// 고객 검색 JavaScript
let allCustomers = [];
let allRepairs = [];
let allPurchases = [];
let searchResults = [];
let currentPage = 1;
let itemsPerPage = 10;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('고객 검색 페이지 로드됨');
    loadAllData();
    setupDateFilters();
});

// 모든 데이터 로드
async function loadAllData() {
    try {
        await Promise.all([
            loadCustomers(),
            loadRepairs(),
            loadPurchases()
        ]);
        console.log('모든 데이터 로드 완료');
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// 고객 목록 로드
async function loadCustomers() {
    try {
        const response = await fetch('/api/customers?limit=10000');
        if (!response.ok) {
            throw new Error('고객 목록을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        allCustomers = data.customers || [];
        console.log('고객 목록 로드됨:', allCustomers.length, '명');
    } catch (error) {
        console.error('고객 목록 로드 오류:', error);
        throw error;
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
    } catch (error) {
        console.error('수리 이력 로드 오류:', error);
        throw error;
    }
}

// 구매 이력 로드
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
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    
    document.getElementById('dateFrom').value = oneYearAgo.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
}

// 검색 수행
function performSearch() {
    console.log('검색 수행 중...');
    
    const searchCriteria = getSearchCriteria();
    searchResults = filterCustomers(searchCriteria);
    
    console.log('검색 결과:', searchResults.length, '명');
    displaySearchResults();
}

// 검색 조건 가져오기
function getSearchCriteria() {
    return {
        name: document.getElementById('searchName').value.trim(),
        phone: document.getElementById('searchPhone').value.trim(),
        email: document.getElementById('searchEmail').value.trim(),
        managementNumber: document.getElementById('searchManagementNumber').value.trim(),
        status: document.getElementById('searchStatus').value,
        repairCount: document.getElementById('searchRepairCount').value,
        includeRepairHistory: document.getElementById('includeRepairHistory').checked,
        includePurchaseHistory: document.getElementById('includePurchaseHistory').checked,
        exactMatch: document.getElementById('exactMatch').checked,
        dateFrom: document.getElementById('dateFrom').value,
        dateTo: document.getElementById('dateTo').value
    };
}

// 고객 필터링
function filterCustomers(criteria) {
    let filtered = allCustomers.filter(customer => {
        // 이름 검색
        if (criteria.name) {
            if (criteria.exactMatch) {
                if (customer.name !== criteria.name) return false;
            } else {
                if (!customer.name.toLowerCase().includes(criteria.name.toLowerCase())) return false;
            }
        }
        
        // 전화번호 검색
        if (criteria.phone) {
            if (criteria.exactMatch) {
                if (customer.phone !== criteria.phone) return false;
            } else {
                if (!customer.phone.includes(criteria.phone)) return false;
            }
        }
        
        // 이메일 검색
        if (criteria.email) {
            if (criteria.exactMatch) {
                if (customer.email !== criteria.email) return false;
            } else {
                if (!customer.email.toLowerCase().includes(criteria.email.toLowerCase())) return false;
            }
        }
        
        // 관리번호 검색
        if (criteria.managementNumber) {
            if (criteria.exactMatch) {
                if (customer.management_number !== criteria.managementNumber) return false;
            } else {
                if (!customer.management_number.includes(criteria.managementNumber)) return false;
            }
        }
        
        // 상태 검색
        if (criteria.status) {
            const isActive = customer.status === 'active' || customer.status === '활성';
            if (criteria.status === 'active' && !isActive) return false;
            if (criteria.status === 'inactive' && isActive) return false;
        }
        
        // 등록일 범위 검색
        if (criteria.dateFrom && customer.created_at) {
            if (customer.created_at < criteria.dateFrom) return false;
        }
        if (criteria.dateTo && customer.created_at) {
            if (customer.created_at > criteria.dateTo) return false;
        }
        
        return true;
    });
    
    // 수리 건수 필터링
    if (criteria.repairCount) {
        filtered = filtered.filter(customer => {
            const repairCount = allRepairs.filter(repair => repair.customer_id === customer.id).length;
            
            switch (criteria.repairCount) {
                case '0':
                    return repairCount === 0;
                case '1-5':
                    return repairCount >= 1 && repairCount <= 5;
                case '6-10':
                    return repairCount >= 6 && repairCount <= 10;
                case '11+':
                    return repairCount >= 11;
                default:
                    return true;
            }
        });
    }
    
    // 수리 이력 포함 검색
    if (criteria.includeRepairHistory) {
        filtered = filtered.filter(customer => {
            return allRepairs.some(repair => 
                repair.customer_id === customer.id &&
                (criteria.name ? repair.device_model.toLowerCase().includes(criteria.name.toLowerCase()) : true)
            );
        });
    }
    
    // 구매 이력 포함 검색
    if (criteria.includePurchaseHistory) {
        filtered = filtered.filter(customer => {
            return allPurchases.some(purchase => 
                purchase.customer_id === customer.id &&
                (criteria.name ? purchase.product_name.toLowerCase().includes(criteria.name.toLowerCase()) : true)
            );
        });
    }
    
    return filtered;
}

// 검색 결과 표시
function displaySearchResults() {
    const container = document.getElementById('searchResults');
    const countElement = document.getElementById('resultsCount');
    
    countElement.textContent = `${searchResults.length}명`;
    
    if (searchResults.length === 0) {
        container.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
        return;
    }
    
    // 페이지네이션 계산
    const totalPages = Math.ceil(searchResults.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageResults = searchResults.slice(startIndex, endIndex);
    
    // 테이블 생성
    const table = document.createElement('table');
    table.className = 'customer-table';
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>고객명</th>
                <th>전화번호</th>
                <th>이메일</th>
                <th>관리번호</th>
                <th>상태</th>
                <th>수리 건수</th>
                <th>등록일</th>
                <th>액션</th>
            </tr>
        </thead>
        <tbody>
            ${pageResults.map(customer => createCustomerRow(customer)).join('')}
        </tbody>
    `;
    
    container.innerHTML = '';
    container.appendChild(table);
    
    // 페이지네이션 추가
    if (totalPages > 1) {
        container.appendChild(createPagination(totalPages));
    }
}

// 고객 행 생성
function createCustomerRow(customer) {
    const repairCount = allRepairs.filter(repair => repair.customer_id === customer.id).length;
    const isActive = customer.status === 'active' || customer.status === '활성';
    
    return `
        <tr>
            <td>
                <span class="customer-name" onclick="viewCustomerDetail(${customer.id})">
                    ${customer.name}
                </span>
            </td>
            <td class="customer-phone">${customer.phone || '-'}</td>
            <td class="customer-email">${customer.email || '-'}</td>
            <td>${customer.management_number || '-'}</td>
            <td>
                <span class="customer-status ${isActive ? 'status-active' : 'status-inactive'}">
                    ${isActive ? '활성' : '비활성'}
                </span>
            </td>
            <td>
                <span class="repair-count">${repairCount}건</span>
            </td>
            <td>${formatDate(customer.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewCustomerDetail(${customer.id})">
                    상세보기
                </button>
            </td>
        </tr>
    `;
}

// 페이지네이션 생성
function createPagination(totalPages) {
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    let paginationHTML = '';
    
    // 이전 버튼
    paginationHTML += `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            이전
        </button>
    `;
    
    // 페이지 번호들
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<span>...</span>';
        }
    }
    
    // 다음 버튼
    paginationHTML += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            다음
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
    return pagination;
}

// 페이지 변경
function changePage(page) {
    const totalPages = Math.ceil(searchResults.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displaySearchResults();
    }
}

// 검색 초기화
function resetSearch() {
    document.getElementById('searchForm').reset();
    document.getElementById('includeRepairHistory').checked = false;
    document.getElementById('includePurchaseHistory').checked = false;
    document.getElementById('exactMatch').checked = false;
    setupDateFilters();
    
    searchResults = [];
    currentPage = 1;
    displaySearchResults();
}

// 결과 내보내기
function exportResults() {
    if (searchResults.length === 0) {
        alert('내보낼 결과가 없습니다.');
        return;
    }
    
    // CSV 형식으로 내보내기
    const csvContent = generateCSV(searchResults);
    downloadCSV(csvContent, 'customer_search_results.csv');
}

// CSV 생성
function generateCSV(customers) {
    const headers = ['고객명', '전화번호', '이메일', '관리번호', '상태', '수리 건수', '등록일'];
    const rows = customers.map(customer => {
        const repairCount = allRepairs.filter(repair => repair.customer_id === customer.id).length;
        const isActive = customer.status === 'active' || customer.status === '활성';
        
        return [
            customer.name,
            customer.phone || '',
            customer.email || '',
            customer.management_number || '',
            isActive ? '활성' : '비활성',
            repairCount,
            formatDate(customer.created_at)
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

// 고객 상세보기
function viewCustomerDetail(customerId) {
    window.open(`customer-detail.html?id=${customerId}`, '_blank');
}

// 날짜 포맷팅
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

// 전역 함수로 등록
window.performSearch = performSearch;
window.resetSearch = resetSearch;
window.exportResults = exportResults;
window.changePage = changePage;
window.viewCustomerDetail = viewCustomerDetail;
