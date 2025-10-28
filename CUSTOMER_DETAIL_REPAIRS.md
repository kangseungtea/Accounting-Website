# customer-detail-repairs.js 파일 구조

## 📋 개요
고객 상세 페이지에서 수리 이력 관리 기능을 담당하는 JavaScript 파일입니다.

---

## 🔧 주요 함수 목록

### 1. `loadRepairs()` - 수리 이력 로드
**위치:** 572~614라인

```javascript
async function loadRepairs() {
    // 1. API 요청: GET /api/repairs?customerId={currentCustomerId}
    // 2. 전역 변수에 수리 데이터 저장 (window.currentRepairsData)
    // 3. displayRepairs(repairs) 호출하여 테이블 렌더링
    // 4. updateRepairStatistics(repairs) 호출하여 통계 업데이트
    // 5. updateRepairStatus(repairs) 호출하여 상태 업데이트
}
```

**흐름:**
1. 서버에서 해당 고객의 수리 이력 조회
2. 수신한 데이터를 전역 변수에 저장
3. 테이블에 수리 이력 표시
4. 통계 카드 업데이트
5. 상태 카드 업데이트

---

### 2. `displayRepairs(repairs)` - 수리 이력 표시
**위치:** 11~75라인

```javascript
function displayRepairs(repairs) {
    // 1. tbody 요소 찾기 (id="repairsTableBody")
    // 2. 빈 데이터 시 "수리 이력이 없습니다" 메시지 표시
    // 3. repairs 배열 순회하며 테이블 행 생성
    // 4. 각 행에 '상세', '수정', '삭제' 버튼 추가
    // 5. 이벤트 리스너 등록 (버튼 클릭 이벤트 처리)
}
```

**표시되는 항목:**
- 수리일
- 기기명 (10자 제한)
- 고장 내용 (10자 제한)
- 해결 내용 (10자 제한)
- 총 수리비
- 상태
- 보증
- 액션 버튼 (상세/수정/삭제)

---

### 3. `addRepair()` - 수리 이력 추가
**위치:** 211~277라인

```javascript
async function addRepair(event) {
    // 1. 폼 데이터 수집 (FormData)
    // 2. repairData 객체 생성
    // 3. API 요청: POST /api/repairs
    // 4. 성공 시 모달 닫기 및 목록 새로고침
    // 5. 실패 시 에러 메시지 표시
}
```

**처리 데이터:**
- `repair_date`: 수리일
- `device_name 괴기명
- `issue_description`: 고장 내용
- `status`: 수리 상태
- `total_cost`: 수리비
- `notes`: 비고
- `customer_id`: 고객 ID

**참고 함수:**
- `showAddRepairModal()` (78~208라인): 모달 생성 및 표시
- `closeAddRepairModal()` (280~290라인): 모달 닫기

---

### 4. `viewRepairDetail(id)` - 수리 상세 보기
**위치:** 293~437라인

```javascript
async function viewRepairDetail(repairId) {
    // 1. API 요청: GET /api/repairs/{repairId}
    // 2. HTML 모달의 각 요소에 데이터 설정
    // 3. 부품 목록 렌더링
    // 4. 인건비 내역 렌더링
    // 5. 부가세 계산 및 표시
    // 6. 모달 표시 (customerRepairDetailModal)
}
```

**표시되는 상세 정보:**
- 수리일
- 관리번호
- 고객 정보 (이름, 전화번호, 주소)
- 기기 모델
- 문제
- 해결 방법
- 사용 부품 목록
- 인건비 내역
- 부가세 정보
- 총 수리비

**부가세 계산 로직:**
- `vat_option = 'included'`: 부가세 포함 (총액 / 1.1 = 공급가액)
- `vat_option = 'excluded'`: 부가세 별도 (총액 × 0.1 = 부가세)
- `vat_option = 'none'`: 부가세 없음

---

### 5. `editRepair(id)` - 수리 이력 수정
**위치:** 501~531라인

```javascript
async function editRepair(repairId) {
    // 1. API 요청: GET /api/repairs/{repairId}
    // 2. addRepair() 함수를 수정 모드로 호출
}
```

**특징:**
- 수정 모드는 `addRepair()` 함수를 재사용

---

### 6. `deleteRepair(id)` - 수리 이력 삭제
**위치:** 537~569라인

```javascript
async function deleteRepair(repairId) {
    // 1. 확인 대화상자 표시
    // 2. API 요청: DELETE /api/repairs/{repairId}
    // 3. 성공 시 목록 새로고침 및 통계 업데이트
}
```

---

### 7. `closeRepairDetailModal()` - 수리 상세 모달 닫기
**위치:** 440~445라인

```javascript
function closeRepairDetailModal() {
    const modal = document.getElementById('customerRepairDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
```

---

### 8. `printRepairDetailFromModal()` - 수리 상세 인쇄
**위치:** 448~498라인

```javascript
function printRepairDetailFromModal() {
    // 1. customerRepairDetailModal 요소 찾기
    // 2. 전역 변수에서 repair 데이터 추출 (window.currentRepairData)
    // 3. window.printRepairDetail(repairData) 호출
}
```

**데이터 소스:**
- `window.currentRepairData`: viewRepairDetail에서 저장된 전역 데이터

---

## 📊 통계 및 상태 관련 함수

### `updateRepairStatistics(repairs)` - 통계 업데이트
**위치:** 617~757라인

**계산 항목:**
- 총 수리 건수
- 완료 건수
- 보증중 건수
- 총 수리 비용
- 부가세 포함 건수
- 부가세 미포함 건수
- 부가세 없음 건수

---

### `updateRepairStatus(repairs)` - 상태 업데이트
**위치:** 760~796라인

**업데이트 항목:**
- `id="pendingCount"`: 접수 건수
- `id="inProgressCount"`: 위탁접수 건수
- `id="completedCount"`: 완료 건수
- `id="warrantyCount"`: 보증중 건수

---

## 🔗 전역 함수 등록
**위치:** 1118~1128라인, 1199~1203라인

```javascript
window.loadRepairs = loadRepairs;
window.updateRepairStatistics = updateRepairStatistics;
window.updateRepairStatus = updateRepairStatus;
window.refreshRepairStatus = refreshRepairStatus;
window.viewRepairDetail = viewRepairDetail;
window.closeRepairDetailModal = closeRepairDetailModal;
window.editRepair = editRepair;
window.deleteRepair = deleteRepair;
// ... 기타 함수들
```

---

## 🎯 주요 사용 예시

### 수리 이력 로드
```javascript
loadRepairs(); // customer-detail.html 페이지 로드 시 호출
```

### 수리 이력 추가
```javascript
showAddRepairModal(); // 모달 표시
addRepair(event); // 폼 제출 시 호출
```

### 수리 이력 상세 보기
```javascript
viewRepairDetail(50); // repairId 50번 수리 상세 보기
```

### 수리 이력 삭제
```javascript
deleteRepair(50); // repairId 50번 수리 삭제
```

---

## 📌 참고사항

1. **모달 ID:**
   - 수리 상세 모달: `customerRepairDetailModal`
   - 수리 추가 모달: `addRepairModal`

2. **전역 변수:**
   - `window.currentRepairsData`: 전체 수리 이력 데이터
   - `window.currentRepairData`: 현재 선택된 수리 상세 데이터

3. **API 엔드포인트:**
   - GET `/api/repairs?customerId={id}`: 수리 이력 조회
   - GET `/api/repairs/{repairId}`: 수리 상세 조회
   - POST `/api/repairs`: 수리 이력 추가
   - DELETE `/api/repairs/{repairId}`: 수리 이력 삭제

4. **텍스트 자르기:**
   - `truncateText(text, maxLength)`: 긴 텍스트를 자르는 유틸리티 함수

5. **이벤트 리스너:**
   - 테이블 내 버튼 클릭은 `tbody.addEventListener('click', ...)` 으로 처리 (성능 최적화)

---

## 🗂️ 파일 정보
- **파일명:** `customers/customer-detail-repairs.js`
- **총 라인 수:** 1214라인
- **의존 파일:**
  - `customers/customer-detail.html` (모달 HTML 구조)
  - `customers/print-utils.js` (printRepairDetail 함수)

