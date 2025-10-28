// 회계 관리 JavaScript
let currentTab = 'overview';
let revenueCalculator;
let revenueUI;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('회계 관리 페이지 로드됨');
    
    // 모듈 초기화
    revenueCalculator = new RevenueCalculator();
    revenueUI = new RevenueUI();
    
    loadOverviewData();
});

// 탭 전환
function showTab(tabName) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    currentTab = tabName;
    
    // 탭별 데이터 로드
    switch(tabName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'sales':
            loadSalesData();
            break;
        case 'expenses':
            loadExpensesData();
            break;
        case 'reports':
            loadReportsData();
            break;
    }
}

// 개요 데이터 로드
async function loadOverviewData() {
    try {
        revenueUI.showLoading();
        
        // 이번 달 수입 데이터 로드
        const revenueResponse = await fetch('/api/repairs?limit=10000');
        const revenueData = await revenueResponse.json();
        
        // 이번 달 구매 데이터 로드
        const expenseResponse = await fetch('/api/purchases?limit=10000');
        const expenseData = await expenseResponse.json();
        
        // 이번 달 데이터 필터링
        const { startOfMonth, endOfMonth } = RevenueUtils.getCurrentMonthRange();
        
        const monthlyRepairs = RevenueUtils.filterByDateRange(
            revenueData.repairs, 
            startOfMonth, 
            endOfMonth
        );
        
        const monthlyPurchases = RevenueUtils.filterByDateRange(
            expenseData.purchases, 
            startOfMonth, 
            endOfMonth
        );
        
        // 매출 계산 (새로운 모듈 사용)
        const revenueSummary = revenueCalculator.calculateFromRepairs(monthlyRepairs);
        
        // 지출 계산
        const totalExpenses = monthlyPurchases.reduce((sum, purchase) => {
            return sum + (parseFloat(purchase.total_amount) || 0);
        }, 0);
        
        // UI 업데이트
        revenueUI.updateMonthlyRevenue(revenueSummary.totalRevenue, revenueSummary.revenueCount);
        updateMonthlyExpenses(totalExpenses, monthlyPurchases.length);
        
    } catch (error) {
        console.error('개요 데이터 로드 오류:', error);
        revenueUI.showError(error.message);
    }
}


// 월별 지출 업데이트
function updateMonthlyExpenses(totalExpenses, count) {
    const container = document.getElementById('monthlyExpenses');
    container.innerHTML = `
        <div class="summary-item">
            <div class="summary-value expense">${totalExpenses.toLocaleString()}원</div>
            <div class="summary-label">총 지출</div>
        </div>
        <div class="summary-item">
            <div class="summary-value expense">${count}건</div>
            <div class="summary-label">지출 건수</div>
        </div>
    `;
}

// 매출 데이터 로드
function loadSalesData() {
    console.log('매출 데이터 로드');
    // 매출 분석 페이지로 리다이렉트하거나 인라인으로 표시
}

// 지출 데이터 로드
function loadExpensesData() {
    console.log('지출 데이터 로드');
    // 지출 관리 기능 구현
}

// 보고서 데이터 로드
function loadReportsData() {
    console.log('보고서 데이터 로드');
    // 보고서 생성 기능 구현
}

// 상세 매출 분석 열기
function openSalesAnalysis() {
    window.open('sales-analysis.html', '_blank');
}

// 전역 함수로 등록
window.showTab = showTab;
window.openSalesAnalysis = openSalesAnalysis;
