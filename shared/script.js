// DOM 요소들
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const loginFormDiv = document.querySelector('.login-form');
const registerFormDiv = document.querySelector('.register-form');

// 폼 전환 기능
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'block';
    registerFormDiv.classList.add('form-transition');
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerFormDiv.style.display = 'none';
    loginFormDiv.style.display = 'block';
    loginFormDiv.classList.add('form-transition');
});

// 깜냥컴퓨터 클릭 시 로그인 폼 표시
function showLoginForm() {
    const homeScreen = document.querySelector('.home-screen');
    registerFormDiv.style.display = 'none';
    loginFormDiv.style.display = 'block';
    loginFormDiv.classList.add('form-transition');
    if (homeScreen) {
        homeScreen.style.display = 'none';
    }
}

// 홈 화면 표시
function showHome() {
    hideAllScreens();
    document.getElementById('homeScreen').style.display = 'block';
    document.getElementById('navMenu').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
}

// 대시보드 표시
function showDashboard() {
    hideAllScreens();
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('navMenu').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'flex';
    loadDashboardAnalysis();
    
    // 진행중인 수리 내역 표시
    showAllRepairs();
    
    // 접수/위탁 요약 업데이트
}

// 대시보드 분석 데이터 로드
async function loadDashboardAnalysis() {
    try {
        console.log('대시보드 분석 데이터 로드 시작');
        await Promise.all([
            loadRepairsData(),
            loadPurchasesData()
        ]);
        updateAnalysis();
        updateRepairStatus();
    } catch (error) {
        console.error('대시보드 분석 데이터 로드 오류:', error);
    }
}

// 수리 데이터 로드 (매출)
let allRepairs = [];
async function loadRepairsData() {
    try {
        console.log('수리 데이터 로드 시작...');
        const response = await fetch('/api/repairs?limit=10000');
        if (!response.ok) {
            throw new Error(`수리 이력을 불러오는데 실패했습니다. (${response.status})`);
        }
        const data = await response.json();
        console.log('수리 API 응답:', data);
        
        // 다양한 응답 형식 지원
        allRepairs = data.repairs || data.data || [];
        console.log('수리 데이터 로드됨:', allRepairs.length, '건');
        
        // 수리 데이터 샘플 출력 (디버깅용)
        if (allRepairs.length > 0) {
            console.log('첫 번째 수리 데이터:', allRepairs[0]);
        }
    } catch (error) {
        console.error('수리 데이터 로드 오류:', error);
        allRepairs = [];
        // 오류 시 사용자에게 알림
        showMessage('수리 데이터를 불러오는데 실패했습니다. 일부 분석 기능이 제한될 수 있습니다.', 'warning');
    }
}

// 구매 데이터 로드 (매입)
let allPurchases = [];
async function loadPurchasesData() {
    try {
        console.log('구매 데이터 로드 시작...');
        const response = await fetch('/api/purchases?limit=10000');
        if (!response.ok) {
            throw new Error(`구매 이력을 불러오는데 실패했습니다. (${response.status})`);
        }
        const data = await response.json();
        console.log('구매 API 응답:', data);
        
        // 다양한 응답 형식 지원
        allPurchases = data.purchases || data.data || [];
        console.log('구매 데이터 로드됨:', allPurchases.length, '건');
        
        // 구매 데이터 샘플 출력 (디버깅용)
        if (allPurchases.length > 0) {
            console.log('첫 번째 구매 데이터:', allPurchases[0]);
        }
    } catch (error) {
        console.error('구매 데이터 로드 오류:', error);
        allPurchases = [];
        // 오류 시 사용자에게 알림
        showMessage('구매 데이터를 불러오는데 실패했습니다. 일부 분석 기능이 제한될 수 있습니다.', 'warning');
    }
}

// 분석 업데이트
function updateAnalysis() {
    const period = document.getElementById('analysisPeriod').value;
    console.log('분석 업데이트:', period);
    
    // 기간별 데이터 그룹화
    const groupedData = groupDataByPeriod(allRepairs, allPurchases, period);
    
    // 요약 데이터 계산
    const summary = calculateSummary(allRepairs, allPurchases);
    
    // UI 업데이트
    updateSummaryCards(summary);
    updateAnalysisTable(groupedData);
}

// 기간별 데이터 그룹화
function groupDataByPeriod(repairs, purchases, period) {
    console.log('기간별 데이터 그룹화 시작:', period);
    const grouped = {};
    
    // 수리 데이터 그룹화 (매출)
    repairs.forEach((repair, index) => {
        try {
            const date = new Date(repair.repair_date);
            if (isNaN(date.getTime())) {
                console.warn('잘못된 날짜 형식:', repair.repair_date);
                return;
            }
            
            const key = getPeriodKey(date, period);
            
            if (!grouped[key]) {
                grouped[key] = {
                    period: key,
                    sales: { count: 0, supplyAmount: 0, vatAmount: 0, totalAmount: 0 },
                    purchase: { count: 0, supplyAmount: 0, vatAmount: 0, totalAmount: 0 }
                };
            }
            
            const totalCost = parseFloat(repair.total_cost) || 0;
            const vatOption = repair.vat_option || 'none';
            
            if (totalCost > 0) {
                let supplyAmount, vatAmount;
                if (vatOption === 'include' || vatOption === 'included') {
                    supplyAmount = Math.round(totalCost / 1.1);
                    vatAmount = totalCost - supplyAmount;
                } else if (vatOption === 'exclude' || vatOption === 'excluded') {
                    supplyAmount = totalCost;
                    vatAmount = Math.round(totalCost * 0.1);
                } else {
                    supplyAmount = totalCost;
                    vatAmount = 0;
                }
                
                grouped[key].sales.count++;
                grouped[key].sales.supplyAmount += supplyAmount;
                grouped[key].sales.vatAmount += vatAmount;
                grouped[key].sales.totalAmount += totalCost;
            }
        } catch (error) {
            console.error('수리 데이터 그룹화 오류:', error, repair);
        }
    });
    
    // 구매 데이터 그룹화 (매입)
    purchases.forEach((purchase, index) => {
        try {
            const date = new Date(purchase.purchase_date);
            if (isNaN(date.getTime())) {
                console.warn('잘못된 날짜 형식:', purchase.purchase_date);
                return;
            }
            
            const key = getPeriodKey(date, period);
            
            if (!grouped[key]) {
                grouped[key] = {
                    period: key,
                    sales: { count: 0, supplyAmount: 0, vatAmount: 0, totalAmount: 0 },
                    purchase: { count: 0, supplyAmount: 0, vatAmount: 0, totalAmount: 0 }
                };
            }
            
            const totalAmount = parseFloat(purchase.total_amount) || 0;
            const taxOption = purchase.tax_option || 'none';
            
            if (totalAmount > 0) {
                let supplyAmount, vatAmount;
                if (taxOption === 'include' || taxOption === 'included') {
                    supplyAmount = Math.round(totalAmount / 1.1);
                    vatAmount = totalAmount - supplyAmount;
                } else if (taxOption === 'exclude' || taxOption === 'excluded') {
                    supplyAmount = totalAmount;
                    vatAmount = Math.round(totalAmount * 0.1);
                } else {
                    supplyAmount = totalAmount;
                    vatAmount = 0;
                }
                
                grouped[key].purchase.count++;
                grouped[key].purchase.supplyAmount += supplyAmount;
                grouped[key].purchase.vatAmount += vatAmount;
                grouped[key].purchase.totalAmount += totalAmount;
            }
        } catch (error) {
            console.error('구매 데이터 그룹화 오류:', error, purchase);
        }
    });
    
    const result = Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
    console.log('그룹화된 데이터:', result.length, '개 기간');
    return result;
}

// 기간 키 생성
function getPeriodKey(date, period) {
    switch (period) {
        case 'daily':
            return date.toISOString().split('T')[0];
        case 'monthly':
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        case 'yearly':
            return String(date.getFullYear());
        default:
            return date.toISOString().split('T')[0];
    }
}

// 요약 데이터 계산
function calculateSummary(repairs, purchases) {
    console.log('요약 데이터 계산 시작...');
    console.log('수리 데이터:', repairs.length, '건');
    console.log('구매 데이터:', purchases.length, '건');
    
    // 매출 계산 (새로운 모듈 사용)
    const revenueCalculator = new RevenueCalculator();
    const revenueSummary = revenueCalculator.calculateFromRepairs(repairs);
    
    let totalExpense = 0;
    let totalExpenseVat = 0;
    let expenseCount = 0;
    
    // 매입 계산 (구매 이력)
    purchases.forEach((purchase, index) => {
        try {
            const totalAmount = parseFloat(purchase.total_amount) || 0;
            const taxOption = purchase.tax_option || 'none';
            
            if (totalAmount > 0) {
                let supplyAmount, vatAmount;
                if (taxOption === 'include' || taxOption === 'included') {
                    supplyAmount = Math.round(totalAmount / 1.1);
                    vatAmount = totalAmount - supplyAmount;
                } else if (taxOption === 'exclude' || taxOption === 'excluded') {
                    supplyAmount = totalAmount;
                    vatAmount = Math.round(totalAmount * 0.1);
                } else {
                    supplyAmount = totalAmount;
                    vatAmount = 0;
                }
                
                totalExpense += supplyAmount;
                totalExpenseVat += vatAmount;
                expenseCount++;
                
                if (index < 3) { // 처음 3개만 로그
                    console.log(`구매 ${index + 1}: 총액=${totalAmount}, 부가세옵션=${taxOption}, 공급가액=${supplyAmount}, 부가세=${vatAmount}`);
                }
            }
        } catch (error) {
            console.error('구매 데이터 계산 오류:', error, purchase);
        }
    });
    
    const netProfit = revenueSummary.totalRevenue - (totalExpense + totalExpenseVat);
    const profitMargin = RevenueUtils.calculateProfitMargin(revenueSummary.totalRevenue, totalExpense + totalExpenseVat);
    
    const summary = {
        totalRevenue: revenueSummary.totalRevenue,
        totalExpense: totalExpense + totalExpenseVat,
        totalVat: revenueSummary.totalRevenueVat + totalExpenseVat,
        netProfit: netProfit,
        profitMargin: profitMargin,
        revenueCount: revenueSummary.revenueCount,
        expenseCount: expenseCount
    };
    
    console.log('계산된 요약 데이터:', summary);
    return summary;
}

// 요약 카드 업데이트 (RevenueUI 모듈 사용)
function updateSummaryCards(summary) {
    // RevenueUI 모듈 사용
    if (typeof RevenueUI !== 'undefined') {
        const revenueUI = new RevenueUI();
        revenueUI.updateSummaryCard(summary);
    } else {
        // 폴백: 직접 업데이트
        document.getElementById('totalRevenue').textContent = summary.totalRevenue.toLocaleString() + '원';
        document.getElementById('revenueCount').textContent = summary.revenueCount + '건';
    }
    
    document.getElementById('totalExpense').textContent = summary.totalExpense.toLocaleString() + '원';
    document.getElementById('expenseCount').textContent = summary.expenseCount + '건';
    
    const netProfitElement = document.getElementById('netProfit');
    netProfitElement.textContent = summary.netProfit.toLocaleString() + '원';
    netProfitElement.className = summary.netProfit >= 0 ? 'card-value positive' : 'card-value negative';
    
    document.getElementById('profitMargin').textContent = summary.profitMargin + '%';
    
    document.getElementById('totalVat').textContent = summary.totalVat.toLocaleString() + '원';
    
    // 요약 카드 클릭 이벤트 추가
    addSummaryCardClickEvents();
}

// 요약 카드 클릭 이벤트 추가
function addSummaryCardClickEvents() {
    const cardConfigs = [
        { selector: '.summary-card.revenue', type: 'revenue', title: '매출' },
        { selector: '.summary-card.expense', type: 'expense', title: '매입' },
        { selector: '.summary-card.net', type: 'net', title: '순이익' },
        { selector: '.summary-card.vat', type: 'vat', title: '부가세' }
    ];
    
    cardConfigs.forEach(config => {
        const card = document.querySelector(config.selector);
        if (card && !card.hasAttribute('data-modal-initialized')) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                console.log(`${config.title} 카드 클릭됨`);
                openSummaryDetailModal(config.type, config.title);
            });
            card.setAttribute('data-modal-initialized', 'true');
        }
    });
}

// 요약 상세 모달 열기 (간단한 버전)
function openSummaryDetailModal(type, title) {
    // 모달 HTML이 없으면 생성
    if (!document.getElementById('summaryDetailModal')) {
        createSummaryModal();
    }
    
    // 날짜 범위 미리 설정
    if (!window.currentStartDate || !window.currentEndDate) {
        updateDateRange();
    }
    
    // 모달 표시
    const modal = document.getElementById('summaryDetailModal');
    const modalTitle = document.getElementById('modalTitle');
    const tableTitle = document.getElementById('tableTitle');
    
    if (modalTitle) modalTitle.textContent = title + ' 상세 내역';
    if (tableTitle) tableTitle.textContent = title + ' 상세 내역';
    
    modal.style.display = 'flex';
    
    // ESC 키 이벤트 리스너 추가
    document.addEventListener('keydown', handleSummaryModalKeydown);
    
    // 데이터 로드
    loadSummaryDetailData(type);
}

// 모달 생성
function createSummaryModal() {
    const modalHTML = `
        <div class="modal" id="summaryDetailModal" style="display: none;">
            <div class="modal-content" style="max-width: 1000px; max-height: 80vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h2 id="modalTitle">상세 내역</h2>
                    <button class="close-btn" onclick="closeSummaryModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                
                <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <label>기간 선택:</label>
                        <select id="dateRange" onchange="updateDateRange()" style="margin-left: 10px; padding: 5px;">
                            <option value="today">오늘</option>
                            <option value="week">이번 주</option>
                            <option value="month" selected>이번 달</option>
                            <option value="quarter">이번 분기</option>
                            <option value="year">올해</option>
                        </select>
                        <button onclick="loadSummaryDetailData()" style="margin-left: 10px; padding: 5px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">조회</button>
                    </div>
                    
                    <div id="summaryInfo" style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div><strong>총 금액:</strong> <span id="totalAmount">0원</span></div>
                            <div><strong>총 건수:</strong> <span id="totalCount">0건</span></div>
                            <div><strong>평균 금액:</strong> <span id="averageAmount">0원</span></div>
                        </div>
                    </div>
                    
                    <div style="overflow-x: auto; max-height: 400px;">
                        <table id="detailTable" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead id="tableHead" style="background: #f8f9fa; position: sticky; top: 0;">
                                <!-- 테이블 헤더가 동적으로 생성됩니다 -->
                            </thead>
                            <tbody id="tableBody">
                                <tr><td colspan="5" style="text-align: center; padding: 20px;">데이터를 불러오는 중...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="modal-footer" style="padding: 15px; background: #f8f9fa; border-top: 1px solid #dee2e6; text-align: right;">
                    <button onclick="closeSummaryModal()" style="padding: 8px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">닫기</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 모달 닫기
function closeSummaryModal() {
    const modal = document.getElementById('summaryDetailModal');
    if (modal) {
        modal.style.display = 'none';
        // ESC 키 이벤트 리스너 제거
        document.removeEventListener('keydown', handleSummaryModalKeydown);
    }
}

/**
 * 요약 모달 ESC 키 이벤트 핸들러
 */
function handleSummaryModalKeydown(event) {
    if (event.key === 'Escape') {
        closeSummaryModal();
    }
}

// 날짜 범위 업데이트
function updateDateRange() {
    const dateRange = document.getElementById('dateRange').value;
    const today = new Date();
    const startDate = new Date();
    const endDate = new Date();
    
    switch (dateRange) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            startDate.setDate(today.getDate() - today.getDay());
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(today.getDate() - today.getDay() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setMonth(today.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate.setMonth(quarter * 3, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setMonth(quarter * 3 + 3, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'year':
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setMonth(11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;
    }
    
    // 날짜를 YYYY-MM-DD 형식으로 변환
    const formatDate = (date) => date.toISOString().split('T')[0];
    window.currentStartDate = formatDate(startDate);
    window.currentEndDate = formatDate(endDate);
}

// 상세 데이터 로드
async function loadSummaryDetailData(type) {
    if (!type) type = window.currentSummaryType || 'revenue';
    
    try {
        // 날짜 범위 설정
        if (!window.currentStartDate || !window.currentEndDate) {
            console.log('날짜 범위 설정 중...');
            updateDateRange();
            console.log('날짜 범위 설정 완료:', { startDate: window.currentStartDate, endDate: window.currentEndDate });
        }
        
        // 날짜가 여전히 없으면 기본값 설정
        if (!window.currentStartDate || !window.currentEndDate) {
            console.warn('날짜 범위 설정 실패, 기본값 사용');
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            window.currentStartDate = startDate.toISOString().split('T')[0];
            window.currentEndDate = endDate.toISOString().split('T')[0];
        }
        
        console.log('데이터 로드 시작:', { type, startDate: window.currentStartDate, endDate: window.currentEndDate });
        
        const url = `/api/summary-details/${type}?startDate=${window.currentStartDate}&endDate=${window.currentEndDate}`;
        console.log('API URL:', url);
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        console.log('API 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API 응답 데이터:', result);
        
        if (result.success) {
            updateSummaryDetailTable(result.data, type);
            // summary 객체가 있으면 사용하고, 없으면 data에서 계산
            if (result.summary) {
                updateSummaryDetailInfo(result.summary);
            } else {
                // data에서 요약 정보 계산
                const summary = calculateSummaryFromData(result.data);
                updateSummaryDetailInfo(summary);
            }
        } else {
            console.error('API 오류:', result.message);
            showSummaryError(result.message || '데이터를 불러오는데 실패했습니다.');
        }
    } catch (error) {
        console.error('상세 내역 로드 오류:', error);
        showSummaryError('네트워크 오류가 발생했습니다.');
    }
}

// 상세 테이블 업데이트 (DetailTable 모듈 사용)
function updateSummaryDetailTable(data, type) {
    // DetailTable 모듈이 로드될 때까지 대기
    if (typeof DetailTable !== 'undefined') {
        const detailTable = new DetailTable();
        detailTable.updateDetailTable(data, type);
    } else {
        console.warn('DetailTable 모듈이 아직 로드되지 않았습니다. 1초 후 재시도합니다.');
        setTimeout(() => {
            if (typeof DetailTable !== 'undefined') {
                const detailTable = new DetailTable();
                detailTable.updateDetailTable(data, type);
            } else {
                console.error('DetailTable 모듈을 찾을 수 없습니다. 수동으로 테이블을 업데이트합니다.');
                updateSummaryDetailTableFallback(data, type);
            }
        }, 1000);
    }
}

// DetailTable 모듈이 없을 때의 대체 함수
function updateSummaryDetailTableFallback(data, type) {
    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');
    
    if (!thead || !tbody) {
        console.error('테이블 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 기본 헤더 설정
    const headers = ['번호', '거래일', '거래코드', '고객명', '제품명', '수량', '단가', '총액', '상태'];
    thead.innerHTML = headers.map(header => `<th style="padding: 10px; border: 1px solid #dee2e6;">${header}</th>`).join('');
    
    // 기본 데이터 설정
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">데이터가 없습니다.</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map((item, index) => {
        const formatNumber = (num) => new Intl.NumberFormat('ko-KR').format(num || 0);
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('ko-KR') : '-';
        
        return `
            <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${index + 1}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${formatDate(item.date)}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${item.code || '-'}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${item.customer || '-'}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${item.product || '-'}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${formatNumber(item.quantity)}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${formatNumber(item.unitPrice)}원</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${formatNumber(item.totalAmount)}원</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${item.status || '-'}</td>
            </tr>
        `;
    }).join('');
}

// 테이블 헤더 가져오기 (AnalysisTable 모듈로 이동됨)

// 테이블 셀 가져오기 (AnalysisTable 모듈로 이동됨)

// 데이터에서 요약 정보 계산
function calculateSummaryFromData(data) {
    if (!data || !Array.isArray(data)) {
        return { totalAmount: 0, totalCount: 0, averageAmount: 0 };
    }
    
    const totalAmount = data.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalCount = data.length;
    const averageAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
    
    return {
        totalAmount,
        totalCount,
        averageAmount
    };
}

// 요약 정보 업데이트
function updateSummaryDetailInfo(summary) {
    const totalAmount = document.getElementById('totalAmount');
    const totalCount = document.getElementById('totalCount');
    const averageAmount = document.getElementById('averageAmount');
    
    // summary 객체가 없거나 속성이 없을 때를 처리
    if (!summary) {
        console.warn('summary 객체가 없습니다.');
        if (totalAmount) totalAmount.textContent = '0원';
        if (totalCount) totalCount.textContent = '0건';
        if (averageAmount) averageAmount.textContent = '0원';
        return;
    }
    
    if (totalAmount) totalAmount.textContent = new Intl.NumberFormat('ko-KR').format(summary.totalAmount || 0) + '원';
    if (totalCount) totalCount.textContent = (summary.totalCount || 0) + '건';
    if (averageAmount) averageAmount.textContent = new Intl.NumberFormat('ko-KR').format(summary.averageAmount || 0) + '원';
}

// 오류 표시
function showSummaryError(message) {
    const tbody = document.getElementById('tableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">${message}</td></tr>`;
    }
}

// 분석 테이블 업데이트 (SalesAnalysisTable 모듈 사용)
function updateAnalysisTable(data) {
    if (typeof SalesAnalysisTable !== 'undefined') {
        const salesAnalysisTable = new SalesAnalysisTable();
        salesAnalysisTable.updateAnalysisTable(data);
    } else {
        console.error('SalesAnalysisTable 모듈을 찾을 수 없습니다.');
    }
}

// 새로고침
function refreshAnalysis() {
    console.log('분석 새로고침');
    loadDashboardAnalysis();
}

// 수리 현황 업데이트
function updateRepairStatus() {
    console.log('수리 현황 업데이트 시작');
    
    let pendingCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let warrantyCount = 0;
    
    allRepairs.forEach(repair => {
        const status = repair.status || 'pending';
        const repairDate = new Date(repair.repair_date);
        const now = new Date();
        const daysDiff = Math.floor((now - repairDate) / (1000 * 60 * 60 * 24));
        
        switch (status) {
            case 'pending':
            case '접수':
                pendingCount++;
                break;
            case 'in_progress':
            case '진행중':
            case '수리중':
            case '위탁접수':
                inProgressCount++;
                break;
            case 'completed':
            case '완료':
                completedCount++;
                // 보증 기간 확인 (30일 기준)
                if (daysDiff <= 30) {
                    warrantyCount++;
                }
                break;
        }
    });
    
    document.getElementById('pendingCount').textContent = pendingCount + '건';
    document.getElementById('inProgressCount').textContent = inProgressCount + '건';
    document.getElementById('completedCount').textContent = completedCount + '건';
    document.getElementById('warrantyCount').textContent = warrantyCount + '건';
    
    console.log('수리 현황 업데이트 완료:', { pendingCount, inProgressCount, completedCount, warrantyCount });
}

// 진행중인 수리 내역 표시
function showAllRepairs() {
    console.log('전체 수리 내역 표시');
    console.log('전체 수리 데이터:', allRepairs);
    
    const searchResults = document.getElementById('regionSearchResults');
    
    // 모든 수리 데이터의 상태 값 확인
    const statusCounts = {};
    allRepairs.forEach(repair => {
        const status = repair.status || 'null';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('상태별 수리 건수:', statusCounts);
    
    // 접수 및 위탁 접수 상태의 수리만 표시
    const repairList = allRepairs.filter(repair => {
        const status = repair.status || 'pending';
        // 접수, 위탁접수, 진행중 상태만 표시
        return status === 'pending' || status === '접수' || 
               status === 'in_progress' || status === '진행중' || status === '수리중' || 
               status === '위탁접수';
    });
    
    console.log('필터링된 수리 목록:', repairList);
    
    if (repairList.length === 0) {
        searchResults.innerHTML = '<div class="no-results">진행중인 수리가 없습니다.</div>';
        return;
    }
    
    // 수리일 순으로 정렬 (최신순)
    repairList.sort((a, b) => new Date(b.repair_date) - new Date(a.repair_date));
    
    let html = '';
    repairList.forEach(repair => {
        const repairDate = new Date(repair.repair_date).toLocaleDateString('ko-KR');
        const statusText = getStatusText(repair.status);
        const statusClass = getStatusClass(repair.status);
        
        console.log('수리 항목 처리:', {
            id: repair.id,
            customer_name: repair.customer_name,
            status: repair.status,
            statusText: statusText,
            repair_date: repair.repair_date
        });
        
        html += `
            <div class="search-result-item compact">
                <div class="result-info">
                    <div class="result-customer">${repair.customer_name || '고객명 없음'}</div>
                    <div class="result-details">
                        📞 ${repair.customer_phone || '-'} | 📍 ${repair.customer_address || '주소 없음'} | 
                        📅 ${repairDate}
                    </div>
                </div>
                <div class="result-actions">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <button class="result-btn primary" onclick="viewRepairDetail(${repair.id})">상세</button>
                    <button class="result-btn secondary" onclick="callCustomer('${repair.customer_phone}')">전화</button>
                </div>
            </div>
        `;
    });
    
    searchResults.innerHTML = html;
    console.log('진행중인 수리 내역 표시 완료:', repairList.length, '건');
}

// 지역별 검색 기능
function searchByRegion() {
    console.log('지역별 검색 시작');
    
    const searchTerm = document.getElementById('regionSearchInput').value.trim().toLowerCase();
    const searchResults = document.getElementById('regionSearchResults');
    
    if (searchTerm.length < 2) {
        // 검색어가 2글자 미만이면 진행중인 수리 내역 표시
        showAllRepairs();
        return;
    }
    
    // 고객 데이터에서 지역별 검색
    const matchingCustomers = [];
    const customerMap = new Map();
    
    allRepairs.forEach(repair => {
        if (repair.customer_name) {
            const customerName = repair.customer_name.toLowerCase();
            const customerAddress = (repair.customer_address || '').toLowerCase();
            const extractedRegion = extractRegionFromCustomer(repair.customer_name).toLowerCase();
            
            // 디버깅을 위한 로그
            console.log('검색 대상:', {
                customerName: repair.customer_name,
                customerAddress: repair.customer_address,
                extractedRegion: extractedRegion,
                searchTerm: searchTerm
            });
            
            // 고객명, 주소, 또는 추출된 지역에서 검색어 포함 확인
            if (customerName.includes(searchTerm) || 
                customerAddress.includes(searchTerm) || 
                extractedRegion.includes(searchTerm)) {
                const customerId = repair.customer_id;
                
                if (!customerMap.has(customerId)) {
                    customerMap.set(customerId, {
                        id: customerId,
                        name: repair.customer_name,
                        phone: repair.customer_phone || '-',
                        address: repair.customer_address || '-',
                        management_number: repair.management_number || '-',
                        region: extractRegionFromCustomer(repair.customer_name) || '기타',
                        repairCount: 0,
                        totalAmount: 0,
                        lastRepairDate: repair.repair_date
                    });
                }
                
                const customer = customerMap.get(customerId);
                customer.repairCount++;
                customer.totalAmount += parseFloat(repair.total_cost) || 0;
                
                // 최신 수리일 업데이트
                if (new Date(repair.repair_date) > new Date(customer.lastRepairDate)) {
                    customer.lastRepairDate = repair.repair_date;
                }
            }
        }
    });
    
    matchingCustomers.push(...customerMap.values());
    
    // 검색 결과 표시
    if (matchingCustomers.length === 0) {
        searchResults.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
        return;
    }
    
    // 수리 건수 순으로 정렬
    matchingCustomers.sort((a, b) => b.repairCount - a.repairCount);
    
    let html = '';
    matchingCustomers.forEach(customer => {
        const lastRepairDate = new Date(customer.lastRepairDate).toLocaleDateString('ko-KR');
        
        html += `
            <div class="search-result-item compact">
                <div class="result-info">
                    <div class="result-customer">${customer.name}</div>
                    <div class="result-details">
                        📞 ${customer.phone} | 📍 ${customer.address} | 
                        🔧 ${customer.repairCount}건
                    </div>
                </div>
                <div class="result-actions">
                    <button class="result-btn primary" onclick="viewCustomerDetail(${customer.id})">상세</button>
                    <button class="result-btn secondary" onclick="callCustomer('${customer.phone}')">전화</button>
                </div>
            </div>
        `;
    });
    
    searchResults.innerHTML = html;
    console.log('지역별 검색 완료:', matchingCustomers.length, '명의 고객 발견');
}

// 지역별 검색 초기화
function clearRegionSearch() {
    document.getElementById('regionSearchInput').value = '';
    document.getElementById('regionSearchResults').innerHTML = '<div class="loading">지역별 검색을 시작하세요...</div>';
}

// 고객 상세보기
function viewCustomerDetail(customerId) {
    window.open(`/customers/customer-detail.html?id=${customerId}`, '_blank');
}

// 전화걸기
function callCustomer(phone) {
    if (phone && phone !== '-') {
        window.open(`tel:${phone}`, '_self');
    } else {
        alert('전화번호가 없습니다.');
    }
}

// 수리 상세보기
function viewRepairDetail(repairId) {
    console.log('🔍 수리 상세보기 이동, repairId:', repairId);
    // 수리 관리 페이지로 이동
    window.open(`/repairs/repair-management.html?id=${repairId}`, '_blank');
}

// 상태 텍스트 반환
function getStatusText(status) {
    const statusMap = {
        'pending': '접수',
        '접수': '접수',
        '위탁접수': '위탁 접수',
        'in_progress': '위탁 접수',
        '진행중': '위탁 접수',
        '수리중': '위탁 접수',
        'completed': '수리 완료',
        '완료': '수리 완료',
        'cancelled': '취소됨',
        '취소': '취소됨'
    };
    return statusMap[status] || status || '알 수 없음';
}

// 상태 클래스 반환
function getStatusClass(status) {
    const classMap = {
        'pending': 'status-pending',
        '접수': 'status-pending',
        '위탁접수': 'status-progress',
        'in_progress': 'status-progress',
        '진행중': 'status-progress',
        '수리중': 'status-progress',
        'completed': 'status-completed',
        '완료': 'status-completed',
        'cancelled': 'status-cancelled',
        '취소': 'status-cancelled'
    };
    return classMap[status] || 'status-unknown';
}

// 고객명에서 지역 추출 (간단한 예시)
function extractRegionFromCustomer(customerName) {
    // 실제로는 주소 데이터를 사용해야 함
    const regionKeywords = [
        // 시/도
        '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
        // 서울 구/군
        '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구',
        // 서울 구/군 (구 없이)
        '강남', '강동', '강북', '강서', '관악', '광진', '구로', '금천', '노원', '도봉', '동대문', '동작', '마포', '서대문', '서초', '성동', '성북', '송파', '양천', '영등포', '용산', '은평', '종로', '중구', '중랑',
        // 경기도 주요 지역
        '수원', '성남', '의정부', '안양', '부천', '광명', '평택', '과천', '오산', '시흥', '군포', '의왕', '하남', '용인', '파주', '이천', '안성', '김포', '화성', '광주', '여주', '양평', '동두천', '가평', '연천'
    ];
    
    for (const keyword of regionKeywords) {
        if (customerName.includes(keyword)) {
            return keyword;
        }
    }
    
    return '기타';
}


// 수리 현황 새로고침
function refreshRepairStatus() {
    console.log('수리 현황 새로고침');
    loadRepairsData().then(() => {
        updateRepairStatus();
    });
}

// 지역별 검색 새로고침
function refreshRegionSearch() {
    console.log('지역별 검색 새로고침');
    searchByRegion();
}


// 전역 함수로 등록
window.updateAnalysis = updateAnalysis;
window.refreshAnalysis = refreshAnalysis;
window.refreshRepairStatus = refreshRepairStatus;
window.showAllRepairs = showAllRepairs;
window.searchByRegion = searchByRegion;
window.clearRegionSearch = clearRegionSearch;
window.viewCustomerDetail = viewCustomerDetail;
window.viewRepairDetail = viewRepairDetail;
window.callCustomer = callCustomer;
window.refreshRegionSearch = refreshRegionSearch;

// 모든 화면 숨기기
function hideAllScreens() {
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'none';
}

// 메뉴 함수들
function showCustomers() {
    window.location.href = '../customers/customers.html';
}

function showProducts() {
    window.location.href = '../products/products.html';
}

function showLedger() {
    alert('장부 관리 페이지 (개발 예정)');
}

function showAccounting() {
    window.location.href = '../accounting/accounting.html';
}

function showSettings() {
    alert('설정 페이지 (개발 예정)');
}

// 로그아웃
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            showHome();
            alert('로그아웃되었습니다.');
        } else {
            showHome();
            alert('로그아웃되었습니다.');
        }
    } catch (error) {
        showHome();
        alert('로그아웃되었습니다.');
    }
}

// 메시지 표시 함수
function showMessage(message, type) {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 새 메시지 생성
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // 폼 앞에 삽입
    const form = type === 'success' ? loginForm : registerForm;
    form.parentNode.insertBefore(messageDiv, form);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// 로딩 상태 설정
function setLoading(form, loading) {
    if (loading) {
        form.classList.add('loading');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
    } else {
        form.classList.remove('loading');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
    }
}

// 로그인 폼 제출
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showMessage('모든 필드를 입력해주세요.', 'error');
        return;
    }
    
    setLoading(loginForm, true);
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            // 로그인 성공 시 대시보드로 이동
            setTimeout(() => {
                showDashboard();
                document.getElementById('userName').textContent = data.user.username;
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    } finally {
        setLoading(loginForm, false);
    }
});

// 회원가입 폼 제출
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value;
    
    if (!name || !username || !password || !phone) {
        showMessage('모든 필드를 입력해주세요.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('비밀번호는 6자 이상이어야 합니다.', 'error');
        return;
    }
    
    setLoading(registerForm, true);
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, username, password, phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            // 회원가입 성공 시 로그인 폼으로 전환
            setTimeout(() => {
                registerFormDiv.style.display = 'none';
                loginFormDiv.style.display = 'block';
                // 폼 초기화
                registerForm.reset();
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    } finally {
        setLoading(registerForm, false);
    }
});

// 입력 필드 포커스 효과
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.classList.remove('focused');
        }
    });
});


// 페이지 로드 시 사용자 상태 확인
window.addEventListener('load', () => {
    // 서버에서 사용자 상태 확인
    checkUserStatus();
});

// 사용자 상태 확인
async function checkUserStatus() {
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success && result.isLoggedIn) {
            showDashboard();
            document.getElementById('userName').textContent = result.user.username;
        } else {
            showHome();
        }
    } catch (error) {
        showHome();
    }
}

// 수리 현황 모달 관련 함수들 (repair-status-modal.js에서 가져옴)
let currentRepairStatusPage = 1;
let repairStatusPageSize = 10;
let currentRepairStatusFilter = 'all';
let currentRepairStatusDateRange = 'month';
let allRepairStatusData = [];
let filteredRepairStatusData = [];

/**
 * 수리 현황 모달을 엽니다.
 * @param {string} status - '접수', '위탁 접수', '수리 완료', '보증 중' 등
 */
async function openRepairStatusModal(status = 'all') {
    const modal = document.getElementById('repairStatusModal');
    const modalTitle = document.getElementById('repairStatusModalTitle');
    
    if (!modal || !modalTitle) {
        console.error('Repair status modal elements not found.');
        return;
    }
    
    // 모달 제목 설정
    const statusTitles = {
        'all': '수리 현황 상세',
        '접수': '접수 현황 상세',
        '위탁 접수': '위탁 접수 현황 상세',
        '수리 완료': '수리 완료 현황 상세',
        '보증 중': '보증 중 현황 상세'
    };
    
    modalTitle.textContent = statusTitles[status] || '수리 현황 상세';
    
    // 필터 설정
    if (status !== 'all') {
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.value = status;
        }
    }
    
    // 모달 표시
    modal.style.display = 'flex';
    
    // ESC 키 이벤트 리스너 추가
    document.addEventListener('keydown', handleRepairStatusModalKeydown);
    
    // 데이터 로드
    await loadRepairStatusData();
}

/**
 * 수리 현황 모달을 닫습니다.
 */
function closeRepairStatusModal() {
    const modal = document.getElementById('repairStatusModal');
    if (modal) {
        modal.style.display = 'none';
        // ESC 키 이벤트 리스너 제거
        document.removeEventListener('keydown', handleRepairStatusModalKeydown);
    }
}

/**
 * 수리 현황 모달 ESC 키 이벤트 핸들러
 */
function handleRepairStatusModalKeydown(event) {
    if (event.key === 'Escape') {
        closeRepairStatusModal();
    }
}

/**
 * 수리 상세 모달을 엽니다.
 * @param {number} repairId - 수리 ID
 */
async function openRepairDetailModal(repairId) {
    const modal = document.getElementById('repairDetailModal');
    const modalTitle = document.getElementById('repairDetailModalTitle');
    const modalContent = document.getElementById('repairDetailContent');
    
    if (!modal || !modalTitle || !modalContent) {
        console.error('Repair detail modal elements not found.');
        return;
    }
    
    modalTitle.textContent = '수리 상세 정보';
    modalContent.innerHTML = '<div style="text-align: center; padding: 20px;">데이터를 불러오는 중...</div>';
    modal.style.display = 'flex';
    
    // ESC 키 이벤트 리스너 추가
    document.addEventListener('keydown', handleRepairDetailModalKeydown);
    
    try {
        const response = await fetch(`/api/repairs/${repairId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayRepairDetail(result.data, modalContent);
        } else {
            modalContent.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">${result.message || '수리 상세 정보를 불러오는데 실패했습니다.'}</div>`;
        }
    } catch (error) {
        console.error('Failed to fetch repair detail:', error);
        modalContent.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">네트워크 오류: ${error.message}</div>`;
    }
}

/**
 * 수리 상세 모달을 닫습니다.
 */
function closeRepairDetailModal() {
    const modal = document.getElementById('repairDetailModal');
    if (modal) {
        modal.style.display = 'none';
        // ESC 키 이벤트 리스너 제거
        document.removeEventListener('keydown', handleRepairDetailModalKeydown);
    }
}

/**
 * 수리 상세 모달 ESC 키 이벤트 핸들러
 */
function handleRepairDetailModalKeydown(event) {
    if (event.key === 'Escape') {
        closeRepairDetailModal();
    }
}

/**
 * 수리 현황 데이터를 로드합니다.
 */
async function loadRepairStatusData() {
    try {
        // 로딩 상태 표시
        const tbody = document.getElementById('repairStatusTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: #6c757d;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            <div style="font-size: 24px;">📋</div>
                            <div>수리 현황 데이터를 불러오는 중...</div>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // API 호출
        const response = await fetch('/api/repairs?limit=10000', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('수리 현황 API 응답:', result);
        
        if (result.success) {
            allRepairStatusData = result.data || [];
            console.log('수리 현황 데이터:', allRepairStatusData.length, '건');
            
            // 상태 분포 확인을 위한 디버깅 API 호출
            try {
                const debugResponse = await fetch('/api/repair-status-debug', {
                    credentials: 'include'
                });
                const debugResult = await debugResponse.json();
                if (debugResult.success) {
                    console.log('데이터베이스 상태 분포:', debugResult.data);
                }
            } catch (debugError) {
                console.log('디버깅 API 호출 실패:', debugError);
            }
            
            updateRepairStatusFilter();
        } else {
            console.error('수리 현황 API 오류:', result.message);
            showRepairStatusError(result.message || '수리 현황을 불러오는데 실패했습니다.');
        }
    } catch (error) {
        console.error('Failed to load repair status data:', error);
        showRepairStatusError('네트워크 오류가 발생했습니다.');
    }
}

/**
 * 수리 현황 필터를 업데이트합니다.
 */
function updateRepairStatusFilter() {
    const statusFilter = document.getElementById('statusFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    
    if (statusFilter) {
        currentRepairStatusFilter = statusFilter.value;
    }
    
    if (dateRangeFilter) {
        currentRepairStatusDateRange = dateRangeFilter.value;
    }
    
    // 날짜 범위 계산
    const dateRange = getRepairDateRange(currentRepairStatusDateRange);
    
    // 데이터 필터링
    console.log('필터링 전 데이터:', allRepairStatusData.length, '건');
    console.log('현재 필터:', currentRepairStatusFilter);
    console.log('날짜 범위:', dateRange);
    
    // 상태별 데이터 분포 확인
    const statusCounts = {};
    allRepairStatusData.forEach(repair => {
        statusCounts[repair.status] = (statusCounts[repair.status] || 0) + 1;
    });
    console.log('상태별 데이터 분포:', statusCounts);
    
    filteredRepairStatusData = allRepairStatusData.filter(repair => {
        // 상태 필터 - 상태 매핑 적용
        if (currentRepairStatusFilter !== 'all') {
            const statusMapping = {
                '접수': '접수',
                '위탁 접수': '위탁접수',
                '수리 완료': '완료',
                '보증 중': ['보증중', '보증 중', '완료'] // 여러 가능한 상태 값
            };
            
            const mappedStatus = statusMapping[currentRepairStatusFilter] || currentRepairStatusFilter;
            
            // 배열인 경우 포함 여부 확인
            if (Array.isArray(mappedStatus)) {
                if (!mappedStatus.includes(repair.status)) {
                    console.log('상태 필터에서 제외:', repair.status, 'not in', mappedStatus, '(원본 필터:', currentRepairStatusFilter, ')');
                    return false;
                }
            } else {
                if (repair.status !== mappedStatus) {
                    console.log('상태 필터에서 제외:', repair.status, '!==', mappedStatus, '(원본 필터:', currentRepairStatusFilter, ')');
                    return false;
                }
            }
        }
        
        // 날짜 필터
        const repairDate = new Date(repair.repair_date);
        if (repairDate < dateRange.start || repairDate > dateRange.end) {
            console.log('날짜 필터에서 제외:', repair.repair_date, '범위:', dateRange.start, '~', dateRange.end);
            return false;
        }
        
        return true;
    });
    
    console.log('필터링 후 데이터:', filteredRepairStatusData.length, '건');
    
    // 테이블 업데이트
    updateRepairStatusTable();
    updateRepairStatusSummary();
    updateRepairStatusPagination();
}

/**
 * 날짜 범위를 계산합니다.
 * @param {string} range - 'today', 'week', 'month', 'quarter', 'year'
 * @returns {Object} {start: Date, end: Date}
 */
function getRepairDateRange(range) {
    const today = new Date();
    const start = new Date();
    const end = new Date();
    
    switch (range) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'week':
            start.setDate(today.getDate() - today.getDay());
            start.setHours(0, 0, 0, 0);
            end.setDate(today.getDate() - today.getDay() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'month':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(today.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            start.setMonth(quarter * 3, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(quarter * 3 + 3, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'year':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
            break;
    }
    
    return { start, end };
}

/**
 * 수리 현황 테이블을 업데이트합니다.
 */
function updateRepairStatusTable() {
    const tbody = document.getElementById('repairStatusTableBody');
    if (!tbody) return;
    
    if (filteredRepairStatusData.length === 0) {
        const message = allRepairStatusData.length === 0 
            ? '수리 데이터가 없습니다. 테스트 데이터를 추가하려면 서버 관리자에게 문의하세요.'
            : '해당 조건의 수리 현황이 없습니다.';
            
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #6c757d;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <div style="font-size: 24px;">${allRepairStatusData.length === 0 ? '📭' : '🔍'}</div>
                        <div>${message}</div>
                        ${allRepairStatusData.length === 0 ? '<div style="font-size: 12px; color: #999; margin-top: 10px;">수리 이력이 등록되면 여기에 표시됩니다.</div>' : ''}
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // 페이지네이션 적용
    const startIndex = (currentRepairStatusPage - 1) * repairStatusPageSize;
    const endIndex = startIndex + repairStatusPageSize;
    const pageData = filteredRepairStatusData.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageData.map(repair => `
        <tr>
            <td style="text-align: center; font-weight: 600; color: #007bff;">
                <button onclick="goToCustomerDetail(${repair.customer_id})" 
                        style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;"
                        title="고객 상세 정보 보기">
                    ${repair.id || repair.customer_id || '-'}
                </button>
            </td>
            <td style="text-align: center;">${formatRepairDate(repair.repair_date)}</td>
            <td style="text-align: center;">
                <a href="javascript:void(0)" 
                   onclick="goToCustomerDetail(${repair.customer_id})" 
                   style="color: #007bff; text-decoration: none; font-weight: 500;"
                   title="고객 상세 정보 보기">
                    ${repair.customer_name || '-'}
                </a>
            </td>
            <td style="text-align: center; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${repair.device_model || '-'}">${(repair.device_model || '-').length > 10 ? (repair.device_model || '-').substring(0, 10) + '...' : (repair.device_model || '-')}</td>
            <td style="text-align: left; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${repair.problem || '-'}">${repair.problem || '-'}</td>
            <td style="text-align: center;">${getRepairStatusBadge(repair.status)}</td>
            <td style="text-align: right; font-weight: 600;">${formatRepairNumber(repair.total_cost || repair.repair_cost || 0)}원</td>
            <td style="text-align: center;">${formatRepairDate(repair.completion_date || repair.repair_date)}</td>
            <td style="text-align: center;">
                <button class="action-btn view" onclick="openRepairDetailModal(${repair.id})" title="상세보기">👁️</button>
                <button class="action-btn edit" onclick="editRepair(${repair.id})" title="수정">✏️</button>
            </td>
        </tr>
    `).join('');
}

// 고객 상세 정보로 이동하는 함수
function goToCustomerDetail(customerId) {
    console.log('고객 상세 정보로 이동, customerId:', customerId);
    
    if (!customerId) {
        alert('고객 ID가 없습니다.');
        return;
    }
    
    // 고객 상세 페이지로 이동
    window.location.href = `/customers/customer-detail.html?id=${customerId}`;
}

/**
 * 수리 현황 요약 정보를 업데이트합니다.
 */
function updateRepairStatusSummary() {
    const summary = {
        total: filteredRepairStatusData.length,
        pending: filteredRepairStatusData.filter(r => r.status === '접수').length,
        inProgress: filteredRepairStatusData.filter(r => r.status === '위탁접수').length,
        completed: filteredRepairStatusData.filter(r => r.status === '완료').length,
        warranty: filteredRepairStatusData.filter(r => r.status === '보증중').length
    };
    
    // 요약 정보 업데이트
    const elements = {
        totalRepairCount: document.getElementById('totalRepairCount'),
        summaryPendingCount: document.getElementById('summaryPendingCount'),
        summaryInProgressCount: document.getElementById('summaryInProgressCount'),
        summaryCompletedCount: document.getElementById('summaryCompletedCount'),
        summaryWarrantyCount: document.getElementById('summaryWarrantyCount')
    };
    
    if (elements.totalRepairCount) elements.totalRepairCount.textContent = `${summary.total}건`;
    if (elements.summaryPendingCount) elements.summaryPendingCount.textContent = `${summary.pending}건`;
    if (elements.summaryInProgressCount) elements.summaryInProgressCount.textContent = `${summary.inProgress}건`;
    if (elements.summaryCompletedCount) elements.summaryCompletedCount.textContent = `${summary.completed}건`;
    if (elements.summaryWarrantyCount) elements.summaryWarrantyCount.textContent = `${summary.warranty}건`;
    
    // 테이블 정보 업데이트
    const tableInfo = document.getElementById('repairStatusTableInfo');
    if (tableInfo) {
        tableInfo.textContent = `총 ${summary.total}건의 수리 현황`;
    }
}

/**
 * 수리 현황 페이지네이션을 업데이트합니다.
 */
function updateRepairStatusPagination() {
    const totalPages = Math.ceil(filteredRepairStatusData.length / repairStatusPageSize);
    const pageInfo = document.getElementById('repairStatusPageInfo');
    
    if (pageInfo) {
        pageInfo.textContent = `${currentRepairStatusPage} / ${totalPages}`;
    }
    
    // 이전/다음 버튼 활성화/비활성화
    const prevBtn = document.querySelector('#repairStatusPagination button:first-child');
    const nextBtn = document.querySelector('#repairStatusPagination button:last-child');
    
    if (prevBtn) {
        prevBtn.disabled = currentRepairStatusPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentRepairStatusPage >= totalPages;
    }
}

/**
 * 수리 현황 페이지를 변경합니다.
 * @param {number} direction - -1 (이전), 1 (다음)
 */
function changeRepairStatusPage(direction) {
    const totalPages = Math.ceil(filteredRepairStatusData.length / repairStatusPageSize);
    const newPage = currentRepairStatusPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentRepairStatusPage = newPage;
        updateRepairStatusTable();
        updateRepairStatusPagination();
    }
}

/**
 * 수리 현황 테이블을 검색으로 필터링합니다.
 */
function filterRepairStatusTable() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    
    if (searchTerm === '') {
        // 검색어가 없으면 원래 필터 적용
        updateRepairStatusFilter();
        return;
    }
    
    // 검색 필터링
    const searchFilteredData = allRepairStatusData.filter(repair => {
        const customerName = (repair.customer_name || '').toLowerCase();
        const deviceModel = (repair.device_model || '').toLowerCase();
        const customerId = String(repair.customer_id || '').toLowerCase();
        const problem = (repair.problem || '').toLowerCase();
        
        return customerName.includes(searchTerm) ||
               deviceModel.includes(searchTerm) ||
               customerId.includes(searchTerm) ||
               problem.includes(searchTerm);
    });
    
    // 날짜 필터 적용
    const dateRange = getRepairDateRange(currentRepairStatusDateRange);
    filteredRepairStatusData = searchFilteredData.filter(repair => {
        const repairDate = new Date(repair.repair_date);
        return repairDate >= dateRange.start && repairDate <= dateRange.end;
    });
    
    currentRepairStatusPage = 1;
    updateRepairStatusTable();
    updateRepairStatusSummary();
    updateRepairStatusPagination();
}

/**
 * 수리 상세 정보를 표시합니다.
 * @param {Object} repair - 수리 데이터
 * @param {HTMLElement} container - 표시할 컨테이너
 */
function displayRepairDetail(repair, container) {
    const html = `
        <div class="detail-section">
            <h3>📋 기본 정보</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">수리 코드</div>
                    <div class="detail-value">${repair.repair_code || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">접수일</div>
                    <div class="detail-value">${formatRepairDate(repair.repair_date)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">완료일</div>
                    <div class="detail-value">${formatRepairDate(repair.completion_date)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">상태</div>
                    <div class="detail-value">${getRepairStatusBadge(repair.status)}</div>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>👤 고객 정보</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">고객명</div>
                    <div class="detail-value">${repair.customer_name || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">연락처</div>
                    <div class="detail-value">${repair.customer_phone || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">이메일</div>
                    <div class="detail-value">${repair.customer_email || '-'}</div>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>💻 기기 정보</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">기기명</div>
                    <div class="detail-value">${repair.device_model || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">제조사</div>
                    <div class="detail-value">${repair.manufacturer || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">시리얼 번호</div>
                    <div class="detail-value">${repair.serial_number || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">보증 기간</div>
                    <div class="detail-value">${repair.warranty_period || '-'}</div>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>🔧 수리 정보</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">문제</div>
                    <div class="detail-value">${repair.problem || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">수리 내용</div>
                    <div class="detail-value">${repair.repair_description || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">수리비</div>
                    <div class="detail-value">${formatRepairNumber(repair.repair_cost || 0)}원</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">부품비</div>
                    <div class="detail-value">${formatRepairNumber(repair.parts_cost || 0)}원</div>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📝 추가 정보</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">비고</div>
                    <div class="detail-value">${repair.notes || '-'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">수리 담당자</div>
                    <div class="detail-value">${repair.repair_staff || '-'}</div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * 수리 상태 배지를 생성합니다.
 * @param {string} status - 상태
 * @returns {string} HTML 배지
 */
function getRepairStatusBadge(status) {
    const statusClasses = {
        '접수': 'status-pending',
        '위탁 접수': 'status-in-progress',
        '수리 완료': 'status-completed',
        '보증 중': 'status-warranty'
    };
    
    const className = statusClasses[status] || 'status-pending';
    return `<span class="${className}">${status || '접수'}</span>`;
}

/**
 * 수리 날짜를 포맷합니다.
 * @param {string} dateStr - 날짜 문자열
 * @returns {string} 포맷된 날짜
 */
function formatRepairDate(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('ko-KR');
    } catch (e) {
        return dateStr;
    }
}

/**
 * 수리 숫자를 포맷합니다.
 * @param {number} num - 숫자
 * @returns {string} 포맷된 숫자
 */
function formatRepairNumber(num) {
    return new Intl.NumberFormat('ko-KR').format(num || 0);
}

/**
 * 수리 현황 오류를 표시합니다.
 * @param {string} message - 오류 메시지
 */
function showRepairStatusError(message) {
    const tbody = document.getElementById('repairStatusTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #dc3545;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                        <div style="font-size: 24px;">❌</div>
                        <div>${message}</div>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * 수리 수정 함수 (추후 구현)
 * @param {number} repairId - 수리 ID
 */
function editRepair(repairId) {
    console.log('Edit repair:', repairId);
    // TODO: 수리 수정 기능 구현
    alert('수리 수정 기능은 추후 구현 예정입니다.');
}
