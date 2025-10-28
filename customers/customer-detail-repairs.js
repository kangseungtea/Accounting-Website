// 수리 이력 관리 기능

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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">수리 이력이 없습니다.</td></tr>';
        return;
    }
    
    repairs.forEach(repair => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${repair.repair_date ? new Date(repair.repair_date).toLocaleDateString('ko-KR') : '-'}</td>
            <td>${repair.device_name || '-'}</td>
            <td>${repair.issue_description || '-'}</td>
            <td>${repair.status || '-'}</td>
            <td>${repair.total_cost ? repair.total_cost.toLocaleString('ko-KR') + '원' : '-'}</td>
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
                            <strong>${part.name || '부품명 없음'}</strong> - ${quantity}개 × ${unitPrice.toLocaleString('ko-KR')}원 = ${totalPrice.toLocaleString('ko-KR')}원
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
                // 부가세 미포함: 총액이 공급가액, 부가세 별도 계산
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
            document.getElementById('repairDetailModal').style.display = 'flex';
            
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
    const modal = document.getElementById('repairDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 수리 이력 상세 프린트
function printRepairDetailFromModal() {
    console.log('🖨️ 프린트 함수 시작');
    
    const repairDetailModal = document.getElementById('repairDetailModal');
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

// 수리 이력 수정
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
            
            // 수리 이력 수정 모달 생성
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'editRepairModal';
            modal.style.display = 'flex';
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h2>수리 이력 수정</h2>
                        <button class="close-btn" onclick="closeEditRepairModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <style>
                            .form-section {
                                margin-bottom: 25px;
                                padding: 15px;
                                border: 1px solid #e0e0e0;
                                border-radius: 8px;
                                background: #f9f9f9;
                            }
                            .form-section h3 {
                                margin: 0 0 15px 0;
                                color: #333;
                                font-size: 16px;
                                border-bottom: 2px solid #007bff;
                                padding-bottom: 5px;
                            }
                            .part-item, .labor-item {
                                background: white;
                                padding: 10px;
                                border: 1px solid #ddd;
                                border-radius: 5px;
                                margin-bottom: 10px;
                            }
                            .no-parts, .no-labor {
                                text-align: center;
                                color: #666;
                                font-style: italic;
                                padding: 20px;
                                background: #f8f9fa;
                                border: 1px dashed #ccc;
                                border-radius: 5px;
                            }
                            .btn-sm {
                                padding: 4px 8px;
                                font-size: 12px;
                            }
                        </style>
                        <form id="editRepairForm">
                            <div class="form-section">
                                <h3>기본 정보</h3>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="editRepairDate">수리일 *</label>
                                        <input type="date" id="editRepairDate" value="${repair.repair_date ? repair.repair_date.split(' ')[0] : ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="editDeviceModel">장비 모델</label>
                                        <textarea id="editDeviceModel" rows="3" placeholder="장비 모델 정보를 입력하세요">${repair.device_model || ''}</textarea>
                                    </div>
                                    <div class="form-group">
                                        <label for="editProblem">문제 설명</label>
                                        <textarea id="editProblem" rows="3" placeholder="문제를 설명해주세요">${repair.problem || ''}</textarea>
                                    </div>
                                    <div class="form-group">
                                        <label for="editSolution">해결 방법</label>
                                        <textarea id="editSolution" rows="3" placeholder="해결 방법을 입력하세요">${repair.solution || ''}</textarea>
                                    </div>
                                    <div class="form-group">
                                        <label for="editStatus">상태</label>
                                        <select id="editStatus">
                                            <option value="접수" ${repair.status === '접수' ? 'selected' : ''}>접수</option>
                                            <option value="진행중" ${repair.status === '진행중' ? 'selected' : ''}>진행중</option>
                                            <option value="완료" ${repair.status === '완료' ? 'selected' : ''}>완료</option>
                                            <option value="취소" ${repair.status === '취소' ? 'selected' : ''}>취소</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="editTechnician">담당자</label>
                                        <input type="text" id="editTechnician" value="${repair.technician || ''}" placeholder="담당자명을 입력하세요">
                                    </div>
                                    <div class="form-group">
                                        <label for="editTotalCost">총 비용 (원)</label>
                                        <input type="number" id="editTotalCost" value="${repair.total_cost || 0}" min="0" placeholder="총 비용을 입력하세요">
                                    </div>
                                    <div class="form-group">
                                        <label for="editVatOption">부가세 옵션</label>
                                        <select id="editVatOption">
                                            <option value="included" ${repair.vat_option === 'included' ? 'selected' : ''}>부가세 포함</option>
                                            <option value="excluded" ${repair.vat_option === 'excluded' ? 'selected' : ''}>부가세 미포함</option>
                                            <option value="none" ${repair.vat_option === 'none' ? 'selected' : ''}>부가세 없음</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="editWarranty">품질보증</label>
                                        <textarea id="editWarranty" rows="2" placeholder="품질보증 정보를 입력하세요">${repair.warranty || ''}</textarea>
                                    </div>
                                    <div class="form-group">
                                        <label for="editNotes">비고</label>
                                        <textarea id="editNotes" rows="2" placeholder="추가 메모를 입력하세요">${repair.notes || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 부품 관리 섹션 -->
                            <div class="form-section">
                                <h3>🔧 사용 부품</h3>
                                <div id="editPartsList">
                                    ${repair.parts && repair.parts.length > 0 ? 
                                        repair.parts.map(part => `
                                            <div class="part-item" data-part-id="${part.id}">
                                                <div class="form-grid" style="grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: end;">
                                                    <div>
                                                        <label>부품명</label>
                                                        <input type="text" value="${part.name || ''}" class="part-name" placeholder="부품명">
                                                    </div>
                                                    <div>
                                                        <label>수량</label>
                                                        <input type="number" value="${part.quantity || 1}" class="part-quantity" min="1">
                                                    </div>
                                                    <div>
                                                        <label>단가</label>
                                                        <input type="number" value="${part.unitPrice || 0}" class="part-unit-price" min="0">
                                                    </div>
                                                    <div>
                                                        <label>총액</label>
                                                        <input type="number" value="${part.totalPrice || 0}" class="part-total-price" min="0" readonly>
                                                    </div>
                                                    <div>
                                                        <button type="button" onclick="removePart(this)" class="btn btn-danger btn-sm">삭제</button>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('') : 
                                        '<div class="no-parts">사용된 부품이 없습니다.</div>'
                                    }
                                </div>
                                <button type="button" onclick="addPart()" class="btn btn-outline btn-sm" style="margin-top: 10px;">+ 부품 추가</button>
                            </div>
                            
                            <!-- 인건비 관리 섹션 -->
                            <div class="form-section">
                                <h3>👷 인건비 내역</h3>
                                <div id="editLaborList">
                                    ${repair.labor && repair.labor.length > 0 ? 
                                        repair.labor.map(labor => `
                                            <div class="labor-item" data-labor-id="${labor.id}">
                                                <div class="form-grid" style="grid-template-columns: 2fr 1fr auto; gap: 10px; align-items: end;">
                                                    <div>
                                                        <label>작업명</label>
                                                        <input type="text" value="${labor.name || ''}" class="labor-name" placeholder="작업명">
                                                    </div>
                                                    <div>
                                                        <label>비용</label>
                                                        <input type="number" value="${labor.cost || 0}" class="labor-cost" min="0">
                                                    </div>
                                                    <div>
                                                        <button type="button" onclick="removeLabor(this)" class="btn btn-danger btn-sm">삭제</button>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('') : 
                                        '<div class="no-labor">인건비 내역이 없습니다.</div>'
                                    }
                                </div>
                                <button type="button" onclick="addLabor()" class="btn btn-outline btn-sm" style="margin-top: 10px;">+ 인건비 추가</button>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" onclick="updateRepair(${repairId})" class="btn btn-primary">수정</button>
                        <button type="button" onclick="closeEditRepairModal()" class="btn btn-outline">취소</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } else {
            showMessage('수리 이력을 불러오는데 실패했습니다.', 'error');
        }
        
    } catch (error) {
        console.error('수리 이력 수정 오류:', error);
        showMessage('수리 이력을 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 수정 모달 닫기
function closeEditRepairModal() {
    const modal = document.getElementById('editRepairModal');
    if (modal) {
        modal.remove();
    }
}

// 부품 추가
function addPart() {
    const partsList = document.getElementById('editPartsList');
    const noPartsDiv = partsList.querySelector('.no-parts');
    if (noPartsDiv) {
        noPartsDiv.remove();
    }
    
    const partItem = document.createElement('div');
    partItem.className = 'part-item';
    partItem.innerHTML = `
        <div class="form-grid" style="grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: end; margin-bottom: 10px;">
            <div>
                <label>부품명</label>
                <input type="text" class="part-name" placeholder="부품명">
            </div>
            <div>
                <label>수량</label>
                <input type="number" class="part-quantity" value="1" min="1" onchange="calculatePartTotal(this)">
            </div>
            <div>
                <label>단가</label>
                <input type="number" class="part-unit-price" value="0" min="0" onchange="calculatePartTotal(this)">
            </div>
            <div>
                <label>총액</label>
                <input type="number" class="part-total-price" value="0" min="0" readonly>
            </div>
            <div>
                <button type="button" onclick="removePart(this)" class="btn btn-danger btn-sm">삭제</button>
            </div>
        </div>
    `;
    
    partsList.appendChild(partItem);
}

// 부품 삭제
function removePart(button) {
    const partItem = button.closest('.part-item');
    partItem.remove();
    
    // 부품이 없으면 메시지 표시
    const partsList = document.getElementById('editPartsList');
    if (partsList.children.length === 0) {
        partsList.innerHTML = '<div class="no-parts">사용된 부품이 없습니다.</div>';
    }
}

// 부품 총액 계산
function calculatePartTotal(input) {
    const partItem = input.closest('.part-item');
    const quantity = parseInt(partItem.querySelector('.part-quantity').value) || 0;
    const unitPrice = parseInt(partItem.querySelector('.part-unit-price').value) || 0;
    const totalPrice = quantity * unitPrice;
    
    partItem.querySelector('.part-total-price').value = totalPrice;
}

// 인건비 추가
function addLabor() {
    const laborList = document.getElementById('editLaborList');
    const noLaborDiv = laborList.querySelector('.no-labor');
    if (noLaborDiv) {
        noLaborDiv.remove();
    }
    
    const laborItem = document.createElement('div');
    laborItem.className = 'labor-item';
    laborItem.innerHTML = `
        <div class="form-grid" style="grid-template-columns: 2fr 1fr auto; gap: 10px; align-items: end; margin-bottom: 10px;">
            <div>
                <label>작업명</label>
                <input type="text" class="labor-name" placeholder="작업명">
            </div>
            <div>
                <label>비용</label>
                <input type="number" class="labor-cost" value="0" min="0">
            </div>
            <div>
                <button type="button" onclick="removeLabor(this)" class="btn btn-danger btn-sm">삭제</button>
            </div>
        </div>
    `;
    
    laborList.appendChild(laborItem);
}

// 인건비 삭제
function removeLabor(button) {
    const laborItem = button.closest('.labor-item');
    laborItem.remove();
    
    // 인건비가 없으면 메시지 표시
    const laborList = document.getElementById('editLaborList');
    if (laborList.children.length === 0) {
        laborList.innerHTML = '<div class="no-labor">인건비 내역이 없습니다.</div>';
    }
}

// 수리 이력 업데이트
async function updateRepair(repairId) {
    console.log('🔧 수리 이력 업데이트 시작, ID:', repairId);
    
    try {
        // 폼 데이터 수집
        const repairData = {
            repair_date: document.getElementById('editRepairDate').value,
            device_model: document.getElementById('editDeviceModel').value,
            problem: document.getElementById('editProblem').value,
            solution: document.getElementById('editSolution').value,
            status: document.getElementById('editStatus').value,
            technician: document.getElementById('editTechnician').value,
            total_cost: parseInt(document.getElementById('editTotalCost').value) || 0,
            vat_option: document.getElementById('editVatOption').value,
            warranty: document.getElementById('editWarranty').value,
            notes: document.getElementById('editNotes').value
        };
        
        // 부품 데이터 수집
        const parts = [];
        const partItems = document.querySelectorAll('.part-item');
        partItems.forEach(item => {
            const name = item.querySelector('.part-name').value;
            const quantity = parseInt(item.querySelector('.part-quantity').value) || 0;
            const unitPrice = parseInt(item.querySelector('.part-unit-price').value) || 0;
            const totalPrice = parseInt(item.querySelector('.part-total-price').value) || 0;
            
            if (name && quantity > 0) {
                parts.push({
                    name: name,
                    quantity: quantity,
                    unitPrice: unitPrice,
                    totalPrice: totalPrice
                });
            }
        });
        
        // 인건비 데이터 수집
        const labor = [];
        const laborItems = document.querySelectorAll('.labor-item');
        laborItems.forEach(item => {
            const name = item.querySelector('.labor-name').value;
            const cost = parseInt(item.querySelector('.labor-cost').value) || 0;
            
            if (name && cost > 0) {
                labor.push({
                    name: name,
                    cost: cost
                });
            }
        });
        
        repairData.parts = parts;
        repairData.labor = labor;
        
        console.log('📋 수정할 데이터:', repairData);
        
        // 필수 필드 검증
        if (!repairData.repair_date) {
            showMessage('수리일은 필수입니다.', 'error');
            return;
        }
        
        // API 호출
        const response = await fetch(`/api/repairs/${repairId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(repairData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('수리 이력이 성공적으로 수정되었습니다.', 'success');
            closeEditRepairModal();
            
            // 수리 이력 목록 새로고침
            if (typeof window.loadRepairs === 'function') {
                window.loadRepairs();
            } else {
                loadCustomerData(); // 페이지 새로고침
            }
        } else {
            showMessage(result.message || '수리 이력 수정에 실패했습니다.', 'error');
        }
        
    } catch (error) {
        console.error('수리 이력 업데이트 오류:', error);
        showMessage('수리 이력 수정 중 오류가 발생했습니다.', 'error');
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
            displayRepairs(repairs);
            
            // 통계 업데이트
            updateRepairStatistics(repairs);
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
    const statsCard = document.querySelector('.stats-card');
    if (statsCard) {
        console.log('✅ 통계 카드 찾음, 업데이트 중...');
        statsCard.innerHTML = `
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
        `;
        console.log('🎯 통계 카드 업데이트 완료');
    } else {
        console.warn('⚠️ 통계 카드를 찾을 수 없습니다.');
    }
}

// 전역 함수로 등록
window.loadRepairs = loadRepairs;
window.updateRepairStatistics = updateRepairStatistics;
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

// 전역 함수 등록
window.viewRepairDetail = viewRepairDetail;
window.closeRepairDetailModal = closeRepairDetailModal;
window.printRepairDetail = printRepairDetail;
window.editRepair = editRepair;
window.closeEditRepairModal = closeEditRepairModal;
window.updateRepair = updateRepair;
window.addPart = addPart;
window.removePart = removePart;
window.calculatePartTotal = calculatePartTotal;
window.addLabor = addLabor;
window.removeLabor = removeLabor;

// 수리 이력 탭 전환 시 통계 업데이트
function switchToRepairsTab() {
    console.log('📊 수리 이력 탭으로 전환, 통계 업데이트 중...');
    setTimeout(() => {
        if (typeof window.loadRepairs === 'function') {
            window.loadRepairs();
        }
    }, 200);
}
