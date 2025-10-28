const express = require('express');
const domainConfig = require('../config/domain-config');

/**
 * 기타 API 라우터
 * - 서버 상태 확인
 * - 방문 이력 관리
 */
const router = express.Router();

/**
 * 서버 상태 확인 API
 * GET /api/status
 */
router.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'kkam.shop 서버가 정상 작동 중입니다.',
        timestamp: new Date().toISOString(),
        domain: domainConfig.getCurrentConfig().domain
    });
});

/**
 * 방문 이력 조회 API
 * GET /api/visits
 */
router.get('/api/visits', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const { customerId } = req.query;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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

/**
 * 방문 이력 등록 API
 * POST /api/visits
 */
router.post('/api/visits', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const { customerId, visitDate, purpose, notes } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
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

module.exports = router;
