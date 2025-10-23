const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 미들웨어
app.use(cors({
  origin: ['http://kkam.shop', 'https://kkam.shop', 'http://kkam.shop:3000', 'https://kkam.shop:3000', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('.'));

// 데이터 파일 경로
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const REPAIRS_FILE = path.join(DATA_DIR, 'repairs.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

// 데이터 디렉토리 생성
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// 데이터 로드 함수
function loadData(filePath, defaultData) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`데이터 로드 오류 (${filePath}):`, error);
  }
  return defaultData;
}

// 데이터 저장 함수
function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`데이터 저장 오류 (${filePath}):`, error);
    return false;
  }
}

// 데이터 로드
let users = loadData(USERS_FILE, [
  { name: '관리자', username: 'admin', password: '1234', phone: '010-0000-0000', id: 1 }
]);

// 세션 관리 (실제 프로덕션에서는 Redis 등 사용)
let sessions = new Map();

// 고객 데이터 저장소
let customers = loadData(CUSTOMERS_FILE, [
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
]);

// 방문 기록 데이터 저장소
let visitRecords = loadData(path.join(DATA_DIR, 'visitRecords.json'), [
  {
    id: 1,
    customerId: 1,
    visitDate: new Date('2024-10-01'),
    purpose: '노트북 수리',
    description: '화면 깨짐 수리',
    status: '완료',
    technician: '김기사',
    cost: 50000,
    notes: '화면 교체 완료'
  },
  {
    id: 2,
    customerId: 2,
    visitDate: new Date('2024-09-28'),
    purpose: '데스크탑 점검',
    description: '정기 점검 및 청소',
    status: '완료',
    technician: '이기사',
    cost: 20000,
    notes: '정상 작동 확인'
  }
]);

// 수리 이력 데이터 저장소
let repairRecords = loadData(REPAIRS_FILE, [
  {
    id: 1,
    customerId: 1,
    repairDate: new Date('2024-10-01'),
    deviceType: '노트북',
    deviceModel: 'Samsung Galaxy Book Pro',
    problem: '화면 깨짐',
    solution: 'LCD 패널 교체',
    parts: ['LCD 패널', '액정 테이프'],
    laborCost: 30000,
    partsCost: 20000,
    totalCost: 50000,
    warranty: 90,
    status: '완료',
    technician: '김기사',
    notes: '화면 교체 완료, 90일 보증'
  }
]);

// 구매/매입 이력 데이터 저장소
let purchaseRecords = [
  {
    id: 1,
    customerId: 1,
    purchaseDate: new Date('2024-10-01'),
    type: '판매', // 판매, 매입
    items: [
      {
        name: '마우스',
        quantity: 2,
        unitPrice: 15000,
        totalPrice: 30000
      },
      {
        name: '키보드',
        quantity: 1,
        unitPrice: 25000,
        totalPrice: 25000
      }
    ],
    totalAmount: 55000,
    paymentMethod: '카드',
    status: '완료',
    notes: '추가 주문'
  }
];

// 제품 데이터 저장소
let products = loadData(PRODUCTS_FILE, [
  {
    id: 1,
    name: '로지텍 MX Master 3S',
    category: '마우스',
    brand: '로지텍',
    price: 129000,
    stockQuantity: 15,
    status: '정품',
    description: '고급 무선 마우스, 8K DPI 센서, USB-C 충전',
    imageUrl: '',
    registrationDate: new Date('2024-01-10')
  },
  {
    id: 2,
    name: '키크론 K8 Pro',
    category: '키보드',
    brand: '키크론',
    price: 159000,
    stockQuantity: 10,
    status: '직구',
    description: '텐키리스 기계식 키보드, 무선/유선 겸용, RGB 백라이트',
    imageUrl: '',
    registrationDate: new Date('2024-02-15')
  },
  {
    id: 3,
    name: 'LG 울트라기어 27GL850',
    category: '모니터',
    brand: 'LG',
    price: 450000,
    stockQuantity: 5,
    status: '정품',
    description: '27인치 QHD 나노IPS 게이밍 모니터, 144Hz, 1ms',
    imageUrl: '',
    registrationDate: new Date('2024-03-20')
  }
]);

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
  
  // 데이터 저장
  if (saveData(CUSTOMERS_FILE, customers)) {
    res.json({ success: true, message: '고객이 등록되었습니다.', data: newCustomer });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
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
  
  // 데이터 저장
  if (saveData(CUSTOMERS_FILE, customers)) {
    res.json({ success: true, message: '고객 정보가 수정되었습니다.', data: customers[customerIndex] });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
});

// 고객 삭제
app.delete('/api/customers/:id', requireAuth, (req, res) => {
  const customerId = parseInt(req.params.id);
  const customerIndex = customers.findIndex(c => c.id === customerId);
  
  if (customerIndex === -1) {
    return res.json({ success: false, message: '고객을 찾을 수 없습니다.' });
  }
  
  customers.splice(customerIndex, 1);
  
  // 데이터 저장
  if (saveData(CUSTOMERS_FILE, customers)) {
    res.json({ success: true, message: '고객이 삭제되었습니다.' });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
});

// 방문 기록 관리 API
// 방문 기록 목록 조회
app.get('/api/visits', requireAuth, (req, res) => {
  const { page = 1, limit = 10, customerId, search = '' } = req.query;
  
  let filteredVisits = visitRecords;
  
  // 고객 ID 필터링
  if (customerId) {
    filteredVisits = filteredVisits.filter(v => v.customerId === parseInt(customerId));
  }
  
  // 검색 필터링
  if (search) {
    filteredVisits = filteredVisits.filter(v => 
      v.purpose.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase()) ||
      v.technician.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // 정렬 (최신순)
  filteredVisits.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
  
  // 페이지네이션
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedVisits = filteredVisits.slice(startIndex, endIndex);
  
  // 고객 정보 추가
  const visitsWithCustomer = paginatedVisits.map(visit => {
    const customer = customers.find(c => c.id === visit.customerId);
    return {
      ...visit,
      customerName: customer ? customer.name : '알 수 없음'
    };
  });
  
  res.json({
    success: true,
    data: visitsWithCustomer,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredVisits.length / limit),
      totalItems: filteredVisits.length,
      itemsPerPage: parseInt(limit)
    }
  });
});

// 방문 기록 등록
app.post('/api/visits', requireAuth, (req, res) => {
  const { customerId, visitDate, purpose, description, status, technician, cost, notes } = req.body;
  
  if (!customerId || !visitDate || !purpose) {
    return res.json({ success: false, message: '고객ID, 방문일, 목적은 필수입니다.' });
  }
  
  const newVisit = {
    id: Date.now(),
    customerId: parseInt(customerId),
    visitDate: new Date(visitDate),
    purpose,
    description: description || '',
    status: status || '예약',
    technician: technician || '',
    cost: cost || 0,
    notes: notes || ''
  };
  
  visitRecords.push(newVisit);
  res.json({ success: true, message: '방문 기록이 등록되었습니다.', data: newVisit });
});

// 수리 이력 관리 API
// 수리 이력 목록 조회
app.get('/api/repairs', requireAuth, (req, res) => {
  const { page = 1, limit = 10, customerId, search = '' } = req.query;
  
  let filteredRepairs = repairRecords;
  
  if (customerId) {
    filteredRepairs = filteredRepairs.filter(r => r.customerId === parseInt(customerId));
  }
  
  if (search) {
    filteredRepairs = filteredRepairs.filter(r => 
      r.deviceModel.toLowerCase().includes(search.toLowerCase()) ||
      r.problem.toLowerCase().includes(search.toLowerCase()) ||
      r.solution.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  filteredRepairs.sort((a, b) => new Date(b.repairDate) - new Date(a.repairDate));
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedRepairs = filteredRepairs.slice(startIndex, endIndex);
  
  const repairsWithCustomer = paginatedRepairs.map(repair => {
    const customer = customers.find(c => c.id === repair.customerId);
    return {
      ...repair,
      customerName: customer ? customer.name : '알 수 없음'
    };
  });
  
  res.json({
    success: true,
    data: repairsWithCustomer,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredRepairs.length / limit),
      totalItems: filteredRepairs.length,
      itemsPerPage: parseInt(limit)
    }
  });
});

// 수리 이력 등록
app.post('/api/repairs', requireAuth, (req, res) => {
  console.log('수리 이력 등록 요청:', req.body);
  console.log('요청 헤더:', req.headers);
  
  const { customerId, repairDate, deviceType, deviceModel, problem, solution, parts, laborCost, partsCost, warranty, technician, status, notes } = req.body;
  
  if (!customerId || !repairDate || !problem) {
    console.log('필수 필드 누락:', { customerId, repairDate, problem });
    return res.json({ success: false, message: '고객ID, 수리일, 문제는 필수입니다.' });
  }
  
  const totalCost = (laborCost || 0) + (partsCost || 0);
  
  const newRepair = {
    id: Date.now(),
    customerId: parseInt(customerId),
    repairDate: new Date(repairDate),
    deviceType: '기타', // 기본값으로 설정
    deviceModel: deviceModel || '',
    problem,
    solution: solution || '',
    parts: parts || [],
    laborCost: laborCost || 0,
    partsCost: partsCost || 0,
    totalCost,
    warranty: warranty || '',
    status: status || '완료',
    technician: technician || '',
    notes: notes || ''
  };
  
  repairRecords.push(newRepair);
  
  // 데이터 저장
  if (saveData(REPAIRS_FILE, repairRecords)) {
    res.json({ success: true, message: '수리 이력이 등록되었습니다.', data: newRepair });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
});

// 수리 이력 상세 조회
app.get('/api/repairs/:id', requireAuth, (req, res) => {
  const repairId = parseInt(req.params.id);
  const repair = repairRecords.find(r => r.id === repairId);
  
  if (repair) {
    res.json({ success: true, data: repair });
  } else {
    res.json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
  }
});

// 수리 이력 수정
app.put('/api/repairs/:id', requireAuth, (req, res) => {
  const repairId = parseInt(req.params.id);
  const repairIndex = repairRecords.findIndex(r => r.id === repairId);
  
  if (repairIndex === -1) {
    return res.json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
  }
  
  const { repairDate, deviceModel, problem, solution, parts, laborCost, partsCost, warranty, technician, status, notes } = req.body;
  
  const totalCost = (laborCost || 0) + (partsCost || 0);
  
  repairRecords[repairIndex] = {
    ...repairRecords[repairIndex],
    repairDate: repairDate ? new Date(repairDate) : repairRecords[repairIndex].repairDate,
    deviceModel: deviceModel !== undefined ? deviceModel : repairRecords[repairIndex].deviceModel,
    problem: problem || repairRecords[repairIndex].problem,
    solution: solution !== undefined ? solution : repairRecords[repairIndex].solution,
    parts: parts || repairRecords[repairIndex].parts,
    laborCost: laborCost !== undefined ? laborCost : repairRecords[repairIndex].laborCost,
    partsCost: partsCost !== undefined ? partsCost : repairRecords[repairIndex].partsCost,
    totalCost,
    warranty: warranty !== undefined ? warranty : repairRecords[repairIndex].warranty,
    technician: technician !== undefined ? technician : repairRecords[repairIndex].technician,
    status: status !== undefined ? status : repairRecords[repairIndex].status,
    notes: notes !== undefined ? notes : repairRecords[repairIndex].notes
  };
  
  res.json({ success: true, message: '수리 이력이 수정되었습니다.', data: repairRecords[repairIndex] });
});

// 수리 이력 삭제
app.delete('/api/repairs/:id', requireAuth, (req, res) => {
  const repairId = parseInt(req.params.id);
  const repairIndex = repairRecords.findIndex(r => r.id === repairId);
  
  if (repairIndex === -1) {
    return res.json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
  }
  
  repairRecords.splice(repairIndex, 1);
  res.json({ success: true, message: '수리 이력이 삭제되었습니다.' });
});

// 수리 이력 상태 변경
app.put('/api/repairs/:id/status', requireAuth, (req, res) => {
  const repairId = parseInt(req.params.id);
  const repairIndex = repairRecords.findIndex(r => r.id === repairId);
  
  if (repairIndex === -1) {
    return res.json({ success: false, message: '수리 이력을 찾을 수 없습니다.' });
  }
  
  const { status } = req.body;
  const validStatuses = ['접수', '위탁접수', '완료', '보증중'];
  
  if (!status || !validStatuses.includes(status)) {
    return res.json({ success: false, message: '유효하지 않은 상태입니다.' });
  }
  
  repairRecords[repairIndex].status = status;
  res.json({ success: true, message: '수리 상태가 변경되었습니다.', data: repairRecords[repairIndex] });
});

// 구매/매입 이력 관리 API
// 구매 이력 목록 조회
app.get('/api/purchases', requireAuth, (req, res) => {
  const { page = 1, limit = 10, customerId, type, search = '' } = req.query;
  
  let filteredPurchases = purchaseRecords;
  
  if (customerId) {
    filteredPurchases = filteredPurchases.filter(p => p.customerId === parseInt(customerId));
  }
  
  if (type) {
    filteredPurchases = filteredPurchases.filter(p => p.type === type);
  }
  
  if (search) {
    filteredPurchases = filteredPurchases.filter(p => 
      p.items.some(item => item.name.toLowerCase().includes(search.toLowerCase())) ||
      p.paymentMethod.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  filteredPurchases.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedPurchases = filteredPurchases.slice(startIndex, endIndex);
  
  const purchasesWithCustomer = paginatedPurchases.map(purchase => {
    const customer = customers.find(c => c.id === purchase.customerId);
    return {
      ...purchase,
      customerName: customer ? customer.name : '알 수 없음'
    };
  });
  
  res.json({
    success: true,
    data: purchasesWithCustomer,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredPurchases.length / limit),
      totalItems: filteredPurchases.length,
      itemsPerPage: parseInt(limit)
    }
  });
});

// 구매 이력 등록
app.post('/api/purchases', requireAuth, (req, res) => {
  const { customerId, purchaseDate, type, items, paymentMethod, notes } = req.body;
  
  if (!customerId || !purchaseDate || !type || !items || !Array.isArray(items)) {
    return res.json({ success: false, message: '고객ID, 구매일, 구분, 상품목록은 필수입니다.' });
  }
  
  const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  
  const newPurchase = {
    id: Date.now(),
    customerId: parseInt(customerId),
    purchaseDate: new Date(purchaseDate),
    type,
    items,
    totalAmount,
    paymentMethod: paymentMethod || '현금',
    status: '완료',
    notes: notes || ''
  };
  
  purchaseRecords.push(newPurchase);
  res.json({ success: true, message: '구매 이력이 등록되었습니다.', data: newPurchase });
});

// 제품 관리 API
// 제품 목록 조회
app.get('/api/products', requireAuth, (req, res) => {
  const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
  
  let filteredProducts = products;
  
  // 검색 필터링
  if (search) {
    filteredProducts = filteredProducts.filter(product => 
      product.name.toLowerCase().includes(search.toLowerCase()) || 
      (product.brand && product.brand.toLowerCase().includes(search.toLowerCase()))
    );
  }
  
  // 카테고리 필터링
  if (category) {
    filteredProducts = filteredProducts.filter(product => 
      product.category === category
    );
  }
  
  // 상태 필터링
  if (status) {
    filteredProducts = filteredProducts.filter(product => 
      product.status === status
    );
  }
  
  // 페이지네이션
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedProducts,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredProducts.length / limit),
      totalItems: filteredProducts.length,
      itemsPerPage: parseInt(limit)
    }
  });
});

// 제품 상세 조회
app.get('/api/products/:id', requireAuth, (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);
  
  if (product) {
    res.json({ success: true, data: product });
  } else {
    res.json({ success: false, message: '제품을 찾을 수 없습니다.' });
  }
});

// 제품 등록
app.post('/api/products', requireAuth, (req, res) => {
  const { name, category, brand, price, stockQuantity, status, description } = req.body;
  
  // 필수 필드 검증
  if (!name || !category || price === undefined || stockQuantity === undefined) {
    return res.json({ success: false, message: '제품명, 카테고리, 가격, 재고수량은 필수입니다.' });
  }
  
  // 새 제품 생성
  const newProduct = {
    id: Date.now(),
    name,
    category,
    brand: brand || '',
    price: parseInt(price),
    stockQuantity: parseInt(stockQuantity),
    status: status || '활성',
    description: description || '',
    imageUrl: '',
    registrationDate: new Date()
  };
  
  products.push(newProduct);
  
  // 데이터 저장
  if (saveData(PRODUCTS_FILE, products)) {
    res.json({ success: true, message: '제품이 등록되었습니다.', data: newProduct });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
});

// 제품 수정
app.put('/api/products/:id', requireAuth, (req, res) => {
  const productId = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return res.json({ success: false, message: '제품을 찾을 수 없습니다.' });
  }
  
  const { name, category, brand, price, stockQuantity, status, description } = req.body;
  
  // 제품 정보 업데이트
  products[productIndex] = {
    ...products[productIndex],
    name: name || products[productIndex].name,
    category: category || products[productIndex].category,
    brand: brand !== undefined ? brand : products[productIndex].brand,
    price: price !== undefined ? parseInt(price) : products[productIndex].price,
    stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : products[productIndex].stockQuantity,
    status: status || products[productIndex].status,
    description: description !== undefined ? description : products[productIndex].description
  };
  
  // 데이터 저장
  if (saveData(PRODUCTS_FILE, products)) {
    res.json({ success: true, message: '제품 정보가 수정되었습니다.', data: products[productIndex] });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
});

// 제품 삭제
app.delete('/api/products/:id', requireAuth, (req, res) => {
  const productId = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return res.json({ success: false, message: '제품을 찾을 수 없습니다.' });
  }
  
  products.splice(productIndex, 1);
  
  // 데이터 저장
  if (saveData(PRODUCTS_FILE, products)) {
    res.json({ success: true, message: '제품이 삭제되었습니다.' });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
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
