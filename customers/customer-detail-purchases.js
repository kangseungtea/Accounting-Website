// 구매 이력 관련 기능

// 페이지네이션 관련 전역 변수
let allPurchases = [];
let currentPurchasePage = 1;
const purchasesPerPage = 10;

// 구매 이력 추가 모달 표시
function showAddPurchaseModal() {
    console.log('구매 이력 추가 모달 표시');
    
    // 폼 초기화
    document.getElementById('purchaseForm').reset();
    document.getElementById('purchaseDate').value = new Date().toISOString().slice(0, 10);
    
    // 상품 목록 초기화 (첫 번째 행만 남기기)
    const itemsList = document.getElementById('itemsList');
    itemsList.innerHTML = `
        <div class="item-row">
            <div class="autocomplete-container">
                <input type="text" name="itemName" placeholder="제품명 입력..." required autocomplete="off" onkeyup="filterProducts(this)" onfocus="showProductSuggestions(this)" onblur="hideProductSuggestions(this)">
                <input type="hidden" name="itemProductId" value="">
                <div class="autocomplete-suggestions" style="display: none;"></div>
            </div>
            <input type="number" name="itemQuantity" placeholder="수량" min="1" value="1" required onchange="updateAmountCalculation()">
            <input type="number" name="itemUnitPrice" placeholder="단가" min="0" required onchange="updateAmountCalculation()" onfocus="showPriceHint(this)" onblur="hidePriceHint(this)">
            <button type="button" onclick="removeItem(this)" class="btn btn-danger">삭제</button>
        </div>
    `;
    
    // 금액 계산 초기화
    updateAmountCalculation();
    
    // 모달 표시
    document.getElementById('purchaseModal').style.display = 'flex';
}

// 구매 이력 모달 닫기
function closePurchaseModal() {
    document.getElementById('purchaseModal').style.display = 'none';
}

// 구매 코드 생성
async function generatePurchaseCode() {
    const type = document.getElementById('purchaseType').value;
    if (!type) {
        alert('구분을 먼저 선택해주세요.');
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
            document.getElementById('purchaseCode').value = result.data.code;
        } else {
            alert('구매 코드 생성에 실패했습니다: ' + result.message);
        }
    } catch (error) {
        console.error('구매 코드 생성 오류:', error);
        alert('구매 코드 생성 중 오류가 발생했습니다.');
    }
}

// 구분 변경 시 구매 코드 생성 버튼 활성화
function updatePurchaseCodeGeneration() {
    const type = document.getElementById('purchaseType').value;
    const generateBtn = document.getElementById('generatePurchaseCodeBtn');
    
    if (type) {
        generateBtn.disabled = false;
        generateBtn.textContent = '자동 생성';
    } else {
        generateBtn.disabled = true;
        generateBtn.textContent = '구분 선택 필요';
    }
}

// 상품 행 추가
function addItem() {
    const itemsList = document.getElementById('itemsList');
    const newRow = document.createElement('div');
    newRow.className = 'item-row';
    newRow.innerHTML = `
        <div class="autocomplete-container">
            <input type="text" name="itemName" placeholder="제품명 입력..." required autocomplete="off" onkeyup="filterProducts(this)" onfocus="showProductSuggestions(this)" onblur="hideProductSuggestions(this)">
            <input type="hidden" name="itemProductId" value="">
            <div class="autocomplete-suggestions" style="display: none;"></div>
        </div>
        <input type="number" name="itemQuantity" placeholder="수량" min="1" value="1" required onchange="updateAmountCalculation()">
        <input type="number" name="itemUnitPrice" placeholder="단가" min="0" required onchange="updateAmountCalculation()" onfocus="showPriceHint(this)" onblur="hidePriceHint(this)">
        <button type="button" onclick="removeItem(this)" class="btn btn-danger">삭제</button>
    `;
    
    itemsList.appendChild(newRow);
    updateAmountCalculation();
}

// 상품 행 삭제
function removeItem(button) {
    const itemsList = document.getElementById('itemsList');
    if (itemsList.children.length > 1) {
        button.parentElement.remove();
        updateAmountCalculation();
    } else {
        alert('최소 하나의 상품은 필요합니다.');
    }
}

// 금액 계산 업데이트
function updateAmountCalculation() {
    const itemRows = document.querySelectorAll('.item-row');
    let subtotal = 0;
    
    itemRows.forEach(row => {
        const quantity = parseFloat(row.querySelector('input[name="itemQuantity"]').value) || 0;
        const unitPrice = parseFloat(row.querySelector('input[name="itemUnitPrice"]').value) || 0;
        subtotal += quantity * unitPrice;
    });
    
    const taxOption = document.getElementById('taxOption').value;
    let tax = 0;
    let total = subtotal;
    
    if (taxOption === 'included') {
        tax = Math.round(subtotal * 0.1);
        total = subtotal;
    } else if (taxOption === 'excluded') {
        tax = Math.round(subtotal * 0.1);
        total = subtotal + tax;
    }
    
    document.getElementById('subtotalAmount').textContent = subtotal.toLocaleString('ko-KR') + '원';
    document.getElementById('taxAmount').textContent = tax.toLocaleString('ko-KR') + '원';
    document.getElementById('totalAmount').textContent = total.toLocaleString('ko-KR') + '원';
    
    // 부가세 행 표시/숨김
    const taxRow = document.getElementById('taxRow');
    if (taxOption === 'none') {
        taxRow.style.display = 'none';
    } else {
        taxRow.style.display = 'flex';
    }
}

// 부가세 계산 업데이트
function updateTaxCalculation() {
    updateAmountCalculation();
}

// 제품 자동완성 필터링
function filterProducts(input) {
    const query = input.value.toLowerCase();
    const suggestions = input.parentElement.querySelector('.autocomplete-suggestions');
    
    if (query.length < 2) {
        suggestions.style.display = 'none';
        return;
    }
    
    const filteredProducts = window.products.filter(product => 
        product.name.toLowerCase().includes(query)
    );
    
    if (filteredProducts.length > 0) {
        suggestions.innerHTML = filteredProducts.map(product => 
            `<div class="suggestion-item" onclick="selectProduct(this, '${product.id}', '${product.name}')">
                <div style="font-weight: bold; color: #000;">${product.name}</div>
                <div style="font-size: 12px; color: #666;">${product.price.toLocaleString('ko-KR')}원</div>
                <div style="font-size: 12px; color: #666;">${product.status}</div>
            </div>`
        ).join('');
        suggestions.style.display = 'block';
    } else {
        suggestions.style.display = 'none';
    }
}

// 제품 선택
function selectProduct(element, productId, productName) {
    const container = element.closest('.autocomplete-container');
    const nameInput = container.querySelector('input[name="itemName"]');
    const idInput = container.querySelector('input[name="itemProductId"]');
    
    nameInput.value = productName;
    idInput.value = productId;
    
    container.querySelector('.autocomplete-suggestions').style.display = 'none';
    
    // 가격 자동 입력 및 힌트 표시
    const product = window.products.find(p => p.id == productId);
    if (product) {
        const priceInput = container.parentElement.querySelector('input[name="itemUnitPrice"]');
        priceInput.value = product.price; // 가격 자동 입력
        priceInput.placeholder = `권장가격: ${product.price.toLocaleString('ko-KR')}원`;
        
        // 금액 계산 업데이트
        updateAmountCalculation();
    }
}

// 제품 제안 표시
function showProductSuggestions(input) {
    if (input.value.length >= 2) {
        filterProducts(input);
    }
}

// 제품 제안 숨기기
function hideProductSuggestions(input) {
    setTimeout(() => {
        input.parentElement.querySelector('.autocomplete-suggestions').style.display = 'none';
    }, 200);
}

// 가격 힌트 표시
function showPriceHint(input) {
    const container = input.closest('.item-row');
    const nameInput = container.querySelector('input[name="itemName"]');
    const productId = container.querySelector('input[name="itemProductId"]').value;
    
    if (productId) {
        const product = window.products.find(p => p.id == productId);
        if (product) {
            input.placeholder = `권장가격: ${product.price.toLocaleString('ko-KR')}원`;
        }
    }
}

// 가격 힌트 숨기기
function hidePriceHint(input) {
    input.placeholder = '단가';
}

// 구매 이력 저장
async function addPurchase(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const items = [];
    
    // 상품 목록 수집
    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const name = row.querySelector('input[name="itemName"]').value;
        const productId = row.querySelector('input[name="itemProductId"]').value;
        const quantity = parseInt(row.querySelector('input[name="itemQuantity"]').value);
        const unitPrice = parseInt(row.querySelector('input[name="itemUnitPrice"]').value);
        
        if (name && quantity && unitPrice) {
            items.push({
                productId: productId || null,
                productName: name,
                quantity: quantity,
                unitPrice: unitPrice
            });
        }
    });
    
    if (items.length === 0) {
        alert('최소 하나의 상품을 입력해주세요.');
        return;
    }
    
    // 구매코드가 비어있으면 자동 생성
    let purchaseCode = formData.get('purchaseCode');
    if (!purchaseCode || purchaseCode.trim() === '') {
        const type = formData.get('type');
        if (!type) {
            alert('구분을 선택해주세요.');
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
                purchaseCode = result.data.code;
                // 화면에도 업데이트
                document.getElementById('purchaseCode').value = purchaseCode;
            } else {
                alert('구매코드 생성에 실패했습니다.');
                return;
            }
        } catch (error) {
            console.error('구매코드 생성 오류:', error);
            alert('구매코드 생성 중 오류가 발생했습니다.');
            return;
        }
    }
    
    const purchaseData = {
        customerId: currentCustomerId,
        purchaseCode: purchaseCode,
        purchaseDate: formData.get('purchaseDate'),
        type: formData.get('type'),
        items: items,
        paymentMethod: formData.get('paymentMethod'),
        taxOption: formData.get('taxOption'),
        notes: formData.get('notes')
    };
    
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
            showMessage('구매 이력이 성공적으로 추가되었습니다.', 'success');
            closePurchaseModal();
            loadCustomerData(); // 고객 데이터 다시 로드
            // 페이지네이션을 첫 페이지로 리셋
            currentPurchasePage = 1;
        } else {
            showMessage('구매 이력 추가에 실패했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('구매 이력 추가 오류:', error);
        showMessage('구매 이력 추가 중 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 표시
function displayPurchases(purchases) {
    console.log('구매 이력 표시 시작, 구매 건수:', purchases.length);
    
    // 전체 구매 데이터 저장
    allPurchases = purchases;
    currentPurchasePage = 1;
    
    // 페이지네이션으로 구매 이력 표시
    displayPurchasesPage();
}

// 페이지네이션으로 구매 이력 표시
function displayPurchasesPage() {
    const tbody = document.getElementById('purchasesTableBody');
    
    if (!tbody) {
        console.error('purchasesTableBody 요소를 찾을 수 없습니다!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (allPurchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #666;">구매 이력이 없습니다.</td></tr>';
        updatePurchasePagination();
        return;
    }
    
    // 현재 페이지의 데이터 계산
    const startIndex = (currentPurchasePage - 1) * purchasesPerPage;
    const endIndex = startIndex + purchasesPerPage;
    const currentPagePurchases = allPurchases.slice(startIndex, endIndex);
    
    console.log(`페이지 ${currentPurchasePage} 표시: ${startIndex + 1}-${Math.min(endIndex, allPurchases.length)} / 총 ${allPurchases.length}개`);
    
    // 각 구매의 상품별로 개별 행 생성
    currentPagePurchases.forEach(purchase => {
        // 구매 상품들을 개별적으로 표시
        if (purchase.items && purchase.items.length > 0) {
            purchase.items.forEach((item, itemIndex) => {
                const row = document.createElement('tr');
                
                // 부가세 계산 (tax_option에 따라 다르게 처리)
                let supplyAmount, taxAmount;
                
                if (purchase.tax_option === 'included') {
                    // 부가세 포함: 총액에서 부가세를 제외한 공급가액 계산
                    supplyAmount = Math.round(item.total_price / 1.1);
                    taxAmount = item.total_price - supplyAmount;
                } else if (purchase.tax_option === 'excluded') {
                    // 부가세 미포함: 총액이 공급가액, 부가세 별도 계산
                    supplyAmount = item.total_price;
                    taxAmount = Math.round(item.total_price * 0.1);
                } else {
                    // 부가세 없음: 총액이 공급가액, 부가세 0
                    supplyAmount = item.total_price;
                    taxAmount = 0;
                }
                
                row.innerHTML = `
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6; font-weight: 600;">${purchase.purchase_code || '-'}</td>
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6;">${purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString('ko-KR') : '-'}</td>
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center;">
                        <span class="purchase-type purchase-type-${purchase.type}">
                            ${purchase.type === '구매' ? '🛒' : purchase.type === '반품' ? '↩️' : '💰'} ${purchase.type}
                        </span>
                    </td>
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: left; font-size: 12px; max-width: 200px;">
                        ${item.product_name || item.name || '상품명 없음'}
                    </td>
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: right;">${supplyAmount.toLocaleString('ko-KR')}원</td>
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: right;">${taxAmount.toLocaleString('ko-KR')}원</td>
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; color: #2196F3;">${item.total_price.toLocaleString('ko-KR')}원</td>
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center;">${purchase.payment_method || '-'}</td>
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center; font-weight: bold;">${item.quantity || 1}개</td>
                    <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center;">
                        <button onclick="editProductPurchase(${purchase.id}, '${(item.product_name || item.name || '상품명 없음').replace(/'/g, "\\'")}', ${item.quantity || 1}, ${item.unit_price || 0}, ${item.total_price || 0})" style="background: #ffc107; color: black; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 3px;">수정</button>
                        <button onclick="returnProduct(${purchase.id}, '${(item.product_name || item.name || '상품명 없음').replace(/'/g, "\\'")}', ${item.quantity || 1}, ${item.unit_price || 0}, ${item.total_price || 0})" style="background: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 3px;">반품</button>
                        <button onclick="deletePurchase(${purchase.id})" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            // 상품 정보가 없는 경우 기존 방식으로 표시
        const row = document.createElement('tr');
        
        // 부가세 계산 (tax_option에 따라 다르게 처리)
        let supplyAmount, taxAmount;
        
        if (purchase.tax_option === 'included') {
            // 부가세 포함: 총액에서 부가세를 제외한 공급가액 계산
            supplyAmount = Math.round(purchase.total_amount / 1.1);
            taxAmount = purchase.total_amount - supplyAmount;
        } else if (purchase.tax_option === 'excluded') {
            // 부가세 미포함: 총액이 공급가액, 부가세 별도 계산
            supplyAmount = purchase.total_amount;
            taxAmount = Math.round(purchase.total_amount * 0.1);
        } else {
            // 부가세 없음: 총액이 공급가액, 부가세 0
            supplyAmount = purchase.total_amount;
            taxAmount = 0;
        }
        
        row.innerHTML = `
            <td style="padding: 12px 8px; border: 1px solid #dee2e6; font-weight: 600;">${purchase.purchase_code || '-'}</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6;">${purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString('ko-KR') : '-'}</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center;">
                <span class="purchase-type purchase-type-${purchase.type}">
                    ${purchase.type === '구매' ? '🛒' : purchase.type === '반품' ? '↩️' : '💰'} ${purchase.type}
                </span>
            </td>
                <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: left; font-size: 12px; max-width: 200px;">
                    상품 정보 없음
                </td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: right;">${supplyAmount.toLocaleString('ko-KR')}원</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: right;">${taxAmount.toLocaleString('ko-KR')}원</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; color: #2196F3;">${purchase.total_amount.toLocaleString('ko-KR')}원</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center;">${purchase.payment_method || '-'}</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center; font-weight: bold;">${purchase.total_quantity || 0}개</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6; text-align: center;">
                <button onclick="viewPurchaseDetail(${purchase.id})" style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">상세</button>
                <button onclick="deletePurchase(${purchase.id})" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>
            </td>
        `;
        tbody.appendChild(row);
        }
    });
    
    // 페이지네이션 UI 업데이트
    updatePurchasePagination();
}

// 구매 이력 페이지네이션 UI 업데이트
function updatePurchasePagination() {
    const paginationContainer = document.getElementById('purchasePagination');
    if (!paginationContainer) {
        console.error('purchasePagination 요소를 찾을 수 없습니다!');
        return;
    }
    
    if (allPurchases.length === 0) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(allPurchases.length / purchasesPerPage);
    const startIndex = (currentPurchasePage - 1) * purchasesPerPage + 1;
    const endIndex = Math.min(currentPurchasePage * purchasesPerPage, allPurchases.length);
    
    let paginationHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div style="color: #666; font-size: 14px;">
                ${startIndex}-${endIndex} / 총 ${allPurchases.length}개
            </div>
            <div style="display: flex; gap: 5px; align-items: center;">
    `;
    
    // 이전 버튼
    if (currentPurchasePage > 1) {
        paginationHTML += `<button onclick="changePurchasePage(${currentPurchasePage - 1})" style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">이전</button>`;
    } else {
        paginationHTML += `<button disabled style="padding: 8px 12px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px; cursor: not-allowed; color: #999;">이전</button>`;
    }
    
    // 페이지 번호들
    const startPage = Math.max(1, currentPurchasePage - 2);
    const endPage = Math.min(totalPages, currentPurchasePage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPurchasePage) {
            paginationHTML += `<button style="padding: 8px 12px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">${i}</button>`;
        } else {
            paginationHTML += `<button onclick="changePurchasePage(${i})" style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">${i}</button>`;
        }
    }
    
    // 다음 버튼
    if (currentPurchasePage < totalPages) {
        paginationHTML += `<button onclick="changePurchasePage(${currentPurchasePage + 1})" style="padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">다음</button>`;
    } else {
        paginationHTML += `<button disabled style="padding: 8px 12px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px; cursor: not-allowed; color: #999;">다음</button>`;
    }
    
    paginationHTML += `
            </div>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

// 구매 이력 페이지 변경
function changePurchasePage(page) {
    const totalPages = Math.ceil(allPurchases.length / purchasesPerPage);
    if (page < 1 || page > totalPages) {
        return;
    }
    
    currentPurchasePage = page;
    displayPurchasesPage();
}

// 전역 함수로 노출
window.changePurchasePage = changePurchasePage;

// 특정 상품의 구매 이력 조회
async function viewProductPurchaseHistory(productName) {
    try {
        console.log('상품 구매 이력 조회:', productName);
        
        const response = await fetch(`/api/purchases/product-history?productName=${encodeURIComponent(productName)}`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            const purchases = result.data;
            
            let detailHTML = `
                <div style="padding: 20px;">
                    <h3>상품 구매 이력: ${productName}</h3>
                    <div style="margin-bottom: 20px;">
                        <strong>총 구매 건수:</strong> ${purchases.length}건<br>
                        <strong>총 구매 수량:</strong> ${purchases.reduce((sum, p) => sum + (p.quantity || 0), 0)}개<br>
                        <strong>총 구매 금액:</strong> ${purchases.reduce((sum, p) => sum + (p.total_price || 0), 0).toLocaleString('ko-KR')}원
                    </div>
                    <h4>구매 이력 목록</h4>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; border: 1px solid #ddd;">구매일</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">구매코드</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">고객명</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">수량</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">단가</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">금액</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">결제방법</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            purchases.forEach(purchase => {
                detailHTML += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString('ko-KR') : '-'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${purchase.purchase_code || '-'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${purchase.customer_name || '-'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${purchase.quantity || 0}개</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${(purchase.unit_price || 0).toLocaleString('ko-KR')}원</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${(purchase.total_price || 0).toLocaleString('ko-KR')}원</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${purchase.payment_method || '-'}</td>
                    </tr>
                `;
            });
            
            detailHTML += `
                        </tbody>
                    </table>
                </div>
            `;
            
            // 모달 생성 및 표시
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>상품 구매 이력</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${detailHTML}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="this.closest('.modal').remove()">닫기</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } else {
            showMessage('상품 구매 이력을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('상품 구매 이력 조회 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 특정 상품 구매 수정
async function editProductPurchase(purchaseId, productName, quantity, unitPrice, totalPrice) {
    try {
        console.log('상품 구매 수정:', { purchaseId, productName, quantity, unitPrice, totalPrice });
        
        // 상품 수정 모달 생성
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>상품 구매 수정</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editProductPurchaseForm">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">상품명</label>
                            <input type="text" id="editProductName" value="${productName}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" readonly>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">수량</label>
                                <input type="number" id="editProductQuantity" value="${quantity}" min="1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">단가 (원)</label>
                                <input type="number" id="editProductUnitPrice" value="${unitPrice}" min="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">총 금액 (원)</label>
                            <input type="number" id="editProductTotalPrice" value="${totalPrice}" min="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" readonly>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #495057;">자동 계산</h4>
                            <p style="margin: 0; font-size: 14px; color: #6c757d;">수량 × 단가 = 총 금액으로 자동 계산됩니다.</p>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="updateProductPurchase(${purchaseId}, '${productName.replace(/'/g, "\\'")}')" class="btn btn-primary">수정</button>
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-outline">취소</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 자동 계산 이벤트 리스너 추가
        const quantityInput = document.getElementById('editProductQuantity');
        const unitPriceInput = document.getElementById('editProductUnitPrice');
        const totalPriceInput = document.getElementById('editProductTotalPrice');
        
        function calculateTotal() {
            const qty = parseInt(quantityInput.value) || 0;
            const price = parseInt(unitPriceInput.value) || 0;
            const total = qty * price;
            totalPriceInput.value = total;
        }
        
        quantityInput.addEventListener('input', calculateTotal);
        unitPriceInput.addEventListener('input', calculateTotal);
        
    } catch (error) {
        console.error('상품 구매 수정 오류:', error);
        showMessage('상품 구매 수정 중 오류가 발생했습니다.', 'error');
    }
}

// 상품 구매 업데이트
async function updateProductPurchase(purchaseId, originalProductName) {
    try {
        const productName = document.getElementById('editProductName').value;
        const quantity = parseInt(document.getElementById('editProductQuantity').value);
        const unitPrice = parseInt(document.getElementById('editProductUnitPrice').value);
        const totalPrice = parseInt(document.getElementById('editProductTotalPrice').value);
        
        if (!productName || quantity <= 0 || unitPrice < 0 || totalPrice < 0) {
            showMessage('올바른 값을 입력해주세요.', 'error');
            return;
        }
        
        const response = await fetch(`/api/purchases/${purchaseId}/product`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                originalProductName,
                productName,
                quantity,
                unitPrice,
                totalPrice
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('상품 구매가 수정되었습니다.', 'success');
            document.querySelector('.modal').remove();
            loadCustomerData(); // 구매 이력 새로고침
            // 페이지네이션을 첫 페이지로 리셋
            currentPurchasePage = 1;
        } else {
            showMessage(result.message || '상품 구매 수정에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('상품 구매 업데이트 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 수정
async function editPurchase(purchaseId) {
    try {
        console.log('구매 이력 수정:', purchaseId);
        
        const response = await fetch(`/api/purchases/${purchaseId}`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            const purchase = result.data;
            
            // 수정 모달 생성
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2>구매 이력 수정</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editPurchaseForm">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">구매코드</label>
                                    <input type="text" id="editPurchaseCode" value="${purchase.purchase_code || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" readonly>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">구매일</label>
                                    <input type="date" id="editPurchaseDate" value="${purchase.purchase_date ? purchase.purchase_date.split('T')[0] : ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">구분</label>
                                    <select id="editPurchaseType" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                        <option value="구매" ${purchase.type === '구매' ? 'selected' : ''}>구매</option>
                                        <option value="판매" ${purchase.type === '판매' ? 'selected' : ''}>판매</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">결제방법</label>
                                    <select id="editPaymentMethod" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                        <option value="현금" ${purchase.payment_method === '현금' ? 'selected' : ''}>현금</option>
                                        <option value="카드" ${purchase.payment_method === '카드' ? 'selected' : ''}>카드</option>
                                        <option value="계좌이체" ${purchase.payment_method === '계좌이체' ? 'selected' : ''}>계좌이체</option>
                                        <option value="기타" ${purchase.payment_method === '기타' ? 'selected' : ''}>기타</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">상태</label>
                                    <select id="editPurchaseStatus" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                        <option value="완료" ${purchase.status === '완료' ? 'selected' : ''}>완료</option>
                                        <option value="진행중" ${purchase.status === '진행중' ? 'selected' : ''}>진행중</option>
                                        <option value="취소" ${purchase.status === '취소' ? 'selected' : ''}>취소</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">부가세 옵션</label>
                                    <select id="editTaxOption" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                        <option value="included" ${purchase.tax_option === 'included' ? 'selected' : ''}>부가세 포함</option>
                                        <option value="excluded" ${purchase.tax_option === 'excluded' ? 'selected' : ''}>부가세 미포함</option>
                                        <option value="none" ${purchase.tax_option === 'none' ? 'selected' : ''}>부가세 없음</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">메모</label>
                                <textarea id="editPurchaseNotes" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 80px;">${purchase.notes || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" onclick="updatePurchase(${purchaseId})" class="btn btn-primary">수정</button>
                        <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-outline">취소</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } else {
            showMessage('구매 이력을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('구매 이력 수정 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 업데이트
async function updatePurchase(purchaseId) {
    try {
        const formData = {
            purchase_date: document.getElementById('editPurchaseDate').value,
            type: document.getElementById('editPurchaseType').value,
            payment_method: document.getElementById('editPaymentMethod').value,
            status: document.getElementById('editPurchaseStatus').value,
            tax_option: document.getElementById('editTaxOption').value,
            notes: document.getElementById('editPurchaseNotes').value
        };
        
        const response = await fetch(`/api/purchases/${purchaseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('구매 이력이 수정되었습니다.', 'success');
            document.querySelector('.modal').remove();
            loadCustomerData(); // 구매 이력 새로고침
            // 페이지네이션을 첫 페이지로 리셋
            currentPurchasePage = 1;
        } else {
            showMessage(result.message || '구매 이력 수정에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('구매 이력 업데이트 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 상세보기
async function viewPurchaseDetail(purchaseId) {
    try {
        const response = await fetch(`/api/purchases/${purchaseId}`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        if (result.success) {
            const purchase = result.data;
            
            let detailHTML = `
                <div style="padding: 20px;">
                    <h3>구매 이력 상세</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                            <strong>구매코드:</strong> ${purchase.purchase_code || '-'}<br>
                            <strong>구매일:</strong> ${new Date(purchase.purchase_date).toLocaleDateString('ko-KR')}<br>
                            <strong>구분:</strong> ${purchase.type}<br>
                            <strong>결제방법:</strong> ${purchase.payment_method || '-'}
                        </div>
                        <div>
                            <strong>고객명:</strong> ${purchase.customer_name || '-'}<br>
                            <strong>총금액:</strong> ${purchase.total_amount.toLocaleString('ko-KR')}원<br>
                            <strong>상태:</strong> ${purchase.status}<br>
                            <strong>메모:</strong> ${purchase.notes || '-'}
                        </div>
                    </div>
                    <h4>구매 상품</h4>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                <thead>
                                    <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; border: 1px solid #ddd;">상품명</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">수량</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">단가</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">금액</th>
                                    </tr>
                                </thead>
                                <tbody>
            `;
            
            purchase.items.forEach(item => {
                detailHTML += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.product_name}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}개</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${item.unit_price.toLocaleString('ko-KR')}원</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${item.total_price.toLocaleString('ko-KR')}원</td>
                                        </tr>
                `;
            });
            
            detailHTML += `
                                </tbody>
                            </table>
                        </div>
            `;
            
            // 모달 생성 및 표시
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>구매 이력 상세</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${detailHTML}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="this.closest('.modal').remove()">닫기</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } else {
            showMessage('구매 이력 상세 조회에 실패했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('구매 이력 상세 조회 오류:', error);
        showMessage('구매 이력 상세 조회 중 오류가 발생했습니다.', 'error');
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
            showMessage('구매 이력이 성공적으로 삭제되었습니다.', 'success');
            loadCustomerData(); // 고객 데이터 다시 로드
            // 페이지네이션을 첫 페이지로 리셋
            currentPurchasePage = 1;
        } else {
            showMessage('구매 이력 삭제에 실패했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('구매 이력 삭제 오류:', error);
        showMessage('구매 이력 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 상품 반품 처리
async function returnProduct(purchaseId, productName, quantity, unitPrice, totalPrice) {
    try {
        console.log('상품 반품 처리:', { purchaseId, productName, quantity, unitPrice, totalPrice });
        
        // 반품 확인
        if (!confirm(`"${productName}" 상품을 반품하시겠습니까?\n수량: ${quantity}개\n금액: ${totalPrice.toLocaleString('ko-KR')}원`)) {
            return;
        }
        
        // 반품 모달 생성
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>상품 반품</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="returnProductForm">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">상품명</label>
                            <input type="text" id="returnProductName" value="${productName}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" readonly>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">반품 수량</label>
                                <input type="number" id="returnQuantity" value="${quantity}" min="1" max="${quantity}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">단가 (원)</label>
                                <input type="number" id="returnUnitPrice" value="${unitPrice}" min="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">반품 사유</label>
                            <select id="returnReason" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="선출고">선출고</option>
                                <option value="불량품">불량품</option>
                                <option value="고객변심">고객변심</option>
                                <option value="배송오류">배송오류</option>
                                <option value="기타">기타</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">반품 메모</label>
                            <textarea id="returnMemo" placeholder="반품 관련 추가 정보를 입력하세요..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 80px;"></textarea>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: #495057;">반품 정보</h4>
                            <p style="margin: 0; font-size: 14px; color: #6c757d;">
                                반품 처리 시 해당 상품의 재고가 증가하고, 반품 이력이 기록됩니다.
                            </p>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="processReturn(${purchaseId}, '${productName.replace(/'/g, "\\'")}')" class="btn btn-primary">반품 처리</button>
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-outline">취소</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('상품 반품 오류:', error);
        showMessage('상품 반품 중 오류가 발생했습니다.', 'error');
    }
}

// 반품 처리 실행
async function processReturn(purchaseId, originalProductName) {
    try {
        const productName = document.getElementById('returnProductName').value;
        const quantity = parseInt(document.getElementById('returnQuantity').value);
        const unitPrice = parseInt(document.getElementById('returnUnitPrice').value);
        const reason = document.getElementById('returnReason').value;
        const memo = document.getElementById('returnMemo').value;
        
        if (!productName || quantity <= 0 || unitPrice < 0) {
            showMessage('올바른 값을 입력해주세요.', 'error');
            return;
        }
        
        const returnData = {
            purchaseId,
            originalProductName,
            productName,
            quantity,
            unitPrice,
            totalPrice: quantity * unitPrice,
            reason,
            memo,
            customerId: currentCustomerId
        };
        
        const response = await fetch('/api/purchases/return', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(returnData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('상품 반품이 처리되었습니다.', 'success');
            document.querySelector('.modal').remove();
            loadCustomerData(); // 구매 이력 새로고침
            // 페이지네이션을 첫 페이지로 리셋
            currentPurchasePage = 1;
        } else {
            showMessage(result.message || '상품 반품 처리에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('반품 처리 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 폼 제출 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
    const purchaseForm = document.getElementById('purchaseForm');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', addPurchase);
    }
});
