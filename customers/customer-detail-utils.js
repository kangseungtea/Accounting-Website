// 고객 상세 정보 유틸리티 함수들

// 구매 이력 수정
async function editPurchase(purchaseId) {
    try {
        const response = await fetch(`/api/purchases/${purchaseId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('구매 이력을 불러올 수 없습니다.');
        }
        
        const result = await response.json();
        
        if (result.success) {
            const purchase = result.data;
            
            // 구매 이력 수정 모달 생성
            const modal = document.createElement('div');
            modal.id = 'editPurchaseModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            
            // 안전한 날짜 처리
            const formatDateForInput = (dateStr) => {
                if (!dateStr) return new Date().toISOString().split('T')[0];
                try {
                    const date = new Date(dateStr);
                    if (isNaN(date.getTime())) {
                        return new Date().toISOString().split('T')[0];
                    }
                    return date.toISOString().split('T')[0];
                } catch (e) {
                    return new Date().toISOString().split('T')[0];
                }
            };
            
            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 8px;
                    padding: 30px;
                    max-width: 800px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #e9ecef;
                        padding-bottom: 15px;
                    ">
                        <h2 style="margin: 0; color: #333;">구매 이력 수정</h2>
                        <button onclick="closeEditPurchaseModal()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #666;
                        ">&times;</button>
                    </div>
                    
                    <form id="editPurchaseForm">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label for="editPurchaseCode">구매코드:</label>
                                <input type="text" id="editPurchaseCode" name="purchaseCode" value="${purchase.purchase_code || ''}" readonly>
                            </div>
                            <div>
                                <label for="editPurchaseDate">구매일:</label>
                                <input type="date" id="editPurchaseDate" name="purchaseDate" value="${formatDateForInput(purchase.purchase_date)}" required>
                            </div>
                            <div>
                                <label for="editPurchaseType">구분:</label>
                                <select id="editPurchaseType" name="purchaseType" required>
                                    <option value="">선택하세요</option>
                                    <option value="구매" ${purchase.type === '구매' ? 'selected' : ''}>구매</option>
                                    <option value="판매" ${purchase.type === '판매' ? 'selected' : ''}>판매</option>
                                    <option value="선출고" ${purchase.type === '선출고' ? 'selected' : ''}>선출고</option>
                                </select>
                            </div>
                            <div>
                                <label for="editPaymentMethod">결제방법:</label>
                                <select id="editPaymentMethod" name="paymentMethod" required>
                                    <option value="">선택하세요</option>
                                    <option value="현금" ${purchase.payment_method === '현금' ? 'selected' : ''}>현금</option>
                                    <option value="카드" ${purchase.payment_method === '카드' ? 'selected' : ''}>카드</option>
                                    <option value="계좌이체" ${purchase.payment_method === '계좌이체' ? 'selected' : ''}>계좌이체</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>상품 목록 (수정)</label>
                            <div id="editItemsList">
                                <!-- 기존 상품 목록이 여기에 표시됩니다 -->
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label for="editPurchaseNotes">비고:</label>
                            <textarea id="editPurchaseNotes" name="purchaseNotes" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">${purchase.notes || ''}</textarea>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <button type="submit" class="btn btn-primary" style="margin-right: 10px;">수정</button>
                            <button type="button" onclick="closeEditPurchaseModal()" class="btn btn-secondary">취소</button>
                        </div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 상품 목록 채우기
            const itemsList = document.getElementById('editItemsList');
            itemsList.innerHTML = '';

            // 안전한 배열 처리
            const items = purchase.items || []; // purchase.items가 없으면 빈 배열 사용

            if (items.length > 0) {
                items.forEach((item, index) => {
                    const itemRow = document.createElement('div');
                    itemRow.className = 'item-row';

                    // 안전한 값 처리
                    const safeName = item.name || '';
                    const safeQuantity = item.quantity || 1;
                    const safeUnitPrice = item.unit_price || item.unitPrice || 0; // unit_price 또는 unitPrice 모두 지원

                    itemRow.innerHTML = `
                        <div class="item-field item-name" style="flex: 2; display: flex; flex-direction: column;">
                            <input type="text" name="itemName" placeholder="상품명" list="productList" required style="width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 14px; background: #f8f9fa; box-sizing: border-box;" value="${safeName}">
                        </div>
                        <div class="item-field item-quantity" style="flex: 1; display: flex; flex-direction: column;">
                            <input type="number" name="itemQuantity" placeholder="수량" min="1" required style="width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 14px; background: #f8f9fa; box-sizing: border-box;" value="${safeQuantity}">
                        </div>
                        <div class="item-field item-price" style="flex: 1.5; display: flex; flex-direction: column;">
                            <input type="number" name="itemUnitPrice" placeholder="단가" min="0" required style="width: 100%; padding: 12px 15px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 14px; background: #f8f9fa; box-sizing: border-box;" value="${safeUnitPrice}">
                        </div>
                        <div class="item-field item-info" style="flex: 0 0 auto; width: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                            <small style="color: #666; font-size: 10px;">수정 가능</small>
                        </div>
                    `;
                    itemsList.appendChild(itemRow);
                });
            } else {
                // 상품이 없는 경우 안내 메시지 표시
                const noItemsMessage = document.createElement('div');
                noItemsMessage.className = 'no-items-message';
                noItemsMessage.style.cssText = 'text-align: center; padding: 20px; color: #666; font-style: italic; background: #f8f9fa; border: 1px dashed #ddd; border-radius: 8px;';
                noItemsMessage.innerHTML = '이 구매 이력에는 상품이 없습니다.<br><small>새 구매 이력을 추가하려면 "구매 이력 추가" 버튼을 사용하세요.</small>';
                itemsList.appendChild(noItemsMessage);
            }
            
            // 폼 제출 이벤트
            document.getElementById('editPurchaseForm').addEventListener('submit', (e) => updatePurchase(e, purchaseId));
            
        } else {
            showMessage('구매 이력을 불러오는데 실패했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('구매 이력 수정 오류:', error);
        showMessage('구매 이력을 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 수정 모달 닫기
function closeEditPurchaseModal() {
    const modal = document.getElementById('editPurchaseModal');
    if (modal) {
        modal.remove();
    }
}

// 구매 이력 수정
async function updatePurchase(event, purchaseId) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const items = [];
        
        // 상품 목록 수집
        const itemRows = document.querySelectorAll('#editItemsList .item-row');
        itemRows.forEach(row => {
            const name = row.querySelector('input[name="itemName"]').value;
            const quantity = parseInt(row.querySelector('input[name="itemQuantity"]').value) || 0;
            const unitPrice = parseInt(row.querySelector('input[name="itemUnitPrice"]').value) || 0;
            
            if (name && quantity > 0 && unitPrice >= 0) {
                items.push({
                    name: name,
                    quantity: quantity,
                    unit_price: unitPrice,
                    total_price: quantity * unitPrice
                });
            }
        });
        
        if (items.length === 0) {
            showMessage('최소 하나의 상품을 입력해주세요.', 'error');
            return;
        }
        
        // 총 금액 계산
        const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
        
        const purchaseData = {
            purchase_code: formData.get('purchaseCode'),
            purchase_date: formData.get('purchaseDate'),
            type: formData.get('purchaseType'),
            payment_method: formData.get('paymentMethod'),
            total_amount: totalAmount,
            notes: formData.get('purchaseNotes'),
            customer_id: currentCustomerId,
            items: items
        };
        
        console.log('구매 수정 요청 데이터:', purchaseData);
        
        const response = await fetch(`/api/purchases/${purchaseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(purchaseData),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showMessage('구매 이력이 수정되었습니다.', 'success');
            closeEditPurchaseModal();
            loadCustomerData(); // 페이지 새로고침
        } else {
            showMessage('구매 이력 수정에 실패했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('구매 이력 수정 오류:', error);
        showMessage('구매 이력을 수정하는 중 오류가 발생했습니다.', 'error');
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
        
        if (response.ok && result.success) {
            showMessage('구매 이력이 삭제되었습니다.', 'success');
            loadCustomerData(); // 페이지 새로고침
        } else {
            showMessage('구매 이력 삭제에 실패했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('구매 이력 삭제 오류:', error);
        showMessage('구매 이력을 삭제하는 중 오류가 발생했습니다.', 'error');
    }
}

// 방문 이력 수정
async function editVisit(visitId) {
    // 방문 이력 수정 기능 구현
    console.log('방문 이력 수정:', visitId);
    showMessage('방문 이력 수정 기능은 구현 중입니다.', 'info');
}

// 방문 이력 삭제
async function deleteVisit(visitId) {
    if (!confirm('정말로 이 방문 이력을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/visits/${visitId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showMessage('방문 이력이 삭제되었습니다.', 'success');
            loadCustomerData(); // 페이지 새로고침
        } else {
            showMessage('방문 이력 삭제에 실패했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('방문 이력 삭제 오류:', error);
        showMessage('방문 이력을 삭제하는 중 오류가 발생했습니다.', 'error');
    }
}


