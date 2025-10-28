const express = require('express');
const router = express.Router();

/**
 * 구매 관리 API 라우터
 * 
 * 포함된 API:
 * - POST /api/purchases - 구매 이력 추가
 * - POST /api/purchases/generate-code - 구매 코드 생성
 * - GET /api/purchases - 구매 이력 조회
 * - GET /api/purchases/product-history - 특정 상품의 구매 이력 조회
 * - GET /api/purchases/:id - 구매 이력 상세 조회
 * - PUT /api/purchases/:id - 구매 이력 수정
 * - PUT /api/purchases/:id/product - 특정 상품 구매 수정
 * - DELETE /api/purchases/:id/product - 개별 상품 삭제
 * - DELETE /api/purchases/:id - 구매 이력 삭제
 * - POST /api/purchases/return - 상품 반품
 * - DELETE /api/admin/drop-purchase-tables - 구매 관련 테이블 삭제 (관리자 전용)
 */

/**
 * requireAuth 미들웨어를 동적으로 가져오는 함수
 */
function getRequireAuth() {
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
}

/**
 * 구매 이력 추가 API
 * POST /api/purchases
 */
router.post('/api/purchases', getRequireAuth(), (req, res) => {
    const { customerId, purchaseCode, purchaseDate, type, items, paymentMethod, taxOption, notes } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
                        // 구매 내역을 Transactions 테이블에 저장 (type이 '구매'인 경우)
                        if (type === '구매') {
                            // 각 상품별로 Transactions에 기록
                            const insertTransaction = db.prepare('INSERT INTO transactions (transaction_date, transaction_type, reference_type, reference_id, customer_id, product_id, amount, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                            
                            items.forEach(item => {
                                const itemTotal = item.quantity * item.unitPrice;
                                insertTransaction.run([
                                    purchaseDate,
                                    'PURCHASE',
                                    'purchase',
                                    purchaseCode,
                                    customerId,
                                    item.productId || null,
                                    -itemTotal, // 구매는 음수로 기록
                                    `${item.productName} - 구매`
                                ]);
                            });
                            
                            insertTransaction.finalize((err) => {
                                if (err) {
                                    console.error('Transactions 테이블 저장 오류:', err.message);
                                }
                            });
                        }
                        
                        res.json({ success: true, message: '구매 이력이 성공적으로 추가되었습니다.', data: { id: purchaseId } });
                    }
                });
            }
        );
    });
    }
});

/**
 * 구매 코드 생성 API
 * POST /api/purchases/generate-code
 */
router.post('/api/purchases/generate-code', getRequireAuth(), (req, res) => {
    const { type } = req.body;
    const prefix = type === '구매' ? 'P' : 'S';
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const code = `${prefix}${timestamp}${random}`;
    
    res.json({ success: true, code });
});

/**
 * 구매 이력 조회 API
 * GET /api/purchases
 */
router.get('/api/purchases', getRequireAuth(), (req, res) => {
    const { customerId, page = 1, limit = 1000 } = req.query;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    const offset = (page - 1) * limit;
    
    // 먼저 구매 이력 조회
    let purchaseQuery = `
        SELECT p.*, c.name as customer_name
        FROM purchases p
        LEFT JOIN customers c ON p.customer_id = c.id
    `;
    
    let purchaseParams = [];
    
    if (customerId) {
        purchaseQuery += ' WHERE p.customer_id = ?';
        purchaseParams.push(customerId);
    }
    
    purchaseQuery += ' ORDER BY p.purchase_date DESC';
    
    if (limit && limit !== 'all') {
        purchaseQuery += ' LIMIT ? OFFSET ?';
        purchaseParams.push(parseInt(limit), offset);
    }
    
    db.all(purchaseQuery, purchaseParams, (err, purchases) => {
        if (err) {
            console.error('구매 이력 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '구매 이력 조회에 실패했습니다.' });
            return;
        }
        
        if (purchases.length === 0) {
            res.json({ success: true, data: [], count: 0 });
            return;
        }
        
        // 각 구매의 상품 정보 조회
        const purchaseIds = purchases.map(p => p.id);
        const placeholders = purchaseIds.map(() => '?').join(',');
        
        const itemsQuery = `
            SELECT * FROM purchase_items 
            WHERE purchase_id IN (${placeholders})
            ORDER BY purchase_id, id
        `;
        
        db.all(itemsQuery, purchaseIds, (err, items) => {
            if (err) {
                console.error('구매 상품 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '구매 상품 조회에 실패했습니다.' });
                return;
            }
            
            // 구매별로 상품 정보 그룹화
            const itemsByPurchase = {};
            items.forEach(item => {
                if (!itemsByPurchase[item.purchase_id]) {
                    itemsByPurchase[item.purchase_id] = [];
                }
                itemsByPurchase[item.purchase_id].push(item);
            });
            
            // 각 구매에 상품 정보 추가
            purchases.forEach(purchase => {
                purchase.items = itemsByPurchase[purchase.id] || [];
                // 기존 products 필드도 유지 (호환성을 위해)
                purchase.products = purchase.items.map(item => 
                    `${item.product_name} (${item.quantity}개)`
                ).join(', ');
            });
            
            res.json({ success: true, data: purchases, count: purchases.length });
        });
    });
});

/**
 * 특정 상품의 구매 이력 조회 API
 * GET /api/purchases/product-history
 */
router.get('/api/purchases/product-history', getRequireAuth(), (req, res) => {
    const { productName } = req.query;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    if (!productName) {
        res.status(400).json({ success: false, message: '상품명이 필요합니다.' });
        return;
    }
    
    const query = `
        SELECT p.*, c.name as customer_name, pi.quantity, pi.unit_price, pi.total_price
        FROM purchases p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
        WHERE pi.product_name = ?
        ORDER BY p.purchase_date DESC
    `;
    
    db.all(query, [productName], (err, rows) => {
        if (err) {
            console.error('상품 구매 이력 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '상품 구매 이력 조회에 실패했습니다.' });
            return;
        }
        
        res.json({ success: true, data: rows });
    });
});

/**
 * 구매 이력 상세 조회 API
 * GET /api/purchases/:id
 */
router.get('/api/purchases/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
        
        // 구매 상품 목록 조회
        const itemsQuery = 'SELECT * FROM purchase_items WHERE purchase_id = ?';
        db.all(itemsQuery, [id], (err, items) => {
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

/**
 * 구매 이력 수정 API
 * PUT /api/purchases/:id
 */
router.put('/api/purchases/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const { purchase_date, type, payment_method, status, tax_option, notes } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
            res.status(404).json({ success: false, message: '수정할 구매 이력을 찾을 수 없습니다.' });
            return;
        }
        
        res.json({ success: true, message: '구매 이력이 성공적으로 수정되었습니다.' });
    });
});

/**
 * 특정 상품 구매 수정 API
 * PUT /api/purchases/:id/product
 */
router.put('/api/purchases/:id/product', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const { originalProductName, productName, quantity, unitPrice, totalPrice } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    // 먼저 해당 구매의 상품 정보를 업데이트
    const updateProductQuery = `
        UPDATE purchase_items 
        SET product_name = ?, quantity = ?, unit_price = ?, total_price = ?
        WHERE purchase_id = ? AND product_name = ?
    `;
    
    db.run(updateProductQuery, [productName, quantity, unitPrice, totalPrice, id, originalProductName], function(err) {
        if (err) {
            console.error('상품 정보 수정 오류:', err.message);
            res.status(500).json({ success: false, message: '상품 정보 수정에 실패했습니다.' });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ success: false, message: '수정할 상품을 찾을 수 없습니다.' });
            return;
        }
        
        // 구매 총액 재계산
        const recalculateQuery = 'SELECT SUM(total_price) as newTotal FROM purchase_items WHERE purchase_id = ?';
        db.get(recalculateQuery, [id], (err, result) => {
            if (err) {
                console.error('총액 재계산 오류:', err.message);
                res.status(500).json({ success: false, message: '총액 재계산에 실패했습니다.' });
                return;
            }
            
            // 구매 총액 업데이트
            const updateTotalQuery = 'UPDATE purchases SET total_amount = ? WHERE id = ?';
            db.run(updateTotalQuery, [result.newTotal || 0, id], (err) => {
                if (err) {
                    console.error('총액 업데이트 오류:', err.message);
                    res.status(500).json({ success: false, message: '총액 업데이트에 실패했습니다.' });
                    return;
                }
                
                res.json({ success: true, message: '상품 정보가 성공적으로 수정되었습니다.' });
            });
        });
    });
});

/**
 * 개별 상품 삭제 API
 * DELETE /api/purchases/:id/product
 */
router.delete('/api/purchases/:id/product', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const { productName } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    // 먼저 해당 상품을 삭제
    const deleteProductQuery = 'DELETE FROM purchase_items WHERE purchase_id = ? AND product_name = ?';
    
    db.run(deleteProductQuery, [id, productName], function(err) {
        if (err) {
            console.error('상품 삭제 오류:', err.message);
            res.status(500).json({ success: false, message: '상품 삭제에 실패했습니다.' });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ success: false, message: '삭제할 상품을 찾을 수 없습니다.' });
            return;
        }
        
        // 구매 총액 재계산
        const recalculateQuery = 'SELECT SUM(total_price) as newTotal FROM purchase_items WHERE purchase_id = ?';
        db.get(recalculateQuery, [id], (err, result) => {
            if (err) {
                console.error('총액 재계산 오류:', err.message);
                res.status(500).json({ success: false, message: '총액 재계산에 실패했습니다.' });
                return;
            }
            
            // 구매 총액 업데이트
            const updateTotalQuery = 'UPDATE purchases SET total_amount = ? WHERE id = ?';
            db.run(updateTotalQuery, [result.newTotal || 0, id], (err) => {
                if (err) {
                    console.error('총액 업데이트 오류:', err.message);
                    res.status(500).json({ success: false, message: '총액 업데이트에 실패했습니다.' });
                    return;
                }
                
                res.json({ success: true, message: '상품이 성공적으로 삭제되었습니다.' });
            });
        });
    });
});

/**
 * 구매 이력 삭제 API
 * DELETE /api/purchases/:id
 */
router.delete('/api/purchases/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    db.serialize(() => {
        // 구매 상품들 먼저 삭제
        db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [id], (err) => {
            if (err) {
                console.error('구매 상품 삭제 오류:', err.message);
                res.status(500).json({ success: false, message: '구매 상품 삭제에 실패했습니다.' });
                return;
            }
            
            // 구매 이력 삭제
            db.run('DELETE FROM purchases WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('구매 이력 삭제 오류:', err.message);
                    res.status(500).json({ success: false, message: '구매 이력 삭제에 실패했습니다.' });
                    return;
                }
                
                if (this.changes === 0) {
                    res.status(404).json({ success: false, message: '삭제할 구매 이력을 찾을 수 없습니다.' });
                    return;
                }
                
                res.json({ success: true, message: '구매 이력이 성공적으로 삭제되었습니다.' });
            });
        });
    });
});

/**
 * 상품 반품 API
 * POST /api/purchases/return
 */
router.post('/api/purchases/return', getRequireAuth(), (req, res) => {
    const { purchaseId, originalProductName, productName, quantity, unitPrice, totalPrice, reason, memo, customerId } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    if (!purchaseId || !productName || !quantity || unitPrice === undefined) {
        return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }
    
    // 반품 코드 생성
    const returnCode = `R${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    db.serialize(() => {
        // 반품 이력 추가
        db.run(
            'INSERT INTO purchases (customer_id, purchase_code, purchase_date, type, total_amount, payment_method, tax_option, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [customerId, returnCode, new Date().toISOString().split('T')[0], '반품', totalPrice, '현금', 'included', `반품사유: ${reason || '없음'}, 메모: ${memo || '없음'}`],
            function(err) {
                if (err) {
                    console.error('반품 이력 추가 오류:', err.message);
                    res.status(500).json({ success: false, message: '반품 이력 추가에 실패했습니다.' });
                    return;
                }
                
                const returnPurchaseId = this.lastID;
                
                // 반품 상품 추가
                db.run(
                    'INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
                    [returnPurchaseId, null, productName, quantity, unitPrice, totalPrice],
                    function(err) {
                        if (err) {
                            console.error('반품 상품 추가 오류:', err.message);
                            res.status(500).json({ success: false, message: '반품 상품 추가에 실패했습니다.' });
                            return;
                        }
                        
                        res.json({ 
                            success: true, 
                            message: '반품이 성공적으로 처리되었습니다.', 
                            data: { 
                                returnPurchaseId: returnPurchaseId,
                                returnCode: returnCode
                            } 
                        });
                    }
                );
            }
        );
    });
});

/**
 * 구매 관련 테이블 삭제 API (관리자 전용)
 * DELETE /api/admin/drop-purchase-tables
 */
router.delete('/api/admin/drop-purchase-tables', getRequireAuth(), (req, res) => {
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    // 관리자 권한 확인
    if (req.session.userId !== 'admin') {
        return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    
    db.serialize(() => {
        // purchase_items 테이블 삭제
        db.run('DROP TABLE IF EXISTS purchase_items', (err) => {
            if (err) {
                console.error('purchase_items 테이블 삭제 오류:', err.message);
                res.status(500).json({ success: false, message: 'purchase_items 테이블 삭제에 실패했습니다.' });
                return;
            }
            
            // purchases 테이블 삭제
            db.run('DROP TABLE IF EXISTS purchases', (err) => {
                if (err) {
                    console.error('purchases 테이블 삭제 오류:', err.message);
                    res.status(500).json({ success: false, message: 'purchases 테이블 삭제에 실패했습니다.' });
                    return;
                }
                
                res.json({ success: true, message: '구매 관련 테이블이 성공적으로 삭제되었습니다.' });
            });
        });
    });
});

module.exports = router;
