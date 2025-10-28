const express = require('express');

/**
 * 통계 및 요약 API 라우터
 * - 요약 상세 내역 조회
 * - 고객 통계
 * - 수리 현황 통계
 */
const router = express.Router();

/**
 * 요약 상세 내역 조회 API
 * GET /api/summary-details/:type
 */
router.get('/api/summary-details/:type', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
            // 판매/반품 데이터와 완료된 수리 데이터를 UNION으로 결합
            query = `
                SELECT 
                    p.purchase_date as date,
                    p.purchase_code as code,
                    c.id as customerId,
                    c.name as customer,
                    pr.name as product,
                    pi.quantity,
                    pi.unit_price as unitPrice,
                    pi.total_price as totalAmount,
                    p.type as status,
                    p.original_type,
                    p.original_purchase_id,
                    p.payment_method as paymentMethod,
                    p.tax_option,
                    'purchase' as source_type
                FROM purchases p
                LEFT JOIN customers c ON p.customer_id = c.id
                LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
                LEFT JOIN products pr ON pi.product_id = pr.id
                WHERE p.purchase_date BETWEEN ? AND ?
                AND (p.type = '판매' OR (p.type = '반품' AND p.original_type = '판매'))
                
                UNION ALL
                
                SELECT 
                    r.repair_date as date,
                    'R' || r.id as code,
                    c.id as customerId,
                    c.name as customer,
                    COALESCE(r.device_model, r.device_type, '수리') as product,
                    1 as quantity,
                    r.total_cost as unitPrice,
                    r.total_cost as totalAmount,
                    '수리완료' as status,
                    NULL as original_type,
                    NULL as original_purchase_id,
                    '현금' as paymentMethod,
                    COALESCE(r.vat_option, 'included') as tax_option,
                    'repair' as source_type
                FROM repairs r
                LEFT JOIN customers c ON r.customer_id = c.id
                WHERE r.repair_date BETWEEN ? AND ?
                AND r.status = '완료'
                
                ORDER BY date DESC
            `;
            params = [startDate, endDate, startDate, endDate];
            break;
            
        case 'expense':
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
                    p.original_type,
                    p.original_purchase_id,
                    p.payment_method as paymentMethod,
                    p.tax_option
                FROM purchases p
                LEFT JOIN customers c ON p.customer_id = c.id
                LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
                LEFT JOIN products pr ON pi.product_id = pr.id
                WHERE p.purchase_date BETWEEN ? AND ?
                AND (p.type = '구매' OR (p.type = '반품' AND p.original_type = '구매'))
                ORDER BY p.purchase_date DESC
            `;
            params = [startDate, endDate];
            break;
            
        case 'repairs':
            query = `
                SELECT 
                    r.repair_date as date,
                    r.repair_code as code,
                    c.name as customer,
                    r.device_name as device,
                    r.issue_description as issue,
                    r.repair_cost as cost,
                    r.status,
                    r.completion_date as completionDate
                FROM repairs r
                LEFT JOIN customers c ON r.customer_id = c.id
                WHERE r.repair_date BETWEEN ? AND ?
                ORDER BY r.repair_date DESC
            `;
            params = [startDate, endDate];
            break;
            
        case 'customers':
            query = `
                SELECT 
                    c.id,
                    c.name,
                    c.phone,
                    c.address,
                    COUNT(DISTINCT p.id) as purchase_count,
                    COUNT(DISTINCT r.id) as repair_count,
                    COALESCE(SUM(p.total_amount), 0) as total_purchase_amount,
                    COALESCE(SUM(r.repair_cost), 0) as total_repair_cost
                FROM customers c
                LEFT JOIN purchases p ON c.id = p.customer_id AND p.purchase_date BETWEEN ? AND ?
                LEFT JOIN repairs r ON c.id = r.customer_id AND r.repair_date BETWEEN ? AND ?
                WHERE c.created_at BETWEEN ? AND ?
                GROUP BY c.id, c.name, c.phone, c.address
                ORDER BY c.created_at DESC
            `;
            params = [startDate, endDate, startDate, endDate, startDate, endDate];
            break;
            
        case 'net':
            // 순이익 상세 내역 (매출과 매입을 합쳐서 보여줌)
            query = `
                SELECT 
                    'revenue' as type,
                    r.repair_date as date,
                    'R' || r.id as code,
                    c.name as customer,
                    COALESCE(r.device_type || ' ' || r.device_model, '수리') as device,
                    COALESCE(r.problem, '수리') as issue,
                    r.total_cost as totalAmount,
                    r.status,
                    '현금' as paymentMethod
                FROM repairs r
                LEFT JOIN customers c ON r.customer_id = c.id
                WHERE r.repair_date BETWEEN ? AND ?
                AND r.total_cost > 0
                
                UNION ALL
                
                SELECT 
                    'expense' as type,
                    p.purchase_date as date,
                    p.purchase_code as code,
                    c.name as customer,
                    '구매' as device,
                    '구매' as issue,
                    p.total_amount as totalAmount,
                    p.type as status,
                    p.payment_method as paymentMethod
                FROM purchases p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.purchase_date BETWEEN ? AND ?
                AND p.type = '구매'
                AND p.total_amount > 0
                
                ORDER BY date DESC
            `;
            params = [startDate, endDate, startDate, endDate];
            break;
            
        case 'vat':
            // 부가세 상세 내역 (매출과 매입의 부가세 정보)
            query = `
                SELECT 
                    'revenue' as type,
                    r.repair_date as date,
                    'R' || r.id as code,
                    c.name as customer,
                    COALESCE(r.device_type || ' ' || r.device_model, '수리') as device,
                    COALESCE(r.problem, '수리') as issue,
                    r.total_cost as totalAmount,
                    r.vat_option as taxOption,
                    CASE 
                        WHEN r.vat_option = 'include' OR r.vat_option = 'included' THEN ROUND(r.total_cost / 1.1)
                        WHEN r.vat_option = 'exclude' OR r.vat_option = 'excluded' THEN r.total_cost
                        ELSE r.total_cost
                    END as supplyPrice,
                    CASE 
                        WHEN r.vat_option = 'include' OR r.vat_option = 'included' THEN r.total_cost - ROUND(r.total_cost / 1.1)
                        WHEN r.vat_option = 'exclude' OR r.vat_option = 'excluded' THEN ROUND(r.total_cost * 0.1)
                        ELSE 0
                    END as vatAmount,
                    r.status,
                    '현금' as paymentMethod
                FROM repairs r
                LEFT JOIN customers c ON r.customer_id = c.id
                WHERE r.repair_date BETWEEN ? AND ?
                AND r.total_cost > 0
                
                UNION ALL
                
                SELECT 
                    'expense' as type,
                    p.purchase_date as date,
                    p.purchase_code as code,
                    c.name as customer,
                    '구매' as device,
                    '구매' as issue,
                    p.total_amount as totalAmount,
                    p.tax_option as taxOption,
                    CASE 
                        WHEN p.tax_option = 'include' OR p.tax_option = 'included' THEN ROUND(p.total_amount / 1.1)
                        WHEN p.tax_option = 'exclude' OR p.tax_option = 'excluded' THEN p.total_amount
                        ELSE p.total_amount
                    END as supplyPrice,
                    CASE 
                        WHEN p.tax_option = 'include' OR p.tax_option = 'included' THEN p.total_amount - ROUND(p.total_amount / 1.1)
                        WHEN p.tax_option = 'exclude' OR p.tax_option = 'excluded' THEN ROUND(p.total_amount * 0.1)
                        ELSE 0
                    END as vatAmount,
                    p.type as status,
                    p.payment_method as paymentMethod
                FROM purchases p
                LEFT JOIN customers c ON p.customer_id = c.id
                WHERE p.purchase_date BETWEEN ? AND ?
                AND p.type = '구매'
                AND p.total_amount > 0
                
                ORDER BY date DESC
            `;
            params = [startDate, endDate, startDate, endDate];
            break;
            
        default:
            return res.status(400).json({ 
                success: false, 
                message: '유효하지 않은 타입입니다. (revenue, expense, repairs, customers, net, vat)' 
            });
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('요약 상세 내역 조회 오류:', err.message);
            res.status(500).json({ 
                success: false, 
                message: '요약 상세 내역을 불러오는데 실패했습니다.' 
            });
        } else {
            res.json({ 
                success: true, 
                data: rows,
                count: rows.length,
                type: type,
                period: { startDate, endDate }
            });
        }
    });
});

/**
 * 고객 통계 API
 * GET /api/customers/stats
 */
router.get('/api/customers/stats', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const { dateFrom, dateTo, customerId, status } = req.query;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
            COALESCE(MIN(r.total_cost), 0) as min_cost,
            COUNT(CASE WHEN r.status = '완료' THEN 1 END) as completed_count,
            COUNT(CASE WHEN r.status = '진행중' THEN 1 END) as in_progress_count,
            COUNT(CASE WHEN r.status = '대기' THEN 1 END) as pending_count
        FROM customers c
        LEFT JOIN repairs r ON c.id = r.customer_id ${whereClause}
        GROUP BY c.id, c.name
        ORDER BY repair_count DESC, total_cost DESC
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('고객 통계 조회 오류:', err.message);
            res.status(500).json({ 
                success: false, 
                message: '고객 통계를 불러오는데 실패했습니다.' 
            });
        } else {
            const summary = {
                total_customers: rows.length,
                total_repairs: rows.reduce((sum, row) => sum + row.repair_count, 0),
                total_revenue: rows.reduce((sum, row) => sum + row.total_cost, 0),
                avg_repairs_per_customer: rows.length > 0 ? 
                    (rows.reduce((sum, row) => sum + row.repair_count, 0) / rows.length).toFixed(2) : 0,
                customers: rows
            };
            
            res.json({ success: true, data: summary });
        }
    });
});

/**
 * 수리 현황 통계 API
 * GET /api/repair-status-summary
 */
router.get('/api/repair-status-summary', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const { startDate, endDate } = req.query;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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
            res.status(500).json({ 
                success: false, 
                message: '수리 현황 통계를 불러오는데 실패했습니다.' 
            });
        } else {
            const summary = {
                total: 0,
                pending: 0,
                inProgress: 0,
                completed: 0,
                cancelled: 0,
                total_cost: 0,
                status_breakdown: {}
            };
            
            rows.forEach(row => {
                summary.total += row.count;
                summary.total_cost += row.total_cost;
                summary.status_breakdown[row.status] = {
                    count: row.count,
                    total_cost: row.total_cost
                };
                
                switch (row.status) {
                    case '대기':
                        summary.pending = row.count;
                        break;
                    case '진행중':
                        summary.inProgress = row.count;
                        break;
                    case '완료':
                        summary.completed = row.count;
                        break;
                    case '취소':
                        summary.cancelled = row.count;
                        break;
                }
            });
            
            res.json({ success: true, data: summary });
        }
    });
});

module.exports = router;
