// 매출 분석 JavaScript
let allRepairs = [];
let allPurchases = [];
let analysisData = [];
let currentPeriod = 'daily';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('매출 분석 페이지 로드됨');
    setupDateFilters();
    loadData();
});

// 데이터 로드
async function loadData() {
    try {
        await Promise.all([
            loadRepairs(),
            loadPurchases()
        ]);
        console.log('모든 데이터 로드 완료');
        applyFilters();
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// 수리 이력 로드 (매출 데이터)
async function loadRepairs() {
    try {
        const response = await fetch('/api/repairs?limit=10000');
        if (!response.ok) {
            throw new Error('수리 이력을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        allRepairs = data.repairs || [];
        console.log('수리 이력 로드됨:', allRepairs.length, '건');
    } catch (error) {
        console.error('수리 이력 로드 오류:', error);
        throw error;
    }
}

// 구매 이력 로드 (매입 데이터)
async function loadPurchases() {
    try {
        const response = await fetch('/api/purchases?limit=10000');
        if (!response.ok) {
            throw new Error('구매 이력을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        allPurchases = data.purchases || [];
        console.log('구매 이력 로드됨:', allPurchases.length, '건');
    } catch (error) {
        console.error('구매 이력 로드 오류:', error);
        throw error;
    }
}

// 날짜 필터 기본값 설정
function setupDateFilters() {
    const today = new Date();
    const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('dateFrom').value = oneMonthAgo.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
}

// 기간 설정
function setPeriod(period) {
    currentPeriod = period;
    
    // 탭 활성화 상태 변경
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 날짜 필터 업데이트
    updateDateFilters(period);
    applyFilters();
}

// 기간에 따른 날짜 필터 업데이트
function updateDateFilters(period) {
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'daily':
            startDate = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7일 전
            endDate = today;
            break;
        case 'monthly':
            startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1); // 6개월 전
            endDate = today;
            break;
        case 'yearly':
            startDate = new Date(today.getFullYear() - 2, 0, 1); // 2년 전
            endDate = today;
            break;
    }
    
    document.getElementById('dateFrom').value = startDate.toISOString().split('T')[0];
    document.getElementById('dateTo').value = endDate.toISOString().split('T')[0];
}

// 필터 적용
function applyFilters() {
    console.log('매출 분석 필터 적용 중...');
    
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const analysisType = document.getElementById('analysisType').value;
    
    // 수리 데이터 필터링 (매출)
    let filteredRepairs = allRepairs.filter(repair => {
        if (dateFrom && repair.repair_date < dateFrom) return false;
        if (dateTo && repair.repair_date > dateTo) return false;
        return true;
    });
    
    // 구매 데이터 필터링 (매입)
    let filteredPurchases = allPurchases.filter(purchase => {
        if (dateFrom && purchase.purchase_date < dateFrom) return false;
        if (dateTo && purchase.purchase_date > dateTo) return false;
        return true;
    });
    
    // 분석 유형에 따른 필터링
    if (analysisType === 'sales') {
        filteredPurchases = [];
    } else if (analysisType === 'purchase') {
        filteredRepairs = [];
    }
    
    console.log('필터링된 수리 데이터:', filteredRepairs.length, '건');
    console.log('필터링된 구매 데이터:', filteredPurchases.length, '건');
    
    analyzeData(filteredRepairs, filteredPurchases);
}

// 데이터 분석
function analyzeData(repairs, purchases) {
    console.log('데이터 분석 중...');
    
    // 기간별 그룹화
    const groupedData = groupDataByPeriod(repairs, purchases);
    
    // 요약 데이터 계산
    const salesSummary = calculateSalesSummary(repairs);
    const purchaseSummary = calculatePurchaseSummary(purchases);
    
    // UI 업데이트
    updateSalesSummary(salesSummary);
    updatePurchaseSummary(purchaseSummary);
    updateAnalysisTable(groupedData);
    
    analysisData = groupedData;
}

// 기간별 데이터 그룹화
function groupDataByPeriod(repairs, purchases) {
    const grouped = {};
    
    // 수리 데이터 그룹화 (매출)
    repairs.forEach(repair => {
        const date = new Date(repair.repair_date);
        const key = getPeriodKey(date);
        
        if (!grouped[key]) {
            grouped[key] = {
                period: key,
                sales: {
                    count: 0,
                    supplyAmount: 0,
                    vatAmount: 0,
                    totalAmount: 0
                },
                purchase: {
                    count: 0,
                    supplyAmount: 0,
                    vatAmount: 0,
                    totalAmount: 0
                }
            };
        }
        
        const totalCost = parseFloat(repair.total_cost) || 0;
        const vatOption = repair.vat_option || 'none';
        
        let supplyAmount, vatAmount;
        if (vatOption === 'include') {
            supplyAmount = Math.round(totalCost / 1.1);
            vatAmount = totalCost - supplyAmount;
        } else if (vatOption === 'exclude') {
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
    });
    
    // 구매 데이터 그룹화 (매입)
    purchases.forEach(purchase => {
        const date = new Date(purchase.purchase_date);
        const key = getPeriodKey(date);
        
        if (!grouped[key]) {
            grouped[key] = {
                period: key,
                sales: {
                    count: 0,
                    supplyAmount: 0,
                    vatAmount: 0,
                    totalAmount: 0
                },
                purchase: {
                    count: 0,
                    supplyAmount: 0,
                    vatAmount: 0,
                    totalAmount: 0
                }
            };
        }
        
        const totalAmount = parseFloat(purchase.total_amount) || 0;
        const taxOption = purchase.tax_option || 'none';
        
        let supplyAmount, vatAmount;
        if (taxOption === 'include') {
            supplyAmount = Math.round(totalAmount / 1.1);
            vatAmount = totalAmount - supplyAmount;
        } else if (taxOption === 'exclude') {
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
    });
    
    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
}

// 기간 키 생성
function getPeriodKey(date) {
    switch (currentPeriod) {
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

// 매출 요약 계산
function calculateSalesSummary(repairs) {
    let totalSupplyAmount = 0;
    let totalVatAmount = 0;
    let totalAmount = 0;
    let count = 0;
    
    repairs.forEach(repair => {
        const totalCost = parseFloat(repair.total_cost) || 0;
        const vatOption = repair.vat_option || 'none';
        
        let supplyAmount, vatAmount;
        if (vatOption === 'include') {
            supplyAmount = Math.round(totalCost / 1.1);
            vatAmount = totalCost - supplyAmount;
        } else if (vatOption === 'exclude') {
            supplyAmount = totalCost;
            vatAmount = Math.round(totalCost * 0.1);
        } else {
            supplyAmount = totalCost;
            vatAmount = 0;
        }
        
        totalSupplyAmount += supplyAmount;
        totalVatAmount += vatAmount;
        totalAmount += totalCost;
        count++;
    });
    
    return {
        count,
        supplyAmount: totalSupplyAmount,
        vatAmount: totalVatAmount,
        totalAmount: totalAmount
    };
}

// 매입 요약 계산
function calculatePurchaseSummary(purchases) {
    let totalSupplyAmount = 0;
    let totalVatAmount = 0;
    let totalAmount = 0;
    let count = 0;
    
    purchases.forEach(purchase => {
        const totalCost = parseFloat(purchase.total_amount) || 0;
        const taxOption = purchase.tax_option || 'none';
        
        let supplyAmount, vatAmount;
        if (taxOption === 'include') {
            supplyAmount = Math.round(totalCost / 1.1);
            vatAmount = totalCost - supplyAmount;
        } else if (taxOption === 'exclude') {
            supplyAmount = totalCost;
            vatAmount = Math.round(totalCost * 0.1);
        } else {
            supplyAmount = totalCost;
            vatAmount = 0;
        }
        
        totalSupplyAmount += supplyAmount;
        totalVatAmount += vatAmount;
        totalAmount += totalCost;
        count++;
    });
    
    return {
        count,
        supplyAmount: totalSupplyAmount,
        vatAmount: totalVatAmount,
        totalAmount: totalAmount
    };
}

// 매출 요약 업데이트
function updateSalesSummary(summary) {
    const container = document.getElementById('salesSummary');
    
    container.innerHTML = `
        <div class="summary-item">
            <div class="summary-value revenue">${summary.count}</div>
            <div class="summary-label">매출 건수</div>
        </div>
        <div class="summary-item">
            <div class="summary-value revenue">${summary.supplyAmount.toLocaleString()}원</div>
            <div class="summary-label">공급가액</div>
        </div>
        <div class="summary-item">
            <div class="summary-value vat">${summary.vatAmount.toLocaleString()}원</div>
            <div class="summary-label">부가세</div>
        </div>
        <div class="summary-item">
            <div class="summary-value revenue">${summary.totalAmount.toLocaleString()}원</div>
            <div class="summary-label">총금액</div>
        </div>
    `;
}

// 매입 요약 업데이트
function updatePurchaseSummary(summary) {
    const container = document.getElementById('purchaseSummary');
    
    container.innerHTML = `
        <div class="summary-item">
            <div class="summary-value expense">${summary.count}</div>
            <div class="summary-label">매입 건수</div>
        </div>
        <div class="summary-item">
            <div class="summary-value expense">${summary.supplyAmount.toLocaleString()}원</div>
            <div class="summary-label">공급가액</div>
        </div>
        <div class="summary-item">
            <div class="summary-value vat">${summary.vatAmount.toLocaleString()}원</div>
            <div class="summary-label">부가세</div>
        </div>
        <div class="summary-item">
            <div class="summary-value expense">${summary.totalAmount.toLocaleString()}원</div>
            <div class="summary-label">총금액</div>
        </div>
    `;
}

// 분석 테이블 업데이트
function updateAnalysisTable(data) {
    const container = document.getElementById('analysisTable');
    
    if (data.length === 0) {
        container.innerHTML = '<div class="empty-state">분석할 데이터가 없습니다.</div>';
        return;
    }
    
    // 총계 계산
    const totals = data.reduce((acc, item) => {
        acc.sales.supplyAmount += item.sales.supplyAmount;
        acc.sales.vatAmount += item.sales.vatAmount;
        acc.sales.totalAmount += item.sales.totalAmount;
        acc.purchase.supplyAmount += item.purchase.supplyAmount;
        acc.purchase.vatAmount += item.purchase.vatAmount;
        acc.purchase.totalAmount += item.purchase.totalAmount;
        return acc;
    }, {
        sales: { supplyAmount: 0, vatAmount: 0, totalAmount: 0 },
        purchase: { supplyAmount: 0, vatAmount: 0, totalAmount: 0 }
    });
    
    const netAmount = totals.sales.totalAmount - totals.purchase.totalAmount;
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>기간</th>
                    <th class="number">매출 공급가액</th>
                    <th class="number">매출 부가세</th>
                    <th class="number">매출 총금액</th>
                    <th class="number">매입 공급가액</th>
                    <th class="number">매입 부가세</th>
                    <th class="number">매입 총금액</th>
                    <th class="number">순이익</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach(item => {
        const netAmount = item.sales.totalAmount - item.purchase.totalAmount;
        const netClass = netAmount >= 0 ? 'positive' : 'negative';
        
        html += `
            <tr>
                <td>${item.period}</td>
                <td class="number">${item.sales.supplyAmount.toLocaleString()}원</td>
                <td class="number">${item.sales.vatAmount.toLocaleString()}원</td>
                <td class="number">${item.sales.totalAmount.toLocaleString()}원</td>
                <td class="number">${item.purchase.supplyAmount.toLocaleString()}원</td>
                <td class="number">${item.purchase.vatAmount.toLocaleString()}원</td>
                <td class="number">${item.purchase.totalAmount.toLocaleString()}원</td>
                <td class="number ${netClass}">${netAmount.toLocaleString()}원</td>
            </tr>
        `;
    });
    
    // 총계 행
    const totalNetClass = netAmount >= 0 ? 'positive' : 'negative';
    html += `
            <tr class="total-row">
                <td><strong>총계</strong></td>
                <td class="number"><strong>${totals.sales.supplyAmount.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totals.sales.vatAmount.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totals.sales.totalAmount.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totals.purchase.supplyAmount.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totals.purchase.vatAmount.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totals.purchase.totalAmount.toLocaleString()}원</strong></td>
                <td class="number ${totalNetClass}"><strong>${netAmount.toLocaleString()}원</strong></td>
            </tr>
        </tbody>
    </table>
    `;
    
    container.innerHTML = html;
}

// 필터 초기화
function resetFilters() {
    document.getElementById('analysisType').value = 'all';
    updateDateFilters(currentPeriod);
    applyFilters();
}

// 데이터 내보내기
function exportData() {
    if (analysisData.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }
    
    // CSV 형식으로 내보내기
    const csvContent = generateCSV(analysisData);
    downloadCSV(csvContent, `sales_analysis_${currentPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
}

// CSV 생성
function generateCSV(data) {
    const headers = ['기간', '매출 공급가액', '매출 부가세', '매출 총금액', '매입 공급가액', '매입 부가세', '매입 총금액', '순이익'];
    const rows = data.map(item => {
        const netAmount = item.sales.totalAmount - item.purchase.totalAmount;
        return [
            item.period,
            item.sales.supplyAmount,
            item.sales.vatAmount,
            item.sales.totalAmount,
            item.purchase.supplyAmount,
            item.purchase.vatAmount,
            item.purchase.totalAmount,
            netAmount
        ];
    });
    
    return [headers, ...rows].map(row => 
        row.map(field => `"${field}"`).join(',')
    ).join('\n');
}

// CSV 다운로드
function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 전역 함수로 등록
window.setPeriod = setPeriod;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportData = exportData;
