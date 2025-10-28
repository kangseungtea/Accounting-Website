// 고객 상세 정보 핵심 기능
// 고객 상세 정보 관련 변수
let currentCustomerId = null;
let currentCustomer = null;
let products = [];

// 전역 변수로 products와 currentCustomer를 사용할 수 있도록 설정
window.products = products;
window.currentCustomer = currentCustomer;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    currentCustomerId = urlParams.get('id');
    
    if (currentCustomerId) {
        loadCustomerData();
    } else {
        showMessage('고객 ID가 없습니다.', 'error');
        setTimeout(() => {
            window.location.href = 'customers.html';
        }, 2000);
    }
});

// 고객 데이터 로드
async function loadCustomerData() {
    try {
        console.log('고객 데이터 로드 시작, ID:', currentCustomerId);
        
        // 고객 정보 로드
        const customerResponse = await fetch(`/api/customers/${currentCustomerId}`, {
            credentials: 'include'
        });
        
        if (!customerResponse.ok) {
            throw new Error('고객 정보를 불러올 수 없습니다.');
        }
        
        const customerData = await customerResponse.json();
        if (customerData.success) {
            currentCustomer = customerData.data;
            window.currentCustomer = currentCustomer;
            displayCustomerInfo(currentCustomer);
        }
        
        // 제품 목록 로드
        const productsResponse = await fetch('/api/products?limit=1000', {
            credentials: 'include'
        });
        
        if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            if (productsData.success) {
                products = productsData.data;
                window.products = products;
            }
        }
        
        
        // 구매 이력 로드
        const purchasesResponse = await fetch(`/api/purchases?customerId=${currentCustomerId}`, {
            credentials: 'include'
        });
        
        if (purchasesResponse.ok) {
            const purchasesData = await purchasesResponse.json();
            if (purchasesData.success) {
                displayPurchases(purchasesData.data);
            }
        }
        
        // 방문 이력 로드
        const visitsResponse = await fetch(`/api/visits?customerId=${currentCustomerId}`, {
            credentials: 'include'
        });
        
        if (visitsResponse.ok) {
            const visitsData = await visitsResponse.json();
            if (visitsData.success) {
                displayVisits(visitsData.data);
            }
        }
        
        // 수리 이력 로드
        const repairsResponse = await fetch(`/api/repairs?customerId=${currentCustomerId}`, {
            credentials: 'include'
        });
        
        if (repairsResponse.ok) {
            const repairsData = await repairsResponse.json();
            if (repairsData.success) {
                displayRepairs(repairsData.data);
            }
        }
        
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        showMessage('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 고객 정보 표시
function displayCustomerInfo(customer) {
    console.log('고객 정보 표시:', customer);
    
    // 페이지 제목 업데이트
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = `${customer.name || '고객'} 상세 정보`;
    }
    
    // 고객 기본 정보
    document.getElementById('customerName').textContent = customer.name || '이름 없음';
    document.getElementById('customerPhone').textContent = customer.phone || '전화번호 없음';
    document.getElementById('customerEmail').textContent = customer.email || '이메일 없음';
    document.getElementById('customerAddress').textContent = customer.address || '주소 없음';
    document.getElementById('customerNotes').textContent = customer.notes || '비고 없음';
    
    // 고객 상태
    const statusElement = document.getElementById('customerStatus');
    if (statusElement) {
        statusElement.textContent = customer.status || '활성';
        statusElement.className = `status ${customer.status === '활성' ? 'active' : 'inactive'}`;
    }
    
    // 등록일
    const registrationDate = customer.created_at ? 
        new Date(customer.created_at).toLocaleDateString('ko-KR') : '알 수 없음';
    document.getElementById('registrationDate').textContent = registrationDate;
}

// 방문 이력 표시
function displayVisits(visits) {
    console.log('방문 이력 표시 시작, 방문 건수:', visits.length);
    const tbody = document.getElementById('visitsTableBody');
    
    if (!tbody) {
        console.error('visitsTableBody 요소를 찾을 수 없습니다!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #666;">방문 이력이 없습니다.</td></tr>';
        return;
    }
    
    visits.forEach(visit => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('ko-KR') : '-'}</td>
            <td>${visit.purpose || '-'}</td>
            <td>${visit.notes || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editVisit(${visit.id})">수정</button>
                    <button class="action-btn delete-btn" onclick="deleteVisit(${visit.id})">삭제</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 메시지 표시 함수
function showMessage(message, type = 'info') {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // 페이지 상단에 메시지 추가
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(messageDiv, container.firstChild);
    }
    
    // 3초 후 메시지 제거
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// 로그아웃 함수
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '../shared/index.html';
    } catch (error) {
        window.location.href = '../shared/index.html';
    }
}

// 탭 전환 함수
function showTab(tabName) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// 뒤로가기 함수
function goBack() {
    window.location.href = 'customers.html';
}
