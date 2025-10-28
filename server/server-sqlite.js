const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const domainConfig = require('../config/domain-config');
const BackupRestoreManager = require('./backup-restore');
const miscApis = require('./misc-apis');
const authApis = require('./auth-apis');
const categoryApis = require('./category-apis');
const productValidationApis = require('./product-validation-apis');
const statsApis = require('./stats-apis');
const debugApis = require('./debug-apis');
const customerApis = require('./customer-apis');
const productApis = require('./product-apis');
const purchaseApis = require('./purchase-apis');
const repairApis = require('./repair-apis');
const backupApis = require('./backup-apis');
const backupConfigApis = require('./backup-config-apis');
const adminApis = require('./admin-apis');
const categoryUtils = require('./category-utils');
const returnApis = require('./return-apis');
const transactionApis = require('./transaction-apis');

const app = express();
const PORT = process.env.PORT || 3000;

// SQLite 데이터베이스 연결
const dbPath = path.resolve(__dirname, '../database/data', 'repair_center.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
    } else {
        console.log('SQLite 데이터베이스에 연결되었습니다.');
        console.log('데이터베이스 경로:', dbPath);
        initializeDatabase();
    }
});

// 백업/복구 매니저 초기화
const backupManager = new BackupRestoreManager(dbPath);

// 데이터베이스 초기화
function initializeDatabase() {
    const fs = require('fs');
    const schemaPath = path.join(__dirname, '../database/database-schema.sql');
    
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema, (err) => {
            if (err) {
                console.error('스키마 생성 오류:', err.message);
            } else {
                console.log('데이터베이스 스키마가 생성되었습니다.');
                migrateFromJSON();
            }
        });
    }
    
    // visits 테이블이 없으면 생성
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='visits'", (err, row) => {
        if (err) {
            console.error('테이블 확인 오류:', err.message);
        } else if (!row) {
            console.log('visits 테이블이 없어서 생성합니다.');
            const createVisitsTable = `
                CREATE TABLE visits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    visit_date DATETIME NOT NULL,
                    purpose TEXT,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits(customer_id);
                CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
            `;
            db.exec(createVisitsTable, (err) => {
                if (err) {
                    console.error('visits 테이블 생성 오류:', err.message);
                } else {
                    console.log('visits 테이블이 생성되었습니다.');
                }
            });
        }
    });
    
    // users 테이블 생성 (기존 테이블이 없을 때만)
    setTimeout(() => {
        const createUsersQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                phone TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        db.run(createUsersQuery, (err) => {
            if (err) {
                console.error('users 테이블 생성 오류:', err.message);
            } else {
                console.log('users 테이블이 준비되었습니다.');
                // 기본 admin 사용자 생성
                initializeDefaultAdmin();
            }
        });
    }, 1000); // 1초 후 실행

    // 카테고리 테이블 생성 (기존 테이블이 없을 때만)
    setTimeout(() => {
        const createCategoriesQuery = categoryUtils.getCreateCategoriesTableQuery();
        
        db.run(createCategoriesQuery, (err) => {
            if (err) {
                console.error('카테고리 테이블 생성 오류:', err.message);
            } else {
                console.log('카테고리 테이블이 준비되었습니다.');
                // 기본 카테고리 데이터가 없으면 추가
                initializeDefaultCategories();
            }
        });
    }, 2000); // 2초 후 실행

    // purchases 테이블에 tax_option 컬럼 추가 (기존 테이블 업데이트)
    setTimeout(() => {
        console.log('purchases 테이블에 tax_option 컬럼 추가 중...');
        db.run('ALTER TABLE purchases ADD COLUMN tax_option TEXT DEFAULT "included"', (err) => {
            if (err) {
                console.log('tax_option 컬럼 추가 결과:', err.message);
                // 이미 존재하는 경우 무시
            } else {
                console.log('tax_option 컬럼이 성공적으로 추가되었습니다.');
            }
        });
    }, 3000);
    
    // purchases 테이블에 total_quantity 컬럼 추가
    setTimeout(() => {
        console.log('purchases 테이블에 total_quantity 컬럼 추가 중...');
        db.run('ALTER TABLE purchases ADD COLUMN total_quantity INTEGER DEFAULT 0', (err) => {
            if (err) {
                console.log('total_quantity 컬럼 추가 결과:', err.message);
            } else {
                console.log('total_quantity 컬럼이 성공적으로 추가되었습니다.');
            }
        });
    }, 4000);
    
    // purchases 테이블에 customer_code 컬럼 추가
    setTimeout(() => {
        console.log('purchases 테이블에 customer_code 컬럼 추가 중...');
        db.run('ALTER TABLE purchases ADD COLUMN customer_code TEXT', (err) => {
            if (err) {
                console.log('customer_code 컬럼 추가 결과:', err.message);
            } else {
                console.log('customer_code 컬럼이 성공적으로 추가되었습니다.');
            }
        });
    }, 5000);
    
    // purchases 테이블의 type CHECK 제약조건 업데이트 (반품 추가)
    setTimeout(() => {
        console.log('purchases 테이블 type 제약조건 업데이트 중...');
        // SQLite는 ALTER TABLE로 CHECK 제약조건을 직접 수정할 수 없으므로
        // 새로운 테이블을 생성하고 데이터를 이전하는 방식 사용
        db.serialize(() => {
            // 1. 새로운 purchases 테이블 생성
            db.run(`
                CREATE TABLE purchases_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    purchase_code TEXT UNIQUE,
                    purchase_date DATETIME NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('판매', '구매', '반품')),
                    original_type TEXT,
                    original_purchase_id INTEGER,
                    total_amount INTEGER NOT NULL,
                    payment_method TEXT,
                    tax_option TEXT DEFAULT 'included' CHECK (tax_option IN ('included', 'excluded', 'none')),
                    status TEXT DEFAULT '완료',
                    notes TEXT,
                    total_quantity INTEGER DEFAULT 0,
                    customer_code TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id),
                    FOREIGN KEY (original_purchase_id) REFERENCES purchases(id)
                )
            `, (err) => {
                if (err) {
                    console.log('새 purchases 테이블 생성 결과:', err.message);
                } else {
                    console.log('새 purchases 테이블이 생성되었습니다.');
                    
                    // 2. 기존 데이터 복사
                    db.run(`
                        INSERT INTO purchases_new 
                        SELECT id, customer_id, purchase_code, purchase_date, type, 
                               COALESCE(original_type, NULL), COALESCE(original_purchase_id, NULL),
                               total_amount, payment_method, tax_option, status, notes, 
                               COALESCE(total_quantity, 0), customer_code, created_at
                        FROM purchases
                    `, (err) => {
                        if (err) {
                            console.log('데이터 복사 결과:', err.message);
                        } else {
                            console.log('데이터가 복사되었습니다.');
                            
                            // 3. 기존 테이블 삭제 및 새 테이블 이름 변경
                            db.run('DROP TABLE purchases', (err) => {
                                if (err) {
                                    console.log('기존 테이블 삭제 결과:', err.message);
                                } else {
                                    console.log('기존 테이블이 삭제되었습니다.');
                                    
                                    db.run('ALTER TABLE purchases_new RENAME TO purchases', (err) => {
                                        if (err) {
                                            console.log('테이블 이름 변경 결과:', err.message);
                                        } else {
                                            console.log('purchases 테이블이 성공적으로 업데이트되었습니다.');
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
    }, 7000);
    
    // purchases 테이블 데이터 복구 (customer_id 정비)
    setTimeout(() => {
        console.log('purchases 테이블 데이터 복구 시작...');
        
        // 1. customer_id가 NULL이거나 잘못된 값인 purchases 조회
        db.all("SELECT id, customer_id FROM purchases WHERE customer_id IS NULL OR customer_id NOT IN (SELECT id FROM customers)", (err, rows) => {
            if (err) {
                console.error('잘못된 customer_id 조회 오류:', err.message);
                return;
            }
            
            if (rows.length === 0) {
                console.log('복구할 데이터가 없습니다.');
                return;
            }
            
            console.log(`복구할 purchases 레코드 수: ${rows.length}개`);
            
            // 2. 각 purchases 레코드에 대해 올바른 customer_id 찾기
            rows.forEach((purchase, index) => {
                // customer_id가 NULL인 경우 기본 고객(첫 번째 고객)으로 설정
                if (purchase.customer_id === null) {
                    db.get("SELECT id FROM customers ORDER BY id LIMIT 1", (err, customer) => {
                        if (err) {
                            console.error('기본 고객 조회 오류:', err.message);
                            return;
                        }
                        
                        if (customer) {
                            // customer_id 업데이트
                            db.run("UPDATE purchases SET customer_id = ? WHERE id = ?", [customer.id, purchase.id], (err) => {
                                if (err) {
                                    console.error(`purchase ${purchase.id} customer_id 업데이트 오류:`, err.message);
                                } else {
                                    console.log(`purchase ${purchase.id} customer_id를 ${customer.id}로 업데이트 완료`);
                                }
                            });
                        }
                    });
                } else {
                    // customer_id가 잘못된 값인 경우 기본 고객으로 설정
                    db.get("SELECT id FROM customers ORDER BY id LIMIT 1", (err, customer) => {
                        if (err) {
                            console.error('기본 고객 조회 오류:', err.message);
                            return;
                        }
                        
                        if (customer) {
                            // 기존 customer_id를 customer_code로 저장하고 올바른 customer_id로 업데이트
                            db.run("UPDATE purchases SET customer_code = ?, customer_id = ? WHERE id = ?", 
                                [purchase.customer_id, customer.id, purchase.id], (err) => {
                                if (err) {
                                    console.error(`purchase ${purchase.id} 데이터 복구 오류:`, err.message);
                                } else {
                                    console.log(`purchase ${purchase.id} 데이터 복구 완료 (기존: ${purchase.customer_id} -> 새: ${customer.id})`);
                                }
                            });
                        }
                    });
                }
            });
        });
        
        // 3. total_quantity 계산 및 업데이트
        setTimeout(() => {
            console.log('total_quantity 계산 및 업데이트 시작...');
            db.run(`
                UPDATE purchases 
                SET total_quantity = (
                    SELECT COALESCE(SUM(quantity), 0) 
                    FROM purchase_items 
                    WHERE purchase_id = purchases.id
                )
            `, (err) => {
                if (err) {
                    console.error('total_quantity 업데이트 오류:', err.message);
                } else {
                    console.log('total_quantity 업데이트 완료');
                }
            });
        }, 2000);
        
    }, 6000);

    // products 테이블에 status 컬럼 추가 (기존 테이블 업데이트)
    setTimeout(() => {
        console.log('products 테이블에 status 컬럼 추가 중...');
        db.run('ALTER TABLE products ADD COLUMN status TEXT DEFAULT "정품"', (err) => {
            if (err) {
                console.log('status 컬럼 추가 결과:', err.message);
                // 이미 존재하는 경우 무시
            } else {
                console.log('status 컬럼이 성공적으로 추가되었습니다.');
            }
        });
    }, 4000);
}

// JSON 데이터를 SQLite로 마이그레이션
function migrateFromJSON() {
    // 기존 JSON 데이터를 SQLite로 이전하는 로직
    console.log('JSON 데이터 마이그레이션을 시작합니다...');
    // 마이그레이션 코드는 별도로 작성
}

// 도메인 리다이렉트 미들웨어
app.use((req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
        // www를 메인 도메인으로 리다이렉트
        if (req.hostname === 'www.kkam.shop') {
            return res.redirect(301, `https://kkam.shop${req.url}`);
        }
        
        // HTTP를 HTTPS로 리다이렉트
        if (req.header('x-forwarded-proto') !== 'https') {
            return res.redirect(301, `https://${req.hostname}${req.url}`);
        }
    }
    
    next();
});

// 미들웨어 설정
app.use(cors(domainConfig.corsOptions)); // CORS를 가장 먼저 설정

// JSON 파싱 오류 디버깅 미들웨어
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            console.log('=== 요청 본문 디버깅 ===');
            console.log('URL:', req.url);
            console.log('Method:', req.method);
            console.log('Content-Type:', req.headers['content-type']);
            console.log('Raw Body:', body);
            console.log('Body Length:', body.length);
            
            // JSON 파싱 시도
            try {
                const parsed = JSON.parse(body);
                console.log('JSON 파싱 성공:', parsed);
            } catch (error) {
                console.error('JSON 파싱 오류:', error.message);
                console.error('문제가 되는 위치:', error.message.match(/position (\d+)/)?.[1]);
                if (body.length > 0) {
                    const pos = parseInt(error.message.match(/position (\d+)/)?.[1] || '0');
                    console.error('문제 문자:', body.charAt(pos));
                    console.error('주변 텍스트:', body.substring(Math.max(0, pos-10), pos+10));
                }
            }
            console.log('========================');
        });
    }
    next();
});

app.use(express.json());

// 데이터베이스 미들웨어 - 모든 요청에 db 객체 주입
app.use((req, res, next) => {
    req.db = db;
    next();
});

// 정적 파일 서빙 설정 (우선순위 순서)
app.use(express.static(path.join(__dirname, '../shared'))); // 공통 파일들 (최우선)
app.use('/customers', express.static(path.join(__dirname, '../customers'))); // 고객 관련 파일들
app.use('/products', express.static(path.join(__dirname, '../products'))); // 제품 관련 파일들
app.use('/repairs', express.static(path.join(__dirname, '../repairs'))); // 수리 관련 파일들
app.use('/accounting', express.static(path.join(__dirname, '../accounting'))); // 회계 관련 파일들
app.use('/revenue-files', express.static(path.join(__dirname, '../revenue-files'))); // 매출 관련 파일들
app.use('/backup', express.static(path.join(__dirname, '../backup'))); // 백업 관련 파일들
app.use(session(domainConfig.sessionConfig));

// 루트 경로 설정
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../shared/index.html'));
});

// shared 폴더 직접 접근 라우트
app.get('/shared/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../shared/index.html'));
});

// HTML 페이지 라우트들
app.get('/customers', (req, res) => {
    res.sendFile(path.join(__dirname, '../customers/customers.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, '../products/products.html'));
});

app.get('/customer-detail', (req, res) => {
    res.sendFile(path.join(__dirname, '../customers/customer-detail.html'));
});

app.get('/product-add', (req, res) => {
    res.sendFile(path.join(__dirname, '../products/product-add.html'));
});

// OPTIONS 요청 처리 (CORS preflight)
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

// requireAuth 미들웨어를 authApis에서 가져옴
const requireAuth = authApis.requireAuth;

// 인증 API 라우터 사용
app.use('/', authApis);

// 제품 검증 API 라우터 사용
app.use('/', productValidationApis);

// 통계 및 요약 API 라우터 사용
app.use('/', statsApis);

// 디버깅 및 관리 API 라우터 사용
app.use('/', debugApis);

// 고객 관리 API 라우터 사용
app.use('/', customerApis);
app.use('/', productApis);

// 구매 관리 API 라우터 사용
app.use('/', purchaseApis);

// 수리 관리 API 라우터 사용
app.use('/', repairApis);

// 백업/복구 API 라우터 사용
app.use('/', backupApis);

// 백업 설정 API 라우터 사용
app.use('/', backupConfigApis);

// 관리자 API 라우터 사용
app.use('/', adminApis);

// 카테고리 API 라우터 사용
app.use('/', categoryApis);

// 반품 관리 API 라우터 사용
app.use('/', returnApis);

// Transactions 기반 통계 API 라우터 사용
app.use('/', transactionApis);

// 기타 API 라우터 사용
app.use('/', miscApis);

// 고객 통계 API

// 고객 검색 API
app.get('/api/customers/search', requireAuth, (req, res) => {
    console.log('고객 검색 API 호출됨');
    const { name } = req.query;
    
    if (!name) {
        return res.status(400).json({ success: false, message: '고객명이 필요합니다.' });
    }
    
    const query = 'SELECT id, name, phone, email, address FROM customers WHERE name LIKE ? ORDER BY name';
    db.all(query, [`%${name}%`], (err, rows) => {
        if (err) {
            console.error('고객 검색 오류:', err.message);
            res.status(500).json({ success: false, message: '고객 검색에 실패했습니다.' });
        } else {
            console.log('고객 검색 결과:', rows.length, '건');
            res.json({ success: true, customers: rows });
        }
    });
});

// 제품명+상태 중복 검사 API (인증 불필요)
app.get('/api/products/check-duplicate', (req, res) => {
    console.log('제품 중복 검사 API 호출됨 - 인증 없음');
    const { name, status } = req.query;
    
    if (!name || !status) {
        return res.status(400).json({ success: false, message: '제품명과 상태가 필요합니다.' });
    }
    
    const query = 'SELECT id FROM products WHERE name = ? AND status = ?';
    db.get(query, [name, status], (err, row) => {
        if (err) {
            console.error('제품 중복 검사 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 중복 검사에 실패했습니다.' });
        } else {
            const exists = !!row;
            console.log('제품 중복 검사 결과:', { name, status, exists, row });
            res.json({ success: true, exists });
        }
    });
});






// 제품 코드 중복 검사 API (인증 불필요)










// 제품 삭제 API


// 재고 동기화 API - 수리 부품 사용 이력 기반으로 재고 수정

// 모든 제품 재고 일괄 동기화 API
app.post('/api/debug/sync-all-stock', requireAuth, (req, res) => {
    console.log('🔄 모든 제품 재고 일괄 동기화 시작...');
    
    // 모든 제품 조회
    const productsQuery = 'SELECT id, name FROM products ORDER BY id';
    db.all(productsQuery, [], (err, products) => {
        if (err) {
            console.error('제품 목록 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 목록 조회 실패' });
            return;
        }
        
        if (!products || products.length === 0) {
            res.json({ 
                success: true, 
                message: '동기화할 제품이 없습니다.',
                syncedCount: 0,
                totalCount: 0
            });
            return;
        }
        
        let syncedCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // 각 제품에 대해 재고 동기화 수행
        const syncPromises = products.map(product => {
            return new Promise((resolve) => {
                const productId = product.id;
                const productName = product.name;
                
                // 구매/판매 이력과 수리 부품 사용 이력을 모두 조회
                const purchaseQuery = `
                    SELECT pi.quantity, p.type, p.purchase_date
                    FROM purchase_items pi
                    JOIN purchases p ON pi.purchase_id = p.id
                    WHERE pi.product_id = ?
                    ORDER BY p.purchase_date DESC
                `;
                
                const repairPartsQuery = `
                    SELECT rp.quantity, rp.name, r.repair_date
                    FROM repair_parts rp
                    JOIN repairs r ON rp.repair_id = r.id
                    WHERE rp.product_id = ? OR rp.name = ?
                    ORDER BY r.repair_date DESC
                `;
                
                // 구매/판매 이력 조회
                db.all(purchaseQuery, [productId], (err, purchases) => {
                    if (err) {
                        console.error(`제품 ${productId} 구매 이력 조회 오류:`, err.message);
                        errorCount++;
                        errors.push(`제품 ${productId} (${productName}): 구매 이력 조회 실패`);
                        resolve();
                        return;
                    }
                    
                    // 수리 부품 사용 이력 조회
                    db.all(repairPartsQuery, [productId, productName], (err, repairParts) => {
                        if (err) {
                            console.error(`제품 ${productId} 수리 부품 이력 조회 오류:`, err.message);
                            errorCount++;
                            errors.push(`제품 ${productId} (${productName}): 수리 부품 이력 조회 실패`);
                            resolve();
                            return;
                        }
                        
                        // 구매량과 판매량 계산
                        const totalPurchased = purchases
                            .filter(p => p.type === '구매')
                            .reduce((sum, p) => sum + (p.quantity || 0), 0);
                        
                        const totalSold = purchases
                            .filter(p => p.type === '판매')
                            .reduce((sum, p) => sum + (p.quantity || 0), 0);
                        
                        // 수리 부품 사용량 합계 계산 (참고용)
                        const totalUsedInRepairs = repairParts
                            .reduce((sum, part) => sum + (part.quantity || 0), 0);
                        
                        // 올바른 재고 계산: 구매량 - 판매량 - 수리부품 사용량
                        const correctStock = totalPurchased - totalSold - totalUsedInRepairs;
                        
                        // 재고 업데이트
                        db.run(
                            'UPDATE products SET stock_quantity = ? WHERE id = ?',
                            [correctStock, productId],
                            (err) => {
                                if (err) {
                                    console.error(`제품 ${productId} 재고 업데이트 오류:`, err.message);
                                    errorCount++;
                                    errors.push(`제품 ${productId} (${productName}): 재고 업데이트 실패`);
                                } else {
                                    syncedCount++;
                                    console.log(`✅ 제품 ${productId} (${productName}) 재고 동기화 완료: ${correctStock}개`);
                                }
                                resolve();
                            }
                        );
                    });
                });
            });
        });
        
        // 모든 동기화 작업 완료 대기
        Promise.all(syncPromises).then(() => {
            console.log(`🔄 모든 제품 재고 일괄 동기화 완료: ${syncedCount}/${products.length}개 성공`);
            
            res.json({
                success: true,
                message: `재고 동기화가 완료되었습니다.`,
                syncedCount: syncedCount,
                totalCount: products.length,
                errorCount: errorCount,
                errors: errors.length > 0 ? errors : undefined
            });
        });
    });
});



// 기본 카테고리 데이터 초기화 함수
function initializeDefaultCategories() {
    // 먼저 기존 데이터가 있는지 확인
    db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
        if (err) {
            console.error('카테고리 데이터 확인 오류:', err.message);
            return;
        }
        
        // 데이터가 없으면 기본 데이터 추가
        if (row.count === 0) {
            console.log('기본 카테고리 데이터를 추가합니다...');
            const defaultData = getDefaultCategoryData();
            
            // 기본 데이터를 데이터베이스에 삽입
            Object.keys(defaultData).forEach(mainCategory => {
                Object.keys(defaultData[mainCategory]).forEach(subCategory => {
                    defaultData[mainCategory][subCategory].forEach(detailCategory => {
                        const code = `${mainCategory.substring(0, 2)}${subCategory.substring(0, 2)}${detailCategory.substring(0, 2)}`.toUpperCase();
                        
                        db.run(
                            'INSERT OR IGNORE INTO categories (main_category, sub_category, detail_category, code) VALUES (?, ?, ?, ?)',
                            [mainCategory, subCategory, detailCategory, code],
                            (err) => {
                                if (err) {
                                    console.error('기본 카테고리 추가 오류:', err.message);
                                }
                            }
                        );
                    });
                });
            });
            
            console.log('기본 카테고리 데이터 추가 완료');
        } else {
            console.log('기존 카테고리 데이터가 있습니다. 기본 데이터를 추가하지 않습니다.');
        }
    });
}

// 기본 카테고리 데이터
function getDefaultCategoryData() {
    return {
        '컴퓨터부품': {
            'CPU': ['인텔', 'AMD', 'AMD_CPU'],
            '메모리': ['DDR4', 'DDR5', 'PC용'],
            '그래픽카드': ['NVIDIA', 'AMD'],
            '메인보드': ['ASUS', 'MSI', 'GIGABYTE'],
            '파워': ['ATX', 'SFX', 'TFX'],
            '케이스': ['ATX', 'M-ATX', 'ITX'],
            '팬': ['케이스팬', 'CPU팬', '쿨러팬'],
            '하드디스크': ['HDD', 'SATA', 'NVMe'],
            'SSD': ['SATA', 'M.2', 'NVMe'],
            '광학드라이브': ['DVD', 'Blu-ray', 'CD'],
            '쿨러': ['CPU공랭쿨러', '수랭쿨러', '하이브리드'],
            '기타': ['케이블', '어댑터', '브라켓']
        },
        '소프트웨어': {
            '운영체제': ['Windows', 'macOS', 'Linux'],
            '오피스': ['Microsoft Office', '한글', 'LibreOffice', '한글과컴퓨터'],
            '보안': ['백신', '방화벽', '암호화'],
            '기타': ['게임', '편집툴', '개발툴']
        },
        '주변기기': {
            '모니터': ['삼성', 'LG', 'DELL', 'ASUS', 'MSI'],
            '키보드': ['기계식', '멤브레인', '무선'],
            '마우스': ['게이밍마우스', '무선마우스', '트랙볼', '무선', '유선'],
            '스피커': ['게이밍스피커', '블루투스스피커', '홈시어터', '2.1채널', '5.1채널']
        },
        '프린터': {
            '잉크젯': ['HP', 'Canon', 'Epson', '가정용', '사무용', '포토프린터'],
            '레이저': ['HP', 'Samsung', 'Brother', '흑백레이저', '컬러레이저', '복합기'],
            '토너': ['잉크카트리지', '토너카트리지', '드럼유닛'],
            '용지': ['A4용지', 'A3용지', '사진용지', '라벨용지'],
            '기타부품': ['펌프', '헤드', '롤러', '케이블']
        }
    };
}




// ==================== 요약 상세 내역 API ====================

// 요약 상세 내역 조회 API

// 자동 백업 스케줄러 시작
console.log('자동 백업 스케줄러를 시작합니다...');
backupManager.scheduleAutoBackup();

// 서버 시작
const config = domainConfig.getCurrentConfig();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
    // 프로덕션 환경: HTTPS 서버
    const { createHttpsServer } = require('../config/deploy-config');
    const httpsServer = createHttpsServer(app);
    
    if (httpsServer) {
        httpsServer.listen(PORT, () => {
            console.log(`HTTPS 서버가 ${config.domain}:${PORT}에서 실행 중입니다.`);
        });
    } else {
        // SSL 인증서가 없으면 HTTP로 실행
        app.listen(PORT, () => {
            console.log(`HTTP 서버가 ${config.domain}:${PORT}에서 실행 중입니다.`);
        });
    }
} else {
    // 개발 환경: HTTP 서버
    app.listen(PORT, () => {
        console.log(`개발 서버가 http://${config.domain}:${PORT}에서 실행 중입니다.`);
        console.log(`프로덕션 도메인: https://${domainConfig.production.domain}`);
    });
}

// 기본 admin 사용자 초기화 함수
function initializeDefaultAdmin() {
    // 먼저 admin 사용자가 있는지 확인
    db.get('SELECT COUNT(*) as count FROM users WHERE username = ?', ['admin'], (err, row) => {
        if (err) {
            console.error('admin 사용자 확인 오류:', err.message);
            return;
        }
        
        // admin 사용자가 없으면 생성
        if (row.count === 0) {
            const bcrypt = require('bcrypt');
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            
            const insertQuery = `
                INSERT INTO users (name, username, password, phone, created_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            db.run(insertQuery, ['관리자', 'admin', hashedPassword, null], (err) => {
                if (err) {
                    console.error('admin 사용자 생성 오류:', err.message);
                } else {
                    console.log('기본 admin 사용자가 생성되었습니다.');
                }
            });
        } else {
            console.log('admin 사용자가 이미 존재합니다.');
        }
    });
}

// 프로세스 종료 시 데이터베이스 연결 종료
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('데이터베이스 연결 종료 오류:', err.message);
        } else {
            console.log('데이터베이스 연결이 종료되었습니다.');
        }
        process.exit(0);
    });
});
