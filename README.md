# 수리센터 관리 시스템

## 📋 프로젝트 개요
수리센터의 고객 관리, 제품 관리, 수리 이력 관리, 회계 관리 등을 통합적으로 처리하는 웹 기반 관리 시스템입니다.

## 🏗️ 프로젝트 구조

```
repair-center/
├── shared/                    # 공통 파일
│   ├── index.html            # 메인 대시보드
│   ├── script.js             # 공통 JavaScript (요약 카드 포함)
│   └── style.css             # 공통 스타일
├── customers/                 # 고객 관리
│   ├── customers.html        # 고객 목록
│   ├── customers.js          # 고객 관리 로직
│   ├── customer-search.html  # 고객 검색
│   ├── customer-detail.html  # 고객 상세
│   └── print-templates/      # 인쇄 템플릿
├── products/                  # 제품 관리
│   ├── products.html         # 제품 목록
│   ├── products.js           # 제품 관리 로직
│   ├── product-add.html      # 제품 추가
│   └── category-manager.js   # 카테고리 관리
├── repairs/                   # 수리 관리
│   ├── repair-management.html # 수리 관리
│   └── repair-add.js         # 수리 추가
├── accounting/                # 회계 관리
│   ├── accounting.html       # 회계 대시보드
│   └── sales-analysis.html   # 매출 분석
├── backup/                    # 백업 관리
│   ├── backup-management.html # 백업 관리
│   ├── backup-json/          # JSON 백업
│   └── backup-sql/           # SQL 백업
├── server/                    # 서버
│   ├── server-sqlite.js      # 메인 서버
│   ├── backup-config.js      # 백업 설정
│   └── backup-restore.js     # 백업 복원
├── database/                  # 데이터베이스
│   ├── data/
│   │   └── repair_center.db  # SQLite 데이터베이스
│   └── database-schema.sql   # 데이터베이스 스키마
└── config/                    # 설정 파일
    ├── domain-config.js      # 도메인 설정
    └── deploy-config.js      # 배포 설정
```

## 🚀 주요 기능

### 1. 대시보드 (shared/index.html)
- **요약 카드**: 총 매출, 총 매입, 순이익, 부가세
- **클릭 가능한 카드**: 각 카드 클릭 시 상세 내역 모달 표시
- **기간별 필터링**: 오늘, 이번 주, 이번 달, 이번 분기, 올해
- **실시간 데이터**: 서버 API를 통한 실시간 데이터 업데이트

### 2. 고객 관리 (customers/)
- 고객 등록, 수정, 삭제
- 고객 검색 및 상세 정보 조회
- 고객별 구매/수리 이력 관리
- 고객 통계 및 분석

### 3. 제품 관리 (products/)
- 제품 등록, 수정, 삭제
- 3단계 카테고리 시스템 (대분류/중분류/소분류)
- 재고 관리 및 상태 추적
- 제품별 구매/판매 이력

### 4. 수리 관리 (repairs/)
- 수리 접수 및 진행 상황 관리
- 수리 부품 사용 이력
- 수리 완료 및 고객 알림

### 5. 회계 관리 (accounting/)
- 매출/매입 관리
- 부가세 계산 및 관리
- 손익 분석 및 보고서

### 6. 백업 관리 (backup/)
- 자동 백업 스케줄링
- JSON/SQL 백업 지원
- 백업 복원 기능

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Styling**: CSS Grid, Flexbox, 반응형 디자인

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 서버 실행
```bash
node server/server-sqlite.js
```

### 3. 웹 브라우저 접속
```
http://localhost:3000
```

## 🔧 환경 설정

### 도메인 설정 (config/domain-config.js)
```javascript
const domains = {
    development: 'http://localhost:3000',
    production: 'https://your-domain.com'
};
```

### 데이터베이스 설정
- SQLite 데이터베이스: `database/data/repair_center.db`
- 자동 스키마 생성 및 마이그레이션 지원

## 📊 API 엔드포인트

### 주요 API
- `GET /api/customers` - 고객 목록 조회
- `GET /api/products` - 제품 목록 조회
- `GET /api/purchases` - 구매 이력 조회
- `GET /api/repairs` - 수리 이력 조회
- `GET /api/summary-details/:type` - 요약 상세 내역 조회

### 요약 상세 내역 API
- `GET /api/summary-details/revenue` - 매출 상세 내역
- `GET /api/summary-details/expense` - 매입 상세 내역
- `GET /api/summary-details/net` - 순이익 상세 내역
- `GET /api/summary-details/vat` - 부가세 상세 내역

## 🎨 UI/UX 특징

### 요약 카드 모달
- **반응형 디자인**: 모바일/태블릿/데스크톱 지원
- **기간 필터링**: 직관적인 기간 선택 드롭다운
- **실시간 검색**: 테이블 내 데이터 실시간 검색
- **요약 정보**: 총 금액, 총 건수, 평균 금액 표시
- **색상 구분**: 매출(초록), 매입(빨강), 순이익(파랑), 부가세(보라)

### 카테고리 시스템
- **3단계 구조**: 대분류 → 중분류 → 소분류
- **자동 코드 생성**: 카테고리별 고유 코드 자동 생성
- **동적 업데이트**: 실시간 카테고리 필터링

## 🔒 보안 기능

- **세션 기반 인증**: 관리자 로그인 시스템
- **데이터 검증**: 서버/클라이언트 양쪽 데이터 검증
- **SQL 인젝션 방지**: Prepared Statement 사용
- **자동 백업**: 정기적인 데이터 백업

## 📈 성능 최적화

- **데이터베이스 인덱싱**: 자주 조회되는 컬럼 인덱스 설정
- **페이지네이션**: 대용량 데이터 효율적 처리
- **캐싱**: 정적 리소스 캐싱
- **압축**: Gzip 압축 지원

## 🐛 문제 해결

### 일반적인 문제
1. **서버 시작 오류**: 포트 3000이 사용 중인 경우
2. **데이터베이스 오류**: SQLite 파일 권한 문제
3. **모달 표시 오류**: JavaScript 로딩 순서 확인

### 로그 확인
서버 콘솔에서 상세한 오류 로그를 확인할 수 있습니다.

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원

문제가 발생하거나 기능 요청이 있으시면 이슈를 생성해 주세요.
