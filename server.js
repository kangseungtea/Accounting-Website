const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// 미들웨어
app.use(cors({
  origin: ['http://kkam.shop', 'https://kkam.shop', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('.'));

// 메모리 저장소 (실제 프로덕션에서는 데이터베이스 사용)
let users = [
  { name: '관리자', username: 'admin', password: '1234', phone: '010-0000-0000', id: 1 }
];

// 세션 관리 (실제 프로덕션에서는 Redis 등 사용)
let sessions = new Map();

// 고객 데이터 저장소
let customers = [
  { 
    id: 1, 
    name: '김철수', 
    company: 'ABC 컴퓨터',
    businessNumber: '123-45-67890',
    phone: '010-1234-5678', 
    email: 'kim@example.com', 
    address: '서울시 강남구', 
    managementNumber: 'CUST-001',
    registrationDate: new Date('2024-01-15'), 
    lastVisit: new Date('2024-10-01'), 
    totalSpent: 150000, 
    visitCount: 5, 
    status: '활성', 
    notes: '정기 고객' 
  },
  { 
    id: 2, 
    name: '이영희', 
    company: 'XYZ 시스템',
    businessNumber: '987-65-43210',
    phone: '010-9876-5432', 
    email: 'lee@example.com', 
    address: '서울시 서초구', 
    managementNumber: 'CUST-002',
    registrationDate: new Date('2024-03-20'), 
    lastVisit: new Date('2024-09-28'), 
    totalSpent: 85000, 
    visitCount: 3, 
    status: '활성', 
    notes: '노트북 수리' 
  }
];

// 세션 생성 함수
function createSession(user) {
  const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const sessionData = {
    userId: user.id,
    username: user.username,
    name: user.name,
    createdAt: new Date(),
    lastAccess: new Date()
  };
  sessions.set(sessionId, sessionData);
  return sessionId;
}

// 세션 검증 함수
function validateSession(sessionId) {
  if (!sessionId) return null;
  
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  // 세션 만료 체크 (24시간)
  const now = new Date();
  const sessionAge = now - session.lastAccess;
  if (sessionAge > 24 * 60 * 60 * 1000) {
    sessions.delete(sessionId);
    return null;
  }
  
  // 마지막 접근 시간 업데이트
  session.lastAccess = now;
  return session;
}

// 로그인 API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    const sessionId = createSession(user);
    res.cookie('sessionId', sessionId, { 
      httpOnly: true, 
      secure: false, // HTTPS에서는 true로 설정
      maxAge: 24 * 60 * 60 * 1000 // 24시간
    });
    res.json({ 
      success: true, 
      message: '로그인 성공', 
      user: { name: user.name, username: user.username } 
    });
  } else {
    res.json({ success: false, message: '아이디 또는 비밀번호가 잘못되었습니다.' });
  }
});

// 인증 상태 확인 API
app.get('/api/check-auth', (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = validateSession(sessionId);
  
  if (session) {
    res.json({ 
      success: true, 
      user: { name: session.name, username: session.username } 
    });
  } else {
    res.json({ success: false, message: '인증되지 않은 사용자입니다.' });
  }
});

// 로그아웃 API
app.post('/api/logout', (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.clearCookie('sessionId');
  res.json({ success: true, message: '로그아웃되었습니다.' });
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

// 인증 미들웨어
function requireAuth(req, res, next) {
  const sessionId = req.cookies.sessionId;
  const session = validateSession(sessionId);
  
  if (session) {
    req.user = session;
    next();
  } else {
    res.status(401).json({ success: false, message: '인증이 필요합니다.' });
  }
}

// 고객 관리 API
// 고객 목록 조회
app.get('/api/customers', requireAuth, (req, res) => {
  const { page = 1, limit = 10, search = '', status = '' } = req.query;
  
  let filteredCustomers = customers;
  
  // 검색 필터링
  if (search) {
    filteredCustomers = customers.filter(customer => 
      customer.name.includes(search) || 
      customer.phone.includes(search) ||
      customer.email.includes(search)
    );
  }
  
  // 상태 필터링
  if (status) {
    filteredCustomers = filteredCustomers.filter(customer => 
      customer.status === status
    );
  }
  
  // 페이지네이션
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedCustomers,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredCustomers.length / limit),
      totalItems: filteredCustomers.length,
      itemsPerPage: parseInt(limit)
    }
  });
});

// 고객 상세 조회
app.get('/api/customers/:id', requireAuth, (req, res) => {
  const customerId = parseInt(req.params.id);
  const customer = customers.find(c => c.id === customerId);
  
  if (customer) {
    res.json({ success: true, data: customer });
  } else {
    res.json({ success: false, message: '고객을 찾을 수 없습니다.' });
  }
});

// 고객 등록
app.post('/api/customers', requireAuth, (req, res) => {
  const { name, company, businessNumber, phone, email, address, managementNumber, notes } = req.body;
  
  // 필수 필드 검증
  if (!name || !phone) {
    return res.json({ success: false, message: '이름과 전화번호는 필수입니다.' });
  }
  
  // 중복 전화번호 체크
  const existingCustomer = customers.find(c => c.phone === phone);
  if (existingCustomer) {
    return res.json({ success: false, message: '이미 등록된 전화번호입니다.' });
  }
  
  // 새 고객 생성
  const newCustomer = {
    id: Date.now(),
    name,
    company: company || '',
    businessNumber: businessNumber || '',
    phone,
    email: email || '',
    address: address || '',
    managementNumber: managementNumber || '',
    registrationDate: new Date(),
    lastVisit: null,
    totalSpent: 0,
    visitCount: 0,
    status: '활성',
    notes: notes || ''
  };
  
  customers.push(newCustomer);
  res.json({ success: true, message: '고객이 등록되었습니다.', data: newCustomer });
});

// 고객 수정
app.put('/api/customers/:id', requireAuth, (req, res) => {
  const customerId = parseInt(req.params.id);
  const customerIndex = customers.findIndex(c => c.id === customerId);
  
  if (customerIndex === -1) {
    return res.json({ success: false, message: '고객을 찾을 수 없습니다.' });
  }
  
  const { name, company, businessNumber, phone, email, address, managementNumber, status, notes } = req.body;
  
  // 전화번호 중복 체크 (자신 제외)
  if (phone && phone !== customers[customerIndex].phone) {
    const existingCustomer = customers.find(c => c.phone === phone && c.id !== customerId);
    if (existingCustomer) {
      return res.json({ success: false, message: '이미 등록된 전화번호입니다.' });
    }
  }
  
  // 고객 정보 업데이트
  customers[customerIndex] = {
    ...customers[customerIndex],
    name: name || customers[customerIndex].name,
    company: company !== undefined ? company : customers[customerIndex].company,
    businessNumber: businessNumber !== undefined ? businessNumber : customers[customerIndex].businessNumber,
    phone: phone || customers[customerIndex].phone,
    email: email || customers[customerIndex].email,
    address: address || customers[customerIndex].address,
    managementNumber: managementNumber !== undefined ? managementNumber : customers[customerIndex].managementNumber,
    status: status || customers[customerIndex].status,
    notes: notes || customers[customerIndex].notes
  };
  
  res.json({ success: true, message: '고객 정보가 수정되었습니다.', data: customers[customerIndex] });
});

// 고객 삭제
app.delete('/api/customers/:id', requireAuth, (req, res) => {
  const customerId = parseInt(req.params.id);
  const customerIndex = customers.findIndex(c => c.id === customerId);
  
  if (customerIndex === -1) {
    return res.json({ success: false, message: '고객을 찾을 수 없습니다.' });
  }
  
  customers.splice(customerIndex, 1);
  res.json({ success: true, message: '고객이 삭제되었습니다.' });
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
