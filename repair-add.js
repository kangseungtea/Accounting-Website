// 수리 이력 추가 관련 함수들

// currentCustomerId 전역 변수 확인
if (typeof currentCustomerId === 'undefined') {
    console.error('currentCustomerId가 정의되지 않았습니다. customer-detail.js가 먼저 로드되어야 합니다.');
}

// 수리 이력 추가
function addRepair() {
    console.log('addRepair 함수 호출됨, currentCustomerId:', currentCustomerId);
    
    // currentCustomerId 확인
    if (!currentCustomerId) {
        // URL에서 다시 가져오기 시도
        const urlParams = new URLSearchParams(window.location.search);
        currentCustomerId = urlParams.get('id');
        console.log('URL에서 재확인한 currentCustomerId:', currentCustomerId);
        
        if (!currentCustomerId) {
            showMessage('고객 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.', 'error');
            return;
        }
    }
    
    // 모달 제목 설정
    document.getElementById('repairModalTitle').textContent = '수리 이력 추가';
    
    // 폼 초기화
    document.getElementById('repairForm').reset();
    document.getElementById('repairDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('deviceModel').value = '';
    document.getElementById('problem').value = '';
    document.getElementById('solution').value = '';
    
    // 부품 목록 초기화
    loadPartsData([]);
    
    // 인건비 목록 초기화
    loadLaborData([]);
    
    document.getElementById('warranty').value = '';
    document.getElementById('repairTechnician').value = '';
    document.getElementById('repairStatus').value = '완료';
    
    // 부가세 옵션 초기화
    const vatIncludedRadio = document.querySelector('input[name="vatOption"][value="included"]');
    if (vatIncludedRadio) {
        vatIncludedRadio.checked = true;
    }
    
    // 총 수리 비용 초기화 (loadPartsData와 loadLaborData에서 이미 호출됨)
    // 추가로 한 번 더 호출하여 확실히 업데이트
    setTimeout(() => {
        updateTotalRepairCost();
    }, 200);
    
    // 모델명 필드에 포커스 및 입력 이벤트 리스너 추가
    setTimeout(() => {
        const deviceModelInput = document.getElementById('deviceModel');
        deviceModelInput.focus();
        
        // 입력 내용 실시간 표시 확인
        deviceModelInput.addEventListener('input', function() {
            console.log('모델명 입력:', this.value);
        });
    }, 100);
    
    // 수정 모드 속성 제거
    document.getElementById('repairForm').removeAttribute('data-repair-id');
    document.getElementById('repairModal').style.display = 'flex';
    
    // 스마트 기능 초기화
    initializeSmartFeatures();
    initializeModalDrag();
    
    // 전체 폼에 엔터 키 네비게이션 추가
    initializeFormNavigation();
}

// 수리 이력 모달 닫기
function closeRepairModal() {
    const modal = document.getElementById('repairModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 부품 추가
function addPart() {
    const partsList = document.getElementById('partsList');
    if (!partsList) {
        console.error('partsList 요소를 찾을 수 없습니다.');
        return;
    }
    
    const partRow = document.createElement('div');
    partRow.className = 'part-row';
    partRow.innerHTML = `
        <div class="autocomplete-container">
            <input type="text" name="partName" placeholder="부품명 입력..." autocomplete="off" onkeyup="filterParts(this)" onfocus="showPartsSuggestions(this)" onblur="hidePartsSuggestions(this)">
            <div class="autocomplete-suggestions" style="display: none;"></div>
        </div>
        <input type="number" name="partQuantity" placeholder="수량" min="1" value="1" onchange="updatePartsCalculation()" oninput="updatePartsCalculation()">
        <input type="number" name="partUnitPrice" placeholder="단가" min="0" onchange="updatePartsCalculation()" oninput="updatePartsCalculation()" onfocus="showPriceHint(this)" onblur="hidePriceHint(this)">
        <span class="part-total" style="min-width: 80px; text-align: right; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">0원</span>
        <button type="button" onclick="removePart(this)" class="btn btn-danger" style="padding: 8px 12px;">삭제</button>
    `;
    
    partsList.appendChild(partRow);
    
    // 계산 업데이트
    updatePartsCalculation();
    
    // 총 수리 비용 업데이트
    updateTotalRepairCost();
}

// 부품 삭제
function removePart(button) {
    const partRow = button.closest('.part-row');
    if (partRow) {
        partRow.remove();
        
        // 계산 업데이트
        updatePartsCalculation();
        
        // 총 수리 비용 업데이트
        updateTotalRepairCost();
    }
}

// 부품 계산 업데이트
function updatePartsCalculation() {
    const partRows = document.querySelectorAll('.part-row');
    let total = 0;
    
    partRows.forEach(row => {
        const quantityInput = row.querySelector('input[name="partQuantity"]');
        const unitPriceInput = row.querySelector('input[name="partUnitPrice"]');
        const totalSpan = row.querySelector('.part-total');
        
        if (quantityInput && unitPriceInput && totalSpan) {
            const quantity = parseInt(quantityInput.value) || 0;
            const unitPrice = parseInt(unitPriceInput.value) || 0;
            const rowTotal = quantity * unitPrice;
            
            totalSpan.textContent = rowTotal.toLocaleString('ko-KR') + '원';
            total += rowTotal;
        }
    });
    
    // 부품 총액 업데이트
    const partsTotalAmount = document.getElementById('partsTotalAmount');
    if (partsTotalAmount) {
        partsTotalAmount.textContent = total.toLocaleString('ko-KR') + '원';
    }
    
    // 총 수리 비용 업데이트
    updateTotalRepairCost();
}

// 인건비 추가
function addLabor() {
    const laborList = document.getElementById('laborList');
    if (!laborList) {
        console.error('laborList 요소를 찾을 수 없습니다.');
        return;
    }
    
    const laborRow = document.createElement('div');
    laborRow.className = 'labor-row';
    laborRow.innerHTML = `
        <input type="text" name="laborDescription" placeholder="작업 내용...">
        <input type="number" name="laborAmount" placeholder="금액" min="0" onchange="updateLaborCalculation()" oninput="updateLaborCalculation()">
        <span class="labor-total" style="min-width: 80px; text-align: right; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">0원</span>
        <button type="button" onclick="removeLabor(this)" class="btn btn-danger" style="padding: 8px 12px;">삭제</button>
    `;
    
    laborList.appendChild(laborRow);
    
    // 계산 업데이트
    updateLaborCalculation();
    
    // 총 수리 비용 업데이트
    updateTotalRepairCost();
}

// 인건비 삭제
function removeLabor(button) {
    const laborRow = button.closest('.labor-row');
    if (laborRow) {
        laborRow.remove();
        
        // 계산 업데이트
        updateLaborCalculation();
        
        // 총 수리 비용 업데이트
        updateTotalRepairCost();
    }
}

// 인건비 계산 업데이트
function updateLaborCalculation() {
    const laborRows = document.querySelectorAll('.labor-row');
    let total = 0;
    
    laborRows.forEach(row => {
        const amountInput = row.querySelector('input[name="laborAmount"]');
        const totalSpan = row.querySelector('.labor-total');
        
        if (amountInput && totalSpan) {
            const amount = parseInt(amountInput.value) || 0;
            
            totalSpan.textContent = amount.toLocaleString('ko-KR') + '원';
            total += amount;
        }
    });
    
    // 인건비 총액 업데이트
    const laborTotalAmount = document.getElementById('laborTotalAmount');
    if (laborTotalAmount) {
        laborTotalAmount.textContent = total.toLocaleString('ko-KR') + '원';
    }
    
    // 총 수리 비용 업데이트
    updateTotalRepairCost();
}

// 부품 데이터 로드
function loadPartsData(partsData) {
    const partsList = document.getElementById('partsList');
    if (!partsList) {
        console.error('partsList 요소를 찾을 수 없습니다.');
        return;
    }
    
    partsList.innerHTML = '';
    
    if (partsData && partsData.length > 0) {
        // 부품 데이터가 객체 배열인 경우 (수량, 단가 포함)
        if (typeof partsData[0] === 'object' && partsData[0].name) {
            partsData.forEach((part, index) => {
                const partRow = document.createElement('div');
                partRow.className = 'part-row';
                partRow.innerHTML = `
                    <div class="autocomplete-container">
                        <input type="text" name="partName" placeholder="부품명 입력..." autocomplete="off" onkeyup="filterParts(this)" onfocus="showPartsSuggestions(this)" onblur="hidePartsSuggestions(this)" value="${part.name || ''}">
                        <div class="autocomplete-suggestions" style="display: none;"></div>
                    </div>
                    <input type="number" name="partQuantity" placeholder="수량" min="1" value="${part.quantity || 1}" onchange="updatePartsCalculation()" oninput="updatePartsCalculation()">
                    <input type="number" name="partUnitPrice" placeholder="단가" min="0" value="${part.unitPrice || 0}" onchange="updatePartsCalculation()" oninput="updatePartsCalculation()" onfocus="showPriceHint(this)" onblur="hidePriceHint(this)">
                    <span class="part-total" style="min-width: 80px; text-align: right; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">0원</span>
                    <button type="button" onclick="removePart(this)" class="btn btn-danger" style="padding: 8px 12px;">삭제</button>
                `;
                partsList.appendChild(partRow);
            });
        } else {
            // 부품 데이터가 문자열 배열인 경우 (기존 형식)
            partsData.forEach((partName, index) => {
                const partRow = document.createElement('div');
                partRow.className = 'part-row';
                partRow.innerHTML = `
                    <div class="autocomplete-container">
                        <input type="text" name="partName" placeholder="부품명 입력..." autocomplete="off" onkeyup="filterParts(this)" onfocus="showPartsSuggestions(this)" onblur="hidePartsSuggestions(this)" value="${partName}">
                        <div class="autocomplete-suggestions" style="display: none;"></div>
                    </div>
                    <input type="number" name="partQuantity" placeholder="수량" min="1" value="1" onchange="updatePartsCalculation()" oninput="updatePartsCalculation()">
                    <input type="number" name="partUnitPrice" placeholder="단가" min="0" onchange="updatePartsCalculation()" oninput="updatePartsCalculation()" onfocus="showPriceHint(this)" onblur="hidePriceHint(this)">
                    <span class="part-total" style="min-width: 80px; text-align: right; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">0원</span>
                    <button type="button" onclick="removePart(this)" class="btn btn-danger" style="padding: 8px 12px;">삭제</button>
                `;
                partsList.appendChild(partRow);
            });
        }
    } else {
        // 부품 데이터가 없는 경우 기본 행 하나 추가
        const partRow = document.createElement('div');
        partRow.className = 'part-row';
        partRow.innerHTML = `
            <div class="autocomplete-container">
                <input type="text" name="partName" placeholder="부품명 입력..." autocomplete="off" onkeyup="filterParts(this)" onfocus="showPartsSuggestions(this)" onblur="hidePartsSuggestions(this)">
                <div class="autocomplete-suggestions" style="display: none;"></div>
            </div>
            <input type="number" name="partQuantity" placeholder="수량" min="1" value="1" onchange="updatePartsCalculation()" oninput="updatePartsCalculation()">
            <input type="number" name="partUnitPrice" placeholder="단가" min="0" onchange="updatePartsCalculation()" oninput="updatePartsCalculation()" onfocus="showPriceHint(this)" onblur="hidePriceHint(this)">
            <span class="part-total" style="min-width: 80px; text-align: right; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">0원</span>
            <button type="button" onclick="removePart(this)" class="btn btn-danger" style="padding: 8px 12px;">삭제</button>
        `;
        partsList.appendChild(partRow);
    }
    
    // 계산 업데이트
    updatePartsCalculation();
    
    // 총 수리 비용 업데이트
    updateTotalRepairCost();
}

// 인건비 데이터 로드
function loadLaborData(laborData) {
    const laborList = document.getElementById('laborList');
    if (!laborList) {
        console.error('laborList 요소를 찾을 수 없습니다.');
        return;
    }
    
    laborList.innerHTML = '';
    
    if (laborData && laborData.length > 0) {
        // 인건비 데이터가 객체 배열인 경우 (시간, 시급 포함)
        if (typeof laborData[0] === 'object' && laborData[0].description) {
            console.log('새로운 형식의 인건비 데이터 로드:', laborData);
            laborData.forEach((labor, index) => {
                const laborRow = document.createElement('div');
                laborRow.className = 'labor-row';
                laborRow.innerHTML = `
                    <input type="text" name="laborDescription" placeholder="작업 내용..." value="${labor.description || ''}">
                    <input type="number" name="laborAmount" placeholder="금액" min="0" value="${labor.amount || 0}" onchange="updateLaborCalculation()" oninput="updateLaborCalculation()">
                    <span class="labor-total" style="min-width: 80px; text-align: right; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">0원</span>
                    <button type="button" onclick="removeLabor(this)" class="btn btn-danger" style="padding: 8px 12px;">삭제</button>
                `;
                laborList.appendChild(laborRow);
            });
        } else {
            // 인건비 데이터가 숫자인 경우 (기존 형식)
            console.log('기존 형식의 인건비 데이터 로드:', laborData);
            const laborRow = document.createElement('div');
            laborRow.className = 'labor-row';
            laborRow.innerHTML = `
                <input type="text" name="laborDescription" placeholder="작업 내용..." value="수리 작업">
                <input type="number" name="laborAmount" placeholder="금액" min="0" value="${laborData}" onchange="updateLaborCalculation()" oninput="updateLaborCalculation()">
                <span class="labor-total" style="min-width: 80px; text-align: right; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">0원</span>
                <button type="button" onclick="removeLabor(this)" class="btn btn-danger" style="padding: 8px 12px;">삭제</button>
            `;
            laborList.appendChild(laborRow);
        }
    } else {
        // 인건비 데이터가 없는 경우 기본 행 하나 추가
        const laborRow = document.createElement('div');
        laborRow.className = 'labor-row';
        laborRow.innerHTML = `
            <input type="text" name="laborDescription" placeholder="작업 내용...">
            <input type="number" name="laborAmount" placeholder="금액" min="0" onchange="updateLaborCalculation()" oninput="updateLaborCalculation()">
            <span class="labor-total" style="min-width: 80px; text-align: right; padding: 8px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">0원</span>
            <button type="button" onclick="removeLabor(this)" class="btn btn-danger" style="padding: 8px 12px;">삭제</button>
        `;
        laborList.appendChild(laborRow);
    }
    
    // 계산 업데이트
    updateLaborCalculation();
    
    // 총 수리 비용 업데이트
    updateTotalRepairCost();
}

// 총 수리 비용 업데이트
function updateTotalRepairCost() {
    console.log('=== updateTotalRepairCost 함수 호출됨 ===');
    
    // 부품 총액 계산
    const partRows = document.querySelectorAll('.part-row');
    let partsTotal = 0;
    console.log('부품 행 개수:', partRows.length);
    
    partRows.forEach((row, index) => {
        const quantityInput = row.querySelector('input[name="partQuantity"]');
        const unitPriceInput = row.querySelector('input[name="partUnitPrice"]');
        if (quantityInput && unitPriceInput) {
            const quantity = parseInt(quantityInput.value) || 0;
            const unitPrice = parseInt(unitPriceInput.value) || 0;
            const total = quantity * unitPrice;
            partsTotal += total;
            console.log(`부품 ${index + 1}: 수량=${quantity}, 단가=${unitPrice}, 총액=${total}`);
        } else {
            console.log(`부품 ${index + 1}: 입력 필드를 찾을 수 없음`);
        }
    });
    
    // 인건비 총액 계산
    const laborRows = document.querySelectorAll('.labor-row');
    let laborTotal = 0;
    console.log('인건비 행 개수:', laborRows.length);
    
    laborRows.forEach((row, index) => {
        const amountInput = row.querySelector('input[name="laborAmount"]');
        if (amountInput) {
            const amount = parseInt(amountInput.value) || 0;
            laborTotal += amount;
            console.log(`인건비 ${index + 1}: 금액=${amount}`);
        } else {
            console.log(`인건비 ${index + 1}: 입력 필드를 찾을 수 없음`);
        }
    });
    
    // 기본 금액 (부품비 + 인건비)
    const baseAmount = partsTotal + laborTotal;
    
    // 부가세 옵션 확인
    const vatOption = document.querySelector('input[name="vatOption"]:checked');
    const vatType = vatOption ? vatOption.value : 'included';
    
    let totalRepairCost, supplyAmount, vatAmount, vatDescription;
    
    if (vatType === 'included') {
        // 부가세 포함: 기본 금액이 이미 부가세 포함된 금액
        totalRepairCost = baseAmount;
        supplyAmount = Math.round(baseAmount / 1.1);
        vatAmount = baseAmount - supplyAmount;
        vatDescription = '부품비 + 인건비 (부가세 포함)';
    } else if (vatType === 'excluded') {
        // 부가세 미포함: 기본 금액에 부가세 추가
        supplyAmount = baseAmount;
        vatAmount = Math.round(baseAmount * 0.1);
        totalRepairCost = supplyAmount + vatAmount;
        vatDescription = '부품비 + 인건비 (부가세 미포함)';
    } else {
        // 부가세 없음: 기본 금액 그대로
        totalRepairCost = baseAmount;
        supplyAmount = baseAmount;
        vatAmount = 0;
        vatDescription = '부품비 + 인건비 (부가세 없음)';
    }
    
    console.log(`=== 계산 결과 ===`);
    console.log(`부품 총액: ${partsTotal}`);
    console.log(`인건비 총액: ${laborTotal}`);
    console.log(`기본 금액: ${baseAmount}`);
    console.log(`부가세 옵션: ${vatType}`);
    console.log(`공급가액: ${supplyAmount}`);
    console.log(`부가세: ${vatAmount}`);
    console.log(`총 수리 비용: ${totalRepairCost}`);
    
    // 총 수리 비용 표시
    const totalRepairCostElement = document.getElementById('totalRepairCost');
    if (totalRepairCostElement) {
        totalRepairCostElement.textContent = totalRepairCost.toLocaleString('ko-KR') + '원';
        console.log('총 수리 비용 업데이트 완료:', totalRepairCost.toLocaleString('ko-KR') + '원');
    } else {
        console.error('totalRepairCost 요소를 찾을 수 없습니다.');
    }
    
    // 부가세 설명 업데이트
    const vatDescriptionElement = document.getElementById('vatDescription');
    if (vatDescriptionElement) {
        vatDescriptionElement.textContent = vatDescription;
    }
    
    // 공급가액 표시
    const supplyAmountElement = document.getElementById('supplyAmount');
    if (supplyAmountElement) {
        supplyAmountElement.textContent = supplyAmount.toLocaleString('ko-KR') + '원';
    }
    
    // 부가세 섹션 표시/숨김
    const vatSectionElement = document.getElementById('vatSection');
    const vatAmountElement = document.getElementById('vatAmount');
    
    if (vatSectionElement && vatAmountElement) {
        if (vatType === 'excluded') {
            // 부가세 미포함: 부가세 섹션 표시
            vatSectionElement.style.display = 'block';
            vatAmountElement.textContent = vatAmount.toLocaleString('ko-KR') + '원';
        } else if (vatType === 'included') {
            // 부가세 포함: 부가세 섹션 표시
            vatSectionElement.style.display = 'block';
            vatAmountElement.textContent = vatAmount.toLocaleString('ko-KR') + '원';
        } else {
            // 부가세 없음: 부가세 섹션 숨김
            vatSectionElement.style.display = 'none';
        }
    }
    
    console.log('=== updateTotalRepairCost 함수 종료 ===');
}

// 부품 자동완성 초기화
function initializePartsAutoComplete() {
    const partsInputs = document.querySelectorAll('input[name="partName"]');
    partsInputs.forEach(input => {
        // 이미 이벤트 리스너가 추가되었는지 확인
        if (!input.hasAttribute('data-listener-added')) {
            input.addEventListener('keyup', (e) => filterParts(e.target));
            input.addEventListener('focus', (e) => showPartsSuggestions(e.target));
            input.addEventListener('blur', (e) => hidePartsSuggestions(e.target));
            input.setAttribute('data-listener-added', 'true');
        }
    });
}

// 부품 필터링
function filterParts(input) {
    const value = input.value.toLowerCase().trim();
    const suggestions = input.parentElement.querySelector('.autocomplete-suggestions');
    
    if (value.length < 1) {
        suggestions.style.display = 'none';
        return;
    }
    
    // 쉼표로 구분된 여러 부품명 처리
    const parts = value.split(',').map(part => part.trim()).filter(part => part.length > 0);
    const lastPart = parts[parts.length - 1];
    
    if (lastPart.length < 1) {
        suggestions.style.display = 'none';
        return;
    }
    
    // 제품 데이터에서 필터링
    const filteredProducts = window.products.filter(product => 
        product.name.toLowerCase().includes(lastPart)
    ).slice(0, 5); // 최대 5개만 표시
    
    if (filteredProducts.length > 0) {
        displayPartsSuggestions(suggestions, filteredProducts, input);
    } else {
        suggestions.style.display = 'none';
    }
}

// 부품 제안 표시
function displayPartsSuggestions(suggestions, products, input) {
    suggestions.innerHTML = '';
    
    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
            <div style="font-weight: bold;">${product.name}</div>
            <div style="font-size: 12px; color: #666;">${product.price.toLocaleString('ko-KR')}원</div>
        `;
        div.addEventListener('click', () => selectPart(input, product));
        suggestions.appendChild(div);
    });
    
    suggestions.style.display = 'block';
}

// 부품 선택
function selectPart(input, product) {
    const value = input.value;
    const parts = value.split(',').map(part => part.trim());
    parts[parts.length - 1] = product.name;
    
    input.value = parts.join(', ');
    input.parentElement.querySelector('.autocomplete-suggestions').style.display = 'none';
    
    // 단가 자동 입력
    const unitPriceInput = input.closest('.part-row').querySelector('input[name="partUnitPrice"]');
    if (unitPriceInput) {
        unitPriceInput.value = product.price;
        updatePartsCalculation();
    }
}

// 부품 제안 숨기기
function hidePartsSuggestions(input) {
    setTimeout(() => {
        const suggestions = input.parentElement.querySelector('.autocomplete-suggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }, 200);
}

// 부품 제안 표시
function showPartsSuggestions(input) {
    if (input.value.trim().length > 0) {
        filterParts(input);
    }
}

// 가격 힌트 표시
function showPriceHint(input) {
    const hint = input.getAttribute('data-original-price');
    if (hint) {
        input.placeholder = `원가: ${parseInt(hint).toLocaleString('ko-KR')}원`;
    }
}

// 가격 힌트 숨기기
function hidePriceHint(input) {
    input.placeholder = '단가';
}

// 스마트 기능 초기화
function initializeSmartFeatures() {
    initializePartsAutoComplete();
}

// 모달 드래그 초기화
function initializeModalDrag() {
    const modal = document.getElementById('repairModal');
    const header = modal.querySelector('.modal-header');
    
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = modal.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        header.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        modal.style.left = (initialX + deltaX) + 'px';
        modal.style.top = (initialY + deltaY) + 'px';
        modal.style.transform = 'none';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'grab';
        }
    });
}

// 폼 네비게이션 초기화
function initializeFormNavigation() {
    const form = document.getElementById('repairForm');
    const fieldOrder = [
        'repairDate', 'repairTechnician', 'repairStatus', 'warranty',
        'deviceModel', 'problem', 'solution'
    ];
    
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            const currentField = e.target;
            const currentIndex = fieldOrder.indexOf(currentField.name);
            
            if (currentIndex !== -1 && currentIndex < fieldOrder.length - 1) {
                const nextFieldName = fieldOrder[currentIndex + 1];
                const nextField = form.querySelector(`[name="${nextFieldName}"]`);
                
                if (nextField) {
                    nextField.focus();
                }
            }
        }
    });
}

// 폼 제출 처리
document.addEventListener('DOMContentLoaded', function() {
    const repairForm = document.getElementById('repairForm');
    if (repairForm) {
        repairForm.addEventListener('submit', async function(e) {
            console.log('수리 이력 폼 제출 시작');
            e.preventDefault();
            
            // 폼 데이터 수집
            const repairData = {
                customerId: currentCustomerId,
                repairDate: document.getElementById('repairDate').value,
                deviceModel: document.getElementById('deviceModel').value,
                problem: document.getElementById('problem').value,
                solution: document.getElementById('solution').value,
                warranty: document.getElementById('warranty').value,
                technician: document.getElementById('repairTechnician').value,
                status: document.getElementById('repairStatus').value
            };
            
            // 부품 데이터 수집
            const parts = [];
            const partRows = document.querySelectorAll('.part-row');
            console.log('저장할 부품 행 개수:', partRows.length);
            
            partRows.forEach((row, index) => {
                const nameInput = row.querySelector('input[name="partName"]');
                const quantityInput = row.querySelector('input[name="partQuantity"]');
                const unitPriceInput = row.querySelector('input[name="partUnitPrice"]');
                
                if (!nameInput || !quantityInput || !unitPriceInput) {
                    console.log(`부품 ${index + 1}: 입력 필드를 찾을 수 없음`);
                    return;
                }
                
                const name = nameInput.value.trim();
                const quantity = parseInt(quantityInput.value) || 1;
                const unitPrice = parseInt(unitPriceInput.value) || 0;
                
                console.log(`부품 ${index + 1}:`, { name, quantity, unitPrice });
                
                // 부품명이 비어있어도 저장 (빈 문자열로 저장)
                parts.push({
                    name: name || '',  // 빈 문자열로 저장
                    quantity: quantity,
                    unitPrice: unitPrice,
                    totalPrice: quantity * unitPrice
                });
                console.log(`부품 ${index + 1} 저장됨:`, { name: name || '(빈 부품명)', quantity, unitPrice });
            });
            
            // 인건비 데이터 수집
            const labor = [];
            const laborRows = document.querySelectorAll('.labor-row');
            let totalLaborCost = 0;
            console.log('저장할 인건비 행 개수:', laborRows.length);
            
            laborRows.forEach((row, index) => {
                const descriptionInput = row.querySelector('input[name="laborDescription"]');
                const amountInput = row.querySelector('input[name="laborAmount"]');
                
                if (!descriptionInput || !amountInput) {
                    console.log(`인건비 ${index + 1}: 입력 필드를 찾을 수 없음`);
                    return;
                }
                
                const description = descriptionInput.value.trim();
                const amount = parseInt(amountInput.value) || 0;
                
                console.log(`인건비 ${index + 1}:`, { description, amount });
                
                // 작업 내용이 비어있어도 저장 (빈 문자열로 저장)
                labor.push({
                    description: description || '',  // 빈 문자열로 저장
                    amount: amount
                });
                totalLaborCost += amount;
                console.log(`인건비 ${index + 1} 저장됨:`, { description: description || '(빈 작업내용)', amount });
            });
            
            console.log('저장할 인건비 데이터:', labor);
            repairData.labor = labor;
            
            // 부품 총액 계산
            let totalPartsCost = 0;
            parts.forEach(part => {
                totalPartsCost += part.totalPrice;
            });
            
            // 부가세 정보 추가
            const vatOption = document.querySelector('input[name="vatOption"]:checked');
            repairData.vatOption = vatOption ? vatOption.value : 'included';
            
            // 기본 금액 (부품비 + 인건비)
            const baseAmount = totalPartsCost + totalLaborCost;
            
            // 부가세별 총 비용 계산
            let totalCost;
            if (repairData.vatOption === 'included') {
                // 부가세 포함: 기본 금액이 이미 부가세 포함된 금액
                totalCost = baseAmount;
            } else if (repairData.vatOption === 'excluded') {
                // 부가세 미포함: 기본 금액에 부가세 추가
                const vatAmount = Math.round(baseAmount * 0.1);
                totalCost = baseAmount + vatAmount;
            } else {
                // 부가세 없음: 기본 금액 그대로
                totalCost = baseAmount;
            }
            
            // 숫자 필드 변환
            repairData.laborCost = totalLaborCost;
            repairData.partsCost = totalPartsCost;
            repairData.totalCost = totalCost;
            repairData.warranty = repairData.warranty || '';
            
            const repairId = e.target.getAttribute('data-repair-id');
            const isEdit = !!repairId;
            
            console.log('수리 이력 저장 데이터:', repairData); // 디버깅용
            
            try {
                const url = isEdit ? `/api/repairs/${repairId}` : '/api/repairs';
                const method = isEdit ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(repairData)
                });

                const result = await response.json();
                console.log('서버 응답:', result);

                if (result.success) {
                    showMessage(isEdit ? '수리 이력이 수정되었습니다.' : '수리 이력이 추가되었습니다.', 'success');
                    closeRepairModal();
                    
                    // 수리 이력 목록 새로고침
                    console.log('loadRepairs 함수 존재 여부:', typeof window.loadRepairs);
                    if (typeof window.loadRepairs === 'function') {
                        console.log('loadRepairs 함수 호출 중...');
                        window.loadRepairs();
                    } else {
                        console.error('loadRepairs 함수를 찾을 수 없습니다.');
                        // 페이지 새로고침으로 대체
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                } else {
                    showMessage(result.message || '수리 이력 저장에 실패했습니다.', 'error');
                }
            } catch (error) {
                console.error('수리 이력 저장 오류:', error);
                showMessage('수리 이력 저장 중 오류가 발생했습니다.', 'error');
            }
        });
    }
});
