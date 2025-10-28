const express = require('express');
const router = express.Router();

/**
 * 수리 관리 API 라우터
 * 
 * 포함된 API:
 * - GET /api/repairs - 수리 이력 조회 (고객별)
 * - POST /api/repairs - 수리 이력 등록
 * - POST /api/repairs/test-data - 테스트용 수리 데이터 추가 (개발용)
 * - GET /api/repair-status-debug - 수리 상태 분포 확인 (디버깅용)
 * - GET /api/repairs/:id - 수리 이력 상세 조회
 * - PUT /api/repairs/:id - 수리 이력 수정
 * - DELETE /api/repairs/:id - 수리 이력 삭제
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
 * 수리 이력 조회 API (고객별)
 * GET /api/repairs
 */
router.get('/api/repairs', getRequireAuth(), (req, res) => {
    const { customerId, page = 1, limit = 10 } = req.query;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
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

/**
 * 수리 이력 등록 API
 * POST /api/repairs
 */
router.post('/api/repairs', getRequireAuth(), (req, res) => {
    const { 
        customerId, 
        deviceModel, 
        problem, 
        repairDate, 
        status, 
        totalCost, 
        parts, 
        labor 
    } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    if (!customerId || !deviceModel || !problem || !repairDate) {
        return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
    }
    
    db.serialize(() => {
        // 수리 이력 등록
        const repairQuery = `
            INSERT INTO repairs (customer_id, device_model, problem, repair_date, status, total_cost)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(repairQuery, [customerId, deviceModel, problem, repairDate, status || '접수', totalCost || 0], function(err) {
            if (err) {
                console.error('수리 이력 등록 오류:', err.message);
                res.status(500).json({ success: false, message: '수리 이력 등록에 실패했습니다.' });
                return;
            }
            
            const repairId = this.lastID;
            
            // 수리 부품 등록
            if (parts && parts.length > 0) {
                const partsQuery = `
                    INSERT INTO repair_parts (repair_id, product_id, name, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                const partsStmt = db.prepare(partsQuery);
                parts.forEach(part => {
                    partsStmt.run([repairId, part.productId, part.name, part.quantity, part.unitPrice, part.totalPrice]);
                });
                partsStmt.finalize();
            }
            
            // 수리 인건비 등록
            if (labor && labor.length > 0) {
                const laborQuery = `
                    INSERT INTO repair_labor (repair_id, description, hours, rate, total_cost)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                const laborStmt = db.prepare(laborQuery);
                labor.forEach(lab => {
                    laborStmt.run([repairId, lab.description, lab.hours, lab.rate, lab.totalCost]);
                });
                laborStmt.finalize();
            }
            
            // 수리 비용을 Transactions 테이블에 저장 (수리 비용이 있고 상태가 '완료'인 경우)
            if (status === '완료' && totalCost && totalCost > 0) {
                const repairCode = `R${repairId}`;
                
                // 부품 비용 기록
                if (parts && parts.length > 0) {
                    const insertPartTransaction = db.prepare(`
                        INSERT INTO transactions (transaction_date, transaction_type, reference_type, reference_id, customer_id, product_id, amount, description) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    
                    parts.forEach(part => {
                        insertPartTransaction.run([
                            repairDate,
                            'REPAIR_PART',
                            'repair',
                            repairCode,
                            customerId,
                            part.productId || null,
                            part.totalPrice,
                            `${part.name} - 수리 부품`
                        ]);
                    });
                    
                    insertPartTransaction.finalize();
                }
                
                // 인건비 기록
                if (labor && labor.length > 0) {
                    const insertLaborTransaction = db.prepare(`
                        INSERT INTO transactions (transaction_date, transaction_type, reference_type, reference_id, customer_id, product_id, amount, description) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    
                    labor.forEach(lab => {
                        insertLaborTransaction.run([
                            repairDate,
                            'REPAIR_LABOR',
                            'repair',
                            repairCode,
                            customerId,
                            null,
                            lab.totalCost,
                            `${lab.description} - 수리 인건비`
                        ]);
                    });
                    
                    insertLaborTransaction.finalize();
                }
            }
            
            res.json({ 
                success: true, 
                message: '수리 이력이 성공적으로 등록되었습니다.',
                data: { id: repairId }
            });
        });
    });
});

/**
 * 테스트용 수리 데이터 추가 API (개발용)
 * POST /api/repairs/test-data
 */
router.post('/api/repairs/test-data', getRequireAuth(), (req, res) => {
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    // 테스트용 수리 데이터
    const testRepairs = [
        {
            customerId: 1,
            deviceModel: 'iPhone 12',
            problem: '화면 깨짐',
            repairDate: '2025-10-25',
            status: '완료',
            totalCost: 150000,
            parts: [
                { productId: 1, name: 'iPhone 12 화면', quantity: 1, unitPrice: 120000, totalPrice: 120000 }
            ],
            labor: [
                { description: '화면 교체 작업', hours: 2, rate: 15000, totalCost: 30000 }
            ]
        },
        {
            customerId: 2,
            deviceModel: 'Samsung Galaxy S21',
            problem: '배터리 교체',
            repairDate: '2025-10-24',
            status: '진행중',
            totalCost: 80000,
            parts: [
                { productId: 2, name: 'Galaxy S21 배터리', quantity: 1, unitPrice: 50000, totalPrice: 50000 }
            ],
            labor: [
                { description: '배터리 교체 작업', hours: 1.5, rate: 20000, totalCost: 30000 }
            ]
        }
    ];
    
    let completed = 0;
    let errors = [];
    
    testRepairs.forEach((repair, index) => {
        const { customerId, deviceModel, problem, repairDate, status, totalCost, parts, labor } = repair;
        
        db.serialize(() => {
            const repairQuery = `
                INSERT INTO repairs (customer_id, device_model, problem, repair_date, status, total_cost)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            db.run(repairQuery, [customerId, deviceModel, problem, repairDate, status, totalCost], function(err) {
                if (err) {
                    console.error(`테스트 수리 데이터 ${index + 1} 등록 오류:`, err.message);
                    errors.push(`수리 ${index + 1}: ${err.message}`);
                } else {
                    const repairId = this.lastID;
                    
                    // 수리 부품 등록
                    if (parts && parts.length > 0) {
                        const partsQuery = `
                            INSERT INTO repair_parts (repair_id, product_id, name, quantity, unit_price, total_price)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        
                        const partsStmt = db.prepare(partsQuery);
                        parts.forEach(part => {
                            partsStmt.run([repairId, part.productId, part.name, part.quantity, part.unitPrice, part.totalPrice]);
                        });
                        partsStmt.finalize();
                    }
                    
                    // 수리 인건비 등록
                    if (labor && labor.length > 0) {
                        const laborQuery = `
                            INSERT INTO repair_labor (repair_id, description, hours, rate, total_cost)
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        
                        const laborStmt = db.prepare(laborQuery);
                        labor.forEach(lab => {
                            laborStmt.run([repairId, lab.description, lab.hours, lab.rate, lab.totalCost]);
                        });
                        laborStmt.finalize();
                    }
                    
                    completed++;
                }
                
                // 모든 테스트 데이터 처리 완료
                if (completed + errors.length === testRepairs.length) {
                    if (errors.length > 0) {
                        res.status(500).json({ 
                            success: false, 
                            message: '일부 테스트 데이터 등록에 실패했습니다.',
                            errors: errors
                        });
                    } else {
                        res.json({ 
                            success: true, 
                            message: `${testRepairs.length}개의 테스트 수리 데이터가 성공적으로 등록되었습니다.`,
                            data: { count: testRepairs.length }
                        });
                    }
                }
            });
        });
    });
});

/**
 * 수리 상태 분포 확인 API (디버깅용)
 * GET /api/repair-status-debug
 */
router.get('/api/repair-status-debug', getRequireAuth(), (req, res) => {
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    const query = `
        SELECT status, COUNT(*) as count
        FROM repairs
        GROUP BY status
        ORDER BY count DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('수리 상태 분포 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 상태 분포 조회에 실패했습니다.' });
        } else {
            const total = rows.reduce((sum, row) => sum + row.count, 0);
            const statusDistribution = rows.map(row => ({
                status: row.status,
                count: row.count,
                percentage: total > 0 ? ((row.count / total) * 100).toFixed(1) : 0
            }));
            
            res.json({ 
                success: true, 
                data: {
                    total,
                    distribution: statusDistribution
                }
            });
        }
    });
});

/**
 * 수리 이력 상세 조회 API
 * GET /api/repairs/:id
 */
router.get('/api/repairs/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    const query = `
        SELECT r.*, c.name as customer_name, c.management_number, c.phone as customer_phone, c.address as customer_address
        FROM repairs r
        JOIN customers c ON r.customer_id = c.id
        WHERE r.id = ?
    `;
    
    db.get(query, [id], (err, repair) => {
        if (err) {
            console.error('수리 이력 상세 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '수리 이력 상세 조회에 실패했습니다.' });
            return;
        }
        
        if (!repair) {
            res.status(404).json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
            return;
        }
        
        // 수리 부품 조회
        const partsQuery = `
            SELECT rp.*, p.name as product_name, p.product_code
            FROM repair_parts rp
            LEFT JOIN products p ON rp.product_id = p.id
            WHERE rp.repair_id = ?
        `;
        
        db.all(partsQuery, [id], (err, parts) => {
            if (err) {
                console.error('수리 부품 조회 오류:', err.message);
                res.status(500).json({ success: false, message: '수리 부품 조회에 실패했습니다.' });
                return;
            }
            
            // 수리 인건비 조회
            const laborQuery = 'SELECT * FROM repair_labor WHERE repair_id = ?';
            
            db.all(laborQuery, [id], (err, labor) => {
                if (err) {
                    console.error('수리 인건비 조회 오류:', err.message);
                    res.status(500).json({ success: false, message: '수리 인건비 조회에 실패했습니다.' });
                    return;
                }
                
                repair.parts = parts;
                repair.labor = labor;
                
                res.json({ success: true, data: repair });
            });
        });
    });
});

/**
 * 수리 이력 수정 API
 * PUT /api/repairs/:id
 */
router.put('/api/repairs/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const { 
        deviceModel, 
        problem, 
        repairDate, 
        status, 
        totalCost, 
        parts, 
        labor 
    } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    db.serialize(() => {
        // 수리 이력 수정
        const repairQuery = `
            UPDATE repairs 
            SET device_model = ?, problem = ?, repair_date = ?, status = ?, total_cost = ?
            WHERE id = ?
        `;
        
        db.run(repairQuery, [deviceModel, problem, repairDate, status, totalCost, id], function(err) {
            if (err) {
                console.error('수리 이력 수정 오류:', err.message);
                res.status(500).json({ success: false, message: '수리 이력 수정에 실패했습니다.' });
                return;
            }
            
            if (this.changes === 0) {
                res.status(404).json({ success: false, message: '수정할 수리 이력을 찾을 수 없습니다.' });
                return;
            }
            
            // 기존 수리 부품 삭제
            db.run('DELETE FROM repair_parts WHERE repair_id = ?', [id], (err) => {
                if (err) {
                    console.error('기존 수리 부품 삭제 오류:', err.message);
                    res.status(500).json({ success: false, message: '기존 수리 부품 삭제에 실패했습니다.' });
                    return;
                }
                
                // 새로운 수리 부품 등록
                if (parts && parts.length > 0) {
                    const partsQuery = `
                        INSERT INTO repair_parts (repair_id, product_id, name, quantity, unit_price, total_price)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    
                    const partsStmt = db.prepare(partsQuery);
                    parts.forEach(part => {
                        partsStmt.run([id, part.productId, part.name, part.quantity, part.unitPrice, part.totalPrice]);
                    });
                    partsStmt.finalize();
                }
                
                // 기존 수리 인건비 삭제
                db.run('DELETE FROM repair_labor WHERE repair_id = ?', [id], (err) => {
                    if (err) {
                        console.error('기존 수리 인건비 삭제 오류:', err.message);
                        res.status(500).json({ success: false, message: '기존 수리 인건비 삭제에 실패했습니다.' });
                        return;
                    }
                    
                    // 새로운 수리 인건비 등록
                    if (labor && labor.length > 0) {
                        const laborQuery = `
                            INSERT INTO repair_labor (repair_id, description, hours, rate, total_cost)
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        
                        const laborStmt = db.prepare(laborQuery);
                        labor.forEach(lab => {
                            laborStmt.run([id, lab.description, lab.hours, lab.rate, lab.totalCost]);
                        });
                        laborStmt.finalize();
                    }
                    
                    res.json({ success: true, message: '수리 이력이 성공적으로 수정되었습니다.' });
                });
            });
        });
    });
});

/**
 * 수리 이력 삭제 API
 * DELETE /api/repairs/:id
 */
router.delete('/api/repairs/:id', getRequireAuth(), (req, res) => {
    const { id } = req.params;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    db.serialize(() => {
        // 수리 부품 삭제
        db.run('DELETE FROM repair_parts WHERE repair_id = ?', [id], (err) => {
            if (err) {
                console.error('수리 부품 삭제 오류:', err.message);
                res.status(500).json({ success: false, message: '수리 부품 삭제에 실패했습니다.' });
                return;
            }
            
            // 수리 인건비 삭제
            db.run('DELETE FROM repair_labor WHERE repair_id = ?', [id], (err) => {
                if (err) {
                    console.error('수리 인건비 삭제 오류:', err.message);
                    res.status(500).json({ success: false, message: '수리 인건비 삭제에 실패했습니다.' });
                    return;
                }
                
                // 수리 이력 삭제
                db.run('DELETE FROM repairs WHERE id = ?', [id], function(err) {
                    if (err) {
                        console.error('수리 이력 삭제 오류:', err.message);
                        res.status(500).json({ success: false, message: '수리 이력 삭제에 실패했습니다.' });
                        return;
                    }
                    
                    if (this.changes === 0) {
                        res.status(404).json({ success: false, message: '삭제할 수리 이력을 찾을 수 없습니다.' });
                        return;
                    }
                    
                    res.json({ success: true, message: '수리 이력이 성공적으로 삭제되었습니다.' });
                });
            });
        });
    });
});

module.exports = router;
