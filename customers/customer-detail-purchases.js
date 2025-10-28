// 구매 이력 관련 기능

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
            `<div class="suggestion-item" onclick="selectProduct(this, '${product.id}', '${product.name}')">${product.name}</div>`
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
    
    // 가격 힌트 표시
    const product = window.products.find(p => p.id == productId);
    if (product) {
        const priceInput = container.parentElement.querySelector('input[name="itemUnitPrice"]');
        priceInput.placeholder = `권장가격: ${product.price.toLocaleString('ko-KR')}원`;
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
    const tbody = document.getElementById('purchasesTableBody');
    
    if (!tbody) {
        console.error('purchasesTableBody 요소를 찾을 수 없습니다!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (purchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #666;">구매 이력이 없습니다.</td></tr>';
        return;
    }
    
    purchases.forEach(purchase => {
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
                <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    🛒 ${purchase.type}
                </span>
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
    });
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
        } else {
            showMessage('구매 이력 삭제에 실패했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('구매 이력 삭제 오류:', error);
        showMessage('구매 이력 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 폼 제출 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
    const purchaseForm = document.getElementById('purchaseForm');
    if (purchaseForm) {
        purchaseForm.addEventListener('submit', addPurchase);
    }
});
