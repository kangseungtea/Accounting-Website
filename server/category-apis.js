const express = require('express');
const categoryUtils = require('./category-utils');

/**
 * 카테고리 관리 API 라우터
 * - 카테고리 목록 조회
 * - 카테고리 추가
 * - 카테고리 테이블 재생성
 */
const router = express.Router();

/**
 * 카테고리 목록 조회 API
 * GET /api/categories
 */
router.get('/api/categories', (req, res) => {
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    const query = 'SELECT * FROM categories ORDER BY main_category, sub_category, detail_category';
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('카테고리 조회 오류:', err.message);
            res.status(500).json({ success: false, message: '카테고리 목록을 불러오는데 실패했습니다.' });
        } else {
            // 데이터베이스의 실제 데이터만 반환
            res.json({ success: true, data: rows });
        }
    });
});

/**
 * 카테고리 추가 API
 * POST /api/categories
 */
router.post('/api/categories', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const { level, parentCategory, subParentCategory, categoryName, categoryDescription } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    console.log('=== 카테고리 추가 요청 ===');
    console.log('요청 데이터:', req.body);
    console.log('level:', level);
    console.log('parentCategory:', parentCategory);
    console.log('subParentCategory:', subParentCategory);
    console.log('categoryName:', categoryName);
    
    if (!level || !categoryName) {
        return res.status(400).json({ success: false, message: '카테고리 레벨과 이름은 필수입니다.' });
    }
    
    let mainCategory, subCategory, detailCategory;
    
    if (level === 'main') {
        // 대분류 추가
        mainCategory = categoryName;
        subCategory = null;
        detailCategory = null;
    } else if (level === 'sub') {
        // 중분류 추가
        if (!parentCategory) {
            return res.status(400).json({ success: false, message: '상위 카테고리(대분류)를 선택해주세요.' });
        }
        mainCategory = parentCategory;
        subCategory = categoryName;
        detailCategory = null;
    } else if (level === 'detail') {
        // 소분류 추가
        if (!parentCategory || !subParentCategory) {
            return res.status(400).json({ success: false, message: '상위 카테고리(대분류, 중분류)를 선택해주세요.' });
        }
        mainCategory = parentCategory;
        subCategory = subParentCategory;
        detailCategory = categoryName;
    } else {
        return res.status(400).json({ success: false, message: '유효하지 않은 카테고리 레벨입니다.' });
    }
    
    // 코드 생성 (간단한 방식)
    const code = `${mainCategory}_${subCategory || ''}_${detailCategory || ''}`.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    
    const insertQuery = `
        INSERT INTO categories (main_category, sub_category, detail_category, code)
        VALUES (?, ?, ?, ?)
    `;
    
    const params = [mainCategory, subCategory, detailCategory, code];
    
    db.run(insertQuery, params, function(err) {
        if (err) {
            console.error('카테고리 추가 오류:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ success: false, message: '이미 존재하는 카테고리입니다.' });
            } else {
                res.status(500).json({ success: false, message: '카테고리 추가에 실패했습니다.' });
            }
        } else {
            console.log('카테고리 추가 성공:', { id: this.lastID, mainCategory, subCategory, detailCategory });
            res.json({ 
                success: true, 
                message: '카테고리가 성공적으로 추가되었습니다.',
                data: { id: this.lastID, mainCategory, subCategory, detailCategory, code }
            });
        }
    });
});

/**
 * 카테고리 테이블 재생성 API (관리자 전용)
 * POST /api/admin/recreate-categories-table
 */
router.post('/api/admin/recreate-categories-table', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    const recreateQuery = categoryUtils.getRecreateCategoriesTableQuery();
    
    db.exec(recreateQuery, (err) => {
        if (err) {
            console.error('카테고리 테이블 재생성 오류:', err.message);
            return res.status(500).json({ success: false, message: '테이블 재생성 실패' });
        }
        
        console.log('카테고리 테이블이 성공적으로 재생성되었습니다.');
        res.json({ success: true, message: '카테고리 테이블이 재생성되었습니다.' });
    });
});

module.exports = router;
