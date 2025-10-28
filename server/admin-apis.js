const express = require('express');
const router = express.Router();

/**
 * 관리자 API 라우터
 * 
 * 포함된 API:
 * - DELETE /api/admin/delete-product/:id - 임시 제품 삭제 API (개발용)
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
 * 데이터베이스를 동적으로 가져오는 함수
 */
function getDatabase() {
    try {
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(__dirname, '../database/data/repair_center.db');
        return new sqlite3.Database(dbPath);
    } catch (error) {
        console.error('데이터베이스를 가져올 수 없습니다:', error.message);
        return null;
    }
}

/**
 * 임시 제품 삭제 API (개발용)
 * DELETE /api/admin/delete-product/:id
 */
router.delete('/api/admin/delete-product/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const db = getDatabase();
        if (!db) {
            return res.status(500).json({
                success: false,
                message: '데이터베이스에 연결할 수 없습니다.'
            });
        }
        
        const query = 'DELETE FROM products WHERE id = ?';
        db.run(query, [id], function(err) {
            if (err) {
                console.error('제품 삭제 오류:', err.message);
                res.status(500).json({ success: false, message: '제품 삭제에 실패했습니다.' });
            } else if (this.changes === 0) {
                res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
            } else {
                console.log(`✅ 제품 ID ${id} 삭제 완료`);
                res.json({ success: true, message: '제품이 삭제되었습니다.' });
            }
        });
    } catch (error) {
        console.error('제품 삭제 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '제품 삭제 중 오류가 발생했습니다.'
        });
    }
});

module.exports = router;
