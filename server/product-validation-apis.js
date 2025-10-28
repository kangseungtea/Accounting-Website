const express = require('express');

/**
 * 제품 검증 API 라우터
 * - 제품명 중복 검사
 * - 제품 코드 중복 검사
 * - 제품 코드 자동 생성
 */
const router = express.Router();

/**
 * 제품명 중복 검사 API
 * GET /api/products/check-duplicate
 */
router.get('/api/products/check-duplicate', (req, res) => {
    console.log('제품 중복 검사 API 호출됨 - 인증 없음');
    const { name, status } = req.query;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    if (!name || !status) {
        return res.status(400).json({ success: false, message: '제품명과 상태가 필요합니다.' });
    }
    
    const query = 'SELECT id FROM products WHERE name = ? AND status = ?';
    db.get(query, [name, status], (err, row) => {
        if (err) {
            console.error('제품 중복 검사 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 중복 검사에 실패했습니다.' });
        } else {
            const exists = !!row;
            console.log('제품 중복 검사 결과:', { name, status, exists, row });
            res.json({ success: true, exists });
        }
    });
});

/**
 * 제품 코드 중복 검사 API
 * GET /api/products/check-code
 */
router.get('/api/products/check-code', (req, res) => {
    console.log('제품 코드 검사 API 호출됨 - 인증 없음');
    const { code } = req.query;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    if (!code) {
        return res.status(400).json({ success: false, message: '제품 코드가 필요합니다.' });
    }
    
    const query = 'SELECT id FROM products WHERE product_code = ?';
    db.get(query, [code], (err, row) => {
        if (err) {
            console.error('제품 코드 검사 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 코드 검사에 실패했습니다.' });
        } else {
            const exists = !!row;
            console.log('제품 코드 검사 결과:', { code, exists, row });
            res.json({ success: true, exists });
        }
    });
});

/**
 * 제품 코드 자동 생성 API
 * POST /api/products/generate-code
 */
router.post('/api/products/generate-code', (req, res, next) => {
    // requireAuth 미들웨어를 수동으로 호출
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    next();
}, (req, res) => {
    const { mainCategory, subCategory, detailCategory } = req.body;
    const db = req.db; // 데이터베이스는 미들웨어에서 주입
    
    if (!mainCategory || !subCategory) {
        return res.status(400).json({ success: false, message: '대분류와 중분류는 필수입니다.' });
    }
    
    // 제품 코드 생성 (0대분류1중분류01소분류01상품명4자리)
    const categoryCodes = {
        '컴퓨터부품': '0',
        '소프트웨어': '1', 
        '주변기기': '2',
        '프린터': '3'
    };
    
    const subCategoryCodes = {
        // 컴퓨터부품 (0)
        'CPU': '1', '메모리': '2', '그래픽카드': '3', '메인보드': '4', '파워': '5',
        '케이스': '6', '팬': '7', '하드디스크': '8', 'SSD': '9', '광학드라이브': '0',
        '쿨러': '1', '기타': '2',
        // 소프트웨어 (1)
        '운영체제': '1', '오피스': '2', '보안': '3', '기타': '4',
        // 주변기기 (2)
        '모니터': '1', '키보드': '2', '마우스': '3', '스피커': '4',
        // 프린터 (3)
        '잉크젯': '1', '레이저': '2', '토너': '3', '용지': '4', '기타부품': '5'
    };
    
    const detailCategoryCodes = {
        // CPU
        '인텔': '01', 'AMD': '02', 'AMD_CPU': '03',
        // 메모리
        'DDR4': '01', 'DDR5': '02', 'DDR3': '03',
        // 그래픽카드
        'NVIDIA': '01', 'AMD': '02', 'RTX': '03', 'GTX': '04',
        // 메인보드
        '인텔': '01', 'AMD': '02', 'ATX': '03', 'M-ATX': '04', 'ITX': '05',
        // 파워
        '80PLUS': '01', '80PLUS_BRONZE': '02', '80PLUS_SILVER': '03', '80PLUS_GOLD': '04', '80PLUS_PLATINUM': '05',
        // 케이스
        'ATX': '01', 'M-ATX': '02', 'ITX': '03', '미들타워': '04', '풀타워': '05', '미니타워': '06',
        // 팬
        '120mm': '01', '140mm': '02', '200mm': '03', '쿨러': '04',
        // 하드디스크
        'SATA': '01', 'IDE': '02', '7200RPM': '03', '5400RPM': '04',
        // SSD
        'SATA': '01', 'M.2': '02', 'NVMe': '03', 'SATA3': '04',
        // 광학드라이브
        'DVD': '01', 'CD': '02', '블루레이': '03',
        // 쿨러
        '공랭': '01', '수랭': '02', '하이브리드': '03',
        // 기타
        '케이블': '01', '어댑터': '02', '브라켓': '03',
        // 운영체제
        'Windows': '01', 'Linux': '02', 'macOS': '03',
        // 오피스
        'Microsoft': '01', '한글': '02', '기타': '03',
        // 보안
        '백신': '01', '방화벽': '02', 'VPN': '03',
        // 모니터
        'LED': '01', 'IPS': '02', 'TN': '03', 'VA': '04', 'OLED': '05',
        // 키보드
        '기계식': '01', '멤브레인': '02', '무선': '03', '유선': '04',
        // 마우스
        '광학': '01', '레이저': '02', '무선': '03', '유선': '04',
        // 스피커
        '2.0': '01', '2.1': '02', '5.1': '03', '7.1': '04',
        // 잉크젯
        'Canon': '01', 'HP': '02', 'Epson': '03', 'Samsung': '04',
        // 레이저
        'Samsung': '01', 'HP': '02', 'Canon': '03', 'Brother': '04',
        // 토너
        'Samsung': '01', 'HP': '02', 'Canon': '03', 'Brother': '04',
        // 용지
        'A4': '01', 'A3': '02', 'Letter': '03', 'Legal': '04',
        // 기타부품
        '펌프': '01', '헤드': '02', '롤러': '03', '케이블': '04'
    };
    
    const mainCode = categoryCodes[mainCategory] || '9';
    const subCode = subCategoryCodes[subCategory] || '9';
    const detailCode = detailCategoryCodes[detailCategory] || '99';
    
    // 상품명 4자리 (랜덤)
    const productNameCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    const generatedCode = `${mainCode}${subCode}${detailCode}${productNameCode}`;
    
    // 중복 검사
    const checkQuery = 'SELECT id FROM products WHERE product_code = ?';
    db.get(checkQuery, [generatedCode], (err, row) => {
        if (err) {
            console.error('제품 코드 중복 검사 오류:', err.message);
            res.status(500).json({ success: false, message: '제품 코드 생성에 실패했습니다.' });
        } else if (row) {
            // 중복이면 다시 생성
            const newProductNameCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const newGeneratedCode = `${mainCode}${subCode}${detailCode}${newProductNameCode}`;
            
            console.log('제품 코드 생성 완료:', { 
                mainCategory, subCategory, detailCategory, 
                generatedCode: newGeneratedCode 
            });
            res.json({ 
                success: true, 
                code: newGeneratedCode,
                breakdown: {
                    mainCategory: mainCode,
                    subCategory: subCode,
                    detailCategory: detailCode,
                    productName: newProductNameCode
                }
            });
        } else {
            console.log('제품 코드 생성 완료:', { 
                mainCategory, subCategory, detailCategory, 
                generatedCode 
            });
            res.json({ 
                success: true, 
                code: generatedCode,
                breakdown: {
                    mainCategory: mainCode,
                    subCategory: subCode,
                    detailCategory: detailCode,
                    productName: productNameCode
                }
            });
        }
    });
});

module.exports = router;
