// 고객 상세 정보 관련 변수
let currentCustomerId = null;
let currentCustomer = null;

// 페이지 로드 시 초기화
window.addEventListener('load', () => {
    checkUserStatus();
    getCustomerIdFromURL();
    if (currentCustomerId) {
        loadCustomerDetail();
        loadVisits();
        loadRepairs();
        loadPurchases();
    }
});

// URL에서 고객 ID 가져오기
function getCustomerIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    currentCustomerId = urlParams.get('id');
}

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

// 고객 상세 정보 로드
async function loadCustomerDetail() {
    try {
        const response = await fetch(`/api/customers/${currentCustomerId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            currentCustomer = result.data;
            displayCustomerInfo();
        } else {
            showMessage('고객 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 고객 정보 표시
function displayCustomerInfo() {
    document.getElementById('customerName').textContent = `${currentCustomer.name}님 상세 정보`;
    
    const basicInfo = document.getElementById('customerBasicInfo');
    basicInfo.innerHTML = `
        <div class="info-item">
            <label>이름</label>
            <span>${currentCustomer.name}</span>
        </div>
        <div class="info-item">
            <label>회사명</label>
            <span>${currentCustomer.company || '-'}</span>
        </div>
        <div class="info-item">
            <label>사업자번호</label>
            <span>${currentCustomer.businessNumber || '-'}</span>
        </div>
        <div class="info-item">
            <label>전화번호</label>
            <span>${currentCustomer.phone}</span>
        </div>
        <div class="info-item">
            <label>이메일</label>
            <span>${currentCustomer.email || '-'}</span>
        </div>
        <div class="info-item">
            <label>주소</label>
            <span>${currentCustomer.address || '-'}</span>
        </div>
        <div class="info-item">
            <label>관리번호</label>
            <span>${currentCustomer.managementNumber || '-'}</span>
        </div>
        <div class="info-item">
            <label>등록일</label>
            <span>${new Date(currentCustomer.registrationDate).toLocaleDateString('ko-KR')}</span>
        </div>
        <div class="info-item">
            <label>총 구매금액</label>
            <span>${currentCustomer.totalSpent.toLocaleString('ko-KR')}원</span>
        </div>
        <div class="info-item">
            <label>상태</label>
            <span class="status-badge status-${currentCustomer.status === '활성' ? 'active' : 'inactive'}">${currentCustomer.status}</span>
        </div>
        <div class="info-item full-width">
            <label>메모</label>
            <span>${currentCustomer.notes || '-'}</span>
        </div>
    `;
}

// 방문 기록 로드
async function loadVisits() {
    try {
        const response = await fetch(`/api/visits?customerId=${currentCustomerId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            displayVisits(result.data);
        } else {
            showMessage('방문 기록을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 방문 기록 표시
function displayVisits(visits) {
    const tbody = document.getElementById('visitsTableBody');
    tbody.innerHTML = '';
    
    if (visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">방문 기록이 없습니다.</td></tr>';
        return;
    }
    
    visits.forEach(visit => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(visit.visitDate).toLocaleDateString('ko-KR')}</td>
            <td>${visit.purpose}</td>
            <td>${visit.description || '-'}</td>
            <td>${visit.technician || '-'}</td>
            <td>${visit.cost.toLocaleString('ko-KR')}원</td>
            <td><span class="status-badge status-${visit.status === '완료' ? 'active' : 'inactive'}">${visit.status}</span></td>
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

// 수리 이력 관련 함수들은 repair-management.js로 이동됨

// 구매 이력 로드
async function loadPurchases() {
    try {
        const response = await fetch(`/api/purchases?customerId=${currentCustomerId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            displayPurchases(result.data);
        } else {
            showMessage('구매 이력을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 표시
function displayPurchases(purchases) {
    const tbody = document.getElementById('purchasesTableBody');
    tbody.innerHTML = '';
    
    if (purchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">구매 이력이 없습니다.</td></tr>';
        return;
    }
    
    purchases.forEach(purchase => {
        const row = document.createElement('tr');
        const itemsText = purchase.items.map(item => `${item.name} (${item.quantity}개)`).join(', ');
        row.innerHTML = `
            <td>${new Date(purchase.purchaseDate).toLocaleDateString('ko-KR')}</td>
            <td><span class="type-badge type-${purchase.type}">${purchase.type}</span></td>
            <td>${itemsText}</td>
            <td>${purchase.totalAmount.toLocaleString('ko-KR')}원</td>
            <td>${purchase.paymentMethod}</td>
            <td><span class="status-badge status-${purchase.status === '완료' ? 'active' : 'inactive'}">${purchase.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editPurchase(${purchase.id})">수정</button>
                    <button class="action-btn delete-btn" onclick="deletePurchase(${purchase.id})">삭제</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 탭 전환
function showTab(tabName) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// 뒤로가기
function goBack() {
    window.location.href = 'customers.html';
}

// 고객 정보 수정
function editCustomer() {
    window.location.href = `customers.html?edit=${currentCustomerId}`;
}

// 방문 기록 추가
function addVisit() {
    document.getElementById('visitModalTitle').textContent = '방문 기록 추가';
    document.getElementById('visitForm').reset();
    document.getElementById('visitDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('visitModal').style.display = 'flex';
}

// 수리 이력 추가 함수는 repair-management.js로 이동됨

// 구매 이력 추가
function addPurchase() {
    document.getElementById('purchaseModalTitle').textContent = '구매 이력 추가';
    document.getElementById('purchaseForm').reset();
    document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
    // 상품 목록 초기화
    document.getElementById('itemsList').innerHTML = `
        <div class="item-row">
            <input type="text" name="itemName" placeholder="상품명" required>
            <input type="number" name="itemQuantity" placeholder="수량" min="1" value="1" required>
            <input type="number" name="itemUnitPrice" placeholder="단가" min="0" required>
            <button type="button" onclick="removeItem(this)" class="btn btn-danger">삭제</button>
        </div>
    `;
    document.getElementById('purchaseModal').style.display = 'flex';
}

// 상품 추가
function addItem() {
    const itemsList = document.getElementById('itemsList');
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.innerHTML = `
        <input type="text" name="itemName" placeholder="상품명" required>
        <input type="number" name="itemQuantity" placeholder="수량" min="1" value="1" required>
        <input type="number" name="itemUnitPrice" placeholder="단가" min="0" required>
        <button type="button" onclick="removeItem(this)" class="btn btn-danger">삭제</button>
    `;
    itemsList.appendChild(itemRow);
}

// 상품 삭제
function removeItem(button) {
    if (document.querySelectorAll('.item-row').length > 1) {
        button.parentElement.remove();
    } else {
        alert('최소 하나의 상품은 필요합니다.');
    }
}

// 모달 닫기 함수들
function closeVisitModal() {
    document.getElementById('visitModal').style.display = 'none';
}

// 수리 이력 모달 닫기 함수는 repair-management.js로 이동됨

function closePurchaseModal() {
    document.getElementById('purchaseModal').style.display = 'none';
}

// 폼 제출 이벤트 리스너
document.getElementById('visitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const visitData = Object.fromEntries(formData);
    visitData.customerId = currentCustomerId;
    
    try {
        const response = await fetch('/api/visits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(visitData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            closeVisitModal();
            loadVisits();
        } else {
            showMessage(result.message || '오류가 발생했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
});

// 수리 이력 폼 제출 이벤트 리스너는 repair-management.js로 이동됨

document.getElementById('purchaseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const purchaseData = Object.fromEntries(formData);
    purchaseData.customerId = currentCustomerId;
    
    // 상품 목록 처리
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];
    itemRows.forEach(row => {
        const name = row.querySelector('input[name="itemName"]').value;
        const quantity = parseInt(row.querySelector('input[name="itemQuantity"]').value);
        const unitPrice = parseInt(row.querySelector('input[name="itemUnitPrice"]').value);
        if (name && quantity && unitPrice) {
            items.push({
                name,
                quantity,
                unitPrice,
                totalPrice: quantity * unitPrice
            });
        }
    });
    
    purchaseData.items = items;
    
    try {
        const response = await fetch('/api/purchases', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(purchaseData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            closePurchaseModal();
            loadPurchases();
        } else {
            showMessage(result.message || '오류가 발생했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
});

// 메시지 표시 함수
function showMessage(message, type) {
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const page = document.querySelector('.customer-detail-page');
    page.insertBefore(messageDiv, page.firstChild);
    
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
        window.location.href = 'index.html';
    } catch (error) {
        window.location.href = 'index.html';
    }
}
