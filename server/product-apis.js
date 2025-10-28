const express = require('express');
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
 * 제품 목록 조회 API
 * GET /api/products
 */
router.get('/api/products', getRequireAuth(), (req, res) => {
    const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
    const offset = (page - 1) * limit;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
                    const total = countRow.total;
                    const totalPages = Math.ceil(total / limit);
                    
                    res.json({
                        success: true,
                        data: rows,
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: totalPages,
                            totalItems: total,
                            itemsPerPage: parseInt(limit)
                        }
                    });
                }
            });
        }
    });
});

/**
 * 제품 상세 조회 API
 * GET /api/products/:id
 */
router.get('/api/products/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
            res.json({ success: true, data: row });
        }
    });
});

/**
 * 제품 추가 API
 * POST /api/products
 */
router.post('/api/products', getRequireAuth(), (req, res) => {
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
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    if (!name || !productCode) {
        return res.status(400).json({ success: false, message: '제품명과 제품코드는 필수입니다.' });
    }
    
    // 제품 코드 중복 확인
    const checkQuery = 'SELECT id FROM products WHERE product_code = ?';
    db.get(checkQuery, [productCode], (err, existingProduct) => {
        if (err) {
            console.error('제품 코드 중복 확인 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 코드 확인에 실패했습니다.' });
        } else if (existingProduct) {
            res.status(400).json({ success: false, message: '이미 존재하는 제품 코드입니다.' });
        } else {
            const query = `
                INSERT INTO products (
                    product_code, name, brand, main_category, sub_category, detail_category,
                    selling_price, stock_quantity, description, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `;
            
            const params = [
                productCode, name, brand || '', mainCategory || '', subCategory || '', detailCategory || '',
                price || 0, stockQuantity || 0, description || '', status || '정품'
            ];
            
            db.run(query, params, function(err) {
                if (err) {
                    console.error('제품 등록 오류:', err.message);
                    res.status(500).json({ success: false, message: '제품 등록에 실패했습니다.' });
                } else {
                    res.json({ success: true, message: '제품이 등록되었습니다.', productId: this.lastID });
                }
            });
        }
    });
});

/**
 * 제품 수정 API
 * PUT /api/products/:id
 */
router.put('/api/products/:id', getRequireAuth(), (req, res) => {
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
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    if (!name) {
        return res.status(400).json({ success: false, message: '제품명은 필수입니다.' });
    }
    
    const query = `
        UPDATE products 
        SET name = ?, brand = ?, main_category = ?, sub_category = ?, detail_category = ?,
            selling_price = ?, stock_quantity = ?, description = ?, status = ?, updated_at = datetime('now')
        WHERE id = ?
    `;
    
    const params = [
        name, brand || '', mainCategory || '', subCategory || '', detailCategory || '',
        price || 0, stockQuantity || 0, description || '', status || '정품', id
    ];
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('제품 수정 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 정보 수정에 실패했습니다.' });
        } else if (this.changes === 0) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
        } else {
            res.json({ success: true, message: '제품 정보가 수정되었습니다.' });
        }
    });
});

/**
 * 제품 삭제 API
 * DELETE /api/products/:id
 */
router.delete('/api/products/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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

/**
 * 제품 구매 이력 조회 API
 * GET /api/products/:id/purchases
 */
router.get('/api/products/:id/purchases', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    // 제품 정보 조회
    const productQuery = 'SELECT * FROM products WHERE id = ?';
    db.get(productQuery, [id], (err, product) => {
        if (err) {
            console.error('제품 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 정보를 불러오는데 실패했습니다.' });
        } else if (!product) {
            res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
        } else {
            // 구매 이력 조회
            const purchasesQuery = `
                SELECT p.*, pi.quantity, pi.unit_price, pi.total_price, c.name as customer_name, c.company
                FROM purchases p
                JOIN purchase_items pi ON p.id = pi.purchase_id
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE pi.product_id = ? OR pi.product_name = ?
                ORDER BY p.purchase_date DESC
            `;
            
            db.all(purchasesQuery, [id, product.name], (err, purchases) => {
                if (err) {
                    console.error('구매 이력 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '구매 이력을 불러오는데 실패했습니다.' });
                } else {
                    res.json({ 
                        success: true, 
                        data: purchases
                    });
                }
            });
        }
    });
});

module.exports = router;
