const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 80;

// 미들웨어
app.use(cors({
  origin: ['http://kkam.shop', 'https://kkam.shop', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// 메모리 저장소 (실제 프로덕션에서는 데이터베이스 사용)
let users = [
  { name: '관리자', username: 'admin', password: '1234', phone: '010-0000-0000', id: 1 }
];

// 로그인 API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    res.json({ success: true, message: '로그인 성공', user: { name: user.name, username: user.username } });
  } else {
    res.json({ success: false, message: '아이디 또는 비밀번호가 잘못되었습니다.' });
  }
});

// 회원가입 API
app.post('/api/register', (req, res) => {
  const { name, username, password, phone } = req.body;
  
  // 중복 체크
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return res.json({ success: false, message: '이미 존재하는 아이디입니다.' });
  }
  
  // 새 사용자 추가
  const newUser = { name, username, password, phone, id: Date.now() };
  users.push(newUser);
  
  res.json({ success: true, message: '회원가입이 완료되었습니다.' });
});

// 기본 라우트
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 모든 라우트에 대해 index.html 반환 (SPA 지원)
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`http://localhost:${PORT} 에서 확인하세요.`);
  console.log(`도메인: http://kkam.shop:${PORT}`);
});
