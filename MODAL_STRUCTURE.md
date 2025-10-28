# 수리 현황 모달 구조 문서

## 📋 개요
현재 `index.html`에 포함된 수리 현황 모달과 수리 상세 정보 모달의 구조를 설명합니다.

---

## 📍 위치

### 수리 현황 모달
- **파일:** `shared/index.html`
- **위치:** 226~330라인
- **ID:** `repairStatusModal`

### 수리 상세 정보 모달
- **파일:** `shared/index.html`
- **위치:** 334~414라인
- **ID:** `repairDetailModal`

---

## 🔧 모달별 구조

### 1. 수리 현황 모달 (`repairStatusModal`)

#### 모달 헤더
```html
<div class="modal-header">
    <h2 id="repairStatusModalTitle">수리 현황 상세</h2>
    <button class="close-btn" onclick="closeRepairStatusModal()">&times;</button>
</div>
```

#### 필터 섹션 (235~271라인)
- **상태 필터:** `id="statusFilter"` - 전체/접수/위탁 접수/수리 완료/보증 중
- **기간 필터:** `id="dateRangeFilter"` - 오늘/이번 주/이번 달/이번 분기/올해
- **검색 입력:** `id="searchInput"` - 고객명, 기기명, 번호 검색
- **새로고침 버튼:** `loadRepairStatusData()` 함수 호출

#### 요약 정보 (273~282라인)
- **총 수리 건수:** `id="totalRepairCount"`
- **접수 대기:** `id="summaryPendingCount"`
- **진행 중:** `id="summaryInProgressCount"`
- **완료:** `id="summaryCompletedCount"`
- **보증 중:** `id="summaryWarrantyCount"`

#### 수리 현황 테이블 (284~311라인)
**테이블 ID:** `repairStatusTable`

**컬럼:**
- 번호
- 접수일
- 고객명
- 기기명
- 문제
- 상태
- 수리비
- 완료일
- 액션

#### 페이지네이션 (313~318라인)
- **이전 버튼:** `changeRepairStatusPage(-1)`
- **페이지 정보:** `id="repairStatusPageInfo"`
- **다음 버튼:** `changeRepairStatusPage(1)`

---

### 2. 수리 상세 정보 모달 (`repairDetailModal`)

#### 모달 헤더
```html
<div class="modal-header">
    <h2>수리 이력 상세</h2>
    <button class="close-btn" onclick="closeRepairDetailModal()">&times;</button>
</div>
```

#### 기본 정보 (341~377라인)
**ID:**
- `detailRepairDate` - 수리일
- `detailManagementNumber` - 관리번호
- `detailCustomerName` - 고객이름
- `detailCustomerPhone` - 전화번호
- `detailCustomerAddress` - 주소
- `detailDeviceModel` - 모델
- `detailProblem` - 문제
- `detailSolution` - 해결방법

#### 사용 부품 (379~382라인)
- **ID:** `detailParts`

#### 인건비 내역 (384~387라인)
- **ID:** `detailLabor`

#### 비용 내역 (389~408라인)
- **공급가액:** `detailSupplyAmount`
- **부가세 (10%):** `detailVatAmount` (부가세 섹션 `detailVatSection`)
- **총 비용:** `detailTotalCost`
- **부가세 설명:** `detailVatDescription`

---

## 🎯 관련 JavaScript 파일

### 주요 파일
- **`shared/repairStatus.js`**: 수리 현황 관리 로직
- **`shared/script.js`**: 메인 대시보드 로직

### 주요 함수

#### 수리 현황 모달
- `openRepairStatusModal(status)`: 모달 열기
- `closeRepairStatusModal()`: 모달 닫기
- `loadRepairStatusData()`: 데이터 로드
- `updateRepairStatusFilter()`: 필터 업데이트
- `filterRepairStatusTable()`: 테이블 필터링
- `changeRepairStatusPage(direction)`: 페이지 전환

#### 수리 상세 정보 모달
- `openRepairDetailModal(repairId)`: 모달 열기 (repairStatus.js 109라인)
- `closeRepairDetailModal()`: 모달 닫기 (repairStatus.js 138라인)
- `displayRepairDetail(repair)`: 상세 정보 표시 (repairStatus.js 143라인)

---

## 💡 모달 별도 파일 분리 고려사항

현재 모달 HTML은 `index.html`에 직접 포함되어 있습니다.

### 분리할 경우의 장점
1. **코드 가독성 향상:** `index.html` 파일 크기 감소
2. **유지보수 용이:** 모달 구조 변경 시 해당 파일만 수정
3. **재사용성:** 다른 페이지에서도 동일한 모달 사용 가능

### 분리 시 구현 방법

#### 옵션 1: JavaScript로 동적 로드
```javascript
// DOMContentLoaded 시 모달 HTML 로드
fetch('/shared/modals/repair-status-modal.html')
    .then(response => response.text())
    .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
    });
```

#### 옵션 2: HTML import (커스텀 컴포넌트)
```html
<link rel="import" href="/shared/modals/repair-status-modal.html">
```

#### 옵션 3: server-side include
```html
<!--#include virtual="/shared/modals/repair-status-modal.html" -->
```

### 현재 추천
모달이 이미 잘 작동하고 있으며, 복잡도를 증가시키지 않는 것이 좋습니다.
**별도 파일로 분리하지 않고 현재 구조를 유지하는 것을 권장합니다.**

---

## 🔄 모달 간 상호작용

### 1. 수리 현황 모달 → 수리 상세 정보 모달
```
수리 현황 모달에서 "상세" 버튼 클릭
    ↓
openRepairDetailModal(repairId) 호출
    ↓
API에서 수리 데이터 조회
    ↓
displayRepairDetail(repair) 호출
    ↓
수리 상세 정보 모달 표시
```

### 2. 모달 닫기
```
closeRepairStatusModal() 또는 closeRepairDetailModal() 호출
    ↓
모달의 style.display = 'none'
```

---

## 📝 참고사항

1. **모달 컨테이너:** 모든 모달은 `position: fixed`로 화면 중앙에 표시
2. **이벤트 버블링:** 모달 외부 클릭 시 닫기 기능 구현 가능
3. **키보드 이벤트:** ESC 키로 모달 닫기 기능 구현됨 (`handleRepairStatusModalKeydown`)
4. **데이터 새로고침:** 모달을 열 때마다 최신 데이터 로드

---

## 🎨 스타일링

모달 스타일은 다음 파일에서 정의됩니다:
- `shared/style.css`: 기본 모달 스타일
- `shared/repair-status-modal.css`: 수리 현황 모달 전용 스타일

---

**문서 생성일:** 2025-01-25
**업데이트:** 필요 시 `shared/index.html` 파일을 확인하여 반영

