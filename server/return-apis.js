// 반품 처리 전용 API
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 연결
const dbPath = path.resolve(__dirname, '../database/data', 'repair_center.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
    } else {
        console.log('반품 API 데이터베이스에 연결되었습니다.');
    }
});

// 반품 등록 API
router.post('/api/returns', (req, res) => {
    const { 
        originalPurchaseId, 
        customerId, 
        returnDate, 
        totalAmount, 
        quantity,
        reason,
        notes 
    } = req.body;

    if (!originalPurchaseId || !customerId || !returnDate || !totalAmount) {
        return res.status(400).json({ 
            success: false, 
            message: '필수 필드가 누락되었습니다.' 
        });
    }

    // 원래 거래 정보 조회
    const originalQuery = `
        SELECT type, purchase_code, total_amount, tax_option
        FROM purchases 
        WHERE id = ?
    `;

    db.get(originalQuery, [originalPurchaseId], (err, originalPurchase) => {
        if (err) {
            console.error('원래 거래 조회 오류:', err.message);
            return res.status(500).json({ 
                success: false, 
                message: '원래 거래 정보를 조회할 수 없습니다.' 
            });
        }

        if (!originalPurchase) {
            return res.status(404).json({ 
                success: false, 
                message: '원래 거래를 찾을 수 없습니다.' 
            });
        }

        // 반품 코드 생성
        const returnCode = `R${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // 반품 등록
        const returnQuery = `
            INSERT INTO purchases (
                customer_id, 
                purchase_code, 
                purchase_date, 
                type, 
                original_type, 
                original_purchase_id, 
                total_amount, 
                tax_option, 
                status, 
                notes
            ) VALUES (?, ?, ?, '반품', ?, ?, ?, ?, '완료', ?)
        `;

        db.run(returnQuery, [
            customerId,
            returnCode,
            returnDate,
            originalPurchase.type,
            originalPurchaseId,
            totalAmount,
            originalPurchase.tax_option,
            notes || `반품 사유: ${reason || '기타'}`
        ], function(err) {
            if (err) {
                console.error('반품 등록 오류:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    message: '반품 등록에 실패했습니다.' 
                });
            }

            const returnId = this.lastID;

            // 반품 상품 등록 (원래 거래의 상품 정보 복사)
            const itemQuery = `
                INSERT INTO purchase_items (
                    purchase_id, 
                    product_id, 
                    product_name, 
                    quantity, 
                    unit_price, 
                    total_price
                )
                SELECT 
                    ?, 
                    product_id, 
                    product_name, 
                    ?, 
                    unit_price, 
                    ?
                FROM purchase_items 
                WHERE purchase_id = ?
            `;

            db.run(itemQuery, [returnId, quantity, totalAmount, originalPurchaseId], (err) => {
                if (err) {
                    console.error('반품 상품 등록 오류:', err.message);
                    return res.status(500).json({ 
                        success: false, 
                        message: '반품 상품 등록에 실패했습니다.' 
                    });
                }

                res.json({ 
                    success: true, 
                    message: '반품이 성공적으로 등록되었습니다.',
                    data: { 
                        id: returnId, 
                        returnCode: returnCode,
                        originalType: originalPurchase.type
                    }
                });
            });
        });
    });
});

// 반품 목록 조회 API
router.get('/api/returns', (req, res) => {
    const { startDate, endDate, originalType } = req.query;
    
    let query = `
        SELECT 
            p.id,
            p.purchase_code as returnCode,
            p.purchase_date as returnDate,
            p.original_type,
            p.original_purchase_id,
            p.total_amount,
            p.notes,
            c.name as customerName,
            op.purchase_code as originalCode,
            op.purchase_date as originalDate
        FROM purchases p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN purchases op ON p.original_purchase_id = op.id
        WHERE p.type = '반품'
    `;
    
    const params = [];
    
    if (startDate && endDate) {
        query += ` AND p.purchase_date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }
    
    if (originalType) {
        query += ` AND p.original_type = ?`;
        params.push(originalType);
    }
    
    query += ` ORDER BY p.purchase_date DESC`;
    
    db.all(query, params, (err, returns) => {
        if (err) {
            console.error('반품 목록 조회 오류:', err.message);
            return res.status(500).json({ 
                success: false, 
                message: '반품 목록을 조회할 수 없습니다.' 
            });
        }
        
        res.json({ 
            success: true, 
            data: returns 
        });
    });
});

// 반품 상세 조회 API
router.get('/api/returns/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            p.*,
            c.name as customerName,
            op.purchase_code as originalCode,
            op.purchase_date as originalDate,
            op.type as originalType
        FROM purchases p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN purchases op ON p.original_purchase_id = op.id
        WHERE p.id = ? AND p.type = '반품'
    `;
    
    db.get(query, [id], (err, returnData) => {
        if (err) {
            console.error('반품 상세 조회 오류:', err.message);
            return res.status(500).json({ 
                success: false, 
                message: '반품 상세 정보를 조회할 수 없습니다.' 
            });
        }
        
        if (!returnData) {
            return res.status(404).json({ 
                success: false, 
                message: '반품을 찾을 수 없습니다.' 
            });
        }
        
        // 반품 상품 목록 조회
        const itemsQuery = `
            SELECT * FROM purchase_items 
            WHERE purchase_id = ?
        `;
        
        db.all(itemsQuery, [id], (err, items) => {
            if (err) {
                console.error('반품 상품 조회 오류:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    message: '반품 상품 정보를 조회할 수 없습니다.' 
                });
            }
            
            returnData.items = items;
            
            res.json({ 
                success: true, 
                data: returnData 
            });
        });
    });
});

module.exports = router;
