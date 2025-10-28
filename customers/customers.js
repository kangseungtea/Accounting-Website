// 고객 관리 관련 변수
let currentPage = 1;
let currentSearch = '';
let currentStatus = '';

// 페이지 로드 시 초기화
window.addEventListener('load', () => {
    checkUserStatus();
    loadCustomers();
    
    // data-listener-added 속성 제거
    const customerSearchInput = document.getElementById('customerSearch');
    if (customerSearchInput) {
        // data-listener-added로 시작하는 모든 속성 제거
        const attributes = customerSearchInput.attributes;
        for (let i = attributes.length - 1; i >= 0; i--) {
            const attr = attributes[i];
            if (attr.name.startsWith('data-listener-added')) {
                customerSearchInput.removeAttribute(attr.name);
            }
        }
    }
});

// 사용자 상태 확인
async function checkUserStatus() {
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success && result.isLoggedIn) {
            document.getElementById('userName').textContent = result.user.username;
        } else {
            window.location.href = '../shared/index.html';
        }
    } catch (error) {
        window.location.href = '../shared/index.html';
    }
}

// 고객 목록 로드
async function loadCustomers(page = 1) {
    try {
        console.log('고객 목록 로드 시작, 페이지:', page);
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            search: currentSearch,
            status: currentStatus
        });
        
        console.log('API 요청 URL:', `/api/customers?${params}`);
        const response = await fetch(`/api/customers?${params}`, {
            credentials: 'include'
        });
        
        console.log('API 응답 상태:', response.status);
        const result = await response.json();
        console.log('API 응답 데이터:', result);
        
        if (result.success) {
            console.log('고객 데이터 개수:', result.data.length);
            displayCustomers(result.data);
            displayPagination(result.pagination);
            currentPage = page;
        } else {
            console.error('API 오류:', result.message);
            showMessage('고객 목록을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('네트워크 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 고객 목록 표시
function displayCustomers(customers) {
    console.log('displayCustomers 호출됨, 고객 수:', customers.length);
    const tbody = document.getElementById('customersTableBody');
    console.log('tbody 요소:', tbody);
    
    if (!tbody) {
        console.error('customersTableBody 요소를 찾을 수 없습니다!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        console.log('고객 데이터가 없음, 빈 메시지 표시');
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 40px; color: #666;">등록된 고객이 없습니다.</td></tr>';
        return;
    }
    
    customers.forEach(customer => {
        console.log('고객 데이터:', customer);
        const row = document.createElement('tr');
        
        // 안전한 숫자 변환 함수
        const formatNumber = (value) => {
            if (value === null || value === undefined || isNaN(value)) {
                return '0';
            }
            return Number(value).toLocaleString('ko-KR');
        };
        
        row.innerHTML = `
            <td>${customer.id || '-'}</td>
            <td>${customer.name || '-'}</td>
            <td>${customer.company || '-'}</td>
            <td>${customer.phone || '-'}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${customer.address || '-'}">${customer.address || '-'}</td>
            <td>
                <input type="text" 
                       value="${customer.management_number || customer.managementNumber || ''}" 
                       style="width: 100px; padding: 4px; border: 1px solid #ddd; border-radius: 3px; font-size: 12px;"
                       onblur="updateManagementNumber(${customer.id}, this.value)"
                       placeholder="관리번호">
            </td>
            <td>${formatNumber(customer.total_spent || customer.totalSpent)}원</td>
            <td>${formatNumber(customer.total_return_amount || customer.totalReturnAmount || 0)}원</td>
            <td>${formatNumber(customer.total_repair_cost || customer.totalRepairCost)}원</td>
            <td><span class="status-badge status-${customer.status === '활성' ? 'active' : 'inactive'}">${customer.status || '활성'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewCustomer(${customer.id})">상세</button>
                    <button class="action-btn edit-btn" onclick="editCustomer(${customer.id})">수정</button>
                    <button class="action-btn delete-btn" onclick="deleteCustomer(${customer.id})">삭제</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 관리번호 업데이트
async function updateManagementNumber(customerId, managementNumber) {
    try {
        const response = await fetch(`/api/customers/${customerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                management_number: managementNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('관리번호가 업데이트되었습니다.', 'success');
        } else {
            showMessage('관리번호 업데이트에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('관리번호 업데이트 오류:', error);
        showMessage('관리번호 업데이트 중 오류가 발생했습니다.', 'error');
    }
}

// 페이지네이션 표시
function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';
    
    if (pagination.totalPages <= 1) return;
    
    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '이전';
    prevBtn.disabled = pagination.currentPage === 1;
    prevBtn.onclick = () => loadCustomers(pagination.currentPage - 1);
    paginationDiv.appendChild(prevBtn);
    
    // 페이지 번호들
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === pagination.currentPage ? 'active' : '';
        pageBtn.onclick = () => loadCustomers(i);
        paginationDiv.appendChild(pageBtn);
    }
    
    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '다음';
    nextBtn.disabled = pagination.currentPage === pagination.totalPages;
    nextBtn.onclick = () => loadCustomers(pagination.currentPage + 1);
    paginationDiv.appendChild(nextBtn);
    
    // 페이지 정보
    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `${pagination.currentPage} / ${pagination.totalPages} 페이지 (총 ${pagination.totalItems}명)`;
    paginationDiv.appendChild(info);
}

// 고객 검색
function searchCustomers() {
    currentSearch = document.getElementById('customerSearch').value;
    loadCustomers(1);
}

// 고객 필터링
function filterCustomers() {
    currentStatus = document.getElementById('statusFilter').value;
    loadCustomers(1);
}

// 새 고객 등록 모달 표시
function showAddCustomerModal() {
    document.getElementById('modalTitle').textContent = '새 고객 등록';
    document.getElementById('customerForm').reset();
    document.getElementById('customerModal').style.display = 'flex';
}

// 고객 수정 모달 표시
async function editCustomer(customerId) {
    try {
        const response = await fetch(`/api/customers/${customerId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            const customer = result.data;
            
            // 디버깅: 고객 데이터 확인
            console.log('🔍 고객 수정 데이터:', customer);
            console.log('🔍 management_number:', customer.management_number);
            console.log('🔍 managementNumber:', customer.managementNumber);
            
            document.getElementById('modalTitle').textContent = '고객 정보 수정';
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerCompany').value = customer.company || '';
            document.getElementById('customerBusinessNumber').value = customer.businessNumber || '';
            document.getElementById('customerPhone').value = customer.phone;
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerAddress').value = customer.address || '';
            document.getElementById('customerManagementNumber').value = customer.management_number || customer.managementNumber || '';
            document.getElementById('customerStatus').value = customer.status;
            document.getElementById('customerNotes').value = customer.notes || '';
            
            // 수정 모드임을 표시하기 위해 폼에 데이터 속성 추가
            document.getElementById('customerForm').setAttribute('data-customer-id', customerId);
            document.getElementById('customerModal').style.display = 'flex';
        } else {
            showMessage('고객 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 고객 삭제
async function deleteCustomer(customerId) {
    if (!confirm('정말로 이 고객을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/customers/${customerId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            showMessage('고객이 삭제되었습니다.', 'success');
            loadCustomers(currentPage);
        } else {
            showMessage(result.message || '고객 삭제에 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 고객 상세 보기
function viewCustomer(customerId) {
    // 새 창으로 고객 상세 페이지 열기
    const newWindow = window.open(
        `customer-detail.html?id=${customerId}`, 
        `customer_${customerId}`, 
        'width=1200,height=800,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no'
    );
    
    // 새 창이 차단되었을 경우 대비
    if (!newWindow) {
        alert('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
        // 팝업이 차단된 경우 기존 방식으로 이동
        window.location.href = `customer-detail.html?id=${customerId}`;
    }
}

// 고객 모달 닫기
function closeCustomerModal() {
    document.getElementById('customerModal').style.display = 'none';
    document.getElementById('customerForm').removeAttribute('data-customer-id');
}

// 고객 폼 제출
document.getElementById('customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const customerData = Object.fromEntries(formData);
    
    // 디버깅: 폼 데이터 확인
    console.log('📋 폼 데이터 수집:', customerData);
    console.log('🔍 managementNumber 값:', customerData.managementNumber);
    
    const customerId = e.target.getAttribute('data-customer-id');
    const isEdit = !!customerId;
    
    try {
        const url = isEdit ? `/api/customers/${customerId}` : '/api/customers';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(customerData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            closeCustomerModal();
            loadCustomers(currentPage);
        } else {
            showMessage(result.message || '오류가 발생했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
});

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
    
    // 페이지 상단에 삽입
    const customersPage = document.querySelector('.customers-page');
    customersPage.insertBefore(messageDiv, customersPage.firstChild);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
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
            window.location.href = '../shared/index.html';
        } else {
            window.location.href = '../shared/index.html';
        }
    } catch (error) {
        window.location.href = '../shared/index.html';
    }
}
