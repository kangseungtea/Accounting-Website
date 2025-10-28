const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const domainConfig = require('../config/domain-config');
const BackupRestoreManager = require('./backup-restore');
const BackupConfigManager = require('./backup-config');

const app = express();
const PORT = process.env.PORT || 3000;

// SQLite 데이터베이스 연결
const dbPath = path.join(__dirname, '../database/data', 'repair_center.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
    } else {
        console.log('SQLite 데이터베이스에 연결되었습니다.');
        initializeDatabase();
    }
});

// 백업 설정 매니저 초기화
const backupConfigManager = new BackupConfigManager();

// 백업/복구 매니저 초기화
const backupManager = new BackupRestoreManager(dbPath, backupConfigManager);

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
    
    // 카테고리 테이블 생성 (기존 테이블이 없을 때만)
    setTimeout(() => {
        const createQuery = `
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                main_category TEXT NOT NULL,
                sub_category TEXT,
                detail_category TEXT,
                code TEXT NOT NULL,
                UNIQUE(main_category, sub_category, detail_category)
            )
        `;
        
        db.run(createQuery, (err) => {
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
                    total_amount INTEGER NOT NULL,
                    payment_method TEXT,
                    tax_option TEXT DEFAULT 'included' CHECK (tax_option IN ('included', 'excluded', 'none')),
                    status TEXT DEFAULT '완료',
                    notes TEXT,
                    total_quantity INTEGER DEFAULT 0,
                    customer_code TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers(id)
                )
            `, (err) => {
                if (err) {
                    console.log('새 purchases 테이블 생성 결과:', err.message);
                } else {
                    console.log('새 purchases 테이블이 생성되었습니다.');
                    
                    // 2. 기존 데이터 복사
                    db.run(`
                        INSERT INTO purchases_new 
                        SELECT id, customer_id, purchase_code, purchase_date, type, total_amount, 
                               payment_method, tax_option, status, notes, 
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
// 정적 파일 서빙 설정 (우선순위 순서)
app.use(express.static(path.join(__dirname, '../shared'))); // 공통 파일들 (최우선)
app.use('/customers', express.static(path.join(__dirname, '../customers'))); // 고객 관련 파일들
app.use('/products', express.static(path.join(__dirname, '../products'))); // 제품 관련 파일들
app.use('/repairs', express.static(path.join(__dirname, '../repairs'))); // 수리 관련 파일들
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

// API 상태 확인
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'kkam.shop 서버가 정상 작동 중입니다.',
        timestamp: new Date().toISOString(),
        domain: domainConfig.getCurrentConfig().domain
    });
});

// 구매 이력 추가 API
app.post('/api/purchases', requireAuth, (req, res) => {
    const { customerId, purchaseCode, purchaseDate, type, items, paymentMethod, taxOption, notes } = req.body;
    
    if (!customerId || !purchaseDate || !type || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }
    
    // customer_id 유효성 검증
    if (isNaN(parseInt(customerId)) || parseInt(customerId) <= 0) {
        return res.status(400).json({ success: false, message: '유효한 고객 ID가 필요합니다.' });
    }
    
    // 고객 존재 여부 확인
    db.get('SELECT id FROM customers WHERE id = ?', [customerId], (err, customer) => {
        if (err) {
            console.error('고객 조회 오류:', err.message);
            return res.status(500).json({ success: false, message: '고객 정보 조회 중 오류가 발생했습니다.' });
        }
        
        if (!customer) {
            return res.status(400).json({ success: false, message: '존재하지 않는 고객입니다.' });
        }
        
        // 고객이 존재하는 경우 구매 등록 진행
        processPurchaseRegistration();
    });
    
    function processPurchaseRegistration() {
        // 총 금액 계산
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        
        db.serialize(() => {
        db.run(
            'INSERT INTO purchases (customer_id, purchase_code, purchase_date, type, total_amount, payment_method, tax_option, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [customerId, purchaseCode, purchaseDate, type, totalAmount, paymentMethod, taxOption || 'included', notes],
            function(err) {
                if (err) {
                    console.error('구매 이력 추가 오류:', err.message);
                    res.status(500).json({ success: false, message: '구매 이력 추가에 실패했습니다.' });
                    return;
                }
                
                const purchaseId = this.lastID;
                
                // 구매 상품들 추가
                const insertItem = db.prepare('INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)');
                
                items.forEach(item => {
                    const itemTotal = item.quantity * item.unitPrice;
                    insertItem.run([purchaseId, item.productId, item.productName, item.quantity, item.unitPrice, itemTotal]);
                });
                
                insertItem.finalize((err) => {
                    if (err) {
                        console.error('구매 상품 추가 오류:', err.message);
                        res.status(500).json({ success: false, message: '구매 상품 추가에 실패했습니다.' });
                    } else {
                        res.json({ success: true, message: '구매 이력이 성공적으로 추가되었습니다.', data: { id: purchaseId } });
                    }
                });
            }
        );
    });
    }
});

// 구매 코드 생성 API
app.post('/api/purchases/generate-code', requireAuth, (req, res) => {
    const { type } = req.body;
    const prefix = type === '구매' ? 'P' : 'S';
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const code = `${prefix}${timestamp}${random}`;
    
    res.json({ success: true, data: { code } });
});

// 구매 이력 조회 API
app.get('/api/purchases', requireAuth, (req, res) => {
    const { customerId, page = 1, limit = 1000 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT p.*, c.name as customer_name,
               GROUP_CONCAT(pi.product_name || ' (' || pi.quantity || '개)') as products,
               SUM(pi.quantity) as total_quantity
        FROM purchases p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
    `;
    
    const params = [];
    if (customerId) {
        query += ' WHERE p.customer_id = ?';
        params.push(customerId);
    }
    
    query += ' GROUP BY p.id ORDER BY p.purchase_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    db.all(query, params, async (err, purchases) => {
        if (err) {
            console.error('구매 이력 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '구매 이력 조회에 실패했습니다.' });
            return;
        }
        
        console.log('구매 이력 조회 결과:', purchases.length, '건');
        purchases.forEach(p => {
            console.log(`- ID: ${p.id}, Type: ${p.type}, Code: ${p.purchase_code}, Date: ${p.purchase_date}`);
        });
        
        // 각 구매의 상품 정보 조회
        for (let purchase of purchases) {
            try {
                const items = await new Promise((resolve, reject) => {
                    db.all('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchase.id], (err, items) => {
                        if (err) reject(err);
                        else resolve(items);
                    });
                });
                purchase.items = items;
            } catch (error) {
                console.error('구매 상품 조회 오류:', error);
                purchase.items = [];
            }
        }
        
        // 전체 개수 조회
        let countQuery = 'SELECT COUNT(*) as total FROM purchases';
        const countParams = [];
        if (customerId) {
            countQuery += ' WHERE customer_id = ?';
            countParams.push(customerId);
        }
        
        db.get(countQuery, countParams, (err, countResult) => {
            if (err) {
                console.error('구매 이력 개수 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '구매 이력 개수 조회에 실패했습니다.' });
                return;
            }
            
            // 대시보드 호환성을 위한 응답 형식
            res.json({
                success: true,
                purchases: purchases, // 대시보드에서 사용하는 키
                data: purchases, // 기존 호환성
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult.total,
                    pages: Math.ceil(countResult.total / limit)
                }
            });
        });
    });
});

// 특정 상품의 구매 이력 조회 API
app.get('/api/purchases/product-history', requireAuth, (req, res) => {
    const { productName } = req.query;
    
    if (!productName) {
        res.status(400).json({ success: false, message: '상품명이 필요합니다.' });
        return;
    }
    
    const query = `
        SELECT p.*, pi.quantity, pi.unit_price, pi.total_price, c.name as customer_name
        FROM purchases p
        JOIN purchase_items pi ON p.id = pi.purchase_id
        LEFT JOIN customers c ON p.customer_id = c.id
        WHERE pi.product_name = ?
        ORDER BY p.purchase_date DESC
    `;
    
    db.all(query, [productName], (err, purchases) => {
        if (err) {
            console.error('상품 구매 이력 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '상품 구매 이력 조회에 실패했습니다.' });
            return;
        }
        
        res.json({ success: true, data: purchases });
    });
});

// 구매 이력 상세 조회 API
app.get('/api/purchases/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT p.*, c.name as customer_name
        FROM purchases p
        LEFT JOIN customers c ON p.customer_id = c.id
        WHERE p.id = ?
    `;
    
    db.get(query, [id], (err, purchase) => {
        if (err) {
            console.error('구매 이력 상세 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '구매 이력 상세 조회에 실패했습니다.' });
            return;
        }
        
        if (!purchase) {
            res.status(404).json({ success: false, message: '구매 이력을 찾을 수 없습니다.' });
            return;
        }
        
        // 구매 상품들 조회
        db.all('SELECT * FROM purchase_items WHERE purchase_id = ?', [id], (err, items) => {
            if (err) {
                console.error('구매 상품 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '구매 상품 조회에 실패했습니다.' });
                return;
            }
            
            purchase.items = items;
            res.json({ success: true, data: purchase });
        });
    });
});

// 구매 이력 수정 API
app.put('/api/purchases/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { purchase_date, type, payment_method, status, tax_option, notes } = req.body;
    
    const query = `
        UPDATE purchases 
        SET purchase_date = ?, type = ?, payment_method = ?, status = ?, tax_option = ?, notes = ?
        WHERE id = ?
    `;
    
    db.run(query, [purchase_date, type, payment_method, status, tax_option, notes, id], function(err) {
        if (err) {
            console.error('구매 이력 수정 오류:', err.message);
            res.status(500).json({ success: false, message: '구매 이력 수정에 실패했습니다.' });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ success: false, message: '구매 이력을 찾을 수 없습니다.' });
            return;
        }
        
        res.json({ success: true, message: '구매 이력이 수정되었습니다.' });
    });
});

// 특정 상품 구매 수정 API
app.put('/api/purchases/:id/product', requireAuth, (req, res) => {
    const { id } = req.params;
    const { originalProductName, productName, quantity, unitPrice, totalPrice } = req.body;
    
    // 먼저 해당 구매의 상품 정보를 업데이트
    const updateProductQuery = `
        UPDATE purchase_items 
        SET product_name = ?, quantity = ?, unit_price = ?, total_price = ?
        WHERE purchase_id = ? AND product_name = ?
    `;
    
    db.run(updateProductQuery, [productName, quantity, unitPrice, totalPrice, id, originalProductName], function(err) {
        if (err) {
            console.error('상품 구매 수정 오류:', err.message);
            res.status(500).json({ success: false, message: '상품 구매 수정에 실패했습니다.' });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ success: false, message: '해당 상품을 찾을 수 없습니다.' });
            return;
        }
        
        // 구매의 총 금액을 다시 계산
        db.all('SELECT SUM(total_price) as total FROM purchase_items WHERE purchase_id = ?', [id], (err, result) => {
            if (err) {
                console.error('총 금액 계산 오류:', err.message);
                res.status(500).json({ success: false, message: '총 금액 계산에 실패했습니다.' });
                return;
            }
            
            const newTotalAmount = result[0].total || 0;
            
            // 구매의 총 금액 업데이트
            db.run('UPDATE purchases SET total_amount = ? WHERE id = ?', [newTotalAmount, id], (err) => {
                if (err) {
                    console.error('구매 총 금액 업데이트 오류:', err.message);
                    res.status(500).json({ success: false, message: '구매 총 금액 업데이트에 실패했습니다.' });
                    return;
                }
                
                res.json({ success: true, message: '상품 구매가 수정되었습니다.' });
            });
        });
    });
});

// 구매 이력 삭제 API
app.delete('/api/purchases/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    db.serialize(() => {
        // 구매 상품들 먼저 삭제
        db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [id], (err) => {
            if (err) {
                console.error('구매 상품 삭제 오류:', err.message);
                res.status(500).json({ success: false, message: '구매 상품 삭제에 실패했습니다.' });
                return;
            }
            
            // 구매 이력 삭제
            db.run('DELETE FROM purchases WHERE id = ?', [id], (err) => {
                if (err) {
                    console.error('구매 이력 삭제 오류:', err.message);
                    res.status(500).json({ success: false, message: '구매 이력 삭제에 실패했습니다.' });
                } else {
                    res.json({ success: true, message: '구매 이력이 성공적으로 삭제되었습니다.' });
                }
            });
        });
    });
});

// 상품 반품 API
app.post('/api/purchases/return', requireAuth, (req, res) => {
    const { purchaseId, originalProductName, productName, quantity, unitPrice, totalPrice, reason, memo, customerId } = req.body;
    
    if (!purchaseId || !productName || !quantity || unitPrice === undefined) {
        return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }
    
    // customer_id 확보 - 요청 본문에서 가져오기
    if (!customerId || isNaN(parseInt(customerId))) {
        return res.status(400).json({ success: false, message: '유효한 고객 ID가 필요합니다.' });
    }
    
    db.serialize(() => {
        // 1. 원본 구매의 tax_option 조회
        const getOriginalTaxOptionQuery = `SELECT tax_option FROM purchases WHERE id = ?`;
        
        db.get(getOriginalTaxOptionQuery, [purchaseId], (err, originalPurchase) => {
            if (err) {
                console.error('원본 구매 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '원본 구매 정보를 조회할 수 없습니다.' });
                return;
            }
            
            if (!originalPurchase) {
                res.status(400).json({ success: false, message: '원본 구매를 찾을 수 없습니다.' });
                return;
            }
            
            const taxOption = originalPurchase.tax_option || 'included';
            
            // 2. 반품 이력 추가 (purchases 테이블에 반품 기록)
            const returnCode = `R${Date.now()}`;
            const returnQuery = `
                INSERT INTO purchases (customer_id, purchase_code, purchase_date, type, payment_method, status, tax_option, notes, total_amount, total_quantity)
                VALUES (?, ?, datetime('now'), '반품', '현금', '완료', ?, ?, ?, ?)
            `;
            
            db.run(returnQuery, [customerId, returnCode, taxOption, `반품사유: ${reason}${memo ? ', 메모: ' + memo : ''}`, totalPrice, quantity], function(err) {
                if (err) {
                    console.error('반품 이력 추가 오류:', err.message);
                    res.status(500).json({ success: false, message: '반품 이력 추가에 실패했습니다.' });
                    return;
                }
                
                const returnPurchaseId = this.lastID;
                
                // 3. 반품 상품 정보 추가 (purchase_items 테이블)
                const returnItemQuery = `
                    INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, unit_price, total_price)
                    VALUES (?, (SELECT product_id FROM purchase_items WHERE purchase_id = ? AND product_name = ?), ?, ?, ?, ?)
                `;
                
                db.run(returnItemQuery, [returnPurchaseId, purchaseId, originalProductName, productName, quantity, unitPrice, totalPrice], function(err) {
                    if (err) {
                        console.error('반품 상품 정보 추가 오류:', err.message);
                        res.status(500).json({ success: false, message: '반품 상품 정보 추가에 실패했습니다.' });
                        return;
                    }
                
                // 3. 원본 구매의 상품 수량 조정
                const updateOriginalQuery = `
                    UPDATE purchase_items 
                    SET quantity = quantity - ?, 
                        total_price = CASE 
                            WHEN (quantity - ?) <= 0 THEN 0
                            ELSE unit_price * (quantity - ?)
                        END
                    WHERE purchase_id = ? AND product_name = ?
                `;
                
                db.run(updateOriginalQuery, [quantity, quantity, purchaseId, originalProductName], function(err) {
                    if (err) {
                        console.error('원본 구매 수량 조정 오류:', err.message);
                        res.status(500).json({ success: false, message: '원본 구매 수량 조정에 실패했습니다.' });
                        return;
                    }
                    
                    // 4. 원본 구매의 총 금액과 수량 업데이트
                    const updatePurchaseQuery = `
                        UPDATE purchases 
                        SET total_amount = (SELECT SUM(total_price) FROM purchase_items WHERE purchase_id = ?),
                            total_quantity = (SELECT SUM(quantity) FROM purchase_items WHERE purchase_id = ?)
                        WHERE id = ?
                    `;
                    
                    db.run(updatePurchaseQuery, [purchaseId, purchaseId, purchaseId], function(err) {
                        if (err) {
                            console.error('구매 총액 업데이트 오류:', err.message);
                            res.status(500).json({ success: false, message: '구매 총액 업데이트에 실패했습니다.' });
                            return;
                        }
                        
                        // 5. 상품 재고 증가 (해당 상품이 products 테이블에 있는 경우)
                        const updateStockQuery = `
                            UPDATE products 
                            SET stock_quantity = stock_quantity + ?
                            WHERE id = (SELECT product_id FROM purchase_items WHERE purchase_id = ? AND product_name = ?)
                        `;
                        
                        db.run(updateStockQuery, [quantity, purchaseId, originalProductName], function(err) {
                            if (err) {
                                console.error('재고 업데이트 오류:', err.message);
                                // 재고 업데이트 실패는 경고로만 처리하고 반품은 성공으로 처리
                                console.warn('재고 업데이트에 실패했지만 반품은 처리되었습니다.');
                            }
                            
                            res.json({ 
                                success: true, 
                                message: '상품 반품이 성공적으로 처리되었습니다.',
                                data: {
                                    returnPurchaseId,
                                    returnCode,
                                    returnedQuantity: quantity,
                                    returnedAmount: totalPrice
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});
});

// 제품별 구매 이력 조회 API
app.get('/api/products/:id/purchases', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // 제품 정보 조회
    const productQuery = 'SELECT * FROM products WHERE id = ?';
    db.get(productQuery, [id], (err, product) => {
        if (err) {
            console.error('제품 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 조회 실패' });
            return;
        }
        
        if (!product) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
            return;
        }
        
        console.log('제품별 이력 조회 시작, 제품명:', product.name);
        
        // 구매 이력 조회
        const purchaseQuery = `
            SELECT p.*, pi.quantity, pi.unit_price, pi.total_price, c.name as customer_name, '구매/판매' as source_type
            FROM purchases p
            JOIN purchase_items pi ON p.id = pi.purchase_id
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE pi.product_id = ? OR pi.product_name = ?
            ORDER BY p.purchase_date DESC
        `;
        
        // 수리 부품 사용 이력 조회
        const repairPartsQuery = `
            SELECT rp.quantity, rp.name, r.repair_date, r.device_model, r.problem, c.name as customer_name, '수리부품' as source_type, rp.total_price
            FROM repair_parts rp
            JOIN repairs r ON rp.repair_id = r.id
            LEFT JOIN customers c ON r.customer_id = c.id
            WHERE rp.product_id = ? OR rp.name = ?
            ORDER BY r.repair_date DESC
        `;
        
        db.all(purchaseQuery, [id, product.name], (err, purchases) => {
            if (err) {
                console.error('구매 이력 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '구매 이력 조회 실패' });
                return;
            }
            
            // 수리 부품 사용 이력 조회
            db.all(repairPartsQuery, [id, product.name], (err, repairParts) => {
                if (err) {
                    console.error('수리 부품 이력 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '수리 부품 이력 조회 실패' });
                    return;
                }
                
                // 결과 합치기
                const allHistory = [...purchases, ...repairParts].sort((a, b) => {
                    const dateA = new Date(a.purchase_date || a.repair_date);
                    const dateB = new Date(b.purchase_date || b.repair_date);
                    return dateB - dateA;
                });
                
                console.log(`제품별 이력 조회 완료: 구매 ${purchases.length}개, 수리 ${repairParts.length}개, 총 ${allHistory.length}개`);
                
                res.json({
                    success: true,
                    data: allHistory
                });
            });
        });
    });
});

// 구매 관련 테이블 삭제 API (관리자 전용)
app.delete('/api/admin/drop-purchase-tables', requireAuth, (req, res) => {
    // 관리자 권한 확인
    if (req.session.userId !== 'admin') {
        return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    
    db.serialize(() => {
        db.run('DROP TABLE IF EXISTS purchase_items', (err) => {
            if (err) {
                console.error('purchase_items 테이블 삭제 오류:', err.message);
            } else {
                console.log('purchase_items 테이블이 삭제되었습니다.');
            }
        });
        
        db.run('DROP TABLE IF EXISTS purchases', (err) => {
            if (err) {
                console.error('purchases 테이블 삭제 오류:', err.message);
                res.status(500).json({ success: false, message: '구매 관련 테이블 삭제에 실패했습니다.' });
            } else {
                console.log('purchases 테이블이 삭제되었습니다.');
                res.json({ success: true, message: '구매 관련 테이블이 성공적으로 삭제되었습니다.' });
            }
        });
    });
});

// 로그인 API
app.post('/api/login', (req, res) => {
    try {
        console.log('로그인 요청 받음:', req.body);
        const { username, password } = req.body;
        
        if (!username || !password) {
            console.log('사용자명 또는 비밀번호 누락');
            return res.status(400).json({ success: false, message: '사용자명과 비밀번호를 입력해주세요.' });
        }
        
        // 기본 관리자 계정 확인
        if (username === 'admin' && password === 'admin123') {
            console.log('관리자 계정 로그인 성공');
            req.session.userId = 'admin';
            req.session.username = 'admin';
            res.json({ 
                success: true, 
                message: '로그인 성공',
                user: { id: 'admin', username: 'admin' }
            });
        } else {
            console.log('사용자명 또는 비밀번호가 올바르지 않습니다.');
            res.status(401).json({ success: false, message: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
        }
    } catch (error) {
        console.error('로그인 API 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 로그아웃 API
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('세션 삭제 오류:', err.message);
            res.status(500).json({ success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' });
        } else {
            res.json({ success: true, message: '로그아웃되었습니다.' });
        }
    });
});

// 로그인 상태 확인 API
app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            success: true, 
            isLoggedIn: true,
            user: { id: req.session.userId, username: req.session.username }
        });
    } else {
        res.json({ 
            success: true, 
            isLoggedIn: false 
        });
    }
});

// 인증 미들웨어
function requireAuth(req, res, next) {
    console.log('인증 확인:', {
        sessionId: req.sessionID,
        userId: req.session.userId,
        username: req.session.username,
        url: req.url,
        method: req.method
    });
    
    if (req.session.userId) {
        next();
    } else {
        console.log('인증 실패 - 세션 없음');
        res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
}

// 고객 목록 조회 API
app.get('/api/customers', requireAuth, (req, res) => {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT c.*, 
               COALESCE(purchase_total.total_spent, 0) as total_spent,
               COALESCE(return_total.total_return_amount, 0) as total_return_amount,
               COALESCE(repair_total.total_repair_cost, 0) as total_repair_cost
        FROM customers c
        LEFT JOIN (
            SELECT customer_id, SUM(total_amount) as total_spent
            FROM purchases
            WHERE type IN ('구매', '판매')
            GROUP BY customer_id
        ) purchase_total ON c.id = purchase_total.customer_id
        LEFT JOIN (
            SELECT customer_id, SUM(total_amount) as total_return_amount
            FROM purchases
            WHERE type = '반품'
            GROUP BY customer_id
        ) return_total ON c.id = return_total.customer_id
        LEFT JOIN (
            SELECT customer_id, SUM(total_cost) as total_repair_cost
            FROM repairs
            GROUP BY customer_id
        ) repair_total ON c.id = repair_total.customer_id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
        query += ` AND (c.name LIKE ? OR c.company LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (status) {
        query += ` AND c.status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY c.registration_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('고객 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '고객 목록을 불러오는데 실패했습니다.' });
        } else {
            // 전체 개수 조회
            let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE 1=1';
            const countParams = [];
            
            if (search) {
                countQuery += ` AND (name LIKE ? OR company LIKE ? OR phone LIKE ? OR email LIKE ?)`;
                countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
            }
            
            if (status) {
                countQuery += ` AND status = ?`;
                countParams.push(status);
            }
            
            db.get(countQuery, countParams, (err, countRow) => {
                if (err) {
                    console.error('고객 수 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '데이터를 불러오는데 실패했습니다.' });
                } else {
                    const totalPages = Math.ceil(countRow.total / limit);
                    res.json({
                        success: true,
                        data: rows,
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: totalPages,
                            totalItems: countRow.total,
                            itemsPerPage: parseInt(limit)
                        }
                    });
                }
            });
        }
    });
});

// 고객 상세 조회 API
app.get('/api/customers/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    const query = 'SELECT * FROM customers WHERE id = ?';
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('고객 상세 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '고객 정보를 불러오는데 실패했습니다.' });
        } else if (!row) {
            res.status(404).json({ success: false, message: '고객을 찾을 수 없습니다.' });
        } else {
            res.json({ success: true, data: row });
        }
    });
});

// 고객 통계 API
app.get('/api/customers/stats', requireAuth, (req, res) => {
    const { dateFrom, dateTo, customerId, status } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (dateFrom) {
        whereClause += ' AND r.repair_date >= ?';
        params.push(dateFrom);
    }
    if (dateTo) {
        whereClause += ' AND r.repair_date <= ?';
        params.push(dateTo);
    }
    if (customerId) {
        whereClause += ' AND r.customer_id = ?';
        params.push(customerId);
    }
    if (status) {
        whereClause += ' AND r.status = ?';
        params.push(status);
    }
    
    const query = `
        SELECT 
            c.id as customer_id,
            c.name as customer_name,
            COUNT(r.id) as repair_count,
            COALESCE(SUM(r.total_cost), 0) as total_cost,
            COALESCE(AVG(r.total_cost), 0) as avg_cost,
            COALESCE(MAX(r.total_cost), 0) as max_cost,
            COALESCE(MIN(r.total_cost), 0) as min_cost
        FROM customers c
        LEFT JOIN repairs r ON c.id = r.customer_id ${whereClause.replace('WHERE 1=1', '')}
        GROUP BY c.id, c.name
        ORDER BY repair_count DESC, total_cost DESC
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('고객 통계 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '고객 통계를 불러오는데 실패했습니다.' });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

// 고객 수정 API
app.put('/api/customers/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { name, company, phone, email, address, managementNumber, status, notes } = req.body;
    
    // 디버깅: 요청 데이터 확인
    console.log('🔧 고객 수정 요청 받음 - ID:', id);
    console.log('📋 요청 데이터:', req.body);
    console.log('🔍 managementNumber 값:', managementNumber);
    
    if (!name || !phone) {
        return res.status(400).json({ success: false, message: '이름과 전화번호는 필수입니다.' });
    }
    
    // 관리번호 중복 체크 (현재 고객 제외)
    if (managementNumber) {
        const checkQuery = `
            SELECT id FROM customers 
            WHERE management_number = ? AND id != ?
        `;
        
        db.get(checkQuery, [managementNumber, id], (err, row) => {
            if (err) {
                console.error('관리번호 중복 체크 오류:', err.message);
                return res.status(500).json({ success: false, message: '관리번호 중복 체크에 실패했습니다.' });
            }
            
            if (row) {
                return res.status(400).json({ success: false, message: '이미 사용 중인 관리번호입니다.' });
            }
            
            // 중복이 없으면 업데이트 진행
            updateCustomer();
        });
    } else {
        // 관리번호가 없으면 바로 업데이트
        updateCustomer();
    }
    
    function updateCustomer() {
        const query = `
            UPDATE customers 
            SET name = ?, company = ?, phone = ?, email = ?, address = ?, 
                management_number = ?, status = ?, notes = ?
            WHERE id = ?
        `;
        const params = [name, company || '', phone, email || '', address || '', 
                       managementNumber || '', status || '활성', notes || '', id];
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('고객 수정 오류:', err.message);
                res.status(500).json({ success: false, message: '고객 정보 수정에 실패했습니다.' });
            } else if (this.changes === 0) {
                res.status(404).json({ success: false, message: '고객을 찾을 수 없습니다.' });
            } else {
                res.json({ success: true, message: '고객 정보가 수정되었습니다.' });
            }
        });
    }
});

// 고객 삭제 API
app.delete('/api/customers/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // 먼저 고객이 존재하는지 확인
    const checkQuery = 'SELECT * FROM customers WHERE id = ?';
    db.get(checkQuery, [id], (err, customer) => {
        if (err) {
            console.error('고객 확인 오류:', err.message);
            res.status(500).json({ success: false, message: '고객 확인에 실패했습니다.' });
        } else if (!customer) {
            res.status(404).json({ success: false, message: '고객을 찾을 수 없습니다.' });
        } else {
            // 고객 삭제 (CASCADE로 관련 데이터도 자동 삭제됨)
            const deleteQuery = 'DELETE FROM customers WHERE id = ?';
            db.run(deleteQuery, [id], function(err) {
                if (err) {
                    console.error('고객 삭제 오류:', err.message);
                    res.status(500).json({ success: false, message: '고객 삭제에 실패했습니다.' });
                } else {
                    res.json({ success: true, message: '고객이 삭제되었습니다.' });
                }
            });
        }
    });
});

// 고객 등록 API
app.post('/api/customers', requireAuth, (req, res) => {
    const { name, company, businessNumber, phone, email, address, managementNumber, notes } = req.body;
    
    if (!name || !phone) {
        return res.status(400).json({ success: false, message: '이름과 전화번호는 필수입니다.' });
    }
    
    // 관리번호 자동 생성 (제공되지 않은 경우)
    const generateManagementNumber = (callback) => {
        if (managementNumber && managementNumber.trim()) {
            // 사용자가 제공한 관리번호 사용
            callback(managementNumber.trim());
        } else {
            // 자동 생성: MNG + 현재 시간 (YYYYMMDDHHMMSS)
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const autoNumber = `MNG${year}${month}${day}${hours}${minutes}${seconds}`;
            callback(autoNumber);
        }
    };
    
    generateManagementNumber((finalManagementNumber) => {
        const query = `
            INSERT INTO customers (name, company, business_number, phone, email, address, management_number, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [name, company, businessNumber, phone, email, address, finalManagementNumber, notes], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    res.status(400).json({ success: false, message: '이미 존재하는 관리번호입니다.' });
                } else {
                    console.error('고객 등록 오류:', err.message);
                    res.status(500).json({ success: false, message: '고객 등록에 실패했습니다.' });
                }
            } else {
                res.json({ success: true, message: '고객이 등록되었습니다.', customerId: this.lastID });
            }
        });
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

// 제품 목록 조회 API
app.get('/api/products', requireAuth, (req, res) => {
    const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT 
            id, product_code, name, brand, main_category, sub_category, detail_category,
            selling_price as price, stock_quantity, description, status, created_at, updated_at
        FROM products WHERE 1=1
    `;
    const params = [];
    
    if (search) {
        query += ` AND (name LIKE ? OR brand LIKE ? OR product_code LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (category) {
        // 카테고리 필터링 로직 개선 (대분류-중분류-소분류 형태 지원)
        if (category.includes('-')) {
            const parts = category.split('-');
            if (parts.length === 3) {
                query += ` AND main_category = ? AND sub_category = ? AND detail_category = ?`;
                params.push(parts[0], parts[1], parts[2]);
            } else if (parts.length === 2) {
                query += ` AND main_category = ? AND sub_category = ?`;
                params.push(parts[0], parts[1]);
            } else {
                query += ` AND main_category = ?`;
                params.push(parts[0]);
            }
        } else {
            query += ` AND main_category = ?`;
            params.push(category);
        }
    }
    
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('제품 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 목록을 불러오는데 실패했습니다.' });
        } else {
            // 전체 개수 조회
            let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
            const countParams = [];
            
            if (search) {
                countQuery += ` AND (name LIKE ? OR brand LIKE ? OR product_code LIKE ?)`;
                countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            
            if (category) {
                if (category.includes('-')) {
                    const parts = category.split('-');
                    if (parts.length === 3) {
                        countQuery += ` AND main_category = ? AND sub_category = ? AND detail_category = ?`;
                        countParams.push(parts[0], parts[1], parts[2]);
                    } else if (parts.length === 2) {
                        countQuery += ` AND main_category = ? AND sub_category = ?`;
                        countParams.push(parts[0], parts[1]);
                    } else {
                        countQuery += ` AND main_category = ?`;
                        countParams.push(parts[0]);
                    }
                } else {
                    countQuery += ` AND main_category = ?`;
                    countParams.push(category);
                }
            }
            
            if (status) {
                countQuery += ` AND status = ?`;
                countParams.push(status);
            }
            
            db.get(countQuery, countParams, (err, countRow) => {
                if (err) {
                    console.error('제품 수 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '데이터를 불러오는데 실패했습니다.' });
                } else {
                    console.log('🔍 제품 목록 조회 응답 데이터 (첫 번째 제품):', rows.length > 0 ? {
                        id: rows[0].id,
                        name: rows[0].name,
                        stock_quantity: rows[0].stock_quantity,
                        price: rows[0].price,
                        status: rows[0].status
                    } : '제품 없음');
                    const totalPages = Math.ceil(countRow.total / limit);
                    res.json({
                        success: true,
                        data: rows,
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: totalPages,
                            totalItems: countRow.total,
                            itemsPerPage: parseInt(limit)
                        }
                    });
                }
            });
        }
    });
});

// 제품 상세 조회 API
app.get('/api/products/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            id, product_code, name, brand, main_category, sub_category, detail_category,
            selling_price as price, stock_quantity, description, status, created_at, updated_at
        FROM products WHERE id = ?
    `;
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('제품 상세 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 정보를 불러오는데 실패했습니다.' });
        } else if (!row) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
        } else {
            console.log('🔍 제품 상세 조회 응답 데이터:', {
                id: row.id,
                name: row.name,
                stock_quantity: row.stock_quantity,
                price: row.price,
                status: row.status
            });
            res.json({ success: true, data: row });
        }
    });
});

// 제품 등록 API
app.post('/api/products', requireAuth, (req, res) => {
    const { 
        name, 
        productCode, 
        brand, 
        mainCategory, 
        subCategory, 
        detailCategory, 
        price, 
        stockQuantity, 
        description,
        status
    } = req.body;
    
    console.log('=== 제품 등록 요청 분석 ===');
    console.log('요청 본문 전체:', JSON.stringify(req.body));
    console.log('제품 등록 요청 데이터:', {
        name, mainCategory, subCategory, detailCategory, price, productCode
    });
    console.log('mainCategory 타입:', typeof mainCategory, '값:', mainCategory);
    console.log('subCategory 타입:', typeof subCategory, '값:', subCategory);
    console.log('req.body.mainCategory:', req.body.mainCategory);
    console.log('req.body.subCategory:', req.body.subCategory);
    
    if (!name || !mainCategory || !subCategory) {
        console.log('필수 필드 누락:', { name, mainCategory, subCategory });
        return res.status(400).json({ success: false, message: '제품명, 대분류, 중분류는 필수입니다.' });
    }
    
    // 제품명 + 상태 조합 중복 검사
    const duplicateCheckQuery = 'SELECT id FROM products WHERE name = ? AND status = ?';
    db.get(duplicateCheckQuery, [name, status || '정품'], (err, existingProduct) => {
        if (err) {
            console.error('제품 중복 검사 오류:', err.message);
            return res.status(500).json({ success: false, message: '제품 중복 검사에 실패했습니다.' });
        }
        
        if (existingProduct) {
            return res.status(400).json({ 
                success: false, 
                message: `이미 등록된 제품입니다: ${name} (${status || '정품'})` 
            });
        }
        
        // 제품 코드가 없으면 자동 생성
        if (!productCode) {
            const timestamp = Date.now().toString().slice(-6);
            const categoryCode = mainCategory.substring(0, 2).toUpperCase();
            productCode = `${categoryCode}${timestamp}`;
        }
        
        // 제품 등록 진행
        registerProduct();
    });
    
    function registerProduct() {
        const query = `
            INSERT INTO products (
                product_code, name, brand, main_category, sub_category, detail_category, 
                selling_price, stock_quantity, description, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [
            productCode, 
            name, 
            brand || '', 
            mainCategory, 
            subCategory, 
            detailCategory || '', 
            price || 0, 
            stockQuantity || 0, 
            description || '',
            status || '정품'
        ], function(err) {
            if (err) {
                console.error('제품 등록 오류:', err.message);
                if (err.message.includes('UNIQUE constraint failed')) {
                    res.status(400).json({ success: false, message: '이미 사용 중인 제품 코드입니다.' });
                } else {
                    res.status(500).json({ success: false, message: '제품 등록에 실패했습니다.' });
                }
            } else {
                res.json({ 
                    success: true, 
                    message: '제품이 등록되었습니다.', 
                    productId: this.lastID,
                    productCode: productCode
                });
            }
        });
    }
});

// 제품 수정 API
app.put('/api/products/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { 
        name, 
        brand, 
        mainCategory, 
        subCategory, 
        detailCategory, 
        price, 
        stockQuantity, 
        description,
        status
    } = req.body;
    
    let { productCode } = req.body;
    
    // 디버깅: 받은 데이터 확인
    console.log('🔍 제품 수정 API - 받은 데이터:');
    console.log('  - id:', id);
    console.log('  - name:', name);
    console.log('  - productCode:', productCode);
    console.log('  - mainCategory:', mainCategory);
    console.log('  - subCategory:', subCategory);
    console.log('  - stockQuantity:', stockQuantity);
    console.log('  - 전체 body:', req.body);
    
    if (!name || !mainCategory || !subCategory) {
        console.log('❌ 필수 필드 누락:', { name: !!name, mainCategory: !!mainCategory, subCategory: !!subCategory });
        return res.status(400).json({ success: false, message: '제품명, 대분류, 중분류는 필수입니다.' });
    }
    
    // 제품 코드가 없거나 빈 문자열이면 자동 생성
    if (!productCode || productCode.trim() === '') {
        const timestamp = Date.now().toString().slice(-6);
        const categoryCode = mainCategory.substring(0, 2).toUpperCase();
        productCode = `${categoryCode}${timestamp}`;
        console.log('🔍 자동 생성된 제품 코드:', productCode);
    }
    
    const query = `
        UPDATE products 
        SET product_code = ?, name = ?, brand = ?, main_category = ?, sub_category = ?, detail_category = ?, 
            selling_price = ?, stock_quantity = ?, description = ?, status = ?
        WHERE id = ?
    `;
    
    db.run(query, [
        productCode, 
        name,
        brand || '', 
        mainCategory, 
        subCategory, 
        detailCategory || '', 
        price || 0, 
        stockQuantity || 0, 
        description || '',
        status || '정품',
        id
    ], function(err) {
        if (err) {
            console.error('제품 수정 오류:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ success: false, message: '이미 사용 중인 제품 코드입니다.' });
            } else {
                res.status(500).json({ success: false, message: '제품 수정에 실패했습니다.' });
            }
        } else if (this.changes === 0) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
        } else {
            res.json({ success: true, message: '제품이 수정되었습니다.' });
        }
    });
});

// 제품 삭제 API
app.delete('/api/products/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    const query = 'DELETE FROM products WHERE id = ?';
    
    db.run(query, [id], function(err) {
        if (err) {
            console.error('제품 삭제 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 삭제에 실패했습니다.' });
        } else if (this.changes === 0) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
        } else {
            res.json({ success: true, message: '제품이 삭제되었습니다.' });
        }
    });
});

// 제품 코드 중복 검사 API (인증 불필요)
app.get('/api/products/check-code', (req, res) => {
    console.log('제품 코드 검사 API 호출됨 - 인증 없음');
    const { code } = req.query;
    
    if (!code) {
        return res.status(400).json({ success: false, message: '제품 코드가 필요합니다.' });
    }
    
    const query = 'SELECT id FROM products WHERE product_code = ?';
    db.get(query, [code], (err, row) => {
        if (err) {
            console.error('제품 코드 검사 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 코드 검사에 실패했습니다.' });
        } else {
            const exists = !!row;
            console.log('제품 코드 검사 결과:', { code, exists, row });
            res.json({ success: true, exists });
        }
    });
});

// 제품 코드 자동 생성 API
app.post('/api/products/generate-code', requireAuth, (req, res) => {
    const { mainCategory, subCategory, detailCategory } = req.body;
    
    if (!mainCategory || !subCategory) {
        return res.status(400).json({ success: false, message: '대분류와 중분류는 필수입니다.' });
    }
    
    // 제품 코드 생성 (0대분류1중분류01소분류01상품명4자리)
    const categoryCodes = {
        '컴퓨터부품': '0',
        '소프트웨어': '1', 
        '주변기기': '2',
        '프린터': '3'
    };
    
    const subCategoryCodes = {
        // 컴퓨터부품 (0)
        'CPU': '1', '메모리': '2', '그래픽카드': '3', '메인보드': '4', '파워': '5',
        '케이스': '6', '팬': '7', '하드디스크': '8', 'SSD': '9', '광학드라이브': '0',
        '쿨러': '1', '기타': '2',
        // 소프트웨어 (1)
        '운영체제': '1', '오피스': '2', '보안': '3', '기타': '4',
        // 주변기기 (2)
        '모니터': '1', '키보드': '2', '마우스': '3', '스피커': '4',
        // 프린터 (3)
        '잉크젯': '1', '레이저': '2', '토너': '3', '용지': '4', '기타부품': '5'
    };
    
    const detailCategoryCodes = {
        // CPU
        '인텔': '01', 'AMD': '02', 'AMD_CPU': '03',
        // 메모리
        'DDR4': '01', 'DDR5': '02', 'PC용': '03',
        // 그래픽카드
        'NVIDIA': '01', 'AMD': '02',
        // 쿨러
        'CPU공랭쿨러': '01', '수랭쿨러': '02', '하이브리드': '03',
        // 메인보드
        'ASUS': '01', 'MSI': '02', 'GIGABYTE': '03',
        // 기타 카테고리들...
    };
    
    const mainCode = categoryCodes[mainCategory] || '0';
    const subCode = subCategoryCodes[subCategory] || '1';
    const detailCode = detailCategoryCodes[detailCategory] || '01';
    
    // 상품명 4자리 생성 (타임스탬프 기반)
    const productCode = Date.now().toString().slice(-4); // 마지막 4자리
    const baseCode = `${mainCode}${subCode}${detailCode}${productCode}`;
    
    // 중복 검사 후 고유한 코드 생성
    const generateUniqueCode = (attempt = 0) => {
        const code = attempt === 0 ? baseCode : `${baseCode}${attempt}`;
        
        const query = 'SELECT id FROM products WHERE product_code = ?';
        db.get(query, [code], (err, row) => {
            if (err) {
                console.error('제품 코드 생성 오류:', err.message);
                res.status(500).json({ success: false, message: '제품 코드 생성에 실패했습니다.' });
            } else if (row) {
                // 중복되면 다시 시도
                if (attempt < 10) {
                    generateUniqueCode(attempt + 1);
                } else {
                    res.status(500).json({ success: false, message: '고유한 제품 코드를 생성할 수 없습니다.' });
                }
            } else {
                res.json({ success: true, productCode: code });
            }
        });
    };
    
    generateUniqueCode();
});



// 수리 이력 조회 API (고객별)
app.get('/api/repairs', requireAuth, (req, res) => {
    const { customerId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT r.*, c.name as customer_name, c.management_number, c.phone as customer_phone, c.address as customer_address
        FROM repairs r
        JOIN customers c ON r.customer_id = c.id
        WHERE 1=1
    `;
    const params = [];
    
    if (customerId) {
        query += ` AND r.customer_id = ?`;
        params.push(customerId);
    }
    
    query += ` ORDER BY r.repair_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('수리 이력 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 이력을 불러오는데 실패했습니다.' });
        } else {
            // 수리 부품과 인건비 정보도 함께 조회
            const repairIds = rows.map(row => row.id);
            if (repairIds.length > 0) {
                const partsQuery = `
                    SELECT rp.id, rp.repair_id, rp.product_id, rp.name, rp.quantity,
                           rp.unit_price as unitPrice, rp.total_price as totalPrice,
                           r.device_model, r.problem
                    FROM repair_parts rp
                    JOIN repairs r ON rp.repair_id = r.id
                    WHERE rp.repair_id IN (${repairIds.map(() => '?').join(',')})
                    ORDER BY r.repair_date DESC, rp.id
                `;
                
                const laborQuery = `
                    SELECT rl.*, r.device_model, r.problem
                    FROM repair_labor rl
                    JOIN repairs r ON rl.repair_id = r.id
                    WHERE rl.repair_id IN (${repairIds.map(() => '?').join(',')})
                    ORDER BY r.repair_date DESC, rl.id
                `;
                
                db.all(partsQuery, repairIds, (err, parts) => {
                    if (err) {
                        console.error('수리 부품 조회 오류:', err.message);
                        res.status(500).json({ success: false, message: '수리 부품을 불러오는데 실패했습니다.' });
                        return;
                    }
                    
                    db.all(laborQuery, repairIds, (err, labor) => {
                        if (err) {
                            console.error('수리 인건비 조회 오류:', err.message);
                            res.status(500).json({ success: false, message: '수리 인건비를 불러오는데 실패했습니다.' });
                            return;
                        }
                        
                        // 수리 이력에 부품과 인건비 정보 추가
                        const repairsWithDetails = rows.map(repair => ({
                            ...repair,
                            parts: parts.filter(part => part.repair_id === repair.id),
                            labor: labor.filter(lab => lab.repair_id === repair.id)
                        }));
                        
                        res.json({ success: true, data: repairsWithDetails });
                    });
                });
            } else {
                res.json({ success: true, data: rows });
            }
        }
    });
});



// 수리 이력 등록 API
app.post('/api/repairs', requireAuth, (req, res) => {
    const { customerId, deviceModel, problem, solution, status, warranty, technician, totalCost, vatOption, parts, labor } = req.body;
    
    if (!customerId || !deviceModel || !problem) {
        return res.status(400).json({ success: false, message: '고객 ID, 모델명, 문제는 필수입니다.' });
    }
    
    // 부품과 인건비에서 총 비용 계산
    let calculatedTotalCost = 0;
    let partsCost = 0;
    let laborCost = 0;
    
    if (parts && Array.isArray(parts)) {
        partsCost = parts.reduce((sum, part) => {
            const quantity = parseInt(part.quantity) || 0;
            const unitPrice = parseInt(part.unitPrice) || 0;
            return sum + (quantity * unitPrice);
        }, 0);
    }
    
    if (labor && Array.isArray(labor)) {
        laborCost = labor.reduce((sum, laborItem) => {
            return sum + (parseInt(laborItem.amount) || 0);
        }, 0);
    }
    
    calculatedTotalCost = partsCost + laborCost;
    
    console.log('💰 수리 이력 추가 - 비용 계산:');
    console.log('  - 부품비:', partsCost);
    console.log('  - 인건비:', laborCost);
    console.log('  - 총 비용:', calculatedTotalCost);
    console.log('  - 전달받은 totalCost:', totalCost);
    
    // 계산된 총 비용을 사용 (전달받은 값이 0이거나 없으면)
    const finalTotalCost = (totalCost && totalCost > 0) ? totalCost : calculatedTotalCost;
    
    const query = `
        INSERT INTO repairs (customer_id, device_model, problem, solution, status, warranty, technician, total_cost, vat_option, repair_date, parts_cost, labor_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `;
    const params = [customerId, deviceModel, problem, solution || '', status || '진행중', 
                   warranty || '', technician || '', finalTotalCost, vatOption || 'included', partsCost, laborCost];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('수리 이력 등록 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 이력 등록에 실패했습니다.' });
        } else {
            const repairId = this.lastID;
            
            // 수리 부품 등록
            if (parts && Array.isArray(parts)) {
                parts.forEach((part, index) => {
                    // 부품명이 있거나 수량/단가가 있으면 저장
                    if (part.name || part.quantity || part.unitPrice) {
                        db.run(
                            'INSERT INTO repair_parts (repair_id, product_id, name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
                            [repairId, part.productId || null, part.name || '', part.quantity || 0, part.unitPrice || 0, part.totalPrice || (part.quantity * part.unitPrice) || 0],
                            (err) => {
                                if (err) {
                                    console.error('수리 부품 등록 오류:', err.message);
                                } else {
                                    console.log(`부품 저장됨: ${part.name || '(빈 부품명)'}, 수량: ${part.quantity || 0}, 단가: ${part.unitPrice || 0}`);
                                }
                            }
                        );
                    }
                });
            }
            
            // 수리 인건비 등록
            if (labor && Array.isArray(labor)) {
                labor.forEach((lab, index) => {
                    if (lab.description && lab.amount) {
                        db.run(
                            'INSERT INTO repair_labor (repair_id, description, amount) VALUES (?, ?, ?)',
                            [repairId, lab.description, lab.amount],
                            (err) => {
                                if (err) {
                                    console.error('수리 인건비 등록 오류:', err.message);
                                }
                            }
                        );
                    }
                });
            }
            
            res.json({ success: true, message: '수리 이력이 등록되었습니다.', id: repairId });
        }
    });
});

// 테스트용 수리 데이터 추가 API (개발용)
app.post('/api/repairs/test-data', requireAuth, (req, res) => {
    console.log('테스트용 수리 데이터 추가 시작...');
    
    // 먼저 고객이 있는지 확인
    db.get('SELECT id FROM customers LIMIT 1', (err, customer) => {
        if (err) {
            console.error('고객 조회 오류:', err.message);
            return res.status(500).json({ success: false, message: '고객 조회 실패' });
        }
        
        if (!customer) {
            return res.status(400).json({ success: false, message: '고객 데이터가 없습니다. 먼저 고객을 등록해주세요.' });
        }
        
        const testRepairs = [
            {
                customer_id: customer.id,
                device_model: '삼성 갤럭시 S24',
                problem: '화면 깨짐',
                solution: '액정 교체',
                status: '접수',
                warranty: '1년',
                technician: '김기사',
                total_cost: 150000,
                vat_option: 'included',
                parts_cost: 100000,
                labor_cost: 50000
            },
            {
                customer_id: customer.id,
                device_model: '아이폰 15 Pro',
                problem: '배터리 수명 짧음',
                solution: '배터리 교체',
                status: '위탁 접수',
                warranty: '6개월',
                technician: '박기사',
                total_cost: 120000,
                vat_option: 'included',
                parts_cost: 80000,
                labor_cost: 40000
            },
            {
                customer_id: customer.id,
                device_model: 'LG 그램 노트북',
                problem: '키보드 고장',
                solution: '키보드 교체',
                status: '수리 완료',
                warranty: '2년',
                technician: '이기사',
                total_cost: 200000,
                vat_option: 'included',
                parts_cost: 150000,
                labor_cost: 50000
            },
            {
                customer_id: customer.id,
                device_model: '맥북 프로 M3',
                problem: '충전 포트 불량',
                solution: '충전 포트 교체',
                status: '보증 중',
                warranty: '1년',
                technician: '최기사',
                total_cost: 300000,
                vat_option: 'included',
                parts_cost: 250000,
                labor_cost: 50000
            }
        ];
        
        let completed = 0;
        const total = testRepairs.length;
        
        testRepairs.forEach((repair, index) => {
            const query = `
                INSERT INTO repairs (customer_id, device_model, problem, solution, status, warranty, technician, total_cost, vat_option, repair_date, parts_cost, labor_cost, completion_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-${index} days'), ?, ?, 
                        CASE WHEN ? = '수리 완료' OR ? = '보증 중' THEN datetime('now', '-${index} days', '+1 days') ELSE NULL END)
            `;
            
            const params = [
                repair.customer_id,
                repair.device_model,
                repair.problem,
                repair.solution,
                repair.status,
                repair.warranty,
                repair.technician,
                repair.total_cost,
                repair.vat_option,
                repair.parts_cost,
                repair.labor_cost,
                repair.status,
                repair.status
            ];
            
            db.run(query, params, function(err) {
                if (err) {
                    console.error(`테스트 수리 데이터 ${index + 1} 추가 오류:`, err.message);
                } else {
                    console.log(`✅ 테스트 수리 데이터 ${index + 1} 추가 완료 (ID: ${this.lastID})`);
                }
                
                completed++;
                if (completed === total) {
                    res.json({ 
                        success: true, 
                        message: `${total}개의 테스트 수리 데이터가 추가되었습니다.`,
                        count: total
                    });
                }
            });
        });
    });
});

// 수리 상태 분포 확인 API (디버깅용)
app.get('/api/repair-status-debug', requireAuth, (req, res) => {
    const query = `
        SELECT 
            status,
            COUNT(*) as count
        FROM repairs
        GROUP BY status
        ORDER BY status
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('수리 상태 분포 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 상태 분포를 불러오는데 실패했습니다.' });
        } else {
            console.log('수리 상태 분포:', rows);
            res.json({ success: true, data: rows });
        }
    });
});

// 수리 현황 통계 API
app.get('/api/repair-status-summary', requireAuth, (req, res) => {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
        dateFilter = ' AND r.repair_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }
    
    const query = `
        SELECT 
            r.status,
            COUNT(*) as count,
            SUM(COALESCE(r.repair_cost, 0)) as total_cost
        FROM repairs r
        WHERE 1=1 ${dateFilter}
        GROUP BY r.status
        ORDER BY r.status
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('수리 현황 통계 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 현황 통계를 불러오는데 실패했습니다.' });
        } else {
            const summary = {
                total: 0,
                pending: 0,
                inProgress: 0,
                completed: 0,
                warranty: 0,
                totalCost: 0
            };
            
            rows.forEach(row => {
                summary.total += row.count;
                summary.totalCost += row.total_cost || 0;
                
                switch (row.status) {
                    case '접수':
                        summary.pending = row.count;
                        break;
                    case '위탁 접수':
                        summary.inProgress = row.count;
                        break;
                    case '수리 완료':
                        summary.completed = row.count;
                        break;
                    case '보증 중':
                        summary.warranty = row.count;
                        break;
                }
            });
            
            res.json({ success: true, data: summary });
        }
    });
});

// 수리 이력 상세 조회 API
app.get('/api/repairs/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    console.log(`수리 이력 상세 조회 요청, ID: ${id}`);
    
    const query = `
        SELECT r.*, c.management_number, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
        FROM repairs r 
        LEFT JOIN customers c ON r.customer_id = c.id 
        WHERE r.id = ?
    `;
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('수리 이력 상세 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 이력 정보를 불러오는데 실패했습니다.' });
        } else if (!row) {
            res.status(404).json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
        } else {
            console.log('수리 이력 기본 정보:', row);
            console.log('🔢 management_number 값:', row.management_number);
            console.log('👤 고객 정보:', {
                customer_name: row.customer_name,
                customer_phone: row.customer_phone,
                customer_address: row.customer_address
            });
            
            // 수리 부품과 인건비 정보도 함께 조회
            const partsQuery = `
                SELECT id, repair_id, product_id, name, quantity, 
                       unit_price as unitPrice, total_price as totalPrice
                FROM repair_parts 
                WHERE repair_id = ?
            `;
            const laborQuery = 'SELECT * FROM repair_labor WHERE repair_id = ?';
            
            db.all(partsQuery, [id], (err, parts) => {
                if (err) {
                    console.error('수리 부품 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '수리 부품 정보를 불러오는데 실패했습니다.' });
                    return;
                }
                
                console.log(`수리 부품 조회 결과, ID: ${id}, 부품 개수: ${parts.length}`);
                parts.forEach((part, index) => {
                    console.log(`부품 ${index + 1}:`, part);
                    console.log(`  - 부품명: ${part.name}`);
                    console.log(`  - 수량: ${part.quantity}`);
                    console.log(`  - 단가 (unitPrice): ${part.unitPrice}`);
                    console.log(`  - 총액 (totalPrice): ${part.totalPrice}`);
                    console.log(`  - 제품 ID: ${part.product_id}`);
                });
                
                db.all(laborQuery, [id], (err, labor) => {
                    if (err) {
                        console.error('수리 인건비 조회 오류:', err.message);
                        res.status(500).json({ success: false, message: '수리 인건비 정보를 불러오는데 실패했습니다.' });
                        return;
                    }
                    
                    console.log(`수리 인건비 조회 결과, ID: ${id}, 인건비 개수: ${labor.length}`);
                    
                    const repairWithDetails = {
                        ...row,
                        parts: parts,
                        labor: labor
                    };
                    
                    console.log('최종 수리 이력 데이터:', repairWithDetails);
                    res.json({ success: true, data: repairWithDetails });
                });
            });
        }
    });
});

// 수리 이력 수정 API
app.put('/api/repairs/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { 
        device_model, 
        problem, 
        solution, 
        status, 
        warranty, 
        technician, 
        total_cost, 
        vat_option, 
        repair_date,
        notes,
        parts, 
        labor 
    } = req.body;
    
    console.log('🔧 수리 이력 수정 요청 받음 - ID:', id);
    console.log('📋 요청 데이터:', JSON.stringify(req.body, null, 2));
    console.log('🔍 필수 필드 검증:');
    console.log('  - device_model:', device_model, '(존재:', !!device_model, ')');
    console.log('  - problem:', problem, '(존재:', !!problem, ')');
    
    if (!device_model || !problem) {
        console.error('❌ 필수 필드 누락 - device_model:', !!device_model, 'problem:', !!problem);
        return res.status(400).json({ success: false, message: '모델명과 문제는 필수입니다.' });
    }
    
    // 부품과 인건비에서 총 비용 계산
    let calculatedTotalCost = 0;
    let partsCost = 0;
    let laborCost = 0;
    
    if (parts && Array.isArray(parts)) {
        partsCost = parts.reduce((sum, part) => {
            const quantity = parseInt(part.quantity) || 0;
            const unitPrice = parseInt(part.unitPrice) || 0;
            return sum + (quantity * unitPrice);
        }, 0);
    }
    
    if (labor && Array.isArray(labor)) {
        laborCost = labor.reduce((sum, laborItem) => {
            return sum + (parseInt(laborItem.amount) || 0);
        }, 0);
    }
    
    calculatedTotalCost = partsCost + laborCost;
    
    console.log('💰 비용 계산:');
    console.log('  - 부품비:', partsCost);
    console.log('  - 인건비:', laborCost);
    console.log('  - 총 비용:', calculatedTotalCost);
    console.log('  - 전달받은 total_cost:', total_cost);
    
    // 계산된 총 비용을 사용 (전달받은 값이 0이거나 없으면)
    const finalTotalCost = (total_cost && total_cost > 0) ? total_cost : calculatedTotalCost;
    
    const query = `
        UPDATE repairs 
        SET device_model = ?, problem = ?, solution = ?, status = ?, warranty = ?, 
            technician = ?, total_cost = ?, vat_option = ?, repair_date = ?, notes = ?,
            parts_cost = ?, labor_cost = ?
        WHERE id = ?
    `;
    const params = [
        device_model, 
        problem, 
        solution || '', 
        status || '진행중', 
        warranty || '', 
        technician || '', 
        finalTotalCost, 
        vat_option || 'included',
        repair_date || new Date().toISOString().split('T')[0],
        notes || '',
        partsCost,
        laborCost,
        id
    ];
    
    console.log('💾 데이터베이스 업데이트 쿼리 실행:');
    console.log('  - 쿼리:', query);
    console.log('  - 파라미터:', params);
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('💥 수리 이력 수정 오류:', err.message);
            console.error('📍 에러 코드:', err.code);
            console.error('📍 에러 스택:', err.stack);
            res.status(500).json({ success: false, message: '수리 이력 수정에 실패했습니다.' });
        } else if (this.changes === 0) {
            console.warn('⚠️ 수리 이력을 찾을 수 없음 - ID:', id);
            res.status(404).json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
        } else {
            console.log('✅ 수리 이력 업데이트 성공 - 변경된 행 수:', this.changes);
            // 수리 부품과 인건비도 업데이트
            if (parts && Array.isArray(parts)) {
                // 기존 부품 삭제
                db.run('DELETE FROM repair_parts WHERE repair_id = ?', [id], (err) => {
                    if (err) {
                        console.error('기존 수리 부품 삭제 오류:', err.message);
                    } else {
                        // 새 부품 추가
                        parts.forEach((part, index) => {
                            // 부품명이 있거나 수량/단가가 있으면 저장
                            if (part.name || part.quantity || part.unitPrice) {
                                db.run(
                                    'INSERT INTO repair_parts (repair_id, product_id, name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
                                    [id, part.productId || null, part.name || '', part.quantity || 0, part.unitPrice || 0, part.totalPrice || (part.quantity * part.unitPrice) || 0],
                                    (err) => {
                                        if (err) {
                                            console.error('수리 부품 추가 오류:', err.message);
                                        } else {
                                            console.log(`부품 수정됨: ${part.name || '(빈 부품명)'}, 수량: ${part.quantity || 0}, 단가: ${part.unitPrice || 0}`);
                                        }
                                    }
                                );
                            }
                        });
                    }
                });
            }
            
            if (labor && Array.isArray(labor)) {
                // 기존 인건비 삭제
                db.run('DELETE FROM repair_labor WHERE repair_id = ?', [id], (err) => {
                    if (err) {
                        console.error('기존 수리 인건비 삭제 오류:', err.message);
                    } else {
                        // 새 인건비 추가
                        labor.forEach((lab, index) => {
                            if (lab.description && lab.amount) {
                                db.run(
                                    'INSERT INTO repair_labor (repair_id, description, amount) VALUES (?, ?, ?)',
                                    [id, lab.description, lab.amount],
                                    (err) => {
                                        if (err) {
                                            console.error('수리 인건비 추가 오류:', err.message);
                                        }
                                    }
                                );
                            }
                        });
                    }
                });
            }
            
            res.json({ success: true, message: '수리 이력이 수정되었습니다.' });
        }
    });
});

// 수리 이력 삭제 API
app.delete('/api/repairs/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // 먼저 수리 이력이 존재하는지 확인
    const checkQuery = 'SELECT * FROM repairs WHERE id = ?';
    db.get(checkQuery, [id], (err, repair) => {
        if (err) {
            console.error('수리 이력 확인 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 이력 확인에 실패했습니다.' });
        } else if (!repair) {
            res.status(404).json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
        } else {
            // 트랜잭션으로 수리 이력과 관련 부품/인건비 삭제
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                // 수리 부품 삭제
                db.run('DELETE FROM repair_parts WHERE repair_id = ?', [id], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        console.error('수리 부품 삭제 오류:', err.message);
                        res.status(500).json({ success: false, message: '수리 부품 삭제에 실패했습니다.' });
                        return;
                    }
                    
                    // 수리 인건비 삭제
                    db.run('DELETE FROM repair_labor WHERE repair_id = ?', [id], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            console.error('수리 인건비 삭제 오류:', err.message);
                            res.status(500).json({ success: false, message: '수리 인건비 삭제에 실패했습니다.' });
                            return;
                        }
                        
                        // 수리 이력 삭제
                        db.run('DELETE FROM repairs WHERE id = ?', [id], (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                console.error('수리 이력 삭제 오류:', err.message);
                                res.status(500).json({ success: false, message: '수리 이력 삭제에 실패했습니다.' });
                            } else {
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('트랜잭션 커밋 오류:', err.message);
                                        res.status(500).json({ success: false, message: '수리 이력 삭제에 실패했습니다.' });
                                    } else {
                                        res.json({ success: true, message: '수리 이력이 삭제되었습니다.' });
                                    }
                                });
                            }
                        });
                    });
                });
            });
        }
    });
});

// 제품 삭제 API
app.delete('/api/products/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // 먼저 제품이 존재하는지 확인
    const checkQuery = 'SELECT * FROM products WHERE id = ?';
    db.get(checkQuery, [id], (err, product) => {
        if (err) {
            console.error('제품 확인 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 확인에 실패했습니다.' });
        } else if (!product) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
        } else {
            // 제품 삭제
            const deleteQuery = 'DELETE FROM products WHERE id = ?';
            db.run(deleteQuery, [id], function(err) {
                if (err) {
                    console.error('제품 삭제 오류:', err.message);
                    res.status(500).json({ success: false, message: '제품 삭제에 실패했습니다.' });
                } else {
                    res.json({ success: true, message: '제품이 삭제되었습니다.' });
                }
            });
        }
    });
});

// 방문 이력 API
app.get('/api/visits', requireAuth, (req, res) => {
    const { customerId } = req.query;
    
    let query = 'SELECT * FROM visits WHERE 1=1';
    const params = [];
    
    if (customerId) {
        query += ' AND customer_id = ?';
        params.push(customerId);
    }
    
    query += ' ORDER BY visit_date DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('방문 이력 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '방문 이력을 불러오는데 실패했습니다.' });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

app.post('/api/visits', requireAuth, (req, res) => {
    const { customerId, visitDate, purpose, notes } = req.body;
    
    if (!customerId || !visitDate) {
        return res.status(400).json({ success: false, message: '고객 ID와 방문일은 필수입니다.' });
    }
    
    const query = 'INSERT INTO visits (customer_id, visit_date, purpose, notes) VALUES (?, ?, ?, ?)';
    const params = [customerId, visitDate, purpose || '', notes || ''];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('방문 이력 등록 오류:', err.message);
            res.status(500).json({ success: false, message: '방문 이력 등록에 실패했습니다.' });
        } else {
            res.json({ success: true, message: '방문 이력이 등록되었습니다.', id: this.lastID });
        }
    });
});



// 재고 동기화 API - 수리 부품 사용 이력 기반으로 재고 수정
app.post('/api/debug/sync-stock/:productId', requireAuth, (req, res) => {
    const { productId } = req.params;
    
    // 제품 정보 조회
    const productQuery = 'SELECT * FROM products WHERE id = ?';
    db.get(productQuery, [productId], (err, product) => {
        if (err) {
            console.error('제품 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 조회 실패' });
            return;
        }
        
        if (!product) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
            return;
        }
        
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
                console.error('구매 이력 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '구매 이력 조회 실패' });
                return;
            }
            
            // 수리 부품 사용 이력 조회
            db.all(repairPartsQuery, [productId, product.name], (err, repairParts) => {
                if (err) {
                    console.error('수리 부품 이력 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '수리 부품 이력 조회 실패' });
                    return;
                }
                
                // 구매량과 판매량 계산
                const totalPurchased = purchases
                    .filter(p => p.type === '구매')
                    .reduce((sum, p) => sum + (p.quantity || 0), 0);
                
                const totalSold = purchases
                    .filter(p => p.type === '판매')
                    .reduce((sum, p) => sum + (p.quantity || 0), 0);
                
                // 수리 부품 사용량 합계 계산
                const totalUsedInRepairs = repairParts
                    .reduce((sum, part) => sum + (part.quantity || 0), 0);
                
                // 올바른 재고 계산: 구매량 - 판매량 - 수리부품 사용량
                const correctStock = totalPurchased - totalSold - totalUsedInRepairs;
            
                // 상세 로깅
                console.log(`📊 제품 ${productId} (${product.name}) 재고 계산:`);
                console.log(`  - 구매량: ${totalPurchased}개`);
                console.log(`  - 판매량: ${totalSold}개`);
                console.log(`  - 수리부품사용: ${repairParts.length}건, 총 ${totalUsedInRepairs}개`);
                console.log(`  - 계산: ${totalPurchased} - ${totalSold} - ${totalUsedInRepairs} = ${correctStock}개`);
            
                // 구매/판매 내역 상세 출력
                console.log(`🔍 구매/판매 내역 상세:`);
                purchases.forEach((p, index) => {
                    console.log(`  ${index + 1}. ${p.purchase_date} - ${p.type} ${p.quantity}개`);
                });
                
                // 수리부품 사용 내역 상세 출력
                console.log(`🔍 수리부품 사용 내역 상세:`);
                repairParts.forEach((part, index) => {
                    console.log(`  ${index + 1}. ${part.repair_date} - ${part.name} ${part.quantity}개`);
                });
        
            // 재고 업데이트
            db.run(
                'UPDATE products SET stock_quantity = ? WHERE id = ?',
                [correctStock, productId],
                (err) => {
                    if (err) {
                        console.error('재고 동기화 오류:', err.message);
                        res.status(500).json({ success: false, message: '재고 동기화 실패' });
                    } else {
                        console.log(`✅ 제품 ${productId} 재고 동기화 완료: ${product.stock_quantity} → ${correctStock}`);
                        console.log(`📊 수리부품사용: ${totalUsedInRepairs}개`);
                        
                        // 재고 변화량 계산
                        const stockChange = correctStock - product.stock_quantity;
                        const changeType = stockChange > 0 ? '증가' : stockChange < 0 ? '감소' : '변화없음';
                        
                        res.json({
                            success: true,
                            message: `재고가 동기화되었습니다. (${changeType}: ${Math.abs(stockChange)}개)`,
                            data: {
                                productId: productId,
                                productName: product.name,
                                oldStock: product.stock_quantity,
                                newStock: correctStock,
                                stockChange: stockChange,
                                changeType: changeType,
                                totalUsedInRepairs: totalUsedInRepairs
                            }
                        });
                    }
                }
            );
            });
        });
    });
});

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
                        
                        // 수리 부품 사용량 합계 계산
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

// 재고 디버깅 API - 제품별 수리 부품 사용 이력과 재고 확인
app.get('/api/debug/stock/:productId', requireAuth, (req, res) => {
    const { productId } = req.params;
    
    // 제품 정보 조회
    const productQuery = 'SELECT * FROM products WHERE id = ?';
    db.get(productQuery, [productId], (err, product) => {
        if (err) {
            console.error('제품 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 조회 실패' });
            return;
        }
        
        if (!product) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
            return;
        }
        
        // 수리 부품 사용 이력 조회
        const repairPartsQuery = `
            SELECT rp.quantity, rp.name, r.repair_date, r.device_model, r.problem
            FROM repair_parts rp
            JOIN repairs r ON rp.repair_id = r.id
            WHERE rp.product_id = ? OR rp.name = ?
            ORDER BY r.repair_date DESC
        `;
        
        db.all(repairPartsQuery, [productId, product.name], (err, repairParts) => {
            if (err) {
                console.error('수리 부품 이력 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '수리 부품 이력 조회 실패' });
                return;
            }
            
            // 수리 부품 사용량 합계 계산
            const totalUsedInRepairs = repairParts
                .reduce((sum, part) => sum + (part.quantity || 0), 0);
            
            res.json({
                success: true,
                data: {
                    product: product,
                    repairParts: repairParts,
                    summary: {
                        currentStock: product.stock_quantity,
                        totalUsedInRepairs: totalUsedInRepairs,
                        remainingStock: product.stock_quantity - totalUsedInRepairs
                    }
                }
            });
        });
    });
});

// 임시 제품 삭제 API (개발용)
app.delete('/api/admin/delete-product/:id', (req, res) => {
    const { id } = req.params;
    
    const query = 'DELETE FROM products WHERE id = ?';
    db.run(query, [id], function(err) {
        if (err) {
            console.error('제품 삭제 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 삭제에 실패했습니다.' });
        } else if (this.changes === 0) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
        } else {
            console.log(`✅ 제품 ID ${id} 삭제 완료`);
            res.json({ success: true, message: '제품이 삭제되었습니다.' });
        }
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

// 카테고리 목록 조회 API
app.get('/api/categories', (req, res) => {
    const query = 'SELECT * FROM categories ORDER BY main_category, sub_category, detail_category';
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('카테고리 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '카테고리 목록을 불러오는데 실패했습니다.' });
        } else {
            // 데이터베이스의 실제 데이터만 반환
            res.json({ success: true, data: rows });
        }
    });
});

// 카테고리 추가 API
app.post('/api/categories', requireAuth, (req, res) => {
    const { level, parentCategory, subParentCategory, categoryName, categoryDescription } = req.body;
    
    console.log('=== 카테고리 추가 요청 ===');
    console.log('요청 데이터:', req.body);
    console.log('level:', level);
    console.log('parentCategory:', parentCategory);
    console.log('subParentCategory:', subParentCategory);
    console.log('categoryName:', categoryName);
    
    if (!level || !categoryName) {
        return res.status(400).json({ success: false, message: '카테고리 레벨과 이름은 필수입니다.' });
    }
    
    let mainCategory, subCategory, detailCategory;
    
    if (level === 'main') {
        // 대분류 추가
        mainCategory = categoryName;
        subCategory = null;
        detailCategory = null;
    } else if (level === 'sub') {
        // 중분류 추가
        if (!parentCategory) {
            return res.status(400).json({ success: false, message: '상위 카테고리(대분류)를 선택해주세요.' });
        }
        mainCategory = parentCategory;
        subCategory = categoryName;
        detailCategory = null;
    } else if (level === 'detail') {
        // 소분류 추가
        if (!parentCategory || !subParentCategory) {
            return res.status(400).json({ success: false, message: '상위 카테고리와 중분류를 선택해주세요.' });
        }
        mainCategory = parentCategory;
        subCategory = subParentCategory;
        detailCategory = categoryName;
    } else {
        return res.status(400).json({ success: false, message: '올바른 카테고리 레벨을 선택해주세요.' });
    }
    
    // 카테고리 코드 생성
    const code = `${mainCategory}-${subCategory || ''}-${detailCategory || ''}`.replace(/--/g, '-').replace(/-$/, '');
    
    const query = `
        INSERT INTO categories (main_category, sub_category, detail_category, code)
        VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [mainCategory, subCategory, detailCategory, code], function(err) {
        if (err) {
            console.error('카테고리 추가 오류:', err.message);
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ 
                    success: false, 
                    message: `이미 존재하는 카테고리입니다: ${mainCategory} > ${subCategory || ''} > ${detailCategory || ''}` 
                });
            } else {
                res.status(500).json({ success: false, message: '카테고리 추가에 실패했습니다.' });
            }
        } else {
            // 추가된 카테고리 정보와 함께 응답
            res.json({ 
                success: true, 
                message: '카테고리가 성공적으로 추가되었습니다.',
                categoryId: this.lastID,
                category: {
                    main_category: mainCategory,
                    sub_category: subCategory,
                    detail_category: detailCategory,
                    code: code
                }
            });
        }
    });
});

// 카테고리 테이블 재생성 API (개발용)
app.post('/api/admin/recreate-categories-table', requireAuth, (req, res) => {
    const dropQuery = 'DROP TABLE IF EXISTS categories';
    const createQuery = `
        CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            main_category TEXT NOT NULL,
            sub_category TEXT,
            detail_category TEXT,
            code TEXT NOT NULL,
            UNIQUE(main_category, sub_category, detail_category)
        )
    `;
    
    db.run(dropQuery, (err) => {
        if (err) {
            console.error('카테고리 테이블 삭제 오류:', err.message);
            return res.status(500).json({ success: false, message: '테이블 삭제 실패' });
        }
        
        db.run(createQuery, (err) => {
            if (err) {
                console.error('카테고리 테이블 생성 오류:', err.message);
                return res.status(500).json({ success: false, message: '테이블 생성 실패' });
            }
            
            console.log('카테고리 테이블이 성공적으로 재생성되었습니다.');
            res.json({ success: true, message: '카테고리 테이블이 재생성되었습니다.' });
        });
    });
});

// ==================== 요약 상세 내역 API ====================

// 요약 상세 내역 조회 API
app.get('/api/summary-details/:type', requireAuth, (req, res) => {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log(`요약 상세 내역 조회: ${type}, 기간: ${startDate} ~ ${endDate}`);
    
    if (!startDate || !endDate) {
        return res.status(400).json({ 
            success: false, 
            message: '시작일과 종료일을 입력해주세요.' 
        });
    }
    
    let query, params;
    
    switch (type) {
        case 'revenue':
            query = `
                SELECT 
                    p.purchase_date as date,
                    p.purchase_code as code,
                    c.name as customer,
                    pr.name as product,
                    pi.quantity,
                    pi.unit_price as unitPrice,
                    pi.total_price as totalAmount,
                    p.type as status,
                    p.payment_method as paymentMethod
                FROM purchases p
                LEFT JOIN customers c ON p.customer_id = c.id
                LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
                LEFT JOIN products pr ON pi.product_id = pr.id
                WHERE p.type = '판매' 
                AND p.purchase_date BETWEEN ? AND ?
                ORDER BY p.purchase_date DESC
            `;
            params = [startDate, endDate];
            break;
            
        case 'expense':
            query = `
                SELECT 
                    p.purchase_date as date,
                    p.purchase_code as code,
                    c.name as supplier,
                    pi.product_name as product,
                    pi.quantity,
                    pi.unit_price as unitPrice,
                    pi.total_price as totalAmount,
                    p.type as status,
                    p.payment_method as paymentMethod
                FROM purchases p
                LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.type = '구매' 
                AND p.purchase_date BETWEEN ? AND ?
                ORDER BY p.purchase_date DESC
            `;
            params = [startDate, endDate];
            break;
            
        case 'vat':
            query = `
                SELECT 
                    p.purchase_date as date,
                    p.purchase_code as code,
                    p.type,
                    ROUND(p.total_amount / 1.1) as supplyPrice,
                    (p.total_amount - ROUND(p.total_amount / 1.1)) as vatAmount,
                    p.total_amount as totalAmount,
                    '완료' as status
                FROM purchases p
                WHERE p.purchase_date BETWEEN ? AND ?
                ORDER BY p.purchase_date DESC
            `;
            params = [startDate, endDate];
            break;
            
        case 'net':
            query = `
                SELECT 
                    p.purchase_date as date,
                    p.purchase_code as code,
                    p.type,
                    CASE 
                        WHEN p.type = '판매' THEN p.total_amount 
                        ELSE 0 
                    END as revenue,
                    CASE 
                        WHEN p.type = '구매' THEN p.total_amount 
                        ELSE 0 
                    END as expense,
                    CASE 
                        WHEN p.type = '판매' THEN p.total_amount 
                        WHEN p.type = '구매' THEN -p.total_amount 
                        ELSE 0 
                    END as netProfit,
                    CASE 
                        WHEN p.type = '판매' THEN 100
                        WHEN p.type = '구매' THEN -100
                        ELSE 0 
                    END as margin
                FROM purchases p
                WHERE p.purchase_date BETWEEN ? AND ?
                ORDER BY p.purchase_date DESC
            `;
            params = [startDate, endDate];
            break;
            
        default:
            return res.status(400).json({ 
                success: false, 
                message: '올바른 타입을 선택해주세요.' 
            });
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('요약 상세 내역 조회 오류:', err.message);
            res.status(500).json({ 
                success: false, 
                message: '상세 내역을 불러오는데 실패했습니다.' 
            });
        } else {
            // 요약 정보 계산
            const summary = calculateSummaryInfo(rows, type);
            
            res.json({ 
                success: true, 
                data: rows,
                summary: summary
            });
        }
    });
});

// 요약 정보 계산 함수
function calculateSummaryInfo(data, type) {
    const totalAmount = data.reduce((sum, item) => {
        switch (type) {
            case 'revenue':
            case 'expense':
                return sum + (item.totalAmount || 0);
            case 'vat':
                return sum + (item.vatAmount || 0);
            case 'net':
                return sum + (item.netProfit || 0);
            default:
                return sum + (item.totalAmount || 0);
        }
    }, 0);
    
    const totalCount = data.length;
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
    
    return {
        totalAmount: Math.round(totalAmount),
        totalCount: totalCount,
        averageAmount: Math.round(averageAmount)
    };
}

// ==================== 백업/복구 API ====================

// 백업 목록 조회
app.get('/api/backup/list', (req, res) => {
    try {
        const backupList = backupManager.getBackupList();
        res.json({
            success: true,
            data: backupList
        });
    } catch (error) {
        console.error('백업 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 목록을 가져올 수 없습니다.'
        });
    }
});

// JSON 백업 생성
app.post('/api/backup/create/json', async (req, res) => {
    try {
        const result = await backupManager.createJsonBackup();
        res.json({
            success: true,
            message: 'JSON 백업이 생성되었습니다.',
            data: result
        });
    } catch (error) {
        console.error('JSON 백업 생성 오류:', error);
        res.status(500).json({
            success: false,
            error: 'JSON 백업 생성에 실패했습니다.'
        });
    }
});

// SQL 백업 생성
app.post('/api/backup/create/sql', async (req, res) => {
    try {
        const result = await backupManager.createSqlBackup();
        res.json({
            success: true,
            message: 'SQL 백업이 생성되었습니다.',
            data: result
        });
    } catch (error) {
        console.error('SQL 백업 생성 오류:', error);
        res.status(500).json({
            success: false,
            error: 'SQL 백업 생성에 실패했습니다.'
        });
    }
});

// JSON 백업에서 복구
app.post('/api/backup/restore/json', async (req, res) => {
    try {
        const { fileName } = req.body;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                error: '파일명이 필요합니다.'
            });
        }

        const result = await backupManager.restoreFromJson(fileName);
        res.json({
            success: true,
            message: 'JSON 백업에서 복구되었습니다.',
            data: result
        });
    } catch (error) {
        console.error('JSON 복구 오류:', error);
        res.status(500).json({
            success: false,
            error: 'JSON 복구에 실패했습니다: ' + error.message
        });
    }
});

// SQL 백업에서 복구
app.post('/api/backup/restore/sql', async (req, res) => {
    try {
        const { fileName } = req.body;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                error: '파일명이 필요합니다.'
            });
        }

        const result = await backupManager.restoreFromSql(fileName);
        res.json({
            success: true,
            message: 'SQL 백업에서 복구되었습니다.',
            data: result
        });
    } catch (error) {
        console.error('SQL 복구 오류:', error);
        res.status(500).json({
            success: false,
            error: 'SQL 복구에 실패했습니다: ' + error.message
        });
    }
});

// 백업 파일 삭제
app.delete('/api/backup/delete', (req, res) => {
    try {
        const { fileName, type } = req.body;
        
        if (!fileName || !type) {
            return res.status(400).json({
                success: false,
                error: '파일명과 타입이 필요합니다.'
            });
        }

        const result = backupManager.deleteBackup(fileName, type);
        res.json({
            success: result.success,
            message: result.success ? '백업 파일이 삭제되었습니다.' : '파일 삭제에 실패했습니다.',
            data: result
        });
    } catch (error) {
        console.error('백업 파일 삭제 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 파일 삭제에 실패했습니다.'
        });
    }
});

// 자동 백업 스케줄러 시작
app.post('/api/backup/schedule/start', (req, res) => {
    try {
        backupManager.scheduleAutoBackup();
        res.json({
            success: true,
            message: '자동 백업 스케줄러가 시작되었습니다.'
        });
    } catch (error) {
        console.error('자동 백업 스케줄러 시작 오류:', error);
        res.status(500).json({
            success: false,
            error: '자동 백업 스케줄러 시작에 실패했습니다.'
        });
    }
});

// JSON 백업 다운로드
app.get('/api/backup/download/json', (req, res) => {
    try {
        const { fileName } = req.query;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                error: '파일명이 필요합니다.'
            });
        }

        const filePath = path.join(backupManager.jsonBackupDir, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '백업 파일을 찾을 수 없습니다.'
            });
        }

        res.download(filePath, fileName);
    } catch (error) {
        console.error('JSON 백업 다운로드 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 다운로드에 실패했습니다.'
        });
    }
});

// SQL 백업 다운로드
app.get('/api/backup/download/sql', (req, res) => {
    try {
        const { fileName } = req.query;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                error: '파일명이 필요합니다.'
            });
        }

        const filePath = path.join(backupManager.sqlBackupDir, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '백업 파일을 찾을 수 없습니다.'
            });
        }

        res.download(filePath, fileName);
    } catch (error) {
        console.error('SQL 백업 다운로드 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 다운로드에 실패했습니다.'
        });
    }
});

// ==================== 백업 설정 API ====================

// 백업 설정 조회
app.get('/api/backup/config', (req, res) => {
    try {
        const config = backupConfigManager.getConfig();
        const suggestedDirs = backupConfigManager.getSuggestedDirectories();
        
        res.json({
            success: true,
            data: {
                config: config,
                suggestedDirectories: suggestedDirs
            }
        });
    } catch (error) {
        console.error('백업 설정 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 설정을 가져올 수 없습니다.'
        });
    }
});

// 백업 디렉토리 설정
app.post('/api/backup/config/directories', (req, res) => {
    try {
        const { jsonDir, sqlDir } = req.body;
        
        if (!jsonDir || !sqlDir) {
            return res.status(400).json({
                success: false,
                error: 'JSON 디렉토리와 SQL 디렉토리 경로가 필요합니다.'
            });
        }

        // 디렉토리 유효성 검사
        const jsonValidation = backupConfigManager.validateDirectory(jsonDir);
        const sqlValidation = backupConfigManager.validateDirectory(sqlDir);

        if (!jsonValidation.valid) {
            return res.status(400).json({
                success: false,
                error: `JSON 디렉토리 오류: ${jsonValidation.error}`
            });
        }

        if (!sqlValidation.valid) {
            return res.status(400).json({
                success: false,
                error: `SQL 디렉토리 오류: ${sqlValidation.error}`
            });
        }

        // 디렉토리 설정 업데이트
        const success = backupConfigManager.setBackupDirectories(jsonValidation.path, sqlValidation.path);
        
        if (success) {
            // 백업 매니저 재초기화
            const newBackupManager = new BackupRestoreManager(dbPath, backupConfigManager);
            Object.assign(backupManager, newBackupManager);
            
            res.json({
                success: true,
                message: '백업 디렉토리가 설정되었습니다.',
                data: {
                    jsonDir: jsonValidation.path,
                    sqlDir: sqlValidation.path
                }
            });
        } else {
            throw new Error('설정 저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('백업 디렉토리 설정 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 디렉토리 설정에 실패했습니다: ' + error.message
        });
    }
});

// 자동 백업 설정
app.post('/api/backup/config/auto-backup', (req, res) => {
    try {
        const { enabled, time, maxFiles, retentionDays } = req.body;
        
        const success = backupConfigManager.setAutoBackupSettings(
            enabled,
            time,
            maxFiles,
            retentionDays
        );
        
        if (success) {
            res.json({
                success: true,
                message: '자동 백업 설정이 저장되었습니다.'
            });
        } else {
            throw new Error('설정 저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('자동 백업 설정 오류:', error);
        res.status(500).json({
            success: false,
            error: '자동 백업 설정에 실패했습니다: ' + error.message
        });
    }
});

// 압축 설정
app.post('/api/backup/config/compression', (req, res) => {
    try {
        const { enabled } = req.body;
        
        const success = backupConfigManager.setCompressionSettings(enabled);
        
        if (success) {
            res.json({
                success: true,
                message: '압축 설정이 저장되었습니다.'
            });
        } else {
            throw new Error('설정 저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('압축 설정 오류:', error);
        res.status(500).json({
            success: false,
            error: '압축 설정에 실패했습니다: ' + error.message
        });
    }
});

// 클라우드 백업 설정
app.post('/api/backup/config/cloud', (req, res) => {
    try {
        const { enabled, provider, cloudConfig } = req.body;
        
        const success = backupConfigManager.setCloudBackupSettings(enabled, provider, cloudConfig);
        
        if (success) {
            res.json({
                success: true,
                message: '클라우드 백업 설정이 저장되었습니다.'
            });
        } else {
            throw new Error('설정 저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('클라우드 백업 설정 오류:', error);
        res.status(500).json({
            success: false,
            error: '클라우드 백업 설정에 실패했습니다: ' + error.message
        });
    }
});

// 설정 리셋
app.post('/api/backup/config/reset', (req, res) => {
    try {
        const success = backupConfigManager.resetToDefault();
        
        if (success) {
            // 백업 매니저 재초기화
            const newBackupManager = new BackupRestoreManager(dbPath, backupConfigManager);
            Object.assign(backupManager, newBackupManager);
            
            res.json({
                success: true,
                message: '백업 설정이 기본값으로 리셋되었습니다.'
            });
        } else {
            throw new Error('설정 리셋에 실패했습니다.');
        }
    } catch (error) {
        console.error('설정 리셋 오류:', error);
        res.status(500).json({
            success: false,
            error: '설정 리셋에 실패했습니다: ' + error.message
        });
    }
});

// 백업 파일 정리
app.post('/api/backup/cleanup', (req, res) => {
    try {
        const result = backupConfigManager.cleanupOldBackups();
        
        if (result.success) {
            res.json({
                success: true,
                message: `백업 파일 정리가 완료되었습니다. (${result.deletedCount}개 파일 삭제)`
            });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('백업 파일 정리 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 파일 정리에 실패했습니다: ' + error.message
        });
    }
});

// 디렉토리 유효성 검사
app.post('/api/backup/config/validate-directory', (req, res) => {
    try {
        const { directory } = req.body;
        
        if (!directory) {
            return res.status(400).json({
                success: false,
                error: '디렉토리 경로가 필요합니다.'
            });
        }

        const validation = backupConfigManager.validateDirectory(directory);
        
        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        console.error('디렉토리 유효성 검사 오류:', error);
        res.status(500).json({
            success: false,
            error: '디렉토리 유효성 검사에 실패했습니다: ' + error.message
        });
    }
});

// ==================== 백업 설정 API 끝 ====================

// ==================== 백업/복구 API 끝 ====================

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
