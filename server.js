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
    labor: [
      {
        description: 'LCD 패널 교체 작업',
        hours: 2,
        rate: 15000,
        total: 30000
      }
    ],
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
  
  // 파일에서 최신 고객 데이터 로드
  const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
  let filteredCustomers = loadData(CUSTOMERS_FILE, customers);
  
  // 구매이력에서 총 구매금액 계산
  const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
  const purchases = loadData(PURCHASES_FILE, purchaseRecords);
  
  // 각 고객의 총 구매금액 계산
  filteredCustomers = filteredCustomers.map(customer => {
    const customerPurchases = purchases.filter(p => p.customerId === customer.id);
    const totalSpent = customerPurchases.reduce((sum, purchase) => {
      return sum + (purchase.totalAmount || 0);
    }, 0);
    
    return {
      ...customer,
      totalSpent: totalSpent
    };
  });
  
  // 검색 필터링
  if (search) {
    filteredCustomers = filteredCustomers.filter(customer => 
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
  
  console.log('수리 이력 조회 요청:', { page, limit, customerId, search });
  console.log('전체 수리 이력 개수:', repairRecords.length);
  
  let filteredRepairs = repairRecords;
  
  if (customerId) {
    console.log('고객 ID로 필터링:', customerId, '타입:', typeof customerId);
    const customerIdInt = parseInt(customerId);
    console.log('변환된 고객 ID:', customerIdInt);
    filteredRepairs = filteredRepairs.filter(r => r.customerId === customerIdInt);
    console.log('필터링 후 수리 이력 개수:', filteredRepairs.length);
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
  
  const { customerId, repairDate, deviceType, deviceModel, problem, solution, parts, labor, laborCost, partsCost, warranty, technician, status, notes, vatOption } = req.body;
  
  if (!customerId || !repairDate || !problem) {
    console.log('필수 필드 누락:', { customerId, repairDate, problem });
    return res.json({ success: false, message: '고객ID, 수리일, 문제는 필수입니다.' });
  }
  
  // 기본 금액 (부품비 + 인건비)
  const baseAmount = (laborCost || 0) + (partsCost || 0);
  
  // 부가세별 총 비용 계산
  let totalCost;
  if (vatOption === 'included') {
    // 부가세 포함: 기본 금액이 이미 부가세 포함된 금액
    totalCost = baseAmount;
  } else if (vatOption === 'excluded') {
    // 부가세 미포함: 기본 금액에 부가세 추가
    const vatAmount = Math.round(baseAmount * 0.1);
    totalCost = baseAmount + vatAmount;
  } else {
    // 부가세 없음: 기본 금액 그대로
    totalCost = baseAmount;
  }
  
  const newRepair = {
    id: Date.now(),
    customerId: parseInt(customerId),
    repairDate: new Date(repairDate),
    deviceType: '기타', // 기본값으로 설정
    deviceModel: deviceModel || '',
    problem,
    solution: solution || '',
    parts: parts || [],
    labor: labor || [],
    laborCost: laborCost || 0,
    partsCost: partsCost || 0,
    totalCost,
    warranty: warranty || '',
    status: status || '완료',
    technician: technician || '',
    notes: notes || '',
    vatOption: vatOption || 'included'
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
  
  const { repairDate, deviceModel, problem, solution, parts, labor, laborCost, partsCost, warranty, technician, status, notes, vatOption } = req.body;
  
  // 기본 금액 (부품비 + 인건비)
  const baseAmount = (laborCost || 0) + (partsCost || 0);
  
  // 부가세별 총 비용 계산
  let totalCost;
  if (vatOption === 'included') {
    // 부가세 포함: 기본 금액이 이미 부가세 포함된 금액
    totalCost = baseAmount;
  } else if (vatOption === 'excluded') {
    // 부가세 미포함: 기본 금액에 부가세 추가
    const vatAmount = Math.round(baseAmount * 0.1);
    totalCost = baseAmount + vatAmount;
  } else {
    // 부가세 없음: 기본 금액 그대로
    totalCost = baseAmount;
  }
  
  repairRecords[repairIndex] = {
    ...repairRecords[repairIndex],
    repairDate: repairDate ? new Date(repairDate) : repairRecords[repairIndex].repairDate,
    deviceModel: deviceModel !== undefined ? deviceModel : repairRecords[repairIndex].deviceModel,
    problem: problem || repairRecords[repairIndex].problem,
    solution: solution !== undefined ? solution : repairRecords[repairIndex].solution,
    parts: parts || repairRecords[repairIndex].parts,
    labor: labor || repairRecords[repairIndex].labor || [],
    laborCost: laborCost !== undefined ? laborCost : repairRecords[repairIndex].laborCost,
    partsCost: partsCost !== undefined ? partsCost : repairRecords[repairIndex].partsCost,
    totalCost,
    warranty: warranty !== undefined ? warranty : repairRecords[repairIndex].warranty,
    technician: technician !== undefined ? technician : repairRecords[repairIndex].technician,
    status: status !== undefined ? status : repairRecords[repairIndex].status,
    notes: notes !== undefined ? notes : repairRecords[repairIndex].notes,
    vatOption: vatOption !== undefined ? vatOption : repairRecords[repairIndex].vatOption || 'included'
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
  
  // 파일에서 구매 이력 데이터 로드
  const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
  let filteredPurchases = loadData(PURCHASES_FILE, purchaseRecords);
  
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

// 구매이력 코드 생성 API
app.post('/api/purchases/generate-code', requireAuth, (req, res) => {
  const { type } = req.body; // '판매' 또는 '매입'
  
  if (!type) {
    return res.json({ success: false, message: '구매 유형이 필요합니다.' });
  }
  
  // 구매이력 코드 형식: [유형코드][년월일][순번]
  // 판매: S, 매입: P, 선출고: O
  const typeCode = type === '판매' ? 'S' : (type === '매입' ? 'P' : 'O');
  const today = new Date();
  const dateStr = today.getFullYear().toString().substr(-2) + 
                  (today.getMonth() + 1).toString().padStart(2, '0') + 
                  today.getDate().toString().padStart(2, '0');
  
  // 기존 구매이력에서 같은 날짜의 마지막 순번 찾기
  const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
  const existingPurchases = loadData(PURCHASES_FILE, purchaseRecords);
  const todayPurchases = existingPurchases.filter(p => {
    const purchaseDate = new Date(p.purchaseDate);
    return purchaseDate.getFullYear() === today.getFullYear() &&
           purchaseDate.getMonth() === today.getMonth() &&
           purchaseDate.getDate() === today.getDate() &&
           p.purchaseCode && p.purchaseCode.startsWith(typeCode + dateStr);
  });
  
  let nextNumber = 1;
  if (todayPurchases.length > 0) {
    const lastCode = todayPurchases[todayPurchases.length - 1].purchaseCode;
    const lastNumber = parseInt(lastCode.substring(5)) || 0; // typeCode(1) + dateStr(4) = 5자리
    nextNumber = lastNumber + 1;
  }
  
  const purchaseCode = typeCode + dateStr + nextNumber.toString().padStart(3, '0');
  
  res.json({ success: true, purchaseCode });
});

// 구매 이력 등록
app.post('/api/purchases', requireAuth, (req, res) => {
  const { customerId, purchaseDate, type, items, paymentMethod, notes, taxInfo, purchaseCode } = req.body;
  
  if (!customerId || !purchaseDate || !type || !items || !Array.isArray(items)) {
    return res.json({ success: false, message: '고객ID, 구매일, 구분, 상품목록은 필수입니다.' });
  }
  
  const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  
  // 구매이력 코드가 없으면 자동 생성
  let finalPurchaseCode = purchaseCode;
  if (!finalPurchaseCode) {
    const typeCode = type === '판매' ? 'S' : (type === '매입' ? 'P' : 'O');
    const today = new Date();
    const dateStr = today.getFullYear().toString().substr(-2) + 
                    (today.getMonth() + 1).toString().padStart(2, '0') + 
                    today.getDate().toString().padStart(2, '0');
    
    const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
    const existingPurchases = loadData(PURCHASES_FILE, purchaseRecords);
    const todayPurchases = existingPurchases.filter(p => {
      const purchaseDate = new Date(p.purchaseDate);
      return purchaseDate.getFullYear() === today.getFullYear() &&
             purchaseDate.getMonth() === today.getMonth() &&
             purchaseDate.getDate() === today.getDate() &&
             p.purchaseCode && p.purchaseCode.startsWith(typeCode + dateStr);
    });
    
    let nextNumber = 1;
    if (todayPurchases.length > 0) {
      const lastCode = todayPurchases[todayPurchases.length - 1].purchaseCode;
      const lastNumber = parseInt(lastCode.substring(5)) || 0;
      nextNumber = lastNumber + 1;
    }
    
    finalPurchaseCode = typeCode + dateStr + nextNumber.toString().padStart(3, '0');
  }
  
  // 제품 재고 업데이트
  const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
  let products = loadData(PRODUCTS_FILE, []);
  let stockUpdated = false;
  
  if (type === '판매') {
    // 판매 시 재고 차감
    for (const item of items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          products[productIndex].stockQuantity = newStock;
          stockUpdated = true;
          console.log(`제품 ${products[productIndex].name} 재고 차감: ${currentStock} → ${newStock} (${item.quantity}개 판매)`);
        }
      }
    }
  } else if (type === '매입') {
    // 매입 시 재고 증가
    for (const item of items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          const newStock = currentStock + item.quantity;
          products[productIndex].stockQuantity = newStock;
          stockUpdated = true;
          console.log(`제품 ${products[productIndex].name} 재고 증가: ${currentStock} → ${newStock} (${item.quantity}개 매입)`);
        }
      }
    }
  } else if (type === '선출고') {
    // 선출고 시 재고 차감 (판매와 동일)
    for (const item of items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          products[productIndex].stockQuantity = newStock;
          stockUpdated = true;
          console.log(`제품 ${products[productIndex].name} 재고 차감: ${currentStock} → ${newStock} (${item.quantity}개 선출고)`);
        }
      }
    }
  }
  
  // 제품 재고가 업데이트된 경우 저장
  if (stockUpdated) {
    if (!saveData(PRODUCTS_FILE, products)) {
      return res.json({ success: false, message: '제품 재고 업데이트에 실패했습니다.' });
    }
  }

  const newPurchase = {
    id: Date.now(),
    customerId: parseInt(customerId),
    purchaseDate: new Date(purchaseDate),
    type,
    items,
    totalAmount,
    paymentMethod: paymentMethod || '현금',
    status: '완료',
    notes: notes || '',
    taxInfo: taxInfo || null,
    purchaseCode: finalPurchaseCode
  };
  
  purchaseRecords.push(newPurchase);
  
  // 데이터 저장
  const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
  if (saveData(PURCHASES_FILE, purchaseRecords)) {
    res.json({ success: true, message: '구매 이력이 등록되었습니다.', data: newPurchase });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
});

// 제품 코드 생성용 카테고리 매핑 (실제 카테고리 데이터에 맞춤)
const categoryCodeMapping = {
  '컴퓨터부품': {
    code: '10',
    subCategories: {
      'CPU': { code: '11', detailCategories: { '기본': '110' } },
      '메모리': { code: '12', detailCategories: { '기본': '120' } },
      '그래픽카드': { code: '13', detailCategories: { '기본': '130' } },
      '메인보드': { code: '14', detailCategories: { '기본': '140' } },
      '파워': { code: '15', detailCategories: { '기본': '150' } },
      '케이스': { code: '16', detailCategories: { '기본': '160' } },
      '팬': { code: '17', detailCategories: { '기본': '170' } },
      '하드디스크': { code: '18', detailCategories: { '기본': '180' } },
      'SSD': { code: '19', detailCategories: { '기본': '190' } },
      '광학드라이브': { code: '20', detailCategories: { '기본': '200' } },
      '기타': { code: '21', detailCategories: { '기본': '210' } }
    }
  },
  '소프트웨어': {
    code: '30',
    subCategories: {
      '운영체제': { code: '31', detailCategories: { 'Windows': '311', 'macOS': '312', 'Linux': '313' } },
      '오피스': { code: '32', detailCategories: { 'Microsoft Office': '321', '한글': '322', 'LibreOffice': '323' } },
      '보안': { code: '33', detailCategories: { '백신': '331', '방화벽': '332', '암호화': '333' } },
      '기타': { code: '34', detailCategories: { '게임': '341', '편집툴': '342', '개발툴': '343' } }
    }
  },
  '주변기기': {
    code: '50',
    subCategories: {
      '키보드': { code: '51', detailCategories: { '기계식': '511', '멤브레인': '512', '무선': '513' } },
      '마우스': { code: '52', detailCategories: { '게이밍마우스': '521', '무선마우스': '522', '트랙볼': '523' } },
      '스피커': { code: '53', detailCategories: { '게이밍스피커': '531', '블루투스스피커': '532', '홈시어터': '533' } }
    }
  }
};

// 제품 코드 생성 API
app.post('/api/products/generate-code', requireAuth, (req, res) => {
  const { mainCategory, subCategory, detailCategory } = req.body;
  
  console.log('제품 코드 생성 요청:', { mainCategory, subCategory, detailCategory });
  
  if (!mainCategory || !subCategory || !detailCategory) {
    return res.json({ success: false, message: '카테고리 정보가 부족합니다.' });
  }
  
  const mainCat = categoryCodeMapping[mainCategory];
  if (!mainCat) {
    console.log('유효하지 않은 대분류:', mainCategory);
    return res.json({ success: false, message: '유효하지 않은 대분류입니다.' });
  }
  
  const subCat = mainCat.subCategories[subCategory];
  if (!subCat) {
    console.log('유효하지 않은 중분류:', subCategory);
    return res.json({ success: false, message: '유효하지 않은 중분류입니다.' });
  }
  
  const detailCode = subCat.detailCategories[detailCategory];
  if (!detailCode) {
    console.log('유효하지 않은 소분류:', detailCategory);
    return res.json({ success: false, message: '유효하지 않은 소분류입니다.' });
  }
  
  // 기존 제품에서 해당 카테고리의 마지막 순번 찾기
  const categoryPrefix = mainCat.code + subCat.code + detailCode;
  const existingProducts = products.filter(p => p.productCode && p.productCode.startsWith(categoryPrefix));
  
  let nextNumber = 1;
  if (existingProducts.length > 0) {
    const lastCode = existingProducts[existingProducts.length - 1].productCode;
    const lastNumber = parseInt(lastCode.substring(categoryPrefix.length)) || 0;
    nextNumber = lastNumber + 1;
  }
  
  const productCode = categoryPrefix + nextNumber.toString().padStart(2, '0');
  
  console.log('생성된 제품 코드:', productCode);
  
  res.json({ success: true, productCode });
});

// 제품 코드 중복 검증 API
app.get('/api/products/check-code', requireAuth, (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.json({ success: false, message: '제품 코드가 필요합니다.' });
  }
  
  const existingProduct = products.find(p => p.productCode === code);
  
  res.json({ 
    success: true, 
    exists: !!existingProduct,
    message: existingProduct ? '이미 사용 중인 제품 코드입니다.' : '사용 가능한 제품 코드입니다.'
  });
});

// 기존 제품들에 제품 코드 추가 API (개발용)
app.post('/api/products/add-codes', requireAuth, (req, res) => {
  let updatedCount = 0;
  
  products.forEach((product, index) => {
    if (!product.productCode) {
      // 카테고리별로 기본 코드 할당
      let categoryPrefix = '9999'; // 기본값
      
      if (product.category === '컴퓨터부품') {
        categoryPrefix = '1011'; // CPU 기본
      } else if (product.category === '소프트웨어') {
        categoryPrefix = '3031'; // 운영체제 기본
      } else if (product.category === '주변기기') {
        categoryPrefix = '5051'; // 키보드 기본
      }
      
      // 기존 제품들 중 같은 카테고리에서 마지막 번호 찾기
      const sameCategoryProducts = products.filter(p => p.productCode && p.productCode.startsWith(categoryPrefix));
      let nextNumber = 1;
      
      if (sameCategoryProducts.length > 0) {
        const lastCode = sameCategoryProducts[sameCategoryProducts.length - 1].productCode;
        const lastNumber = parseInt(lastCode.substring(categoryPrefix.length)) || 0;
        nextNumber = lastNumber + 1;
      }
      
      product.productCode = categoryPrefix + nextNumber.toString().padStart(2, '0');
      updatedCount++;
    }
  });
  
  // 데이터 저장
  if (saveData(PRODUCTS_FILE, products)) {
    res.json({ success: true, message: `${updatedCount}개 제품에 코드가 추가되었습니다.` });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
});

// 제품 관리 API
// 제품 목록 조회
app.get('/api/products', requireAuth, (req, res) => {
  const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
  
  // 파일에서 최신 제품 데이터 로드
  const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
  let filteredProducts = loadData(PRODUCTS_FILE, products);
  
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
  const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
  const products = loadData(PRODUCTS_FILE, []);
  const product = products.find(p => p.id === productId);
  
  if (product) {
    res.json({ success: true, data: product });
  } else {
    res.json({ success: false, message: '제품을 찾을 수 없습니다.' });
  }
});

// 제품 등록
app.post('/api/products', requireAuth, (req, res) => {
  const { name, category, brand, price, stockQuantity, status, description, productCode } = req.body;
  
  // 필수 필드 검증
  if (!name || !category || price === undefined) {
    return res.json({ success: false, message: '제품명, 카테고리, 가격은 필수입니다.' });
  }
  
  // 새 제품 생성
  const newProduct = {
    id: Date.now(),
    name,
    category,
    brand: brand || '',
    price: parseInt(price),
    stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : 0,
    status: status || '활성',
    description: description || '',
    imageUrl: '',
    productCode: productCode || '',
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

// 카테고리 관리 API
// 카테고리 추가
app.post('/api/categories', requireAuth, (req, res) => {
  const { level, parentCategory, subParentCategory, categoryName, categoryDescription } = req.body;
  
  // 필수 필드 검증
  if (!level || !categoryName) {
    return res.json({ success: false, message: '카테고리 레벨과 이름은 필수입니다.' });
  }
  
  // 카테고리 데이터 파일 경로
  const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
  
  // 기본 카테고리 데이터
  const defaultCategories = {
    '컴퓨터부품': {
      'CPU': [],
      '메모리': [],
      '그래픽카드': [],
      '메인보드': [],
      '파워': [],
      '케이스': [],
      '팬': [],
      '하드디스크': [],
      'SSD': [],
      '광학드라이브': [],
      '기타': []
    },
    '소프트웨어': {
      '운영체제': ['Windows', 'macOS', 'Linux'],
      '오피스': ['Microsoft Office', '한글', 'LibreOffice'],
      '보안': ['백신', '방화벽', '암호화'],
      '기타': ['게임', '편집툴', '개발툴']
    },
    '주변기기': {
      '키보드': ['기계식', '멤브레인', '무선'],
      '마우스': ['게이밍마우스', '무선마우스', '트랙볼'],
      '스피커': ['게이밍스피커', '블루투스스피커', '홈시어터'],
      
    },
  };

  // 기존 카테고리 데이터 로드 (기존 데이터 우선)
  let existingCategories = loadData(CATEGORIES_FILE, {});
  let categories = { ...defaultCategories };
  
  // 기존 데이터에서 기본 카테고리가 아닌 새로운 카테고리만 추가
  Object.keys(existingCategories).forEach(category => {
    if (!defaultCategories[category]) {
      categories[category] = existingCategories[category];
    } else {
      // 기본 카테고리가 있는 경우, 기존 데이터로 덮어쓰기
      categories[category] = existingCategories[category];
    }
  });
  
  try {
    if (level === 'main') {
      // 대분류 추가
      if (categories[categoryName]) {
        return res.json({ success: false, message: '이미 존재하는 대분류입니다.' });
      }
      categories[categoryName] = {};
      
    } else if (level === 'sub') {
      // 중분류 추가
      if (!parentCategory || !categories[parentCategory]) {
        return res.json({ success: false, message: '유효하지 않은 상위 카테고리입니다.' });
      }
      if (categories[parentCategory][categoryName]) {
        return res.json({ success: false, message: '이미 존재하는 중분류입니다.' });
      }
      categories[parentCategory][categoryName] = [];
      
    } else if (level === 'detail') {
      // 소분류 추가
      if (!parentCategory || !subParentCategory || !categories[parentCategory] || !categories[parentCategory][subParentCategory]) {
        return res.json({ success: false, message: '유효하지 않은 상위 카테고리입니다.' });
      }
      if (categories[parentCategory][subParentCategory].includes(categoryName)) {
        return res.json({ success: false, message: '이미 존재하는 소분류입니다.' });
      }
      categories[parentCategory][subParentCategory].push(categoryName);
    }
    
    // 데이터 저장
    if (saveData(CATEGORIES_FILE, categories)) {
      res.json({ 
        success: true, 
        message: '카테고리가 성공적으로 추가되었습니다.',
        categoryData: categories
      });
    } else {
      res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
    }
  } catch (error) {
    console.error('카테고리 추가 오류:', error);
    res.json({ success: false, message: '카테고리 추가 중 오류가 발생했습니다.' });
  }
});

// 카테고리 목록 조회
app.get('/api/categories', requireAuth, (req, res) => {
  const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
  
  // 기본 카테고리 데이터
  const defaultCategories = {
    '컴퓨터부품': {
      'CPU': [],
      '메모리': [],
      '그래픽카드': [],
      '메인보드': [],
      '파워': [],
      '케이스': [],
      '팬': [],
      '하드디스크': [],
      'SSD': [],
      '광학드라이브': [],
      '기타': []
    },
    '소프트웨어': {
      '운영체제': ['Windows', 'macOS', 'Linux'],
      '오피스': ['Microsoft Office', '한글', 'LibreOffice'],
      '보안': ['백신', '방화벽', '암호화'],
      '기타': ['게임', '편집툴', '개발툴']
    },
    '주변기기': {
      '키보드': ['기계식', '멤브레인', '무선'],
      '마우스': ['게이밍마우스', '무선마우스', '트랙볼'],
      '스피커': ['게이밍스피커', '블루투스스피커', '홈시어터']
    }
  };

  // 기존 카테고리 데이터 로드 (기존 데이터 우선)
  let existingCategories = loadData(CATEGORIES_FILE, {});
  let categories = { ...defaultCategories };
  
  // 기존 데이터에서 기본 카테고리가 아닌 새로운 카테고리만 추가
  Object.keys(existingCategories).forEach(category => {
    if (!defaultCategories[category]) {
      categories[category] = existingCategories[category];
    } else {
      // 기본 카테고리가 있는 경우, 기존 데이터로 덮어쓰기
      categories[category] = existingCategories[category];
    }
  });
  
  res.json({ success: true, data: categories });
});

// 구매 이력 단일 조회
app.get('/api/purchases/:id', requireAuth, (req, res) => {
  const purchaseId = parseInt(req.params.id);
  const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
  
  let purchases = loadData(PURCHASES_FILE, purchaseRecords);
  const purchase = purchases.find(p => p.id === purchaseId);
  
  if (purchase) {
    res.json({ success: true, data: purchase });
  } else {
    res.json({ success: false, message: '구매 이력을 찾을 수 없습니다.' });
  }
});

// 구매 이력 수정
app.put('/api/purchases/:id', requireAuth, (req, res) => {
  const purchaseId = parseInt(req.params.id);
  const { customerId, purchaseDate, type, items, paymentMethod, notes, taxInfo } = req.body;
  
  if (!customerId || !purchaseDate || !type || !items || !Array.isArray(items)) {
    return res.json({ success: false, message: '고객ID, 구매일, 구분, 상품목록은 필수입니다.' });
  }
  
  const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
  let purchases = loadData(PURCHASES_FILE, purchaseRecords);
  const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
  
  if (purchaseIndex === -1) {
    return res.json({ success: false, message: '구매 이력을 찾을 수 없습니다.' });
  }
  
  const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  
  // 기존 구매이력의 재고 복원 (이전 재고 변경사항 되돌리기)
  const oldPurchase = purchases[purchaseIndex];
  const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
  let products = loadData(PRODUCTS_FILE, []);
  
  // 기존 구매이력의 재고 변경사항 되돌리기
  if (oldPurchase.type === '판매') {
    // 기존 판매 → 재고 복원 (증가)
    for (const item of oldPurchase.items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          products[productIndex].stockQuantity = currentStock + item.quantity;
          console.log(`제품 ${products[productIndex].name} 재고 복원: ${currentStock} → ${products[productIndex].stockQuantity} (기존 판매 ${item.quantity}개 복원)`);
        }
      }
    }
  } else if (oldPurchase.type === '매입') {
    // 기존 매입 → 재고 복원 (차감)
    for (const item of oldPurchase.items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          products[productIndex].stockQuantity = Math.max(0, currentStock - item.quantity);
          console.log(`제품 ${products[productIndex].name} 재고 복원: ${currentStock} → ${products[productIndex].stockQuantity} (기존 매입 ${item.quantity}개 복원)`);
        }
      }
    }
  } else if (oldPurchase.type === '선출고') {
    // 기존 선출고 → 재고 복원 (증가, 판매와 동일)
    for (const item of oldPurchase.items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          products[productIndex].stockQuantity = currentStock + item.quantity;
          console.log(`제품 ${products[productIndex].name} 재고 복원: ${currentStock} → ${products[productIndex].stockQuantity} (기존 선출고 ${item.quantity}개 복원)`);
        }
      }
    }
  }
  
  // 새로운 구매이력에 따른 재고 업데이트
  if (type === '판매') {
    // 판매 시 재고 차감
    for (const item of items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          products[productIndex].stockQuantity = newStock;
          console.log(`제품 ${products[productIndex].name} 재고 차감: ${currentStock} → ${newStock} (${item.quantity}개 판매)`);
        }
      }
    }
  } else if (type === '매입') {
    // 매입 시 재고 증가
    for (const item of items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          const newStock = currentStock + item.quantity;
          products[productIndex].stockQuantity = newStock;
          console.log(`제품 ${products[productIndex].name} 재고 증가: ${currentStock} → ${newStock} (${item.quantity}개 매입)`);
        }
      }
    }
  } else if (type === '선출고') {
    // 선출고 시 재고 차감 (판매와 동일)
    for (const item of items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          products[productIndex].stockQuantity = newStock;
          console.log(`제품 ${products[productIndex].name} 재고 차감: ${currentStock} → ${newStock} (${item.quantity}개 선출고)`);
        }
      }
    }
  }
  
  // 제품 재고 저장
  if (!saveData(PRODUCTS_FILE, products)) {
    return res.json({ success: false, message: '제품 재고 업데이트에 실패했습니다.' });
  }
  
  purchases[purchaseIndex] = {
    ...purchases[purchaseIndex],
    customerId: parseInt(customerId),
    purchaseDate: new Date(purchaseDate),
    type,
    items,
    totalAmount,
    paymentMethod: paymentMethod || '현금',
    notes: notes || '',
    taxInfo: taxInfo || null
  };
  
  // 데이터 저장
  if (saveData(PURCHASES_FILE, purchases)) {
    res.json({ success: true, message: '구매 이력이 수정되었습니다.', data: purchases[purchaseIndex] });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
});

// 기존 구매이력에 코드 추가 API (개발용)
app.post('/api/purchases/add-codes', requireAuth, (req, res) => {
  const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
  let purchases = loadData(PURCHASES_FILE, purchaseRecords);
  let updatedCount = 0;
  
  purchases.forEach((purchase, index) => {
    if (!purchase.purchaseCode) {
      // 구매이력 코드 형식: [유형코드][년월일][순번]
      const typeCode = purchase.type === '판매' ? 'S' : (purchase.type === '매입' ? 'P' : 'O');
      const purchaseDate = new Date(purchase.purchaseDate);
      const dateStr = purchaseDate.getFullYear().toString().substr(-2) + 
                      (purchaseDate.getMonth() + 1).toString().padStart(2, '0') + 
                      purchaseDate.getDate().toString().padStart(2, '0');
      
      // 같은 날짜의 기존 구매이력에서 마지막 번호 찾기
      const sameDatePurchases = purchases.filter(p => {
        const pDate = new Date(p.purchaseDate);
        return pDate.getFullYear() === purchaseDate.getFullYear() &&
               pDate.getMonth() === purchaseDate.getMonth() &&
               pDate.getDate() === purchaseDate.getDate() &&
               p.purchaseCode && p.purchaseCode.startsWith(typeCode + dateStr);
      });
      
      let nextNumber = 1;
      if (sameDatePurchases.length > 0) {
        const lastCode = sameDatePurchases[sameDatePurchases.length - 1].purchaseCode;
        const lastNumber = parseInt(lastCode.substring(5)) || 0;
        nextNumber = lastNumber + 1;
      }
      
      purchase.purchaseCode = typeCode + dateStr + nextNumber.toString().padStart(3, '0');
      updatedCount++;
    }
  });
  
  // 데이터 저장
  if (saveData(PURCHASES_FILE, purchases)) {
    res.json({ success: true, message: `${updatedCount}개 구매이력에 코드가 추가되었습니다.` });
  } else {
    res.json({ success: false, message: '데이터 저장에 실패했습니다.' });
  }
});

// 구매 이력 삭제
app.delete('/api/purchases/:id', requireAuth, (req, res) => {
  const purchaseId = parseInt(req.params.id);
  const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
  
  let purchases = loadData(PURCHASES_FILE, purchaseRecords);
  const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
  
  if (purchaseIndex === -1) {
    return res.json({ success: false, message: '구매 이력을 찾을 수 없습니다.' });
  }
  
  // 삭제할 구매이력의 재고 복원
  const purchaseToDelete = purchases[purchaseIndex];
  const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
  let products = loadData(PRODUCTS_FILE, []);
  
  if (purchaseToDelete.type === '판매') {
    // 판매 삭제 → 재고 복원 (증가)
    for (const item of purchaseToDelete.items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          products[productIndex].stockQuantity = currentStock + item.quantity;
          console.log(`제품 ${products[productIndex].name} 재고 복원: ${currentStock} → ${products[productIndex].stockQuantity} (판매 삭제로 ${item.quantity}개 복원)`);
        }
      }
    }
  } else if (purchaseToDelete.type === '매입') {
    // 매입 삭제 → 재고 복원 (차감)
    for (const item of purchaseToDelete.items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          products[productIndex].stockQuantity = Math.max(0, currentStock - item.quantity);
          console.log(`제품 ${products[productIndex].name} 재고 복원: ${currentStock} → ${products[productIndex].stockQuantity} (매입 삭제로 ${item.quantity}개 복원)`);
        }
      }
    }
  } else if (purchaseToDelete.type === '선출고') {
    // 선출고 삭제 → 재고 복원 (증가, 판매와 동일)
    for (const item of purchaseToDelete.items) {
      if (item.productId) {
        const productIndex = products.findIndex(p => p.id == item.productId);
        if (productIndex !== -1) {
          const currentStock = products[productIndex].stockQuantity || 0;
          products[productIndex].stockQuantity = currentStock + item.quantity;
          console.log(`제품 ${products[productIndex].name} 재고 복원: ${currentStock} → ${products[productIndex].stockQuantity} (선출고 삭제로 ${item.quantity}개 복원)`);
        }
      }
    }
  }
  
  // 제품 재고 저장
  if (!saveData(PRODUCTS_FILE, products)) {
    return res.json({ success: false, message: '제품 재고 업데이트에 실패했습니다.' });
  }
  
  purchases.splice(purchaseIndex, 1);
  
  // 데이터 저장
  if (saveData(PURCHASES_FILE, purchases)) {
    res.json({ success: true, message: '구매 이력이 삭제되었습니다.' });
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
