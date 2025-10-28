// Transactions 테이블 기반 통계 API
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'data', 'repair_center.db');
const db = new sqlite3.Database(dbPath);

// 대시보드 요약 통계 조회
router.get('/api/summary', (req, res) => {
    const startDate = req.query.startDate || '2024-01-01';
    const endDate = req.query.endDate || '2025-12-31';
    
    console.log(`요약 통계 조회: ${startDate} ~ ${endDate}`);
    
    // 1. 총 매출 계산 (판매 + 수리 비용 포함, 한 쿼리로 처리)
    const revenueQuery = `
        SELECT 
            -- 1. 총 매출액 (수리는 완료된 것만)
            COALESCE(SUM(
                CASE 
                    WHEN transaction_type = 'SALE' THEN amount
                    WHEN transaction_type IN ('REPAIR_LABOR', 'REPAIR_PART', 'REPAIR')
                        AND t.reference_type = 'repair'
                        AND EXISTS (
                            SELECT 1 FROM repairs r 
                            WHERE r.id = CAST(SUBSTR(t.reference_id, 2) AS INTEGER)
                            AND r.status = '완료'
                        ) THEN amount
                    ELSE 0
                END
            ), 0) as total_revenue,
            
            -- 2. 총 매출 건수 (합계)
            COUNT(
                CASE 
                    WHEN transaction_type = 'SALE' THEN 1
                    WHEN transaction_type IN ('REPAIR_LABOR', 'REPAIR_PART', 'REPAIR')
                        AND t.reference_type = 'repair'
                        AND EXISTS (
                            SELECT 1 FROM repairs r 
                            WHERE r.id = CAST(SUBSTR(t.reference_id, 2) AS INTEGER)
                            AND r.status = '완료'
                        ) THEN 1
                END
            ) as total_count,
            
            -- 3. 판매 건수 (SALE)
            SUM(CASE 
                WHEN transaction_type = 'SALE' THEN 1 
                ELSE 0 
            END) as sales_count,
            
            -- 4. 수리 건수 (완료된 REPAIR만)
            SUM(CASE 
                WHEN transaction_type IN ('REPAIR_LABOR', 'REPAIR_PART', 'REPAIR')
                    AND t.reference_type = 'repair'
                    AND EXISTS (
                        SELECT 1 FROM repairs r 
                        WHERE r.id = CAST(SUBSTR(t.reference_id, 2) AS INTEGER)
                        AND r.status = '완료'
                    ) THEN 1 
                ELSE 0 
            END) as repair_count
            
        FROM transactions t
        WHERE 
            transaction_date BETWEEN ? AND ?
            AND transaction_type IN ('SALE', 'REPAIR_LABOR', 'REPAIR_PART', 'REPAIR')
            AND amount > 0
    `;
    
    // 2. 총 매입 계산 (PURCHASE 합계)
    const expenseQuery = `
        SELECT 
            COALESCE(SUM(amount), 0) as total_expense,
            COUNT(*) as expense_count
        FROM transactions
        WHERE transaction_date BETWEEN ? AND ?
        AND transaction_type = 'PURCHASE'
    `;
    
    // 3. 부가세 계산 (지금은 간단하게 0으로 설정)
    const vatQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_vat
        FROM transactions
        WHERE transaction_date BETWEEN ? AND ?
        AND transaction_type IN ('SALE', 'REPAIR_PART', 'REPAIR_LABOR', 'PURCHASE')
    `;
    
    db.get(revenueQuery, [startDate, endDate], (err, revenueRow) => {
        if (err) {
            console.error('매출 조회 오류:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        db.get(expenseQuery, [startDate, endDate], (err, expenseRow) => {
            if (err) {
                console.error('매입 조회 오류:', err.message);
                return res.status(500).json({ error: err.message });
            }
            
            db.get(vatQuery, [startDate, endDate], (err, vatRow) => {
                if (err) {
                    console.error('부가세 조회 오류:', err.message);
                    return res.status(500).json({ error: err.message });
                }
                
                const totalRevenue = revenueRow.total_revenue || 0;
                const revenueCount = revenueRow.total_count || 0;
                const salesCount = revenueRow.sales_count || 0;
                const repairCount = revenueRow.repair_count || 0;
                const totalExpense = expenseRow.total_expense || 0;
                const expenseCount = expenseRow.expense_count || 0;
                const totalVat = vatRow.total_vat || 0;
                const netProfit = totalRevenue - totalExpense;
                const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
                
                const summary = {
                    totalRevenue,
                    revenueCount,
                    salesCount,
                    repairCount,
                    totalExpense,
                    expenseCount,
                    totalVat,
                    netProfit,
                    profitMargin
                };
                
                console.log('계산된 요약:', summary);
                res.json(summary);
            });
        });
    });
});

module.exports = router;

