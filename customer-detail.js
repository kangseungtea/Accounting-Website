// 고객 상세 정보 관련 변수
let currentCustomerId = null;
let currentCustomer = null;
let products = [];

// 전역 변수로 products와 currentCustomer를 사용할 수 있도록 설정
window.products = products;
window.currentCustomer = currentCustomer;

// 페이지 로드 시 초기화
window.addEventListener('load', async () => {
    await checkUserStatus();
    getCustomerIdFromURL();
    await loadProducts();
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
    console.log('URL에서 가져온 currentCustomerId:', currentCustomerId, typeof currentCustomerId);
}

// 제품 목록 로드
async function loadProducts() {
    try {
        console.log('제품 데이터 로딩 시작...');
        const response = await fetch('/api/products?limit=1000', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            products = result.data;
            window.products = products; // 전역 변수도 업데이트
            console.log('제품 데이터 로드 완료:', products.length, '개');
            // 자동완성은 별도 초기화가 필요하지 않음
        } else {
            console.error('제품 데이터 로드 실패:', result.message);
        }
    } catch (error) {
        console.error('제품 로드 오류:', error);
    }
}

// 제품 자동완성 필터링
function filterProducts(input) {
    console.log('제품 필터링 시작, 입력값:', input.value);
    const query = input.value.toLowerCase();
    const suggestions = input.parentElement.querySelector('.autocomplete-suggestions');
    
    if (!suggestions) {
        console.error('자동완성 제안 영역을 찾을 수 없습니다.');
        return;
    }
    
    if (query.length < 1) {
        suggestions.style.display = 'none';
        return;
    }
    
    console.log('제품 데이터:', products.length, '개');
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        (product.brand && product.brand.toLowerCase().includes(query))
    );
    
    console.log('필터링된 제품:', filteredProducts.length, '개');
    displaySuggestions(suggestions, filteredProducts, input);
}

// 제품 제안 표시
function displaySuggestions(suggestions, filteredProducts, input) {
    suggestions.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        suggestions.style.display = 'none';
        return;
    }
    
    suggestions.style.display = 'block';
    
    filteredProducts.slice(0, 10).forEach(product => {
        const suggestion = document.createElement('div');
        suggestion.className = 'autocomplete-suggestion';
        suggestion.innerHTML = `
            <div class="product-name">${product.name}</div>
            <div class="product-info">
                ${product.brand ? `브랜드: ${product.brand}` : ''}
                <span class="product-price">${product.price.toLocaleString()}원</span>
            </div>
        `;
        
        suggestion.addEventListener('click', () => {
            selectProduct(input, product);
        });
        
        suggestions.appendChild(suggestion);
    });
}

// 제품 선택
function selectProduct(input, product) {
    input.value = product.name;
    input.dataset.productId = product.id;
    input.dataset.productPrice = product.price;
    
    // 가격 자동 입력 (사용자가 수정 가능)
    const priceInput = input.closest('.item-row').querySelector('input[name="itemUnitPrice"]');
    priceInput.value = product.price;
    priceInput.dataset.originalPrice = product.price; // 원래 가격 저장
    
    // 제안 숨기기
    hideProductSuggestions(input);
    
    // 금액 계산 업데이트
    updateAmountCalculation();
}

// 제품 제안 표시
function showProductSuggestions(input) {
    if (input.value.length >= 1) {
        filterProducts(input);
    }
}

// 제품 제안 숨기기
function hideProductSuggestions(input) {
    // 약간의 지연을 두어 클릭 이벤트가 처리되도록 함
    setTimeout(() => {
        const suggestions = input.parentElement.querySelector('.autocomplete-suggestions');
        suggestions.style.display = 'none';
    }, 200);
}

// 부가세 계산 업데이트
function updateTaxCalculation() {
    updateAmountCalculation();
}

// 가격 힌트 표시
function showPriceHint(input) {
    const originalPrice = input.dataset.originalPrice;
    if (originalPrice) {
        input.placeholder = `원래 가격: ${parseInt(originalPrice).toLocaleString()}원`;
    }
}

// 가격 힌트 숨기기
function hidePriceHint(input) {
    input.placeholder = '단가';
}

// 금액 계산 업데이트
function updateAmountCalculation() {
    const itemRows = document.querySelectorAll('.item-row');
    let subtotal = 0;
    
    // 소계 계산
    itemRows.forEach(row => {
        const quantity = parseInt(row.querySelector('input[name="itemQuantity"]').value) || 0;
        const unitPrice = parseInt(row.querySelector('input[name="itemUnitPrice"]').value) || 0;
        subtotal += quantity * unitPrice;
    });
    
    // 부가세 옵션 확인
    const taxOption = document.getElementById('taxOption').value;
    const taxRow = document.getElementById('taxRow');
    let tax = 0;
    let total = subtotal;
    
    if (taxOption === 'included') {
        // 부가세 포함: 소계에 부가세가 포함되어 있음
        tax = Math.round(subtotal * 0.1 / 1.1);
        total = subtotal;
        taxRow.style.display = 'flex';
    } else if (taxOption === 'excluded') {
        // 부가세 미포함: 소계에 부가세를 추가
        tax = Math.round(subtotal * 0.1);
        total = subtotal + tax;
        taxRow.style.display = 'flex';
    } else {
        // 부가세 없음
        tax = 0;
        total = subtotal;
        taxRow.style.display = 'none';
    }
    
    // 금액 표시 업데이트
    document.getElementById('subtotalAmount').textContent = subtotal.toLocaleString() + '원';
    document.getElementById('taxAmount').textContent = tax.toLocaleString() + '원';
    document.getElementById('totalAmount').textContent = total.toLocaleString() + '원';
}

// 수리 이력 로드
// 수리 이력 관련 함수들은 repair-management.js로 이동됨

// 상태 배지 생성
function getStatusBadge(status) {
    const statusMap = {
        '접수': { class: 'status-received', text: '접수' },
        '위탁접수': { class: 'status-diagnosis', text: '위탁접수' },
        '완료': { class: 'status-completed', text: '완료' },
        '보증중': { class: 'status-warranty', text: '보증중' }
    };
    
    const statusInfo = statusMap[status] || { class: 'status-unknown', text: status };
    return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

// 보증 상태 확인
function getWarrantyStatus(repair) {
    if (!repair.warranty) return '-';
    
    // "2025-01-01~2026-01-03" 형식 파싱
    const parts = repair.warranty.split('~');
    if (parts.length !== 2) return '-';
    
    const warrantyEndDate = new Date(parts[1].trim());
    const today = new Date();
    
    // 날짜 유효성 검사
    if (isNaN(warrantyEndDate.getTime())) return '-';
    
    if (today > warrantyEndDate) {
        return `<span class="warranty-expired">만료 (${warrantyEndDate.toLocaleDateString('ko-KR')})</span>`;
    } else {
        const daysLeft = Math.ceil((warrantyEndDate - today) / (24 * 60 * 60 * 1000));
        return `<span class="warranty-active">${daysLeft}일 남음</span>`;
    }
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
            window.currentCustomer = currentCustomer; // 전역 변수 업데이트
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">구매 이력이 없습니다.</td></tr>';
        return;
    }
    
    purchases.forEach(purchase => {
        const row = document.createElement('tr');
        const itemsText = purchase.items.map(item => `${item.name} (${item.quantity}개)`).join(', ');
        const purchaseCode = purchase.purchaseCode || '-';
        row.innerHTML = `
            <td><span class="purchase-code">${purchaseCode}</span></td>
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
// 구매 이력 추가
function addPurchase() {
    document.getElementById('purchaseModalTitle').textContent = '구매 이력 추가';
    document.getElementById('purchaseForm').reset();
    document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('purchaseCode').value = ''; // 구매코드 초기화
    // 상품 목록 초기화
    document.getElementById('itemsList').innerHTML = `
        <div class="item-row">
            <div class="autocomplete-container">
                <input type="text" name="itemName" placeholder="상품명" required autocomplete="off" onkeyup="searchProducts(this)" onfocus="showSuggestions(this)" onblur="hideSuggestions(this)">
                <div class="autocomplete-suggestions" style="display: none;"></div>
            </div>
            <input type="number" name="itemQuantity" placeholder="수량" min="1" value="1" required onchange="updateAmountCalculation()">
            <input type="number" name="itemUnitPrice" placeholder="단가" min="0" required onchange="updateAmountCalculation()" onfocus="showPriceHint(this)" onblur="hidePriceHint(this)">
            <button type="button" onclick="removeItem(this)" class="btn btn-danger">삭제</button>
        </div>
    `;
    document.getElementById('purchaseModal').style.display = 'flex';
}

// 구매코드 자동 생성
async function generatePurchaseCode() {
    const type = document.getElementById('purchaseType').value;
    
    if (!type) {
        showMessage('구분을 먼저 선택해주세요.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/purchases/generate-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ type })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('purchaseCode').value = result.purchaseCode;
            showMessage('구매코드가 자동 생성되었습니다.', 'success');
        } else {
            showMessage('구매코드 생성에 실패했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('구매코드 생성 오류:', error);
        showMessage('구매코드 생성 중 오류가 발생했습니다.', 'error');
    }
}

// 구분 변경 시 구매코드 초기화
function updatePurchaseCodeGeneration() {
    document.getElementById('purchaseCode').value = '';
}

// 구매 이력 수정
async function editPurchase(purchaseId) {
    try {
        const response = await fetch(`/api/purchases/${purchaseId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            const purchase = result.data;
            
            // 모달 제목 변경
            document.getElementById('purchaseModalTitle').textContent = '구매 이력 수정';
            
            // 폼 데이터 채우기
            document.getElementById('purchaseCode').value = purchase.purchaseCode || '';
            document.getElementById('purchaseDate').value = new Date(purchase.purchaseDate).toISOString().split('T')[0];
            document.getElementById('purchaseType').value = purchase.type;
            document.getElementById('paymentMethod').value = purchase.paymentMethod;
            document.getElementById('purchaseNotes').value = purchase.notes || '';
            
            // 상품 목록 채우기
            const itemsList = document.getElementById('itemsList');
            itemsList.innerHTML = '';
            
            purchase.items.forEach((item, index) => {
                const itemRow = document.createElement('div');
                itemRow.className = 'item-row';
                itemRow.innerHTML = `
                    <div class="autocomplete-container">
                        <input type="text" name="itemName" placeholder="제품명 입력..." required autocomplete="off" onkeyup="filterProducts(this)" onfocus="showProductSuggestions(this)" onblur="hideProductSuggestions(this)" value="${item.name}">
                        <div class="autocomplete-suggestions" style="display: none;"></div>
                    </div>
                    <input type="number" name="itemQuantity" placeholder="수량" min="1" value="${item.quantity}" required onchange="updateAmountCalculation()">
                    <input type="number" name="itemUnitPrice" placeholder="단가" min="0" value="${item.unitPrice}" required onchange="updateAmountCalculation()" onfocus="showPriceHint(this)" onblur="hidePriceHint(this)">
                    <button type="button" onclick="removeItem(this)" class="btn btn-danger">삭제</button>
                `;
                itemsList.appendChild(itemRow);
            });
            
            // 부가세 정보 설정
            if (purchase.taxInfo) {
                document.getElementById('taxOption').value = purchase.taxInfo.option;
                updateTaxCalculation();
            }
            
            // 수정 모드로 설정
            document.getElementById('purchaseForm').dataset.editingId = purchaseId;
            
            // 모달 표시
            document.getElementById('purchaseModal').style.display = 'flex';
        } else {
            showMessage('구매 이력을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('구매 이력 수정 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 삭제
async function deletePurchase(purchaseId) {
    if (!confirm('정말로 이 구매 이력을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/purchases/${purchaseId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            showMessage('구매 이력이 삭제되었습니다.', 'success');
            loadPurchases();
        } else {
            showMessage(result.message || '삭제에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('구매 이력 삭제 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 상품 추가
function addItem() {
    const itemsList = document.getElementById('itemsList');
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.innerHTML = `
        <div class="autocomplete-container">
            <input type="text" name="itemName" placeholder="제품명 입력..." required autocomplete="off" onkeyup="filterProducts(this)" onfocus="showProductSuggestions(this)" onblur="hideProductSuggestions(this)">
            <div class="autocomplete-suggestions" style="display: none;"></div>
        </div>
        <input type="number" name="itemQuantity" placeholder="수량" min="1" value="1" required onchange="updateAmountCalculation()">
        <input type="number" name="itemUnitPrice" placeholder="단가" min="0" required onchange="updateAmountCalculation()" onfocus="showPriceHint(this)" onblur="hidePriceHint(this)">
        <button type="button" onclick="removeItem(this)" class="btn btn-danger">삭제</button>
    `;
    itemsList.appendChild(itemRow);
}

// 상품 삭제
function removeItem(button) {
    if (document.querySelectorAll('.item-row').length > 1) {
        button.parentElement.remove();
        updateAmountCalculation();
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
    
    // 구매코드 추가
    purchaseData.purchaseCode = document.getElementById('purchaseCode').value;
    
    // 상품 목록 처리
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];
    itemRows.forEach(row => {
        const input = row.querySelector('input[name="itemName"]');
        const name = input.value;
        const productId = input.dataset.productId;
        const quantity = parseInt(row.querySelector('input[name="itemQuantity"]').value);
        const unitPrice = parseInt(row.querySelector('input[name="itemUnitPrice"]').value);
        
        if (name && quantity && unitPrice) {
            items.push({
                productId: productId || null,
                name,
                quantity,
                unitPrice,
                totalPrice: quantity * unitPrice
            });
        }
    });
    
    purchaseData.items = items;
    
    // 부가세 정보 추가
    const taxOption = document.getElementById('taxOption').value;
    const subtotalAmount = document.getElementById('subtotalAmount').textContent.replace(/[^0-9]/g, '');
    const taxAmount = document.getElementById('taxAmount').textContent.replace(/[^0-9]/g, '');
    const totalAmount = document.getElementById('totalAmount').textContent.replace(/[^0-9]/g, '');
    
    purchaseData.taxInfo = {
        option: taxOption,
        subtotal: parseInt(subtotalAmount) || 0,
        tax: parseInt(taxAmount) || 0,
        total: parseInt(totalAmount) || 0
    };
    
    try {
        // 수정 모드 확인
        const editingId = e.target.dataset.editingId;
        const isEdit = editingId !== undefined;
        
        const url = isEdit ? `/api/purchases/${editingId}` : '/api/purchases';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
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
            
            // 수정 모드 초기화
            if (isEdit) {
                e.target.removeAttribute('data-editing-id');
            }
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
