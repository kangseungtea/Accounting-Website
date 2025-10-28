const express = require('express');

/**
 * 디버깅 및 관리 API 라우터
 * - 제품 재고 동기화
 * - 디버깅 정보 조회
 * - 개발용 유틸리티
 */
const router = express.Router();

/**
 * 개별 제품 재고 동기화 API
 * POST /api/debug/sync-stock/:productId
 */
router.post('/api/debug/sync-stock/:productId', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const { productId } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
        `;
        
        const repairQuery = `
            SELECT rp.quantity, r.repair_date
            FROM repair_parts rp
            JOIN repairs r ON rp.repair_id = r.id
            WHERE (rp.product_id = ? OR rp.name = ?)
        `;
        
            db.all(purchaseQuery, [productId], (err, purchases) => {
                if (err) {
                    console.error('구매 이력 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '구매 이력 조회 실패' });
                    return;
                }
                
                db.all(repairQuery, [productId, product.name], (err, repairs) => {
                if (err) {
                    console.error('수리 이력 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '수리 이력 조회 실패' });
                    return;
                }
                
                // 재고 계산
                let totalStock = 0;
                
                // 구매량 계산
                purchases.forEach(purchase => {
                    if (purchase.type === '구매') {
                        totalStock += purchase.quantity;
                    } else if (purchase.type === '판매' || purchase.type === '반품') {
                        totalStock -= purchase.quantity;
                    }
                });
                
                // 수리 부품 사용량 계산
                repairs.forEach(repair => {
                    totalStock -= repair.quantity;
                });
                
                // 제품 재고 업데이트
                const updateQuery = 'UPDATE products SET stock_quantity = ? WHERE id = ?';
                db.run(updateQuery, [totalStock, productId], (err) => {
                    if (err) {
                        console.error('재고 업데이트 오류:', err.message);
                        res.status(500).json({ success: false, message: '재고 업데이트 실패' });
                        return;
                    }
                    
                    console.log(`✅ 제품 ${productId} (${product.name}) 재고 동기화 완료: ${totalStock}개`);
                    res.json({
                        success: true,
                        message: '재고 동기화 완료',
                        productId: parseInt(productId),
                        productName: product.name,
                        calculatedStock: totalStock,
                        purchases: purchases.length,
                        repairs: repairs.length
                    });
                });
            });
        });
    });
});

/**
 * 모든 제품 재고 일괄 동기화 API
 * POST /api/debug/sync-all-stock
 */
router.post('/api/debug/sync-all-stock', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
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
        let totalCount = products.length;
        
        // 각 제품별로 재고 동기화
        const syncNextProduct = (index) => {
            if (index >= products.length) {
                console.log(`🔄 모든 제품 재고 일괄 동기화 완료: ${syncedCount}/${totalCount}개 성공`);
                res.json({
                    success: true,
                    message: '모든 제품 재고 동기화 완료',
                    syncedCount: syncedCount,
                    totalCount: totalCount
                });
                return;
            }
            
            const product = products[index];
            const productId = product.id;
            
            // 구매/판매 이력과 수리 부품 사용 이력을 모두 조회
            const purchaseQuery = `
                SELECT pi.quantity, p.type, p.purchase_date
                FROM purchase_items pi
                JOIN purchases p ON pi.purchase_id = p.id
                WHERE pi.product_id = ?
            `;
            
            const repairQuery = `
                SELECT ri.quantity, r.repair_date
                FROM repair_parts ri
                JOIN repairs r ON ri.repair_id = r.id
                WHERE (ri.product_id = ? OR ri.name = ?)
            `;
            
            db.all(purchaseQuery, [productId], (err, purchases) => {
                if (err) {
                    console.error(`제품 ${productId} 구매 이력 조회 오류:`, err.message);
                    syncNextProduct(index + 1);
                    return;
                }
                
                db.all(repairQuery, [productId, product.name], (err, repairs) => {
                    if (err) {
                        console.error(`제품 ${productId} 수리 이력 조회 오류:`, err.message);
                        syncNextProduct(index + 1);
                        return;
                    }
                    
                    // 재고 계산
                    let totalStock = 0;
                    
                    // 구매량 계산
                    purchases.forEach(purchase => {
                        if (purchase.type === '구매') {
                            totalStock += purchase.quantity;
                        } else if (purchase.type === '판매' || purchase.type === '반품') {
                            totalStock -= purchase.quantity;
                        }
                    });
                    
                    // 수리 부품 사용량 계산
                    repairs.forEach(repair => {
                        totalStock -= repair.quantity;
                    });
                    
                    // 제품 재고 업데이트
                    const updateQuery = 'UPDATE products SET stock_quantity = ? WHERE id = ?';
                    db.run(updateQuery, [totalStock, productId], (err) => {
                        if (err) {
                            console.error(`제품 ${productId} 재고 업데이트 오류:`, err.message);
                        } else {
                            console.log(`✅ 제품 ${productId} (${product.name}) 재고 동기화 완료: ${totalStock}개`);
                            syncedCount++;
                        }
                        syncNextProduct(index + 1);
                    });
                });
            });
        };
        
        syncNextProduct(0);
    });
});

/**
 * 제품 재고 디버깅 정보 조회 API
 * GET /api/debug/stock/:productId
 */
router.get('/api/debug/stock/:productId', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const { productId } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
        
        // 구매량 조회
        const purchaseQuery = `
            SELECT SUM(pi.quantity) as totalPurchased
            FROM purchase_items pi
            JOIN purchases p ON pi.purchase_id = p.id
            WHERE pi.product_id = ? AND p.type = '구매'
        `;
        
        // 판매량 조회
        const salesQuery = `
            SELECT SUM(pi.quantity) as totalSold
            FROM purchase_items pi
            JOIN purchases p ON pi.purchase_id = p.id
            WHERE pi.product_id = ? AND p.type = '판매'
        `;
        
        // 반품량 조회
        const returnQuery = `
            SELECT SUM(pi.quantity) as totalReturned
            FROM purchase_items pi
            JOIN purchases p ON pi.purchase_id = p.id
            WHERE pi.product_id = ? AND p.type = '반품'
        `;
        
        // 수리 부품 사용량 조회 (product_id와 제품명 모두 고려)
        const repairQuery = `
            SELECT SUM(rp.quantity) as totalUsed
            FROM repair_parts rp
            JOIN repairs r ON rp.repair_id = r.id
            WHERE (rp.product_id = ? OR rp.name = ?)
        `;
        
        // 모든 쿼리 실행
        db.get(purchaseQuery, [productId], (err, purchased) => {
            if (err) {
                console.error('구매량 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '구매량 조회 실패' });
                return;
            }
            
            db.get(salesQuery, [productId], (err, sold) => {
                if (err) {
                    console.error('판매량 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '판매량 조회 실패' });
                    return;
                }
                
                db.get(returnQuery, [productId], (err, returned) => {
                    if (err) {
                        console.error('반품량 조회 오류:', err.message);
                        res.status(500).json({ success: false, message: '반품량 조회 실패' });
                        return;
                    }
                    
                    db.get(repairQuery, [productId, product.name], (err, used) => {
                        if (err) {
                            console.error('수리 사용량 조회 오류:', err.message);
                            res.status(500).json({ success: false, message: '수리 사용량 조회 실패' });
                            return;
                        }
                        
                        const totalPurchased = purchased?.totalPurchased || 0;
                        const totalSold = sold?.totalSold || 0;
                        const totalReturned = returned?.totalReturned || 0;
                        const totalUsed = used?.totalUsed || 0;
                        
                        const calculatedStock = totalPurchased - totalSold + totalReturned - totalUsed;
                        
                        res.json({
                            success: true,
                            product: {
                                id: product.id,
                                name: product.name,
                                currentStock: product.stock_quantity,
                                calculatedStock: calculatedStock,
                                stockDifference: product.stock_quantity - calculatedStock
                            },
                            breakdown: {
                                totalPurchased: totalPurchased,
                                totalSold: totalSold,
                                totalReturned: totalReturned,
                                totalUsedInRepairs: totalUsed,
                                calculatedStock: calculatedStock
                            }
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
