# 수리 센터 관리 시스템 - 전체 구조 및 흐름 문서

## 📁 프로젝트 구조

```
2025-10-25-3/
├── accounting/              # 회계 관련 파일
│   ├── accounting.html
│   ├── accounting.js
│   ├── sales-analysis.html
│   └── sales-analysis.js
├── backup/                  # 백업 관리
│   ├── backup-management.html
│   ├── backup-management.js
│   └── backup-json/        # JSON 백업 파일
├── customers/               # 고객 관리
│   ├── customer-detail.html
│   ├── customer-detail-core.js
│   ├── customer-detail-purchases.js
│   ├── customer-detail-repairs.js
│   └── customers.html
├── database/                # 데이터베이스
│   ├── data/
│   │   └── repair_center.db
│   └── migrations/         # 마이그레이션 스크립트
├── products/                # 제품 관리
│   ├── products.html
│   └── products.js
├── repairs/                 # 수리 관리
│   ├── repair-management.html
│   ├── repair-management.js
│   └── repair-add.js
├── revenue-files/           # 매출/매입 관리 모듈
│   ├── detail-table.js     # 상세 테이블 컴포넌트
│   └── summary-modal.js    # 요약 모달 로직
├── server/                  # 서버 API
│   ├── server-sqlite.js    # 메인 서버
│   ├── transaction-apis.js # 거래 데이터 API
│   ├── stats-apis.js       # 통계 API
│   ├── repair-apis.js      # 수리 API
│   ├── purchase-apis.js    # 구매 API
│   └── customer-apis.js    # 고객 API
└── shared/                  # 공용 파일
    ├── index.html          # 메인 대시보드
    ├── script.js           # 대시보드 로직
    └── repairStatus.js     # 수리 현황 관리
```

## 🔄 데이터 흐름

### 1. 대시보드 로드 흐름

```
1. 브라우저 열기
   ↓
2. shared/index.html 로드
   ↓
3. 공용 스크립트 로드
   - script.js (대시보드 메인 로직)
   - repairStatus.js (수리 현황)
   - detail-table.js (상세 테이블)
   - summary-modal.js (요약 모달)
   ↓
4. loadDashboardAnalysis() 실행
   ↓
5. API 호출: GET /api/summary
   ↓
6. server/transaction-apis.js
   ↓
7. Database Query (Transactions 테이블)
   ↓
8. 거래 데이터 반환
   - totalRevenue (총 매출)
   - totalExpense (총 매입)
   - revenueCount (매출 건수)
   - salesCount (판매 건수)
   - repairCount (수리 건수)
   ↓
9. updateSummaryCardsFromAPI() 실행
   ↓
10. 화면에 카드 표시
```

### 2. 매출 상세 내역 로드 흐름

```
1. 사용자가 "총 매출" 카드 클릭
   ↓
2. openSummaryDetailModal('revenue') 실행
   (revenue-files/summary-modal.js)
   ↓
3. 모달 창 표시
   ↓
4. loadSummaryDetailData() 실행
   ↓
5. API 호출: GET /api/summary-details/revenue?startDate=&endDate=
   ↓
6. server/stats-apis.js
   ↓
7. Database Query
   ```sql
   SELECT 
       CASE 
           WHEN t.transaction_type = 'SALE' THEN 'P' || CAST(t.reference_id AS TEXT)
           WHEN t.transaction_type IN ('REPAIR_LABOR', 'REPAIR_PART') THEN 'R' || CAST(t.reference_id AS TEXT)
           ELSE 'T' || CAST(t.id AS TEXT)
       END as code,
       t.customer_id as customerId,
       c.name as customer,
       COALESCE(pr.name, t.description) as product,
       t.amount as totalAmount,
       ...
   FROM transactions t
   LEFT JOIN customers c ON t.customer_id = c.id
   LEFT JOIN products pr ON t.product_id = pr.id
   WHERE t.transaction_date BETWEEN ? AND ?
   AND t.transaction_type IN ('SALE', 'REPAIR_LABOR', 'REPAIR_PART')
   AND t.amount > 0
   ```
   ↓
8. 거래 데이터 반환
   ↓
9. updateSummaryDetailTable() 실행
   (revenue-files/detail-table.js)
   ↓
10. DetailTable 클래스의 updateDetailTable() 실행
   ↓
11. 테이블 HTML 생성 및 표시
```

### 3. 수리 현황 조회 흐름

```
1. 사용자가 "수리 현황" 카드 클릭
   ↓
2. openRepairStatusModal(status) 실행
   (shared/repairStatus.js)
   ↓
3. loadRepairStatusData() 실행
   ↓
4. API 호출: GET /api/repairs?limit=10000
   ↓
5. server/repair-apis.js
   ↓
6. Database Query (repairs 테이블)
   ↓
7. 수리 데이터 반환
   ↓
8. updateRepairStatusTable() 실행
   ↓
9. 수리 목록 표시
```

### 4. 수리 추가/수정 흐름

```
1. 사용자가 수리 이력 추가/수정
   ↓
2. repair-add.js의 수리 정보 입력
   ↓
3. API 호출: POST/PUT /api/repairs
   ↓
4. server/repair-apis.js
   ↓
5. Database Insert/Update
   - repairs 테이블에 저장
   - repair_labor 테이블에 저장
   - repair_parts 테이블에 저장
   ↓
6. Transactions 테이블에 저장 (status='완료'이고 totalCost > 0인 경우)
   ```javascript
   // REPAIR_LABOR 타입
   INSERT INTO transactions (
       transaction_date, transaction_type, reference_type, reference_id,
       customer_id, amount, description
   ) VALUES (
       repair_date, 'REPAIR_LABOR', 'repair_labor', labor_id,
       customer_id, labor_amount, 'Repair Labor: ' + description
   )
   
   // REPAIR_PART 타입
   INSERT INTO transactions (
       transaction_date, transaction_type, reference_type, reference_id,
       customer_id, amount, description
   ) VALUES (
       repair_date, 'REPAIR_PART', 'repair_part', part_id,
       customer_id, part_price, 'Repair Part: ' + name
   )
   ```
   ↓
7. localStorage.setItem('repairDataChanged', 'true')
   ↓
8. 다른 탭의 대시보드가 storage 이벤트 수신
   ↓
9. 자동 새로고침 (30초마다 또는 storage 이벤트 발생 시)
```

### 5. 매출 항목 삭제 흐름

```
1. 사용자가 매출 상세 내역에서 "삭제" 버튼 클릭
   ↓
2. deleteTransactionItem(code, type) 실행
   (revenue-files/detail-table.js)
   ↓
3. code 파싱
   - 'P'로 시작 → purchase 삭제
   - 'R'로 시작 → repair 삭제
   ↓
4. API 호출
   - DELETE /api/purchases/{id}
   - DELETE /api/repairs/{id}
   ↓
5. server/purchase overdue-apis.js 또는 repair-apis.js
   ↓
6. Database Delete
   ↓
7. Transactions 테이블에서도 관련 항목 삭제
   ↓
8. 성공 메시지 표시 및 테이블 새로고침
```

## 💾 데이터베이스 구조

### 주요 테이블

1. **Transactions 테이블** (통합 거래 데이터)
   ```sql
   CREATE TABLE transactions (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       transaction_date DATE,
       transaction_type TEXT,      -- 'SALE', 'PURCHASE', 'REPAIR_LABOR', 'REPAIR_PART', 'RETURN'
       reference_type TEXT,        -- 'purchase', 'repair', 'repair_labor', 'repair_part'
       reference_id INTEGER,       -- 참조되는 원본 ID
       customer_id INTEGER,
       product_id INTEGER,
       amount REAL,
       description TEXT,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   )
   ```

2. **Repairs 테이블**
   ```sql
   CREATE TABLE repairs (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       repair_date DATE,
       customer_id INTEGER,
       device_model TEXT,
       problem TEXT,
       solution TEXT,
       status TEXT,               -- '접수', '위탁접수', '수리중', '완료', '보증중'
       total_cost INTEGER,
       ...
   )
   ```

3. **Purchases 테이블**
   ```sql
   CREATE TABLE purchases (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       purchase_code TEXT,
       purchase_date DATE,
       customer_id INTEGER,
       type TEXT,                 -- '판매', '구매', '반품'
       total_amount INTEGER,
       ...
   )
   ```

4. **Customers 테이블**
   ```sql
   CREATE TABLE customers (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT,
       phone TEXT,
       address TEXT,
       ...
   )
   ```

## 📊 API 엔드포인트

### 대시보드 관련

- `GET /api/summary` - 총 매출/매입 통계 조회
  - 반환: `{totalRevenue, revenueCount, salesCount, repairCount, totalExpense, expenseCount, ...}`
  
- `GET /api/summary-details/:type` - 상세 내역 조회
  - type: 'revenue', 'expense', 'vat', 'net'
  - 파라미터: startDate, endDate

### 수리 관련

- `GET /api/repairs` - 수리 목록 조회
- `GET /api/repairs/:id` - 수리 상세 조회
- `POST /api/repairs` - 수리 추가
- `PUT /api/repairs/:id` - 수리 수정
- `DELETE /api/repairs/:id` - 수리 삭제

### 고객 관련

- `GET /api/customers` - 고객 목록 조회
- `GET /api/customers/:id` - 고객 상세 조회
- `GET /api/customers/search?name=` - 고객 검색

### 구매 관련

- `GET /api/purchases` - 구매 목록 조회
- `POST /api/purchases` - 구매 추가
- `DELETE /api/purchases/:id` - 구매 삭제

## 🔑 주요 기능

### 1. 실시간 대시보드
- 총 매출/매입 통계 표시
- 판매 건수와 수리 건수 분리 표시
- 30초마다 자동 새로고침
- localStorage를 통한 탭 간 동기화

### 2. 매출 상세 분석
- 기간별 매출 상세 내역 조회
- 판매 내역과 수리 내역 통합 표시
- 고객명 클릭 시 고객 상세 페이지로 이동
- 항목별 삭제 기능

### 3. 수리 현황 관리
- 상태별 수리 현황 조회 (접수, 위탁접수, 수리중, 완료, 보증중)
- 페이지네이션 지원
- 상세 정보 모달 표시

### 4. 자동 데이터 동기화
- 수리 추가/수정 시 Transactions 테이블 자동 업데이트
- 대시보드 자동 새로고침
- 탭 간 데이터 동기화

## 🛠 기술 스택

- **Frontend**: HTML, CSS, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Session Management**: express-session

## 📝 중요한 설계 결정

1. **Transactions 테이블 도입**
   - 기존 purchases와 repairs 데이터를 통합 관리
   - transaction_type으로 거래 유형 구분
   - 대시보드 통계 계산을 데이터베이스 레벨에서 처리

2. **모듈화된 구조**
   - `detail-table.js`: 테이블 렌더링 전담
   - `summary-modal.js`: 요약 모달 로직 전담
   - `repairStatus.js`: 수리 현황 관리 전담
   - 각 모듈은 독립적으로 동작 가능

3. **실시간 동기화**
   - localStorage를 통한 탭 간 통신
   - setInterval을 통한 주기적 새로고침
   - 변경 이벤트 발생 시 즉시 알림

4. **reference_id 활용**
   - 수리 관련 거래는 'R' + repair_id로 표시
   - 판매 관련 거래는 'P' + purchase_id로 표시
   - 삭제 시 reference_id 파싱하여 원본 데이터 삭제

## 🚀 실행 방법

1. 서버 시작
   ```bash
   node server/server-sqlite.js
   ```

2. 브라우저에서 접속
   ```
   http://localhost:3000/shared/index.html
   ```

3. 로그인
   - ID: admin
   - Password: admin123

## 📌 주요 파일 역할

- **shared/index.html**: 메인 대시보드 페이지
- **shared/script.js**: 대시보드 전반적인 로직
- **shared/repairStatus.js**: 수리 현황 관리
- **revenue-files/detail-table.js**: 매출/매입 상세 테이블 렌더링
- **revenue-files/summary-modal.js**: 요약 모달 로직
- **server/transaction-apis.js**: 거래 데이터 API
- **server/stats-apis.js**: 통계 API
- **server/repair-apis.js**: 수리 관리 API

