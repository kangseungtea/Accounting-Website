// 고객 통계 JavaScript
let allCustomers = [];
let allRepairs = [];
let filteredData = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('고객 통계 페이지 로드됨');
    loadCustomers();
    loadRepairs();
    setupDateFilters();
});

// 고객 목록 로드
async function loadCustomers() {
    try {
        const response = await fetch('/api/customers?limit=1000');
        if (!response.ok) {
            throw new Error('고객 목록을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        allCustomers = data.customers || [];
        
        console.log('고객 목록 로드됨:', allCustomers.length, '명');
        populateCustomerFilter();
    } catch (error) {
        console.error('고객 목록 로드 오류:', error);
        alert('고객 목록을 불러오는데 실패했습니다.');
    }
}

// 수리 이력 로드
async function loadRepairs() {
    try {
        const response = await fetch('/api/repairs?limit=10000');
        if (!response.ok) {
            throw new Error('수리 이력을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        allRepairs = data.repairs || [];
        
        console.log('수리 이력 로드됨:', allRepairs.length, '건');
        filteredData = allRepairs;
        updateStatistics();
    } catch (error) {
        console.error('수리 이력 로드 오류:', error);
        alert('수리 이력을 불러오는데 실패했습니다.');
    }
}

// 고객 통계 데이터 로드
async function loadCustomerStats() {
    try {
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;
        const customerId = document.getElementById('customerFilter').value;
        const status = document.getElementById('statusFilter').value;
        
        let url = '/api/customers/stats?';
        const params = new URLSearchParams();
        
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);
        if (customerId) params.append('customerId', customerId);
        if (status) params.append('status', status);
        
        url += params.toString();
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('고객 통계를 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        console.log('고객 통계 로드됨:', data.data.length, '명');
        
        return data.data;
    } catch (error) {
        console.error('고객 통계 로드 오류:', error);
        alert('고객 통계를 불러오는데 실패했습니다.');
        return [];
    }
}

// 고객 필터 드롭다운 채우기
function populateCustomerFilter() {
    const customerFilter = document.getElementById('customerFilter');
    customerFilter.innerHTML = '<option value="">전체 고객</option>';
    
    allCustomers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        customerFilter.appendChild(option);
    });
}

// 날짜 필터 기본값 설정
function setupDateFilters() {
    const today = new Date();
    const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('dateFrom').value = oneMonthAgo.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
}

// 필터 적용
async function applyFilters() {
    console.log('필터 적용 중...');
    
    try {
        const statsData = await loadCustomerStats();
        updateStatisticsWithServerData(statsData);
    } catch (error) {
        console.error('필터 적용 오류:', error);
        alert('필터 적용에 실패했습니다.');
    }
}

// 필터 초기화
function resetFilters() {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('customerFilter').value = '';
    document.getElementById('statusFilter').value = '';
    
    filteredData = allRepairs;
    updateStatistics();
}

// 통계 업데이트
function updateStatistics() {
    console.log('통계 업데이트 중...');
    updateRepairFrequencyTable();
    updateCostAnalysisTable();
}

// 서버 데이터로 통계 업데이트
function updateStatisticsWithServerData(statsData) {
    console.log('서버 데이터로 통계 업데이트 중...');
    updateRepairFrequencyTableWithServerData(statsData);
    updateCostAnalysisTableWithServerData(statsData);
}

// 수리 빈도 테이블 업데이트
function updateRepairFrequencyTable() {
    const tableBody = document.getElementById('repairFrequencyTable');
    tableBody.innerHTML = '';
    
    // 고객별 수리 데이터 집계
    const customerStats = {};
    
    filteredData.forEach(repair => {
        const customerId = repair.customer_id;
        const customerName = repair.customer_name || '알 수 없음';
        
        if (!customerStats[customerId]) {
            customerStats[customerId] = {
                name: customerName,
                count: 0,
                totalCost: 0,
                costs: []
            };
        }
        
        customerStats[customerId].count++;
        const cost = parseFloat(repair.total_cost) || 0;
        customerStats[customerId].totalCost += cost;
        customerStats[customerId].costs.push(cost);
    });
    
    // 테이블에 데이터 추가
    Object.values(customerStats).forEach(stats => {
        const row = document.createElement('tr');
        const avgCost = stats.count > 0 ? Math.round(stats.totalCost / stats.count) : 0;
        
        row.innerHTML = `
            <td>${stats.name}</td>
            <td><span class="repair-count">${stats.count}</span></td>
            <td><span class="total-cost">${stats.totalCost.toLocaleString()}원</span></td>
            <td><span class="avg-cost">${avgCost.toLocaleString()}원</span></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    console.log('수리 빈도 테이블 업데이트 완료');
}

// 비용 분석 테이블 업데이트
function updateCostAnalysisTable() {
    const tableBody = document.getElementById('costAnalysisTable');
    tableBody.innerHTML = '';
    
    // 고객별 비용 데이터 집계
    const customerCosts = {};
    
    filteredData.forEach(repair => {
        const customerId = repair.customer_id;
        const customerName = repair.customer_name || '알 수 없음';
        const cost = parseFloat(repair.total_cost) || 0;
        
        if (!customerCosts[customerId]) {
            customerCosts[customerId] = {
                name: customerName,
                costs: [],
                totalCost: 0
            };
        }
        
        customerCosts[customerId].costs.push(cost);
        customerCosts[customerId].totalCost += cost;
    });
    
    // 테이블에 데이터 추가
    Object.values(customerCosts).forEach(stats => {
        const row = document.createElement('tr');
        const maxCost = Math.max(...stats.costs);
        const minCost = Math.min(...stats.costs);
        
        row.innerHTML = `
            <td>${stats.name}</td>
            <td><span class="total-cost">${maxCost.toLocaleString()}원</span></td>
            <td><span class="avg-cost">${minCost.toLocaleString()}원</span></td>
            <td><span class="total-cost">${stats.totalCost.toLocaleString()}원</span></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    console.log('비용 분석 테이블 업데이트 완료');
}

// 서버 데이터로 수리 빈도 테이블 업데이트
function updateRepairFrequencyTableWithServerData(statsData) {
    const tableBody = document.getElementById('repairFrequencyTable');
    tableBody.innerHTML = '';
    
    if (statsData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">데이터가 없습니다.</td></tr>';
        return;
    }
    
    statsData.forEach(stats => {
        const row = document.createElement('tr');
        const avgCost = stats.repair_count > 0 ? Math.round(stats.avg_cost) : 0;
        
        row.innerHTML = `
            <td>${stats.customer_name}</td>
            <td><span class="repair-count">${stats.repair_count}</span></td>
            <td><span class="total-cost">${parseInt(stats.total_cost).toLocaleString()}원</span></td>
            <td><span class="avg-cost">${avgCost.toLocaleString()}원</span></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    console.log('서버 데이터로 수리 빈도 테이블 업데이트 완료');
}

// 서버 데이터로 비용 분석 테이블 업데이트
function updateCostAnalysisTableWithServerData(statsData) {
    const tableBody = document.getElementById('costAnalysisTable');
    tableBody.innerHTML = '';
    
    if (statsData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">데이터가 없습니다.</td></tr>';
        return;
    }
    
    statsData.forEach(stats => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${stats.customer_name}</td>
            <td><span class="total-cost">${parseInt(stats.max_cost).toLocaleString()}원</span></td>
            <td><span class="avg-cost">${parseInt(stats.min_cost).toLocaleString()}원</span></td>
            <td><span class="total-cost">${parseInt(stats.total_cost).toLocaleString()}원</span></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    console.log('서버 데이터로 비용 분석 테이블 업데이트 완료');
}

// 전역 함수로 등록
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
