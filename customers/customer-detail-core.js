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
    const customerId = urlParams.get('id');
    const customerName = urlParams.get('name');
    const transactionCode = urlParams.get('code');
    
    console.log('URL 파라미터:', { customerId, customerName, transactionCode });
    
    if (customerId) {
        currentCustomerId = customerId;
        loadCustomerData();
    } else if (customerName) {
        // 고객명으로 고객 검색
        searchCustomerByName(customerName, transactionCode);
    } else {
        showMessage('고객 정보가 없습니다.', 'error');
        setTimeout(() => {
            window.location.href = 'customers.html';
        }, 2000);
    }
    
    // URL에 #repair-history가 있으면 수리 이력 탭 활성화
    if (window.location.hash === '#repair-history') {
        setTimeout(() => {
            const repairTab = document.querySelector('button[onclick*="showRepairHistory"]');
            if (repairTab) {
                repairTab.click();
                console.log('수리 이력 탭이 자동으로 활성화되었습니다.');
            }
        }, 1000); // 데이터 로드 후 실행
    }
});

// 고객명으로 고객 검색
async function searchCustomerByName(customerName, transactionCode = '') {
    try {
        console.log('고객명으로 검색:', { customerName, transactionCode });
        
        // 고객 검색 API 호출
        const searchResponse = await fetch(`/api/customers/search?name=${encodeURIComponent(customerName)}`, {
            credentials: 'include'
        });
        
        if (!searchResponse.ok) {
            throw new Error('고객 검색에 실패했습니다.');
        }
        
        const searchData = await searchResponse.json();
        console.log('고객 검색 결과:', searchData);
        
        if (searchData.customers && searchData.customers.length > 0) {
            // 첫 번째 고객을 선택 (동일 이름이 여러 명인 경우)
            const customer = searchData.customers[0];
            currentCustomerId = customer.id;
            
            console.log('고객 ID 설정:', currentCustomerId);
            
            // 거래코드를 전역 변수로 저장 (데이터 로드 후 하이라이트용)
            if (transactionCode) {
                window.highlightTransactionCode = transactionCode;
            }
            
            // 고객 데이터 로드
            await loadCustomerData();
        } else {
            showMessage(`'${customerName}' 고객을 찾을 수 없습니다.`, 'error');
            setTimeout(() => {
                window.location.href = 'customers.html';
            }, 2000);
        }
    } catch (error) {
        console.error('고객 검색 오류:', error);
        showMessage('고객 검색 중 오류가 발생했습니다.', 'error');
        setTimeout(() => {
            window.location.href = 'customers.html';
        }, 2000);
    }
}

// 특정 거래 하이라이트
function highlightTransaction(transactionCode) {
    console.log('거래 하이라이트 시작:', transactionCode);
    
    if (!transactionCode) {
        console.log('거래코드가 없습니다.');
        return;
    }
    
    // 수리 이력에서 해당 거래 찾기
    const repairRows = document.querySelectorAll('#repairsTable tbody tr');
    console.log('수리 이력 행 수:', repairRows.length);
    
    repairRows.forEach((row, index) => {
        const codeCell = row.querySelector('td:nth-child(1)'); // 거래코드가 첫 번째 컬럼
        if (codeCell) {
            const cellText = codeCell.textContent.trim();
            console.log(`수리 이력 ${index}: ${cellText}`);
            if (cellText === transactionCode) {
                console.log('수리 이력에서 거래코드 일치:', transactionCode);
                row.style.backgroundColor = '#fff3cd';
                row.style.border = '2px solid #ffc107';
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
    
    // 구매 이력에서 해당 거래 찾기
    const purchaseRows = document.querySelectorAll('#purchasesTable tbody tr');
    console.log('구매 이력 행 수:', purchaseRows.length);
    
    purchaseRows.forEach((row, index) => {
        const codeCell = row.querySelector('td:nth-child(1)'); // 거래코드가 첫 번째 컬럼
        if (codeCell) {
            const cellText = codeCell.textContent.trim();
            console.log(`구매 이력 ${index}: ${cellText}`);
            if (cellText === transactionCode) {
                console.log('구매 이력에서 거래코드 일치:', transactionCode);
                row.style.backgroundColor = '#fff3cd';
                row.style.border = '2px solid #ffc107';
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
    
    console.log('거래 하이라이트 완료');
}

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
        const purchasesResponse = await fetch(`/api/purchases?customerId=${currentCustomerId}&limit=1000`, {
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
        
        // 거래 하이라이트 (모든 데이터 로드 후 실행)
        if (window.highlightTransactionCode) {
            setTimeout(() => {
                highlightTransaction(window.highlightTransactionCode);
            }, 500); // 0.5초 후 실행하여 DOM이 완전히 렌더링된 후 하이라이트
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
    document.getElementById('customerManagementNumber').textContent = customer.id || '고객 번호 없음';
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
    
    // 수리 이력 탭인 경우 통계 업데이트 (자동 호출 제거)
    if (tabName === 'repairs') {
        console.log('📊 수리 이력 탭 활성화됨 - 자동 로드 비활성화됨');
        // 자동 로드 제거 - 사용자가 직접 상세 버튼을 클릭할 때만 로드
    }
}

// 뒤로가기 함수
function goBack() {
    window.location.href = 'customers.html';
}
