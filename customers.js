// 고객 관리 관련 변수
let currentPage = 1;
let currentSearch = '';
let currentStatus = '';

// 페이지 로드 시 초기화
window.addEventListener('load', () => {
    checkUserStatus();
    loadCustomers();
});

// 사용자 상태 확인
async function checkUserStatus() {
    try {
        const response = await fetch('/api/check-auth', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('userName').textContent = result.user.name;
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        window.location.href = 'index.html';
    }
}

// 고객 목록 로드
async function loadCustomers(page = 1) {
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            search: currentSearch,
            status: currentStatus
        });
        
        const response = await fetch(`/api/customers?${params}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            displayCustomers(result.data);
            displayPagination(result.pagination);
            currentPage = page;
        } else {
            showMessage('고객 목록을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 고객 목록 표시
function displayCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #666;">등록된 고객이 없습니다.</td></tr>';
        return;
    }
    
    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.company || '-'}</td>
            <td>${customer.phone}</td>
            <td>${customer.address || '-'}</td>
            <td>${customer.managementNumber || '-'}</td>
            <td>${customer.totalSpent.toLocaleString('ko-KR')}원</td>
            <td>${customer.totalRepairCost.toLocaleString('ko-KR')}원</td>
            <td><span class="status-badge status-${customer.status === '활성' ? 'active' : 'inactive'}">${customer.status}</span></td>
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
            document.getElementById('modalTitle').textContent = '고객 정보 수정';
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerCompany').value = customer.company || '';
            document.getElementById('customerBusinessNumber').value = customer.businessNumber || '';
            document.getElementById('customerPhone').value = customer.phone;
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerAddress').value = customer.address || '';
            document.getElementById('customerManagementNumber').value = customer.managementNumber || '';
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
            window.location.href = 'index.html';
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        window.location.href = 'index.html';
    }
}
