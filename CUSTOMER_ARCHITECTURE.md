# 고객 관리 시스템 - 구조 및 흐름 문서

## 📁 고객 관련 파일 구조

```
customers/
├── customers.html                   # 고객 목록 페이지
├── customers.js                     # 고객 목록 로직
├── customer-detail.html             # 고객 상세 정보 페이지
├── customer-detail-core.js          # 고객 기본 정보 관리
├── customer-detail-purchases.js     # 구매 이력 관리
├── customer-detail-repairs.js       # 수리 이력 관리
├── customer-detail-utils.js         # 고객 상세 유틸리티
├── customer-search.html             # 고급 검색 페이지
├── customer-search.js               # 검색 로직
├── customer-stats.html              # 고객 통계 페이지
├── customer-stats.js                # 통계 로직
├── customer-notifications.html      # 고객 알림 관리
├── customer-notifications.js        # 알림 로직
├── print-utils.js                   # 인쇄 유틸리티
└── print-templates/                 # 인쇄 템플릿
    ├── repair-detail-print.html
    └── repair-detail-print.css
```

## 🔄 주요 페이지 흐름

### 1. 고객 목록 페이지 (customers.html)

```
1. 페이지 로드
   ↓
2. customers.js: init() 실행
   ↓
3. API 호출: GET /api/customers
   ↓
4. 고객 데이터 로드 및 테이블 렌더링
   ↓
5. 검색/필터 기능 활성화
   - searchCustomers(): 실시간 검색
   - filterCustomers(): 상태별 필터
   ↓
6. 고객 행 클릭
   ↓
7. viewCustomerDetail(customerId) 실행
   ↓
8. customer-detail.html?id={customerId}로 이동
```

**주요 기능:**
- 고객 목록 표시
  - 번호 (customer.id): 고유 번호, 자동 생성
  - 관리번호 (management_number): 사용자 지정 번호, 직접 수정 가능
- 실시간 검색 (고객명, 회사명, 전화번호, 이메일)
- 상태별 필터링
- 새 고객 등록
- 고급 검색, 통계, 알림 페이지 링크

**API 호출:**
```javascript
GET /api/customers
Response: [
  {
    id: 1,
    name: "홍길동",
    company: "홍길동컴퓨터",
    phone: "010-1234-5678",
    email: "hong@example.com",
    status: "활성",
    created_at: "2025-01-01"
  },
  ...
]
```

#### 1.1 새 고객 등록 흐름

```
1. "새 고객 등록" 버튼 클릭
   ↓
2. showAddCustomerModal() 실행 (customers.js 218~222라인)
   ↓
3. 고객 등록 모달 표시
   ↓
4. 고객 정보 입력 (이름, 전화번호 필수)
   ↓
5. "저장" 버튼 클릭
   ↓
6. 고객 폼 제출 이벤트 리스너 실행 (customers.js 309~348라인)
   - FormData 수집
   - isEdit 체크
   ↓
7. API 호출: POST /api/customers
   ```json
   {
     "name": "홍길동",
     "phone": "010-1234-5678",
     "company": "홍길동컴퓨터",
     "management_number": "CUST-001",
     "status": "활성"
   }
   ```
   ↓
8. server/customer-apis.js 처리
   ↓
9. Database INSERT (id는 AUTOINCREMENT로 자동 생성)
   ↓
10. result.data.id 반환 (고유 번호)
   ↓
11. 성공 메시지 및 고객 목록 새로고침
```

**고유 번호 생성 방식:**
- 데이터베이스 `customers` 테이블의 `id` 컬럼은 PRIMARY KEY AUTOINCREMENT
- 새 고객 등록 시 서버에서 자동으로 증가하는 고유 번호 생성
- 클라이언트에서는 고유 번호를 직접 지정할 수 없음

#### 1.2 관리번호 업데이트 흐름

```
1. 고객 목록 테이블의 관리번호 입력칸에서 포커스 아웃
   ↓
2. onblur="updateManagementNumber(customerId, this.value)" 실행
   (customers.js 119라인)
   ↓
3. updateManagementNumber() 함수 실행 (customers.js 138~163라인)
   ↓
4. API 호출: PUT /api/customers/{id}
   ```json
   {
     "management_number": "CUST-001"
   }
   ```
   ↓
5. Database UPDATE
   ↓
6. 성공 메시지: "관리번호가 업데이트되었습니다."
```

**고유 번호 vs 관리번호:**
| 구분 | 고유 번호 (id) | 관리번호 (management_number) |
|------|----------------|------------------------------|
| 생성 방식 | 자동 (AUTOINCREMENT) | 사용자 입력 |
| 수정 가능 | 불가능 | 가능 |
| 표시 위치 | 고객 목록 '번호' 컬럼 | 고객 목록 '관리번호' 컬럼 |
| 용도 | 시스템 내부 식별자 | 사용자 지정 코드 |

### 2. 고객 상세 정보 페이지 (customer-detail.html)

#### 2.1 페이지 구조

```
페이지 레이아웃:
├── 네비게이션 바
├── 페이지 헤더
│   ├── 뒤로가기 버튼
│   ├── 고객 이름
│   └── 액션 버튼들
│       ├── 고객 정보 수정
│       ├── 방문 기록 추가
│       ├── 수리 이력 추가
│       └── 구매 이력 추가
├── 기본 정보 섹션
├── 탭 네비게이션
│   ├── 구매 이력 탭
│   ├── 수리 이력 탭
│   └── 방문 이력 탭
└── 모달들
    ├── 고객 정보 수정 모달
    ├── 구매 이력 추가 모달
    └── 수리 상세 정보 모달
```

#### 2.2 데이터 로드 흐름

```
1. URL에서 고객 ID 추출 (?id=42)
   ↓
2. customer-detail-core.js: loadCustomerDetails(id) 실행
   ↓
3. API 호출: GET /api/customers/42
   ↓
4. 고객 기본 정보 표시
   ↓
5. API 호출: GET /api/products?limit=1000 (제품 목록 로드)
   ↓
6. API 호출: GET /api/purchases?customerId=42&limit=1000 (구매 이력)
   ↓
7. customer-detail-purchases.js: displayPurchases(data) 실행
   ↓
8. API 호출: GET /api/repairs?customerId=42 (수리 이력)
   ↓
9. customer-detail-repairs.js: displayRepairs(repairs) 실행
   ↓
10. 각 탭의 데이터 표시
```

**API 호출 예시:**
```javascript
// 고객 기본 정보
GET /api/customers/42
Response: {
  id: 42,
  name: "홍길동",
  phone: "010-1234-5678",
  email: "hong@example.com",
  address: "서울시 강남구",
  company: "홍길동컴퓨터",
  status: "활성"
}

// 구매 이력
GET /api/purchases?customerId=42&limit=1000
Response: [
  {
    id: 100,
    purchase_code: "P202510251234",
    purchase_date: "2025-10-25",
    type: "판매",
    total_amount: 500000,
    payment_method: "현금",
    items: [...]
  },
  ...
]

// 수리 이력
GET /api/repairs?customerId=42
Response: [
  {
    id: 50,
    repair_date: "2025-10-25",
    device_model: "컴퓨터 조립",
    problem: "화면이 안 나옴",
    status: "완료",
    total_cost: 25000
  },
  ...
]
```

### 3. 구매 이력 관리 (customer-detail-purchases.js)

#### 3.1 구매 이력 추가 흐름

```
1. "구매 이력 추가" 버튼 클릭
   ↓
2. showAddPurchaseModal() 실행
   ↓
3. 모달 창 표시
   ↓
4. 고객 검색 및 선택
   ↓
5. 제품 선택 및 수량 입력
   ↓
6. "저장" 버튼 클릭
   ↓
7. API 호출: POST /api/purchases
   ```json
   {
     "customer_id": 42,
     "purchase_date": "2025-10-25",
     "type": "판매",
     "payment_method": "현금",
     "tax_option": "included",
     "items": [
       {
         "product_id": 10,
         "quantity": 1,
         "unit_price": 500000,
         "total_price": 500000
       }
     ]
   }
   ```
   ↓
8. server/purchase-apis.js 처리
   ↓
9. Database에 purchases와 purchase_items 저장
   ↓
10. Transactions 테이블에 PURCHASE 타입 저장
   ↓
11. 성공 메시지 및 테이블 새로고침
```

#### 3.2 구매 이력 삭제 흐름

```
1. 구매 이력 테이블의 "삭제" 버튼 클릭
   ↓
2. deletePurchase(purchaseId) 실행
   ↓
3. 확인 다이얼로그
   ↓
4. API 호출: DELETE /api/purchases/{id}
   ↓
5. Database에서 purchases, purchase_items 삭제
   ↓
6. Transactions 테이블에서 관련 항목 삭제
   ↓
7. 테이블 새로고침
```

#### 3.3 구매 이력 테이블 구조

```html
<table id="purchasesTable">
  <thead>
    <tr>
      <th>구매코드</th>
      <th>구매일</th>
      <th>구분</th>        <!-- 판매/구매/반품 -->
      <th>상품</th>
      <th>단가</th>
      <th>공급가액</th>
      <th>부가세</th>
      <th>총금액</th>
      <th>결제방법</th>
      <th>수량</th>
      <th>액션</th>
    </tr>
  </thead>
  <tbody>
    <!-- 구매 이력 목록 -->
    <!-- 각 항목당 2개 행:
         1. 구매 정보 (구매코드, 구매일, 총액 등)
         2. 상품 정보 (각 구매의 상품들)
    -->
  </tbody>
</table>
```

### 4. 수리 이력 관리 (customer-detail-repairs.js)

#### 4.1 수리 이력 추가 흐름

```
1. "수리 이력 추가" 버튼 클릭
   ↓
2. addRepair() 실행
   ↓
3. repair-add.js 모달 표시
   ↓
4. 수리 정보 입력
   - 고객 정보
   - 제품/기기 정보
   - 문제 설명
   - 해결 방법
   - 수리 비용 (인건비, 부품비)
   ↓
5. "저장" 버튼 클릭
   ↓
6. API 호출: POST /api/repairs
   ```json
   {
     "customerId": 42,
     "repairDate": "2025-10-25",
     "deviceModel": "컴퓨터 조립",
     "problem": "화면이 안 나옴",
     "solution": "전원 케이블 교체",
     "status": "완료",
     "totalCost": 25000,
     "labor": [
       {
         "description": "출장비",
         "amount": 25000
       }
     ],
     "parts": [...]
   }
   ```
   ↓
7. server/repair-apis.js 처리
   ↓
8. Database에 저장:
   - repairs 테이블
   - repair_labor 테이블
   - repair_parts 테이블
   ↓
9. Transactions 테이블에 저장 (status='완료'이고 totalCost > 0인 경우)
   - REPAIR_LABOR 타입
   - REPAIR_PART 타입
   ↓
10. localStorage.setItem('repairDataChanged', 'true')
   ↓
11. 다른 탭의 대시보드 자동 새로고침
   ↓
12. 수리 이력 테이블 새로고침
```

#### 4.2 수리 이력 조회 흐름

```
1. 수리 이력 탭 클릭
   ↓
2. loadRepairs() 실행
   ↓
3. API 호출: GET /api/repairs?customerId=42
   ↓
4. displayRepairs(repairs) 실행
   ↓
5. 수리 목록 테이블 렌더링
   ```html
   <table id="repairsTable">
     <thead>
       <tr>
         <th>번호</th>
         <th>접수일</th>
         <th>제품/기기</th>
         <th>문제</th>
         <th>상태</th>
         <th>수리비</th>
         <th>수리담당</th>
         <th>액션</th>
       </tr>
     </thead>
     <tbody>
       <!-- 수리 목록 -->
     </tbody>
   </table>
   ```
```

#### 4.3 수리 상세 정보 모달

```
1. 수리 목록의 "상세보기" 버튼 클릭
   ↓
2. viewRepairDetail(repairId) 실행
   ↓
3. API 호출: GET /api/adjacent repairs/{repairId}
   ↓
4. displayRepairDetail(repair) 실행
   ↓
5. 고객 수리 상세 정보 모달 표시
   ```html
   <div id="customerRepairDetailModal">
     <div class="modal-content">
       <!-- 수리 정보 표시 -->
       <div class="repair-info">
         <span id="detailRepairDate"></span>
         <span id="detailManagementNumber"></span>
         <span id="detailCustomerName"></span>
         <span id="detailPhone"></span>
         <span id="detailDeviceModel"></span>
         <span id="detailProblem"></span>
         <span id="detailSolution"></span>
         <span id="detailLaborCost"></span>
         <span id="detailPartsCost"></span>
         <span id="detailTotalCost"></span>
         <span id="detailTechnician"></span>
         <span id="detailStatus"></span>
       </div>
       <!-- 인쇄 버튼 -->
       <button onclick="printRepairDetailFromModal()">인쇄</button>
     </div>
   </div>
   ```
   ↓
6. 모달 닫기: closeRepairDetailModal()
```

### 5. 고객 검색 기능 (customer-search.html)

#### 5.1 고급 검색 흐름

```
1. customers.html에서 "🔍 고급 검색" 클릭
   ↓
2. customer-search.html 새 창으로 열림
   ↓
3. 검색 조건 입력
   - 고객명
   - 전화번호
   - 회사명
   - 이메일
   - 지역
   - 생성일 범위
   ↓
4. "검색" 버튼 클릭
   ↓
5. API 호출: GET /api/customers/search?{조건들}
   ↓
6. 검색 결과 표시
   ↓
7. 고객 선택 시 고객 상세 페이지로 이동
```

**API 호출 예시:**
```javascript
GET /api/customers/search?name=홍길동&region=서울
Response: {
  success: true,
  data: [
    {
      id: 42,
      name: "홍길동",
      phone: "010-1234-5678",
      company: "홍길동컴퓨터",
      region: "서울"
    }
  ]
}
```

### 6. 고객 통계 (customer-stats.html)

#### 6.1 통계 페이지 흐름

```
1. customers.html에서 "📊 고객 통계" 클릭
   ↓
2. customer-stats.html 새 창으로 열림
   ↓
3. API 호출들:
   - GET /api/customers (전체 고객 수)
   - GET /api/purchases (구매 통계)
   - GET /api/repairs (수리 통계)
   ↓
4. 통계 데이터 표시:
   - 총 고객 수
   - 활성 고객 수
   - 비활성 고객 수
   - 총 구매 금액
   - 총 수리 금액
   - 고객별 거래 횟수
   ↓
5. 차트/그래프 렌더링 (선택 사항)
```

### 7. 고객 알림 (customer-notifications.html)

#### 7.1 알림 관리 흐름

```
1. customers.html에서 "🔔 고객 알림" 클릭
   ↓
2. customer-notifications.html 새 창으로 열림
   ↓
3. 알림 목록 표시
   - 보증 만료 예정
   - 수리 완료되지 않은 항목
   - 결제 미완료 항목
   ↓
4. 알림 확인/처리
   ↓
5. 고객 연락 (전화, 문자, 이메일)
```

## 💾 데이터베이스 관계

```
customers (고객)
  ├── id (PK)
  ├── name
  ├── phone
  ├── email
  ├── company
  ├── status
  └── created_at

purchases (구매/판매)
  ├── id (PK)
  ├── customer_id (FK → customers.id)
  ├── purchase_code
  ├── purchase_date
  ├── type (판매/구매/반품)
  ├── total_amount
  └── payment_method

purchase_items (구매 상세)
  ├── id (PK)
  ├── purchase_id (FK → purchases.id)
  ├── product_id (FK → products.id)
  ├── quantity
  ├── unit_price
  └── total_price

repairs (수리)
  ├── id (PK)
  ├── customer_id (FK → customers.id)
  ├── repair_date
  ├── device_model
  ├── problem
  ├── solution
  ├── status
  ├── total_cost
  └── technician

repair_labor (수리 인건비)
  ├── id (PK)
  ├── repair_id (FK → repairs.id)
  ├── description
  └── amount

repair_parts (수리 부품)
  ├── id (PK)
  ├── repair_id (FK → repairs.id)
  ├── name
  ├── quantity
  ├── unit_price
  └── total_price

transactions (거래 통합)
  ├── id (PK)
  ├── transaction_date
  ├── transaction_type (SALE/PURCHASE/REPAIR_LABOR/REPAIR_PART)
  ├── reference_type
  ├── reference_id
  ├── customer_id (FK → customers.id)
  ├── amount
  └── description
```

## 🔗 페이지 간 이동 흐름

```
shared/index.html (메인 대시보드)
  ↓ "총 매출" 카드 클릭
매출 상세 내역 모달
  ↓ 고객명 클릭
customer-detail.html?id={customerId}
  ↓ "수리 이력 추가" 버튼
repair-add.js 모달
  ↓ 저장
customer-detail.html (자동 새로고침)
  ↓ 뒤로가기
customers.html (고객 목록)
```

## 📊 주요 JavaScript 함수

### customers.js
- `loadCustomers(page)`: 고객 목록 로드 및 페이지네이션
- `displayCustomers(customers)`: 고객 목록 테이블 렌더링
  - 번호 (customer.id): 고유 번호, 자동 생성
  - 관리번호 (management_number): 사용자 지정, 직접 수정 가능
- `showAddCustomerModal()`: 새 고객 등록 모달 표시
- `editCustomer(customerId)`: 고객 수정 모달 표시
- `updateManagementNumber(customerId, managementNumber)`: 관리번호 업데이트 (onblur 이벤트)
- `deleteCustomer(customerId)`: 고객 삭제
- `viewCustomer(customerId)`: 고객 상세 페이지 열기
- `searchCustomers()`: 실시간 검색
- `filterCustomers()`: 상태별 필터
- 고객 폼 제출 시 (309~348라인):
  - 새 고객 등록: POST /api/customers
    - 고유 번호 (id)는 서버에서 자동 생성 (AUTOINCREMENT)
  - 고객 수정: PUT /api/customers/{id}

### customer-detail-core.js
- `loadCustomerDetails(id)`: 고객 기본 정보 로드
- `editCustomer()`: 고객 정보 수정
- `displayCustomerInfo(customer)`: 고객 정보 표시
- `updateCustomerStatus(id, status)`: 고객 상태 업데이트

### customer-detail-purchases.js
- `displayPurchases(purchases)`: 구매 이력 표시
- `showAddPurchaseModal()`: 구매 이력 추가 모달
- `deletePurchase(id)`: 구매 이력 삭제
- `editPurchase(id)`: 구매 이력 수정
- `returnPurchase(id)`: 반품 처리
- `viewPurchaseDetail(id)`: 구매 상세 보기

### customer-detail-repairs.js
- `loadRepairs()`: 수리 이력 로드
- `displayRepairs(repairs)`: 수리 이력 표시
- `addRepair()`: 수리 이력 추가
- `viewRepairDetail(id)`: 수리 상세 보기
- `editRepair(id)`: 수리 이력 수정
- `deleteRepair(id)`: 수리 이력 삭제
- `closeRepairDetailModal()`: 수리 상세 모달 닫기
- `printRepairDetailFromModal()`: 수리 상세 인쇄

### customer-detail-utils.js
- `goBack()`: 뒤로가기
- `addVisit()`: 방문 기록 추가
- `formatDate(date)`: 날짜 포맷
- `formatNumber(num)`: 숫자 포맷

## 🎨 UI 컴포넌트

### 고객 정보 카드
```html
<div class="info-item">
  <label>이름</label>
  <span id="customerName">홍길동</span>
</div>
```

### 구매 이력 테이블
```html
<div class="purchase-item">
  <div class="purchase-header">
    <span>구매코드: P202510251234</span>
    <span>구매일: 2025.10.25</span>
    <button onclick="deletePurchase(100)">삭제</button>
  </div>
  <div class="purchase-items">
    <div class="item-row">
      <span>제품명: AMD Ryzen 7</span>
      <span>수량: 1개</span>
      <span>금액: 500,000원</span>
    </div>
  </div>
</div>
```

### 수리 이력 카드
```html
<div class="repair-card">
  <div class="repair-header">
    <span class="repair-number">R50</span>
    <span class="repair-status completed">완료</span>
  </div>
  <div class="repair-info">
    <div>제품: 컴퓨터 조립</div>
    <div>문제: 화면이 안 나옴</div>
    <div>수리비: 25,000원</div>
  </div>
  <div class="repair-actions">
    <button onclick="viewRepairDetail(50)">상세보기</button>
    <button onclick="editRepair(50)">수정</button>
    <button onclick="deleteRepair(50)">삭제</button>
  </div>
</div>
```

## 🔔 이벤트 및 알림

### localStorage 기반 동기화
```javascript
// 수리 이력 추가/수정 시
localStorage.setItem('repairDataChanged', 'true');

// 다른 탭에서 수신
window.addEventListener('storage', function(e) {
  if (e.key === 'repairDataChanged' && e.newValue === 'true') {
    // 대시보드 자동 새로고침
    if (typeof refreshAnalysis === 'function') {
      refreshAnalysis();
    }
  }
});
```

### 자동 새로고침
```javascript
// 30초마다 대시보드 자동 새로고침
setInterval(function() {
  if (typeof refreshAnalysis === 'function') {
    refreshAnalysis();
  }
}, 30000);
```

## 📌 주요 파일 역할

- **customers.html**: 고객 목록 페이지
- **customers.js**: 고객 목록 로직, 검색, 필터링
- **customer-detail.html**: 고객 상세 정보 페이지
- **customer-detail-core.js**: 고객 기본 정보 관리
- **customer-detail-purchases.js**: 구매 이력 관리 (추가, 수정, 삭제, 반품)
- **customer-detail-repairs.js**: 수리 이력 관리 (추가, 상세보기, 수정, 삭제)
- **customer-detail-utils.js**: 공통 유틸리티 함수
- **server/customer-apis.js**: 고객 관련 API 엔드포인트

## 🚀 사용 시나리오

### 시나리오 1: 새 고객 등록 및 구매 이력 추가
1. customers.html → "새 고객 등록" 버튼 클릭
2. 고객 정보 입력 및 저장
3. 고객 목록에서 고객 클릭
4. customer-detail.html 열림
5. "구매 이력 추가" 버튼 클릭
6. 제품 선택 및 구매 정보 입력
7. 저장 → 구매 이력 테이블에 추가됨

### 시나리오 2: 수리 이력 추가 및 대시보드 동기화
1. customer-detail.html → "수리 이력 추가" 버튼 클릭
2. 수리 정보 입력 (제품, 문제, 해결방법, 비용)
3. 상태를 "완료"로 설정
4. 저장
5. 수리 이력 테이블에 추가됨
6. 메인 대시보드 자동 새로고침 (30초 이내 또는 즉시)
7. "총 매출" 카드에 수리 건수 반영
8. "수리 완료" 현황 카드에 반영

### 시나리오 3: 매출 상세에서 고객 상세로 이동
1. shared/index.html → "총 매출" 카드 클릭
2. 매출 상세 내역 모달 열림
3. 고객명 클릭
4. customer-detail.html?id={customerId}로 이동
5. 고객의 구매/수리 이력 확인 가능

