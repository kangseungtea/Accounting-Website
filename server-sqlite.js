const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const domainConfig = require('./domain-config');

const app = express();
const PORT = process.env.PORT || 3000;

// SQLite 데이터베이스 연결
const dbPath = path.join(__dirname, 'data', 'repair_center.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
    } else {
        console.log('SQLite 데이터베이스에 연결되었습니다.');
        initializeDatabase();
    }
});

// 데이터베이스 초기화
function initializeDatabase() {
    const fs = require('fs');
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    
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
app.use(express.json());
app.use(express.static(__dirname)); // 현재 디렉토리의 모든 정적 파일 서빙
app.use(session(domainConfig.sessionConfig));

// 루트 경로 설정
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// HTML 페이지 라우트들
app.get('/customers', (req, res) => {
    res.sendFile(path.join(__dirname, 'customers.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'products.html'));
});

app.get('/customer-detail', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer-detail.html'));
});

app.get('/product-add', (req, res) => {
    res.sendFile(path.join(__dirname, 'product-add.html'));
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
               COALESCE(repair_total.total_repair_cost, 0) as total_repair_cost
        FROM customers c
        LEFT JOIN (
            SELECT customer_id, SUM(total_amount) as total_spent
            FROM purchases
            GROUP BY customer_id
        ) purchase_total ON c.id = purchase_total.customer_id
        LEFT JOIN (
            SELECT customer_id, SUM(total_cost) as total_repair_cost
            FROM repairs
            GROUP BY customer_id
        ) repair_total ON c.id = repair_total.customer_id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
        query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
                countQuery += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
                countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

// 고객 수정 API
app.put('/api/customers/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { name, company, phone, email, address, managementNumber, status, notes } = req.body;
    
    if (!name || !phone) {
        return res.status(400).json({ success: false, message: '이름과 전화번호는 필수입니다.' });
    }
    
    const query = `
        UPDATE customers 
        SET name = ?, company = ?, phone = ?, email = ?, address = ?, 
            management_number = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
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

// 구매 이력 등록 API
app.post('/api/purchases', requireAuth, (req, res) => {
    const { customerId, purchaseDate, type, items, paymentMethod, notes } = req.body;
    
    if (!customerId || !purchaseDate || !type || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }
    
    const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    // 구매 코드 생성
    const typeCode = type === '구매' ? 'S' : (type === '구매매' ? 'P' : 'O');
    const today = new Date();
    const dateStr = today.getFullYear().toString().substr(-2) + 
                    (today.getMonth() + 1).toString().padStart(2, '0') + 
                    today.getDate().toString().padStart(2, '0');
    
    // 순번 생성
    db.get(`SELECT COUNT(*) as count FROM purchases WHERE purchase_code LIKE ?`, 
           [`${typeCode}${dateStr}%`], (err, row) => {
        if (err) {
            console.error('순번 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '구매 코드 생성에 실패했습니다.' });
            return;
        }
        
        const sequence = (row.count + 1).toString().padStart(3, '0');
        const purchaseCode = `${typeCode}${dateStr}${sequence}`;
        
        // 트랜잭션 시작
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // 구매 이력 등록
            const purchaseQuery = `
                INSERT INTO purchases (customer_id, purchase_code, purchase_date, type, total_amount, payment_method, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.run(purchaseQuery, [customerId, purchaseCode, purchaseDate, type, totalAmount, paymentMethod, notes], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    console.error('구매 이력 등록 오류:', err.message);
                    res.status(500).json({ success: false, message: '구매 이력 등록에 실패했습니다.' });
                    return;
                }
                
                const purchaseId = this.lastID;
                
                // 구매 상품 등록
                const itemQuery = `
                    INSERT INTO purchase_items (purchase_id, product_name, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                let completed = 0;
                let hasError = false;
                
                items.forEach((item, index) => {
                    db.run(itemQuery, [purchaseId, item.name, item.quantity, item.unitPrice, item.totalPrice], (err) => {
                        if (err && !hasError) {
                            hasError = true;
                            db.run('ROLLBACK');
                            console.error('구매 상품 등록 오류:', err.message);
                            res.status(500).json({ success: false, message: '구매 상품 등록에 실패했습니다.' });
                            return;
                        }
                        
                        completed++;
                        if (completed === items.length && !hasError) {
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    console.error('트랜잭션 커밋 오류:', err.message);
                                    res.status(500).json({ success: false, message: '구매 이력 저장에 실패했습니다.' });
                                } else {
                                    res.json({ success: true, message: '구매 이력이 등록되었습니다.', purchaseId: purchaseId });
                                }
                            });
                        }
                    });
                });
            });
        });
    });
});

// 제품 코드 중복 검사 API (인증 불필요) - 라우트 순서 중요!
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

// 제품 목록 조회 API
app.get('/api/products', requireAuth, (req, res) => {
    const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT 
            id, product_code, name, brand, main_category, sub_category, detail_category,
            selling_price as price, stock_quantity, description, created_at, updated_at
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
            
            db.get(countQuery, countParams, (err, countRow) => {
                if (err) {
                    console.error('제품 수 조회 오류:', err.message);
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

// 제품 상세 조회 API
app.get('/api/products/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            id, product_code, name, brand, main_category, sub_category, detail_category,
            selling_price as price, stock_quantity, description, created_at, updated_at
        FROM products WHERE id = ?
    `;
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('제품 상세 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 정보를 불러오는데 실패했습니다.' });
        } else if (!row) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
        } else {
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
        description 
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
    
    // 제품 코드가 없으면 자동 생성
    let finalProductCode = productCode;
    if (!finalProductCode) {
        const timestamp = Date.now().toString().slice(-6);
        const categoryCode = mainCategory.substring(0, 2).toUpperCase();
        finalProductCode = `${categoryCode}${timestamp}`;
    }
    
    const query = `
        INSERT INTO products (
            product_code, name, brand, main_category, sub_category, detail_category, 
            selling_price, stock_quantity, description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [
        finalProductCode, 
        name, 
        brand || '', 
        mainCategory, 
        subCategory, 
        detailCategory || '', 
        price || 0, 
        stockQuantity || 0, 
        description || ''
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
                productCode: finalProductCode
            });
        }
    });
});

// 제품 수정 API
app.put('/api/products/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { 
        name, 
        productCode, 
        brand, 
        mainCategory, 
        subCategory, 
        detailCategory, 
        price, 
        stockQuantity, 
        description 
    } = req.body;
    
    if (!name || !mainCategory || !subCategory) {
        return res.status(400).json({ success: false, message: '제품명, 대분류, 중분류는 필수입니다.' });
    }
    
    const query = `
        UPDATE products 
        SET product_code = ?, name = ?, brand = ?, main_category = ?, sub_category = ?, detail_category = ?, 
            selling_price = ?, stock_quantity = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    
    db.run(query, [
        productCode || '', 
        name, 
        brand || '', 
        mainCategory, 
        subCategory, 
        detailCategory || '', 
        price || 0, 
        stockQuantity || 0, 
        description || '', 
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

// 제품 코드 중복 검사 API (인증 불필요) - 새로 작성
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

// 구매 이력 등록 API
app.post('/api/purchases', requireAuth, (req, res) => {
    const { customerId, purchaseCode, type, paymentMethod, totalAmount, items } = req.body;
    
    console.log('=== 구매 요청 분석 ===');
    console.log('구매 요청 데이터:', { customerId, purchaseCode, type, totalAmount });
    console.log('구매 상품 목록:', items);
    console.log('구매 타입 확인:', type, '===', type === '구매');
    
    if (!customerId || !purchaseCode || !type || !totalAmount) {
        return res.status(400).json({ success: false, message: '고객 ID, 구매 코드, 구분, 총 금액은 필수입니다.' });
    }
    
    const query = `
        INSERT INTO purchases (customer_id, purchase_code, type, payment_method, total_amount, purchase_date)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    const params = [customerId, purchaseCode, type, paymentMethod || '', totalAmount];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('구매 이력 등록 오류:', err.message);
            res.status(500).json({ success: false, message: '구매 이력 등록에 실패했습니다.' });
        } else {
            const purchaseId = this.lastID;
            
            // 구매 상품 등록 및 재고 업데이트
            if (items && Array.isArray(items)) {
                items.forEach((item, index) => {
                    if (item.name && item.quantity && item.unitPrice) {
                        // 구매 상품 등록
                        db.run(
                            'INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
                            [purchaseId, item.productId || item.product_id, item.name, item.quantity, item.unitPrice, item.totalPrice || (item.quantity * item.unitPrice)],
                            (err) => {
                                if (err) {
                                    console.error('구매 상품 등록 오류:', err.message);
                                }
                            }
                        );
                        
                        // 구매인 경우 재고 증가
                        const productId = item.productId || item.product_id;
                        console.log(`상품 처리: ${item.name}, productId: ${productId}, type: ${type}`);
                        console.log(`재고 업데이트 조건 확인: type === '구매' = ${type === '구매'}, productId 존재 = ${!!productId}`);
                        if (type === '구매' && productId) {
                            console.log(`재고 업데이트 시도: 제품 ${productId}에 ${item.quantity}개 추가`);
                            db.run(
                                'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
                                [item.quantity, productId],
                                (err) => {
                                    if (err) {
                                        console.error('재고 업데이트 오류:', err.message);
                                    } else {
                                        console.log(`✅ 제품 ${productId} 재고 ${item.quantity}개 증가 완료`);
                                    }
                                }
                            );
                        } else {
                            console.log(`❌ 재고 업데이트 건너뜀: type=${type}, productId=${productId}`);
                        }
                    }
                });
            }
            
            res.json({ success: true, message: '구매 이력이 등록되었습니다.', id: purchaseId });
        }
    });
});

// 구매 이력 조회 API (고객별)
app.get('/api/purchases', requireAuth, (req, res) => {
    const { customerId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT p.*, c.name as customer_name
        FROM purchases p
        JOIN customers c ON p.customer_id = c.id
        WHERE 1=1
    `;
    const params = [];
    
    if (customerId) {
        query += ` AND p.customer_id = ?`;
        params.push(customerId);
    }
    
    query += ` ORDER BY p.purchase_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('구매 이력 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '구매 이력을 불러오는데 실패했습니다.' });
        } else {
            // 구매 상품 정보도 함께 조회
            const purchaseIds = rows.map(row => row.id);
            if (purchaseIds.length > 0) {
                const itemQuery = `
                    SELECT pi.*, p.purchase_code, p.purchase_date, p.type
                    FROM purchase_items pi
                    JOIN purchases p ON pi.purchase_id = p.id
                    WHERE pi.purchase_id IN (${purchaseIds.map(() => '?').join(',')})
                    ORDER BY p.purchase_date DESC, pi.id
                `;
                
                db.all(itemQuery, purchaseIds, (err, items) => {
                    if (err) {
                        console.error('구매 상품 조회 오류:', err.message);
                        res.status(500).json({ success: false, message: '구매 상품을 불러오는데 실패했습니다.' });
                    } else {
                        // 구매 이력에 상품 정보 추가
                        const purchasesWithItems = rows.map(purchase => ({
                            ...purchase,
                            items: items.filter(item => item.purchase_id === purchase.id)
                        }));
                        
                        res.json({ success: true, data: purchasesWithItems });
                    }
                });
            } else {
                res.json({ success: true, data: rows });
            }
        }
    });
});

// 수리 이력 조회 API (고객별)
app.get('/api/repairs', requireAuth, (req, res) => {
    const { customerId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT r.*, c.name as customer_name
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

// 구매 이력 삭제 API
app.delete('/api/purchases/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    // 먼저 구매 이력이 존재하는지 확인
    const checkQuery = 'SELECT * FROM purchases WHERE id = ?';
    db.get(checkQuery, [id], (err, purchase) => {
        if (err) {
            console.error('구매 이력 확인 오류:', err.message);
            res.status(500).json({ success: false, message: '구매 이력 확인에 실패했습니다.' });
        } else if (!purchase) {
            res.status(404).json({ success: false, message: '구매 이력을 찾을 수 없습니다.' });
        } else {
            // 트랜잭션으로 구매 이력과 관련 상품 삭제
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                // 구매 상품 삭제
                db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [id], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        console.error('구매 상품 삭제 오류:', err.message);
                        res.status(500).json({ success: false, message: '구매 상품 삭제에 실패했습니다.' });
                        return;
                    }
                    
                    // 구매 이력 삭제
                    db.run('DELETE FROM purchases WHERE id = ?', [id], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            console.error('구매 이력 삭제 오류:', err.message);
                            res.status(500).json({ success: false, message: '구매 이력 삭제에 실패했습니다.' });
                        } else {
                            db.run('COMMIT', (err) => {
                                if (err) {
                                    console.error('트랜잭션 커밋 오류:', err.message);
                                    res.status(500).json({ success: false, message: '구매 이력 삭제에 실패했습니다.' });
                                } else {
                                    res.json({ success: true, message: '구매 이력이 삭제되었습니다.' });
                                }
                            });
                        }
                    });
                });
            });
        }
    });
});

// 수리 이력 등록 API
app.post('/api/repairs', requireAuth, (req, res) => {
    const { customerId, deviceModel, problem, solution, status, warranty, technician, totalCost, vatOption, parts, labor } = req.body;
    
    if (!customerId || !deviceModel || !problem) {
        return res.status(400).json({ success: false, message: '고객 ID, 모델명, 문제는 필수입니다.' });
    }
    
    const query = `
        INSERT INTO repairs (customer_id, device_model, problem, solution, status, warranty, technician, total_cost, vat_option, repair_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    const params = [customerId, deviceModel, problem, solution || '', status || '진행중', 
                   warranty || '', technician || '', totalCost || 0, vatOption || 'included'];
    
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

// 수리 이력 상세 조회 API
app.get('/api/repairs/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    console.log(`수리 이력 상세 조회 요청, ID: ${id}`);
    
    const query = 'SELECT * FROM repairs WHERE id = ?';
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('수리 이력 상세 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 이력 정보를 불러오는데 실패했습니다.' });
        } else if (!row) {
            res.status(404).json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
        } else {
            console.log('수리 이력 기본 정보:', row);
            
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
    const { deviceModel, problem, solution, status, warranty, technician, totalCost, vatOption, parts, labor } = req.body;
    
    if (!deviceModel || !problem) {
        return res.status(400).json({ success: false, message: '모델명과 문제는 필수입니다.' });
    }
    
    const query = `
        UPDATE repairs 
        SET device_model = ?, problem = ?, solution = ?, status = ?, warranty = ?, 
            technician = ?, total_cost = ?, vat_option = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const params = [deviceModel, problem, solution || '', status || '진행중', 
                   warranty || '', technician || '', totalCost || 0, vatOption || 'included', id];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('수리 이력 수정 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 이력 수정에 실패했습니다.' });
        } else if (this.changes === 0) {
            res.status(404).json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
        } else {
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

// 구매 코드 생성 API
app.get('/api/purchases/generate-code', requireAuth, (req, res) => {
    const { type } = req.query;
    
    // 구매 코드 생성 로직
    const timestamp = Date.now();
    const typeCode = type === '판매' ? 'S' : type === '구매매' ? 'P' : type === '선출고' ? 'O' : 'U';
    const code = `PUR${typeCode}${timestamp}`;
    
    res.json({ success: true, code: code });
});

// 제품별 구매 이력 조회 API (구매/판매 + 수리 부품 사용 내역 포함)
app.get('/api/products/:id/purchases', requireAuth, (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // 제품 정보 먼저 확인
    const productQuery = 'SELECT * FROM products WHERE id = ?';
    db.get(productQuery, [id], (err, product) => {
        if (err) {
            console.error('제품 확인 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 확인에 실패했습니다.' });
        } else if (!product) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
        } else {
            console.log(`제품별 이력 조회 시작, 제품명: ${product.name}`);
            
            // 1. 구매/판매 이력 조회
            const purchaseQuery = `
                SELECT p.*, c.name as customer_name, pi.product_name, pi.quantity, pi.unit_price, pi.total_price,
                       '구매/판매' as source_type
                FROM purchases p
                JOIN customers c ON p.customer_id = c.id
                JOIN purchase_items pi ON p.id = pi.purchase_id
                WHERE pi.product_name = ?
                ORDER BY p.purchase_date DESC
            `;
            
            // 2. 수리 부품 사용 이력 조회
            const repairQuery = `
                SELECT r.id, r.repair_date as purchase_date, r.device_model, r.problem, r.solution,
                       r.total_cost as total_amount, r.status, r.technician, r.warranty,
                       c.name as customer_name, rp.name as product_name, rp.quantity, 
                       rp.unit_price, rp.total_price,
                       '수리부품' as source_type
                FROM repairs r
                JOIN customers c ON r.customer_id = c.id
                JOIN repair_parts rp ON r.id = rp.repair_id
                WHERE rp.product_id = ? OR rp.name = ?
                ORDER BY r.repair_date DESC
            `;
            
            // 두 쿼리를 병렬로 실행
            db.all(purchaseQuery, [product.name], (err, purchaseRows) => {
                if (err) {
                    console.error('구매 이력 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '구매 이력을 불러오는데 실패했습니다.' });
                    return;
                }
                
                db.all(repairQuery, [product.id, product.name], (err, repairRows) => {
                    if (err) {
                        console.error('수리 부품 이력 조회 오류:', err.message);
                        res.status(500).json({ success: false, message: '수리 부품 이력을 불러오는데 실패했습니다.' });
                        return;
                    }
                    
                    // 두 결과를 합치고 날짜순으로 정렬
                    const allRows = [...purchaseRows, ...repairRows]
                        .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
                        .slice(offset, offset + parseInt(limit));
                    
                    console.log(`제품별 이력 조회 완료: 구매 ${purchaseRows.length}개, 수리 ${repairRows.length}개, 총 ${allRows.length}개`);
                    
                    // 전체 개수 계산
                    const totalCount = purchaseRows.length + repairRows.length;
                    const totalPages = Math.ceil(totalCount / limit);
                    
                    res.json({
                        success: true,
                        data: allRows,
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: totalPages,
                            totalItems: totalCount,
                            itemsPerPage: parseInt(limit)
                        }
                    });
                });
            });
        }
    });
});

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
            // 데이터베이스에 카테고리가 없거나 잘못된 데이터가 있으면 기본 데이터 사용
            const defaultData = getDefaultCategoryData();
            const validMainCategories = Object.keys(defaultData);
            
            // 데이터베이스 데이터가 유효한지 확인
            const hasValidData = rows.some(row => 
                validMainCategories.includes(row.main_category) && 
                row.sub_category && 
                row.detail_category
            );
            
            if (rows.length === 0 || !hasValidData) {
                // 기본 데이터를 배열 형태로 변환하여 반환
                const categoryArray = [];
                
                Object.keys(defaultData).forEach(mainCategory => {
                    Object.keys(defaultData[mainCategory]).forEach(subCategory => {
                        defaultData[mainCategory][subCategory].forEach(detailCategory => {
                            categoryArray.push({
                                main_category: mainCategory,
                                sub_category: subCategory,
                                detail_category: detailCategory,
                                code: `${mainCategory.substring(0, 2)}${subCategory.substring(0, 2)}${detailCategory.substring(0, 2)}`.toUpperCase()
                            });
                        });
                    });
                });
                
                res.json({ success: true, data: categoryArray });
            } else {
                // 유효한 데이터만 필터링하여 반환
                const validRows = rows.filter(row => 
                    validMainCategories.includes(row.main_category) && 
                    row.sub_category && 
                    row.detail_category
                );
                res.json({ success: true, data: validRows });
            }
        }
    });
});

// 카테고리 추가 API
app.post('/api/categories', requireAuth, (req, res) => {
    const { level, parentCategory, subParentCategory, categoryName, categoryDescription } = req.body;
    
    if (!level || !categoryName) {
        return res.status(400).json({ success: false, message: '카테고리 레벨과 이름은 필수입니다.' });
    }
    
    let mainCategory, subCategory, detailCategory;
    
    if (level === 'main') {
        // 대분류 추가
        mainCategory = categoryName;
        subCategory = '';
        detailCategory = '';
    } else if (level === 'sub') {
        // 중분류 추가
        if (!parentCategory) {
            return res.status(400).json({ success: false, message: '상위 카테고리(대분류)를 선택해주세요.' });
        }
        mainCategory = parentCategory;
        subCategory = categoryName;
        detailCategory = '';
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
    const code = `${mainCategory}-${subCategory}-${detailCategory}`.replace(/--/g, '-').replace(/-$/, '');
    
    const query = `
        INSERT INTO categories (main_category, sub_category, detail_category, code)
        VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [mainCategory, subCategory, detailCategory, code], function(err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(400).json({ success: false, message: '이미 존재하는 카테고리입니다.' });
            } else {
                console.error('카테고리 추가 오류:', err.message);
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

// 서버 시작
const config = domainConfig.getCurrentConfig();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
    // 프로덕션 환경: HTTPS 서버
    const { createHttpsServer } = require('./deploy-config');
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
