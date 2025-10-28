const express = require('express');

/**
 * 인증 관련 API 라우터
 * - 로그인/로그아웃
 * - 인증 상태 확인
 * - 인증 미들웨어
 */
const router = express.Router();

/**
 * 로그인 API
 * POST /api/login
 */
router.post('/api/login', (req, res) => {
    try {
        console.log('로그인 요청 받음:', req.body);
        const { username, password } = req.body;
        
        if (!username || !password) {
            console.log('사용자명 또는 비밀번호 누락');
            return res.status(400).json({ success: false, message: '사용자명과 비밀번호를 입력해주세요.' });
        }
        
        // admin 계정 특별 처리 (하위 호환성)
        if (username === 'admin' && password === 'admin123') {
            console.log('관리자 계정 로그인 성공');
            req.session.userId = 'admin';
            req.session.username = 'admin';
            return res.json({ 
                success: true, 
                message: '로그인 성공',
                user: { id: 'admin', username: 'admin', name: '관리자' }
            });
        }
        
        // 데이터베이스에서 사용자 확인
        const db = req.db;
        const query = 'SELECT id, username, password, name FROM users WHERE username = ?';
        
        db.get(query, [username], (err, user) => {
            if (err) {
                console.error('사용자 조회 오류:', err.message);
                return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
            }
            
            if (!user) {
                console.log('사용자를 찾을 수 없습니다:', username);
                return res.status(401).json({ success: false, message: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
            }
            
            // 비밀번호 확인
            const bcrypt = require('bcrypt');
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error('비밀번호 확인 오류:', err.message);
                    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
                }
                
                if (isMatch) {
                    console.log('로그인 성공:', username);
                    req.session.userId = user.id.toString();
                    req.session.username = user.username;
                    res.json({ 
                        success: true, 
                        message: '로그인 성공',
                        user: { id: user.id, username: user.username, name: user.name }
                    });
                } else {
                    console.log('비밀번호가 일치하지 않습니다:', username);
                    res.status(401).json({ success: false, message: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
                }
            });
        });
    } catch (error) {
        console.error('로그인 API 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 로그아웃 API
 * POST /api/logout
 */
router.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('세션 삭제 오류:', err.message);
            res.status(500).json({ success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' });
        } else {
            res.json({ success: true, message: '로그아웃되었습니다.' });
        }
    });
});

/**
 * 로그인 상태 확인 API
 * GET /api/auth/status
 */
router.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            success: true, 
            isLoggedIn: true,
            user: { id: req.session.userId, username: req.session.username }
        });
    } else {
        res.json({ 
            success: true, 
            isLoggedIn: false 
        });
    }
});

/**
 * 회원 가입 API
 * POST /api/register
 */
router.post('/api/register', (req, res) => {
    try {
        console.log('회원 가입 요청 받음:', req.body);
        const { name, username, password, phone } = req.body;
        const db = req.db; // 데이터베이스는 미들웨어에서 주입
        
        if (!name || !username || !password || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: '모든 필수 정보를 입력해주세요. (이름, 사용자명, 비밀번호, 전화번호)' 
            });
        }
        
        // 사용자명 중복 확인
        const checkQuery = 'SELECT id FROM users WHERE username = ?';
        db.get(checkQuery, [username], (err, row) => {
            if (err) {
                console.error('사용자명 중복 확인 오류:', err.message);
                return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
            }
            
            if (row) {
                return res.status(400).json({ success: false, message: '이미 사용 중인 사용자명입니다.' });
            }
            
            // 비밀번호 해시화
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            
            bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
                if (err) {
                    console.error('비밀번호 해시화 오류:', err.message);
                    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
                }
                
                // 사용자 등록
                const insertQuery = 'INSERT INTO users (name, username, password, phone, created_at) VALUES (?, ?, ?, ?, datetime("now"))';
                const params = [name, username, hashedPassword, phone];
                
                db.run(insertQuery, params, function(err) {
                    if (err) {
                        console.error('사용자 등록 오류:', err.message);
                        return res.status(500).json({ success: false, message: '회원 가입에 실패했습니다.' });
                    }
                    
                    console.log('새 사용자 등록 성공:', { id: this.lastID, username });
                    res.json({ 
                        success: true, 
                        message: '회원 가입이 완료되었습니다.',
                        user: { id: this.lastID, name, username, phone }
                    });
                });
            });
        });
    } catch (error) {
        console.error('회원 가입 API 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

/**
 * 인증 미들웨어
 * 다른 라우터에서 사용할 수 있도록 export
 */
function requireAuth(req, res, next) {
    console.log('인증 확인:', {
        sessionId: req.sessionID,
        userId: req.session.userId,
        username: req.session.username,
        url: req.url,
        method: req.method
    });
    
    if (req.session.userId) {
        next();
    } else {
        console.log('인증 실패 - 세션 없음');
        res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
}

// requireAuth 미들웨어를 export하여 다른 파일에서 사용할 수 있도록 함
router.requireAuth = requireAuth;

module.exports = router;
