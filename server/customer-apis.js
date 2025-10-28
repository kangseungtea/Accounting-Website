const express = require('express');

/**
 * 고객 관리 API 라우터
 * - 고객 목록 조회 (페이징, 검색, 필터링)
 * - 고객 상세 조회
 * - 고객 추가
 * - 고객 수정
 * - 고객 삭제
 */
const router = express.Router();

// requireAuth 미들웨어를 가져오기 위한 함수
const getRequireAuth = () => {
    try {
        const authApis = require('./auth-apis');
        return authApis.requireAuth;
    } catch (error) {
        console.error('requireAuth 미들웨어를 가져올 수 없습니다:', error.message);
        return (req, res, next) => {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
            }
            next();
        };
    }
};

/**
 * 고객 목록 조회 API
 * GET /api/customers
 */
router.get('/api/customers', getRequireAuth(), (req, res) => {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (status) {
        query += ` AND c.status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY c.registration_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    // 전체 개수 조회
    let countQuery = `
        SELECT COUNT(*) as total
        FROM customers c
        WHERE 1=1
    `;
    
    const countParams = [];
    
    if (search) {
        countQuery += ` AND (c.name LIKE ? OR c.company LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (status) {
        countQuery += ` AND c.status = ?`;
        countParams.push(status);
    }
    
    db.get(countQuery, countParams, (err, countResult) => {
        if (err) {
            console.error('고객 개수 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '고객 개수 조회에 실패했습니다.' });
            return;
        }
        
        const total = countResult.total;
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('고객 목록 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '고객 목록을 불러오는데 실패했습니다.' });
            } else {
                    res.json({
                        success: true,
                        data: rows,
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: Math.ceil(total / limit),
                            totalItems: total,
                            itemsPerPage: parseInt(limit)
                        }
                    });
            }
        });
    });
});

/**
 * 고객 상세 조회 API
 * GET /api/customers/:id
 */
router.get('/api/customers/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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

/**
 * 고객 추가 API
 * POST /api/customers
 */
router.post('/api/customers', getRequireAuth(), (req, res) => {
    const { name, company, businessNumber, phone, email, address, managementNumber, notes } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    if (!name || !phone) {
        return res.status(400).json({ success: false, message: '이름과 전화번호는 필수입니다.' });
    }
    
    // 관리번호 자동 생성 (제공되지 않은 경우)
    const generateManagementNumber = (callback) => {
        if (managementNumber && managementNumber.trim()) {
            // 사용자가 제공한 관리번호 사용
            callback(null, managementNumber.trim());
        } else {
            // 자동 생성
            const query = 'SELECT MAX(CAST(SUBSTR(management_number, 2) AS INTEGER)) as max_num FROM customers WHERE management_number LIKE "C%"';
            db.get(query, [], (err, result) => {
                if (err) {
                    callback(err);
                } else {
                    const nextNum = (result?.max_num || 0) + 1;
                    const generatedNumber = `C${nextNum.toString().padStart(6, '0')}`;
                    callback(null, generatedNumber);
                }
            });
        }
    };
    
    generateManagementNumber((err, finalManagementNumber) => {
        if (err) {
            console.error('관리번호 생성 오류:', err.message);
            res.status(500).json({ success: false, message: '관리번호 생성에 실패했습니다.' });
            return;
        }
        
        const query = `
            INSERT INTO customers (name, company, business_number, phone, email, address, management_number, notes, registration_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        const params = [name, company || '', businessNumber || '', phone, email || '', address || '', finalManagementNumber, notes || ''];
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('고객 추가 오류:', err.message);
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    res.status(400).json({ success: false, message: '이미 존재하는 전화번호입니다.' });
                } else {
                    res.status(500).json({ success: false, message: '고객 추가에 실패했습니다.' });
                }
            } else {
                res.json({
                    success: true,
                    message: '고객이 성공적으로 추가되었습니다.',
                    customerId: this.lastID,
                    managementNumber: finalManagementNumber
                });
            }
        });
    });
});

/**
 * 고객 수정 API
 * PUT /api/customers/:id
 */
router.put('/api/customers/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const { name, company, phone, email, address, managementNumber, status, notes } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    // 디버깅: 요청 데이터 확인
    console.log('🔧 고객 수정 요청 받음 - ID:', id);
    console.log('📋 요청 데이터:', req.body);
    console.log('🔍 managementNumber 값:', managementNumber);
    
    if (!name || !phone) {
        return res.status(400).json({ success: false, message: '이름과 전화번호는 필수입니다.' });
    }
    
    const query = `
        UPDATE customers 
        SET name = ?, company = ?, phone = ?, email = ?, address = ?, management_number = ?, status = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
    `;
    
    const params = [name, company || '', phone, email || '', address || '', managementNumber || '', status || '활성', notes || '', id];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('고객 수정 오류:', err.message);
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(400).json({ success: false, message: '이미 존재하는 전화번호입니다.' });
            } else {
                res.status(500).json({ success: false, message: '고객 수정에 실패했습니다.' });
            }
        } else if (this.changes === 0) {
            res.status(404).json({ success: false, message: '고객을 찾을 수 없습니다.' });
        } else {
            console.log('✅ 고객 수정 완료 - ID:', id);
            res.json({
                success: true,
                message: '고객 정보가 성공적으로 수정되었습니다.',
                changes: this.changes
            });
        }
    });
});

/**
 * 고객 삭제 API
 * DELETE /api/customers/:id
 */
router.delete('/api/customers/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    // 먼저 고객이 존재하는지 확인
    const checkQuery = 'SELECT * FROM customers WHERE id = ?';
    db.get(checkQuery, [id], (err, customer) => {
        if (err) {
            console.error('고객 확인 오류:', err.message);
            res.status(500).json({ success: false, message: '고객 확인에 실패했습니다.' });
        } else if (!customer) {
            res.status(404).json({ success: false, message: '고객을 찾을 수 없습니다.' });
        } else {
            // 고객 삭제
            const deleteQuery = 'DELETE FROM customers WHERE id = ?';
            db.run(deleteQuery, [id], function(err) {
                if (err) {
                    console.error('고객 삭제 오류:', err.message);
                    res.status(500).json({ success: false, message: '고객 삭제에 실패했습니다.' });
                } else {
                    res.json({
                        success: true,
                        message: '고객이 성공적으로 삭제되었습니다.',
                        deletedId: parseInt(id)
                    });
                }
            });
        }
    });
});

module.exports = router;
