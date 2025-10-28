// 수리 이력 관리 기능

// 텍스트 자르기 함수
function truncateText(text, maxLength) {
    if (!text || text === '-') return text;
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// 수리 이력 표시
function displayRepairs(repairs) {
    console.log('수리 이력 표시 시작, 수리 건수:', repairs.length);
    const tbody = document.getElementById('repairsTableBody');
    
    if (!tbody) {
        console.error('repairsTableBody 요소를 찾을 수 없습니다!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (repairs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">수리 이력이 없습니다.</td></tr>';
        return;
    }
    
    repairs.forEach(repair => {
        console.log('수리 데이터:', repair); // 디버깅용
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${repair.repair_date ? new Date(repair.repair_date).toLocaleDateString('ko-KR') : '-'}</td>
            <td title="${repair.device_model || repair.device_name || '-'}">${truncateText(repair.device_model || repair.device_name || '-', 10)}</td>
            <td title="${repair.problem || repair.issue_description || '-'}">${truncateText(repair.problem || repair.issue_description || '-', 10)}</td>
            <td title="${repair.solution || '-'}">${truncateText(repair.solution || '-', 10)}</td>
            <td>${(repair.total_cost || repair.totalCost) > 0 ? (repair.total_cost || repair.totalCost).toLocaleString('ko-KR') + '원' : '-'}</td>
            <td>${repair.status || '-'}</td>
            <td>${repair.warranty || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" data-repair-id="${repair.id}">상세</button>
                    <button class="action-btn edit-btn" data-repair-id="${repair.id}">수정</button>
                    <button class="action-btn delete-btn" data-repair-id="${repair.id}">삭제</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // 이벤트 리스너 추가 (자동 클릭 방지)
    tbody.addEventListener('click', function(e) {
        const target = e.target;
        if (target.classList.contains('view-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const repairId = target.getAttribute('data-repair-id');
            if (repairId) {
                viewRepairDetail(parseInt(repairId));
            }
        } else if (target.classList.contains('edit-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const repairId = target.getAttribute('data-repair-id');
            if (repairId) {
                editRepair(parseInt(repairId));
            }
        } else if (target.classList.contains('delete-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const repairId = target.getAttribute('data-repair-id');
            if (repairId) {
                deleteRepair(parseInt(repairId));
            }
        }
    });
}

// 수리 이력 등록 모달 표시
function showAddRepairModal() {
    console.log('🔧 수리 이력 추가 모달 실행 시작');
    console.log('📊 현재 시간:', new Date().toLocaleString('ko-KR'));
    
    const modal = document.createElement('div');
    modal.id = 'addRepairModal';
    
    console.log('✅ 모달 요소 생성 완료, ID:', modal.id);
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
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        ">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 30px;
                border-bottom: 2px solid #e9ecef;
                background: #f8f9fa;
                border-radius: 8px 8px 0 0;
                flex-shrink: 0;
            ">
                <h2 style="margin: 0; color: #333;">수리 이력 등록</h2>
                <button onclick="closeAddRepairModal()" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">&times;</button>
            </div>
            <div style="
                flex: 1;
                overflow-y: auto;
                padding: 30px;
                scrollbar-width: thin;
                scrollbar-color: #ced4da #f8f9fa;
            ">
            
            <form id="addRepairForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label for="repairDate">수리일:</label>
                        <input type="date" id="repairDate" name="repairDate" required>
                    </div>
                    <div>
                        <label for="deviceName">기기명:</label>
                        <input type="text" id="deviceName" name="deviceName" required>
                    </div>
                    <div>
                        <label for="issueDescription">고장 내용:</label>
                        <input type="text" id="issueDescription" name="issueDescription" required>
                    </div>
                    <div>
                        <label for="repairStatus">수리 상태:</label>
                        <select id="repairStatus" name="repairStatus" required>
                            <option value="">선택하세요</option>
                            <option value="접수">접수</option>
                            <option value="진행중">진행중</option>
                            <option value="완료">완료</option>
                            <option value="취소">취소</option>
                        </select>
                    </div>
                    <div>
                        <label for="totalCost">수리비:</label>
                        <input type="number" id="totalCost" name="totalCost" min="0" value="0">
                    </div>
                    <div>
                        <label for="repairNotes">비고:</label>
                        <input type="text" id="repairNotes" name="repairNotes">
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button type="submit" class="btn btn-primary" style="margin-right: 10px;">등록</button>
                    <button type="button" onclick="closeAddRepairModal()" class="btn btn-secondary">취소</button>
                </div>
            </form>
            </div>
            <div style="
                padding: 20px 30px;
                border-top: 1px solid #e9ecef;
                background: #f8f9fa;
                border-radius: 0 0 8px 8px;
                flex-shrink: 0;
            ">
                <div style="text-align: center;">
                    <button type="submit" form="addRepairForm" class="btn btn-primary" style="margin-right: 10px;">등록</button>
                    <button type="button" onclick="closeAddRepairModal()" class="btn btn-secondary">취소</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    console.log('🎯 모달 DOM에 추가 완료');
    console.log('📏 모달 크기 정보:');
    console.log('  - max-width: 600px');
    console.log('  - max-height: 50vh');
    console.log('  - width: 80%');
    console.log('  - box-shadow: 0 20px 40px rgba(0,0,0,0.2)');
    
    // 오늘 날짜로 설정
    document.getElementById('repairDate').value = new Date().toISOString().split('T')[0];
    console.log('📅 수리일 기본값 설정:', document.getElementById('repairDate').value);
    
    // 폼 제출 이벤트
    document.getElementById('addRepairForm').addEventListener('submit', addRepair);
    console.log('🔗 폼 제출 이벤트 리스너 등록 완료');
}

// 수리 이력 등록
async function addRepair(event) {
    event.preventDefault();
    console.log('💾 수리 이력 등록 폼 제출 시작');
    
    try {
        const formData = new FormData(event.target);
        console.log('📋 폼 데이터 수집 완료');
        
        // 폼 데이터 상세 정보 출력
        console.log('📊 폼 필드 값들:');
        for (let [key, value] of formData.entries()) {
            console.log(`  - ${key}: ${value}`);
        }
        
        const repairData = {
            repair_date: formData.get('repairDate'),
            device_name: formData.get('deviceName'),
            issue_description: formData.get('issueDescription'),
            status: formData.get('repairStatus'),
            total_cost: parseInt(formData.get('totalCost')) || 0,
            notes: formData.get('repairNotes'),
            customer_id: currentCustomerId
        };
        
        console.log('🔧 수리 데이터 객체 생성 완료:');
        console.log(JSON.stringify(repairData, null, 2));
        console.log('👤 현재 고객 ID:', currentCustomerId);
        
        console.log('🌐 API 요청 시작: POST /api/repairs');
        const response = await fetch('/api/repairs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(repairData),
            credentials: 'include'
        });
        
        console.log('📡 API 응답 상태:', response.status, response.statusText);
        
        const result = await response.json();
        console.log('📄 API 응답 데이터:', result);
        
        if (response.ok && result.success) {
            console.log('✅ 수리 이력 등록 성공!');
            showMessage('수리 이력이 등록되었습니다.', 'success');
            closeAddRepairModal();
            
            // 수리 이력 목록 새로고침 및 통계 업데이트
            if (typeof window.loadRepairs === 'function') {
                console.log('🔄 수리 이력 목록 및 통계 업데이트 중...');
                window.loadRepairs();
            } else {
                console.log('🔄 loadRepairs 함수가 없어 페이지 새로고침으로 대체');
            loadCustomerData(); // 페이지 새로고침
            }
        } else {
            console.error('❌ 수리 이력 등록 실패:', result.message);
            showMessage('수리 이력 등록에 실패했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('💥 수리 이력 등록 중 예외 발생:', error);
        console.error('📍 에러 스택:', error.stack);
        showMessage('수리 이력을 등록하는 중 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 등록 모달 닫기
function closeAddRepairModal() {
    console.log('❌ 수리 이력 추가 모달 닫기 시작');
    const modal = document.getElementById('addRepairModal');
    if (modal) {
        console.log('✅ 모달 요소 찾음, 제거 중...');
        modal.remove();
        console.log('🎯 모달 제거 완료');
    } else {
        console.warn('⚠️ 모달 요소를 찾을 수 없습니다!');
    }
}

// 수리 이력 상세 보기
async function viewRepairDetail(repairId) {
    console.log('🔍 viewRepairDetail 호출됨, repairId:', repairId);
    
    try {
        console.log('📡 API 요청 시작:', `/api/repairs/${repairId}`);
        const response = await fetch(`/api/repairs/${repairId}`, {
            credentials: 'include'
        });
        
        console.log('📡 API 응답 상태:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`수리 이력을 불러올 수 없습니다. (${response.status})`);
        }
        
        const result = await response.json();
        console.log('📡 API 응답 데이터:', result);
        
        if (result.success) {
            const repair = result.data;
            
            // 전역 변수로 repair 데이터 저장 (프린트에서 사용)
            window.currentRepairData = repair;
            console.log('🔍 전역 repair 데이터 저장:', window.currentRepairData);
            
            console.log('🔍 수리 이력 데이터:', repair);
            console.log('🔢 management_number 값:', repair.management_number);
            
            // HTML 모달의 요소들에 데이터 설정
            document.getElementById('detailRepairDate').textContent = repair.repair_date ? new Date(repair.repair_date).toLocaleDateString('ko-KR') : '-';
            
            const managementNumberElement = document.getElementById('detailManagementNumber');
            if (managementNumberElement) {
                managementNumberElement.textContent = repair.management_number || '-';
                console.log('✅ 관리번호 설정 완료:', repair.management_number || '-');
            } else {
                console.error('❌ detailManagementNumber 요소를 찾을 수 없습니다.');
            }
            
            // 고객 정보 설정 (API에서 고객 정보를 가져와야 함)
            console.log('👤 고객 정보 설정:', {
                customer_name: repair.customer_name,
                customer_phone: repair.customer_phone,
                customer_address: repair.customer_address
            });
            
            document.getElementById('detailCustomerName').textContent = repair.customer_name || '-';
            document.getElementById('detailCustomerPhone').textContent = repair.customer_phone || '-';
            document.getElementById('detailCustomerAddress').textContent = repair.customer_address || '-';
            document.getElementById('detailDeviceModel').textContent = repair.device_model || '-';
            document.getElementById('detailProblem').textContent = repair.problem || '-';
            document.getElementById('detailSolution').textContent = repair.solution || '-';
            
            // 부품 목록 설정
            if (repair.parts && Array.isArray(repair.parts) && repair.parts.length > 0) {
                const partsHtml = repair.parts.map(part => {
                    if (typeof part === 'object' && part !== null) {
                        const quantity = part.quantity || 1;
                        const unitPrice = part.unit_price || part.unitPrice || 0;
                        const totalPrice = part.total_price || part.totalPrice || (quantity * unitPrice);
                        
                        return `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">
                            <strong>${part.name || part.product_name || part.part_name || '부품명 없음'}</strong> - ${quantity}개 × ${unitPrice.toLocaleString('ko-KR')}원 = ${totalPrice.toLocaleString('ko-KR')}원
                        </div>`;
                    } else {
                        return `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">${part}</div>`;
                    }
                }).join('');
                document.getElementById('detailParts').innerHTML = partsHtml;
            } else {
                document.getElementById('detailParts').innerHTML = '<div style="padding: 8px 0; color: #666; font-style: italic;">사용된 부품이 없습니다.</div>';
            }
            
            // 인건비 설정
            if (repair.labor && Array.isArray(repair.labor) && repair.labor.length > 0) {
                const laborHtml = repair.labor.map(l => {
                    if (typeof l === 'object' && l !== null) {
                        const cost = l.cost || l.amount || 0;
                        const name = l.name || l.description || '인건비';
                        
                        return `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">
                            ${name} - ${cost.toLocaleString('ko-KR')}원
                        </div>`;
                    } else {
                        return `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">${l}</div>`;
                    }
                }).join('');
                document.getElementById('detailLabor').innerHTML = laborHtml;
            } else {
                document.getElementById('detailLabor').innerHTML = '<div style="padding: 8px 0; color: #666; font-style: italic;">인건비 내역이 없습니다.</div>';
            }
            
            // 비용 계산 및 설정
            const totalCost = repair.total_cost || 0;
            const vatOption = repair.vat_option || 'included';
            
            let supplyAmount, vatAmount, vatDescription;
            
            if (vatOption === 'included') {
                // 부가세 포함: 총액에서 부가세를 제외한 공급가액 계산
                supplyAmount = Math.round(totalCost / 1.1);
                vatAmount = totalCost - supplyAmount;
                vatDescription = '부품비 + 인건비 (부가세 포함)';
            } else if (vatOption === 'excluded') {
                // 부가세 미포함: totalCost가 공급가액, 부가세 별도 계산
                supplyAmount = totalCost;
                vatAmount = Math.round(totalCost * 0.1);
                vatDescription = '부품비 + 인건비 (부가세 별도)';
            } else {
                // 부가세 없음: 총액이 공급가액, 부가세 0
                supplyAmount = totalCost;
                vatAmount = 0;
                vatDescription = '부품비 + 인건비 (부가세 없음)';
            }
            
            // 비용 정보 표시
            document.getElementById('detailSupplyAmount').textContent = supplyAmount.toLocaleString('ko-KR') + '원';
            document.getElementById('detailVatAmount').textContent = vatAmount.toLocaleString('ko-KR') + '원';
            document.getElementById('detailVatDescription').textContent = vatDescription;
            document.getElementById('detailTotalCost').textContent = totalCost.toLocaleString('ko-KR') + '원';
            
            // 부가세 섹션 표시/숨김
            const vatSection = document.getElementById('detailVatSection');
            if (vatAmount > 0) {
                vatSection.style.display = 'block';
            } else {
                vatSection.style.display = 'none';
            }
            
            // 모달 표시
            document.getElementById('customerRepairDetailModal').style.display = 'flex';
            
        } else {
            showMessage('수리 이력을 불러오는데 실패했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('❌ 수리 이력 상세 조회 오류:', error);
        console.error('❌ 오류 상세:', {
            message: error.message,
            stack: error.stack,
            repairId: repairId
        });
        showMessage(`수리 이력을 불러오는 중 오류가 발생했습니다: ${error.message}`, 'error');
    }
}

// 수리 이력 상세 모달 닫기
function closeRepairDetailModal() {
    const modal = document.getElementById('customerRepairDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 수리 이력 상세 프린트
function printRepairDetailFromModal() {
    console.log('🖨️ 프린트 함수 시작');
    
    const repairDetailModal = document.getElementById('customerRepairDetailModal');
    if (!repairDetailModal) {
        console.error('수리 이력 상세 모달을 찾을 수 없습니다.');
        alert('수리 이력 상세 모달을 찾을 수 없습니다. 먼저 수리 이력을 선택해주세요.');
        return;
    }
    
    console.log('✅ 수리 이력 상세 모달 찾음');
    
    // 모달에서 데이터 추출
    const repairData = window.extractRepairDataFromModal(repairDetailModal);
    console.log('📋 추출된 데이터:', repairData);
    console.log('📋 데이터 타입:', typeof repairData);
    console.log('📋 데이터 키 개수:', repairData ? Object.keys(repairData).length : 'N/A');
    
    if (!repairData || Object.keys(repairData).length === 0) {
        console.error('❌ 수리 데이터 추출 실패');
        console.error('❌ repairDetailModal:', repairDetailModal);
        console.error('❌ extractRepairDataFromModal 함수:', window.extractRepairDataFromModal);
        
        // 대체 방법: 전역 데이터 사용
        if (window.currentRepairData) {
            console.log('🔄 전역 데이터 사용:', window.currentRepairData);
            repairData = window.currentRepairData;
        } else {
            alert('수리 데이터를 추출할 수 없습니다. 먼저 수리 이력을 선택해주세요.');
            return;
        }
    }
    
    // 프린트 실행
    console.log('🔍 printRepairDetail 함수 확인:', window.printRepairDetail);
    console.log('🔍 전달할 데이터:', repairData);
    
    if (window.printRepairDetail) {
        console.log('✅ printRepairDetail 호출 시작');
        try {
    window.printRepairDetail(repairData);
        } catch (error) {
            console.error('❌ printRepairDetail 호출 오류:', error);
            alert('프린트 기능을 사용할 수 없습니다.');
        }
    } else {
        console.error('❌ 프린트 함수를 찾을 수 없습니다.');
        console.error('❌ 사용 가능한 함수들:', Object.keys(window).filter(key => key.includes('print')));
        alert('프린트 기능을 사용할 수 없습니다.');
    }
}

// 수리 이력 수정 (addRepair 함수를 수정 모드로 사용)
async function editRepair(repairId) {
    console.log('🔧 수리 이력 수정 시작, ID:', repairId);
    
    try {
        // 수리 이력 데이터 로드
        const response = await fetch(`/api/repairs/${repairId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`수리 이력을 불러올 수 없습니다. (${response.status})`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const repair = result.data;
            console.log('🔍 수리 이력 데이터:', repair);
            
            // addRepair 함수를 수정 모드로 호출
            addRepair(repair);
            
        } else {
            showMessage('수리 이력을 불러오는데 실패했습니다.', 'error');
        }
        
    } catch (error) {
        console.error('수리 이력 수정 오류:', error);
        showMessage('수리 이력을 불러오는 중 오류가 발생했습니다.', 'error');
    }
}




// 수리 이력 삭제
async function deleteRepair(repairId) {
    if (!confirm('정말로 이 수리 이력을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/repairs/${repairId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showMessage('수리 이력이 삭제되었습니다.', 'success');
            
            // 수리 이력 목록 새로고침 및 통계 업데이트
            if (typeof window.loadRepairs === 'function') {
                console.log('🔄 수리 이력 삭제 후 목록 및 통계 업데이트 중...');
                window.loadRepairs();
            } else {
                console.log('🔄 loadRepairs 함수가 없어 페이지 새로고침으로 대체');
            loadCustomerData(); // 페이지 새로고침
            }
        } else {
            showMessage('수리 이력 삭제에 실패했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('수리 이력 삭제 오류:', error);
        showMessage('수리 이력을 삭제하는 중 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 로드 함수 (통계 업데이트 포함)
async function loadRepairs() {
    console.log('🔧 loadRepairs 호출됨, currentCustomerId:', currentCustomerId);
    try {
        const response = await fetch(`/api/repairs?customerId=${currentCustomerId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        console.log('📊 서버 응답:', result);
        
        if (result.success) {
            const repairs = result.data;
            console.log('📋 서버에서 받은 repairs 데이터:', repairs);
            
            // 전역 변수에 수리 데이터 저장 (상태 카드 클릭용)
            window.currentRepairsData = repairs;
            
            displayRepairs(repairs);
            
            // 통계 업데이트 (안전장치 추가)
            try {
            updateRepairStatistics(repairs);
            } catch (error) {
                console.warn('⚠️ 통계 업데이트 중 오류 발생:', error);
                // 통계 업데이트 실패해도 수리 목록은 정상 표시
            }
            
            // 수리 현황 업데이트 (안전장치 추가)
            try {
                updateRepairStatus(repairs);
            } catch (error) {
                console.warn('⚠️ 수리 현황 업데이트 중 오류 발생:', error);
                // 수리 현황 업데이트 실패해도 수리 목록은 정상 표시
            }
        } else {
            console.error('❌ 서버 응답 실패:', result.message);
            showMessage('수리 이력을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('💥 수리 이력 로드 오류:', error);
        showMessage('수리 이력을 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 통계 업데이트 함수
function updateRepairStatistics(repairs) {
    console.log('📊 수리 이력 통계 업데이트 시작, 수리 건수:', repairs.length);
    console.log('📋 수리 이력 데이터 상세:', repairs);
    
    const totalRepairs = repairs.length;
    const completedRepairs = repairs.filter(r => r.status === '완료').length;
    const warrantyRepairs = repairs.filter(r => r.status === '보증중').length;
    
    // 총 수리 비용 계산 - 다양한 필드명 확인
    const totalCost = repairs.reduce((sum, repair) => {
        const cost = repair.totalCost || repair.total_cost || 0;
        console.log(`💰 수리 ID ${repair.id}: totalCost=${repair.totalCost}, total_cost=${repair.total_cost}, 최종=${cost}`);
        return sum + Number(cost);
    }, 0);
    
    // 부가세별 통계 - 다양한 필드명 확인
    const includedRepairs = repairs.filter(r => {
        const vat = r.vatOption || r.vat_option || '';
        return vat === 'included';
    }).length;
    
    const excludedRepairs = repairs.filter(r => {
        const vat = r.vatOption || r.vat_option || '';
        return vat === 'excluded';
    }).length;
    
    const noneRepairs = repairs.filter(r => {
        const vat = r.vatOption || r.vat_option || '';
        return vat === 'none';
    }).length;
    
    console.log('📈 통계 데이터:', {
        totalRepairs,
        completedRepairs,
        warrantyRepairs,
        totalCost,
        includedRepairs,
        excludedRepairs,
        noneRepairs,
        repairs: repairs.map(r => ({
            id: r.id,
            status: r.status,
            totalCost: r.totalCost || r.total_cost,
            vatOption: r.vatOption || r.vat_option
        }))
    });
    
    // 통계 카드 업데이트
    let statsCard = document.querySelector('.stats-card');
    
    // 통계 카드가 없으면 생성
    if (!statsCard) {
        console.log('🔧 통계 카드가 없어서 생성합니다.');
        const repairsSection = document.querySelector('#repairsTab');
        if (repairsSection) {
            // 통계 카드 HTML 생성
            const statsHTML = `
                <div class="stats-card" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                ">
                    <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">수리 이력 통계</h3>
                    <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px;">
                        <!-- 통계 항목들이 여기에 동적으로 추가됩니다 -->
                    </div>
                </div>
            `;
            
            // 수리 이력 섹션의 맨 위에 통계 카드 추가
            repairsSection.insertAdjacentHTML('afterbegin', statsHTML);
            statsCard = document.querySelector('.stats-card');
        } else {
            console.warn('⚠️ 수리 이력 섹션을 찾을 수 없습니다.');
            return;
        }
    }
    
    if (statsCard) {
        console.log('✅ 통계 카드 찾음, 업데이트 중...');
        statsCard.innerHTML = `
            <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">수리 이력 통계</h3>
            <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px;">
            <div class="stat-item" style="text-align: center; min-width: 100px;">
                <div class="stat-value" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${totalRepairs}</div>
                <div class="stat-label" style="font-size: 12px; opacity: 0.9;">총 수리 건수</div>
            </div>
            <div class="stat-item" style="text-align: center; min-width: 100px;">
                <div class="stat-value" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${completedRepairs}</div>
                <div class="stat-label" style="font-size: 12px; opacity: 0.9;">완료</div>
            </div>
            <div class="stat-item" style="text-align: center; min-width: 100px;">
                <div class="stat-value" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${warrantyRepairs}</div>
                <div class="stat-label" style="font-size: 12px; opacity: 0.9;">보증중</div>
            </div>
            <div class="stat-item" style="text-align: center; min-width: 100px;">
                <div class="stat-value" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${totalCost.toLocaleString('ko-KR')}원</div>
                <div class="stat-label" style="font-size: 12px; opacity: 0.9;">총 수리 비용</div>
            </div>
            <div class="stat-item" style="text-align: center; min-width: 100px;">
                <div class="stat-value" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${includedRepairs}</div>
                <div class="stat-label" style="font-size: 12px; opacity: 0.9;">부가세 포함</div>
            </div>
            <div class="stat-item" style="text-align: center; min-width: 100px;">
                <div class="stat-value" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${excludedRepairs}</div>
                <div class="stat-label" style="font-size: 12px; opacity: 0.9;">부가세 미포함</div>
            </div>
            <div class="stat-item" style="text-align: center; min-width: 100px;">
                <div class="stat-value" style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${noneRepairs}</div>
                <div class="stat-label" style="font-size: 12px; opacity: 0.9;">부가세 없음</div>
            </div>
            </div>
        `;
        console.log('🎯 통계 카드 업데이트 완료');
        // 성공 시 재시도 카운터 리셋
        if (typeof updateRepairStatistics.retryCount !== 'undefined') {
            updateRepairStatistics.retryCount = 0;
        }
    } else {
        console.warn('⚠️ 통계 카드를 찾을 수 없습니다. 페이지가 완전히 로드되지 않았을 수 있습니다.');
        // 통계 카드가 없는 경우 100ms 후 다시 시도 (최대 3회)
        if (typeof updateRepairStatistics.retryCount === 'undefined') {
            updateRepairStatistics.retryCount = 0;
        }
        
        if (updateRepairStatistics.retryCount < 3) {
            updateRepairStatistics.retryCount++;
            console.log(`🔄 통계 카드 재시도 ${updateRepairStatistics.retryCount}/3`);
            setTimeout(() => {
                updateRepairStatistics(repairs);
            }, 100);
        } else {
            console.warn('⚠️ 통계 카드를 찾을 수 없어 업데이트를 건너뜁니다.');
            updateRepairStatistics.retryCount = 0; // 리셋
        }
        return;
    }
}

// 수리 현황 업데이트 함수
function updateRepairStatus(repairs) {
    console.log('📊 수리 현황 업데이트 시작');
    
    // 상태별 카운트 계산
    const statusCounts = {
        '접수': repairs.filter(r => r.status === '접수').length,
        '위탁접수': repairs.filter(r => r.status === '위탁접수').length,
        '완료': repairs.filter(r => r.status === '완료').length,
        '보증중': repairs.filter(r => r.status === '보증중').length
    };
    
    console.log('상태별 카운트:', statusCounts);
    
    // 각 상태 카드 업데이트
    const pendingElement = document.getElementById('pendingCount');
    const inProgressElement = document.getElementById('inProgressCount');
    const completedElement = document.getElementById('completedCount');
    const warrantyElement = document.getElementById('warrantyCount');
    
    if (pendingElement) {
        pendingElement.textContent = `${statusCounts['접수']}건`;
    }
    if (inProgressElement) {
        inProgressElement.textContent = `${statusCounts['위탁접수']}건`;
    }
    if (completedElement) {
        completedElement.textContent = `${statusCounts['완료']}건`;
    }
    if (warrantyElement) {
        warrantyElement.textContent = `${statusCounts['보증중']}건`;
    }
    
    // 상태 카드 클릭 이벤트는 메인 대시보드에만 필요
    // 고객 상세 페이지에서는 불필요함
    
    console.log('✅ 수리 현황 업데이트 완료');
}

// 상태 카드 클릭 이벤트 추가
function addStatusCardClickEvents(repairs) {
    console.log('🔗 상태 카드 클릭 이벤트 추가 중...');
    
    // 다양한 셀렉터로 상태 카드 찾기
    const selectors = [
        '.status-card.pending',
        '.status-card.in-progress', 
        '.status-card.completed',
        '.status-card.warranty',
        '[class*="status-card"][class*="pending"]',
        '[class*="status-card"][class*="in-progress"]',
        '[class*="status-card"][class*="completed"]',
        '[class*="status-card"][class*="warranty"]',
        '#pendingCount',
        '#inProgressCount', 
        '#completedCount',
        '#warrantyCount'
    ];
    
    // 접수 카드 찾기
    let pendingCard = null;
    for (const selector of ['.status-card.pending', '#pendingCount', '[class*="pending"]']) {
        pendingCard = document.querySelector(selector);
        if (pendingCard) {
            console.log('✅ 접수 카드 찾음:', selector);
            break;
        }
    }
    
    if (pendingCard) {
        pendingCard.style.cursor = 'pointer';
        pendingCard.onclick = () => {
            console.log('📝 접수 카드 클릭됨');
            filterRepairsByStatus('접수', repairs);
        };
    } else {
        console.warn('⚠️ 접수 카드를 찾을 수 없습니다');
    }
    
    // 위탁접수 카드 찾기
    let inProgressCard = null;
    for (const selector of ['.status-card.in-progress', '#inProgressCount', '[class*="in-progress"]']) {
        inProgressCard = document.querySelector(selector);
        if (inProgressCard) {
            console.log('✅ 위탁접수 카드 찾음:', selector);
            break;
        }
    }
    
    if (inProgressCard) {
        inProgressCard.style.cursor = 'pointer';
        inProgressCard.onclick = () => {
            console.log('📦 위탁접수 카드 클릭됨');
            filterRepairsByStatus('위탁접수', repairs);
        };
    } else {
        console.warn('⚠️ 위탁접수 카드를 찾을 수 없습니다');
    }
    
    // 완료 카드 찾기
    let completedCard = null;
    for (const selector of ['.status-card.completed', '#completedCount', '[class*="completed"]']) {
        completedCard = document.querySelector(selector);
        if (completedCard) {
            console.log('✅ 완료 카드 찾음:', selector);
            break;
        }
    }
    
    if (completedCard) {
        completedCard.style.cursor = 'pointer';
        completedCard.onclick = () => {
            console.log('✅ 완료 카드 클릭됨');
            filterRepairsByStatus('완료', repairs);
        };
    } else {
        console.warn('⚠️ 완료 카드를 찾을 수 없습니다');
    }
    
    // 보증중 카드 찾기
    let warrantyCard = null;
    for (const selector of ['.status-card.warranty', '#warrantyCount', '[class*="warranty"]']) {
        warrantyCard = document.querySelector(selector);
        if (warrantyCard) {
            console.log('✅ 보증중 카드 찾음:', selector);
            break;
        }
    }
    
    if (warrantyCard) {
        warrantyCard.style.cursor = 'pointer';
        warrantyCard.onclick = () => {
            console.log('🛡️ 보증중 카드 클릭됨');
            filterRepairsByStatus('보증중', repairs);
        };
    } else {
        console.warn('⚠️ 보증중 카드를 찾을 수 없습니다');
    }
    
    // 디버깅: 모든 상태 카드 요소 확인
    console.log('🔍 현재 페이지의 상태 관련 요소들:');
    const allElements = document.querySelectorAll('[class*="status"], [id*="Count"], [class*="card"]');
    allElements.forEach((el, index) => {
        console.log(`${index + 1}. ${el.tagName}.${el.className} #${el.id}`, el);
    });
}

// 상태별 수리 이력 필터링 함수
function filterRepairsByStatus(status, repairs) {
    console.log(`🔍 ${status} 상태 수리 이력 필터링`);
    
    // 해당 상태의 수리 이력만 필터링
    const filteredRepairs = repairs.filter(repair => repair.status === status);
    
    console.log(`📋 ${status} 상태 수리 이력:`, filteredRepairs);
    
    // 상태별 모달창 표시
    showStatusModal(status, filteredRepairs);
}

// 상태별 모달창 표시 함수
function showStatusModal(status, repairs) {
    console.log(`📱 ${status} 상태 모달창 표시`);
    
    // 모달창 HTML 생성
    const modalHtml = `
        <div id="statusModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 900px; width: 90%;">
                <div class="modal-header">
                    <h2 id="statusModalTitle">${getStatusTitle(status)} 수리 이력</h2>
                    <button class="close-btn" onclick="closeStatusModal()">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <span style="font-size: 16px; font-weight: bold; color: #333;">
                                총 ${repairs.length}건의 ${getStatusTitle(status)} 수리 이력
                            </span>
                            <button onclick="exportStatusData('${status}')" class="btn btn-outline btn-sm">
                                📊 데이터 내보내기
                            </button>
                        </div>
                        
                        <!-- 수리 이력 테이블 -->
                        <div style="overflow-x: auto;">
                            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                <thead>
                                    <tr style="background: #f8f9fa;">
                                        <th style="padding: 12px 8px; text-align: left; border: 1px solid #dee2e6;">수리일</th>
                                        <th style="padding: 12px 8px; text-align: left; border: 1px solid #dee2e6;">고객명</th>
                                        <th style="padding: 12px 8px; text-align: left; border: 1px solid #dee2e6;">모델</th>
                                        <th style="padding: 12px 8px; text-align: left; border: 1px solid #dee2e6;">문제</th>
                                        <th style="padding: 12px 8px; text-align: right; border: 1px solid #dee2e6;">총비용</th>
                                        <th style="padding: 12px 8px; text-align: center; border: 1px solid #dee2e6;">상태</th>
                                        <th style="padding: 12px 8px; text-align: center; border: 1px solid #dee2e6;">액션</th>
                                    </tr>
                                </thead>
                                <tbody id="statusModalTableBody">
                                    ${generateStatusTableRows(repairs)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeStatusModal()" class="btn btn-outline">닫기</button>
                    <button onclick="refreshStatusModal('${status}')" class="btn btn-primary">🔄 새로고침</button>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달이 있으면 제거
    const existingModal = document.getElementById('statusModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 모달 외부 클릭 시 닫기
    document.getElementById('statusModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeStatusModal();
        }
    });
}

// 상태 제목 가져오기
function getStatusTitle(status) {
    const titles = {
        '접수': '📝 접수',
        '위탁접수': '📦 위탁접수', 
        '완료': '✅ 수리완료',
        '보증중': '🛡️ 보증중'
    };
    return titles[status] || status;
}

// 상태별 테이블 행 생성
function generateStatusTableRows(repairs) {
    if (repairs.length === 0) {
        return '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">해당 상태의 수리 이력이 없습니다.</td></tr>';
    }
    
    return repairs.map(repair => `
        <tr>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6;">${repair.repair_date ? new Date(repair.repair_date).toLocaleDateString('ko-KR') : '-'}</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6;">${repair.customer_name || '-'}</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6;" title="${repair.device_model || '-'}">${truncateText(repair.device_model || '-', 20)}</td>
            <td style="padding: 12px 8px; border: 1px solid #dee2e6;" title="${repair.problem || '-'}">${truncateText(repair.problem || '-', 30)}</td>
            <td style="padding: 12px 8px; text-align: right; border: 1px solid #dee2e6;">${(repair.total_cost || repair.totalCost) > 0 ? (repair.total_cost || repair.totalCost).toLocaleString('ko-KR') + '원' : '-'}</td>
            <td style="padding: 12px 8px; text-align: center; border: 1px solid #dee2e6;">
                <span class="status-badge status-${repair.status}">${repair.status}</span>
            </td>
            <td style="padding: 12px 8px; text-align: center; border: 1px solid #dee2e6;">
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewRepairDetail(${repair.id})" style="background: #17a2b8; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 3px;">상세</button>
                    <button class="action-btn edit-btn" onclick="editRepair(${repair.id})" style="background: #ffc107; color: black; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 3px;">수정</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 상태 모달 닫기
function closeStatusModal() {
    const modal = document.getElementById('statusModal');
    if (modal) {
        modal.remove();
    }
}

// 상태 모달 새로고침
function refreshStatusModal(status) {
    console.log(`🔄 ${status} 상태 모달 새로고침`);
    if (typeof loadRepairs === 'function') {
        loadRepairs();
    }
}

// 상태 데이터 내보내기
function exportStatusData(status) {
    console.log(`📊 ${status} 상태 데이터 내보내기`);
    // TODO: 데이터 내보내기 기능 구현
    showMessage(`${status} 상태 데이터 내보내기 기능은 준비 중입니다.`, 'info');
}

// 필터 상태 표시
function showFilterStatus(status, count) {
    // 기존 필터 상태 제거
    const existingFilter = document.querySelector('.filter-status');
    if (existingFilter) {
        existingFilter.remove();
    }
    
    // 수리 이력 테이블 위에 필터 상태 표시
    const repairsTable = document.querySelector('.data-table');
    if (repairsTable) {
        const filterStatus = document.createElement('div');
        filterStatus.className = 'filter-status';
        filterStatus.style.cssText = `
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        filterStatus.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; color: #1976d2;">🔍 필터링됨:</span>
                <span style="background: #2196f3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${status}</span>
                <span style="color: #666;">${count}건</span>
            </div>
            <button onclick="clearRepairFilter()" style="
                background: #f44336;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            ">필터 해제</button>
        `;
        
        repairsTable.parentNode.insertBefore(filterStatus, repairsTable);
    }
}

// 필터 해제 함수
function clearRepairFilter() {
    console.log('🔄 수리 이력 필터 해제');
    
    // 필터 상태 제거
    const filterStatus = document.querySelector('.filter-status');
    if (filterStatus) {
        filterStatus.remove();
    }
    
    // 전체 수리 이력 다시 로드
    if (typeof loadRepairs === 'function') {
        loadRepairs();
    }
}

// 수리 현황 새로고침 함수
function refreshRepairStatus() {
    console.log('🔄 수리 현황 새로고침');
    if (typeof loadRepairs === 'function') {
        loadRepairs();
    }
}

// 전역 함수로 등록
window.loadRepairs = loadRepairs;
window.updateRepairStatistics = updateRepairStatistics;
window.updateRepairStatus = updateRepairStatus;
window.refreshRepairStatus = refreshRepairStatus;
window.filterRepairsByStatus = filterRepairsByStatus;
window.clearRepairFilter = clearRepairFilter;
window.showStatusModal = showStatusModal;
window.closeStatusModal = closeStatusModal;
window.refreshStatusModal = refreshStatusModal;
window.exportStatusData = exportStatusData;
window.printRepairDetail = printRepairDetail;

// 페이지 로드 시 통계 초기화 (자동 호출 제거)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 페이지 로드 완료, 수리 이력 통계 초기화 중...');
    
    // 수리 이력 탭이 활성화될 때만 통계 업데이트
    const repairsTab = document.querySelector('[data-tab="repairs"]');
    if (repairsTab) {
        repairsTab.addEventListener('click', function() {
            console.log('📊 수리 이력 탭 클릭됨, 통계 업데이트 중...');
            setTimeout(() => {
                if (typeof window.loadRepairs === 'function') {
                    window.loadRepairs();
                }
            }, 100);
        });
    }
    
    // 자동 로드 제거 - 수동으로만 호출되도록 변경
    console.log('📊 자동 로드 비활성화됨 - 수동으로만 호출됩니다.');
});

// 전역 클릭 이벤트 리스너로 상태 카드 클릭 처리
document.addEventListener('click', function(e) {
    // 접수 카드 클릭 감지
    if (e.target.closest('.status-card.pending') || e.target.closest('#pendingCount')) {
        console.log('📝 접수 카드 클릭됨 (전역 이벤트)');
        e.preventDefault();
        e.stopPropagation();
        if (window.currentRepairsData) {
            filterRepairsByStatus('접수', window.currentRepairsData);
        }
        return;
    }
    
    // 위탁접수 카드 클릭 감지
    if (e.target.closest('.status-card.in-progress') || e.target.closest('#inProgressCount')) {
        console.log('📦 위탁접수 카드 클릭됨 (전역 이벤트)');
        e.preventDefault();
        e.stopPropagation();
        if (window.currentRepairsData) {
            filterRepairsByStatus('위탁접수', window.currentRepairsData);
        }
        return;
    }
    
    // 완료 카드 클릭 감지
    if (e.target.closest('.status-card.completed') || e.target.closest('#completedCount')) {
        console.log('✅ 완료 카드 클릭됨 (전역 이벤트)');
        e.preventDefault();
        e.stopPropagation();
        if (window.currentRepairsData) {
            filterRepairsByStatus('완료', window.currentRepairsData);
        }
        return;
    }
    
    // 보증중 카드 클릭 감지
    if (e.target.closest('.status-card.warranty') || e.target.closest('#warrantyCount')) {
        console.log('🛡️ 보증중 카드 클릭됨 (전역 이벤트)');
        e.preventDefault();
        e.stopPropagation();
        if (window.currentRepairsData) {
            filterRepairsByStatus('보증중', window.currentRepairsData);
        }
        return;
    }
});

// 전역 함수 등록
window.viewRepairDetail = viewRepairDetail;
window.openRepairDetailModal = viewRepairDetail; // 별칭 추가
window.closeRepairDetailModal = closeRepairDetailModal;
window.printRepairDetail = printRepairDetail;
window.editRepair = editRepair;

// 수리 이력 탭 전환 시 통계 업데이트
function switchToRepairsTab() {
    console.log('📊 수리 이력 탭으로 전환, 통계 업데이트 중...');
    setTimeout(() => {
        if (typeof window.loadRepairs === 'function') {
            window.loadRepairs();
        }
    }, 200);
}
