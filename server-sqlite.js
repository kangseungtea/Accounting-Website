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
            console.log('데이터베이스에서 사용자 확인 시도');
            // 데이터베이스에서 사용자 확인
            const query = 'SELECT * FROM users WHERE username = ?';
            db.get(query, [username], (err, user) => {
                if (err) {
                    console.error('사용자 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
                } else if (!user) {
                    console.log('사용자를 찾을 수 없음:', username);
                    res.status(401).json({ success: false, message: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
                } else {
                    console.log('사용자 발견, 비밀번호 확인 중');
                    // 비밀번호 확인
                    bcrypt.compare(password, user.password, (err, result) => {
                        if (err) {
                            console.error('비밀번호 확인 오류:', err.message);
                            res.status(500).json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
                        } else if (result) {
                            console.log('비밀번호 확인 성공');
                            req.session.userId = user.id;
                            req.session.username = user.username;
                            res.json({ 
                                success: true, 
                                message: '로그인 성공',
                                user: { id: user.id, username: user.username }
                            });
                        } else {
                            console.log('비밀번호 불일치');
                            res.status(401).json({ success: false, message: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
                        }
                    });
                }
            });
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
    if (req.session.userId) {
        next();
    } else {
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

// 고객 등록 API
app.post('/api/customers', requireAuth, (req, res) => {
    const { name, company, businessNumber, phone, email, address, managementNumber, notes } = req.body;
    
    if (!name || !phone) {
        return res.status(400).json({ success: false, message: '이름과 전화번호는 필수입니다.' });
    }
    
    const query = `
        INSERT INTO customers (name, company, business_number, phone, email, address, management_number, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [name, company, businessNumber, phone, email, address, managementNumber, notes], function(err) {
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

// 구매 이력 등록 API
app.post('/api/purchases', requireAuth, (req, res) => {
    const { customerId, purchaseDate, type, items, paymentMethod, notes } = req.body;
    
    if (!customerId || !purchaseDate || !type || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }
    
    const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    // 구매 코드 생성
    const typeCode = type === '판매' ? 'S' : (type === '매입' ? 'P' : 'O');
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

// 제품 목록 조회 API
app.get('/api/products', requireAuth, (req, res) => {
    const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    
    if (search) {
        query += ` AND (name LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    
    if (category) {
        query += ` AND main_category = ?`;
        params.push(category);
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
                countQuery += ` AND (name LIKE ? OR description LIKE ?)`;
                countParams.push(`%${search}%`, `%${search}%`);
            }
            
            if (category) {
                countQuery += ` AND main_category = ?`;
                countParams.push(category);
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
    
    const query = 'SELECT * FROM products WHERE id = ?';
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
    const { name, description, price, stockQuantity, mainCategory, subCategory, detailCategory, status } = req.body;
    
    if (!name || !price) {
        return res.status(400).json({ success: false, message: '제품명과 가격은 필수입니다.' });
    }
    
    const query = `
        INSERT INTO products (name, description, price, stock_quantity, main_category, sub_category, detail_category, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [name, description, price, stockQuantity, mainCategory, subCategory, detailCategory, status || '활성'], function(err) {
        if (err) {
            console.error('제품 등록 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 등록에 실패했습니다.' });
        } else {
            res.json({ success: true, message: '제품이 등록되었습니다.', productId: this.lastID });
        }
    });
});

// 제품 수정 API
app.put('/api/products/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { name, description, price, stockQuantity, mainCategory, subCategory, detailCategory, status } = req.body;
    
    if (!name || !price) {
        return res.status(400).json({ success: false, message: '제품명과 가격은 필수입니다.' });
    }
    
    const query = `
        UPDATE products 
        SET name = ?, description = ?, price = ?, stock_quantity = ?, main_category = ?, sub_category = ?, detail_category = ?, status = ?
        WHERE id = ?
    `;
    
    db.run(query, [name, description, price, stockQuantity, mainCategory, subCategory, detailCategory, status, id], function(err) {
        if (err) {
            console.error('제품 수정 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 수정에 실패했습니다.' });
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
                    SELECT rp.*, r.device_model, r.problem
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

// 카테고리 목록 조회 API
app.get('/api/categories', (req, res) => {
    const query = 'SELECT * FROM categories ORDER BY main_category, sub_category, detail_category';
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('카테고리 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '카테고리 목록을 불러오는데 실패했습니다.' });
        } else {
            res.json({ success: true, data: rows });
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
