// 수리 이력 관리 관련 함수들 (목록, 수정, 삭제, 상세보기)

// currentCustomerId 전역 변수 확인
if (typeof currentCustomerId === 'undefined') {
    console.error('currentCustomerId가 정의되지 않았습니다. customer-detail.js가 먼저 로드되어야 합니다.');
}

// 수리 이력 수정
async function editRepair(repairId) {
    console.log('editRepair 호출됨, repairId:', repairId);
    
    try {
        console.log('API 요청 시작:', `/api/repairs/${repairId}`);
        const response = await fetch(`/api/repairs/${repairId}`, {
            credentials: 'include'
        });
        
        console.log('API 응답 상태:', response.status);
        console.log('API 응답 OK:', response.ok);
        
        const result = await response.json();
        console.log('API 응답 데이터:', result);
        
        if (result.success) {
            const repair = result.data;
            console.log('수리 이력 데이터:', repair);
            
            const repairModalTitle = document.getElementById('repairModalTitle');
            console.log('repairModalTitle 요소:', repairModalTitle);
            if (repairModalTitle) {
                repairModalTitle.textContent = '수리 이력 수정';
            } else {
                console.error('repairModalTitle 요소를 찾을 수 없습니다.');
            }
            
            // 폼에 기존 데이터 채우기
            const repairDate = repair.repairDate || repair.repair_date;
            const deviceModel = repair.deviceModel || repair.device_model || '';
            const problem = repair.problem || '';
            const solution = repair.solution || '';
            const warranty = repair.warranty || '';
            const technician = repair.technician || '';
            const status = repair.status || '완료';
            const vatOption = repair.vatOption || repair.vat_option || 'included';
            
            console.log('폼 데이터 설정:', {
                repairDate, deviceModel, problem, solution, 
                warranty, technician, status, vatOption
            });
            
            // 폼 요소들 안전하게 접근
            const repairDateEl = document.getElementById('repairDate');
            const deviceModelEl = document.getElementById('deviceModel');
            const problemEl = document.getElementById('problem');
            const solutionEl = document.getElementById('solution');
            const warrantyEl = document.getElementById('warranty');
            const repairTechnicianEl = document.getElementById('repairTechnician');
            const repairStatusEl = document.getElementById('repairStatus');
            
            console.log('폼 요소들:', {
                repairDateEl, deviceModelEl, problemEl, solutionEl,
                warrantyEl, repairTechnicianEl, repairStatusEl
            });
            
            if (repairDateEl && repairDate) {
                repairDateEl.value = new Date(repairDate).toISOString().split('T')[0];
            }
            if (deviceModelEl) {
                deviceModelEl.value = deviceModel;
            }
            if (problemEl) {
                problemEl.value = problem;
            }
            if (solutionEl) {
                solutionEl.value = solution;
            }
            if (warrantyEl) {
                warrantyEl.value = warranty;
            }
            if (repairTechnicianEl) {
                repairTechnicianEl.value = technician;
            }
            if (repairStatusEl) {
                repairStatusEl.value = status;
            }
            
            // 부품 데이터 로드
            console.log('부품 데이터 로드:', repair.parts);
            if (repair.parts && Array.isArray(repair.parts)) {
                console.log('부품 데이터 개수:', repair.parts.length);
                repair.parts.forEach((part, index) => {
                    console.log(`부품 ${index + 1}:`, part);
                });
                
                if (typeof window.loadPartsData === 'function') {
                    window.loadPartsData(repair.parts);
                } else {
                    console.error('window.loadPartsData 함수를 찾을 수 없습니다.');
                }
            } else {
                console.log('부품 데이터가 없거나 배열이 아닙니다:', repair.parts);
                if (typeof window.loadPartsData === 'function') {
                    window.loadPartsData([]);
                }
            }
            
            // 인건비 데이터 로드
            console.log('수리 이력 수정 - 인건비 데이터:', repair.labor);
            console.log('laborList 요소 존재 여부:', !!document.getElementById('laborList'));
            if (typeof window.loadLaborData === 'function') {
                console.log('loadLaborData 함수 호출 시작');
                window.loadLaborData(repair.labor || []);
                console.log('loadLaborData 함수 호출 완료');
            } else {
                console.error('window.loadLaborData 함수를 찾을 수 없습니다.');
            }
            
            // 부가세 옵션 로드
            const vatRadio = document.querySelector(`input[name="vatOption"][value="${vatOption}"]`);
            console.log('부가세 라디오 버튼:', vatRadio, '값:', vatOption);
            if (vatRadio) {
                vatRadio.checked = true;
            } else {
                console.error('부가세 라디오 버튼을 찾을 수 없습니다. 값:', vatOption);
            }
            
            // 수정 모드임을 표시
            const repairForm = document.getElementById('repairForm');
            const repairModal = document.getElementById('repairModal');
            
            console.log('repairForm 요소:', repairForm);
            console.log('repairModal 요소:', repairModal);
            
            if (repairForm) {
                repairForm.setAttribute('data-repair-id', repairId);
            } else {
                console.error('repairForm 요소를 찾을 수 없습니다.');
            }
            
            if (repairModal) {
                repairModal.style.display = 'flex';
    } else {
                console.error('repairModal 요소를 찾을 수 없습니다.');
            }
            
            // 스마트 기능 초기화
            if (typeof window.initializeSmartFeatures === 'function') {
                window.initializeSmartFeatures();
            } else {
                console.error('window.initializeSmartFeatures 함수를 찾을 수 없습니다.');
            }
            
            if (typeof window.initializeModalDrag === 'function') {
                window.initializeModalDrag();
            } else {
                console.error('window.initializeModalDrag 함수를 찾을 수 없습니다.');
            }
        } else {
            showMessage('수리 이력 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 삭제
async function deleteRepair(repairId) {
    console.log('deleteRepair 호출됨, repairId:', repairId);
    
    if (!confirm('정말로 이 수리 이력을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/repairs/${repairId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('응답이 JSON 형식이 아닙니다.');
        }
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('수리 이력이 삭제되었습니다.', 'success');
            loadRepairs(); // 목록 새로고침
        } else {
            showMessage(result.message || '수리 이력 삭제에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('수리 이력 삭제 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 상세 보기
async function showRepairDetailModal(repair) {
    console.log('showRepairDetailModal 호출됨, repair 데이터:', repair);
    
    // repair가 ID만 전달된 경우 처리
    if (typeof repair === 'number' || typeof repair === 'string') {
        console.log('repair ID로 전달됨, 상세 정보 조회 중...', repair);
        try {
            const response = await fetch(`/api/repairs/${repair}`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                repair = result.data;
                console.log('상세 정보 조회 완료:', repair);
            } else {
                console.error('상세 정보 조회 실패:', result.message);
                showMessage('수리 이력 정보를 불러오는데 실패했습니다.', 'error');
                return;
            }
        } catch (error) {
            console.error('상세 정보 조회 오류:', error);
            showMessage('네트워크 오류가 발생했습니다.', 'error');
            return;
        }
    }
    
    const modal = document.getElementById('repairDetailModal');
    if (!modal) {
        console.error('repairDetailModal 요소를 찾을 수 없습니다.');
        return;
    }
        
    // 수리 이력 상세 정보 표시
    console.log('repair.repairDate:', repair.repairDate);
    console.log('repair.deviceModel:', repair.deviceModel);
    console.log('repair.problem:', repair.problem);
    console.log('repair.solution:', repair.solution);
    console.log('repair.warranty:', repair.warranty);
    console.log('repair.technician:', repair.technician);
    console.log('repair.status:', repair.status);
    
    const detailRepairDate = document.getElementById('detailRepairDate');
    const detailDeviceModel = document.getElementById('detailDeviceModel');
    const detailProblem = document.getElementById('detailProblem');
    const detailSolution = document.getElementById('detailSolution');
    const detailWarranty = document.getElementById('detailWarranty');
    const detailTechnician = document.getElementById('detailTechnician');
    const detailStatus = document.getElementById('detailStatus');
    
    console.log('detailRepairDate 요소:', detailRepairDate);
    console.log('detailDeviceModel 요소:', detailDeviceModel);
    console.log('detailProblem 요소:', detailProblem);
    console.log('detailSolution 요소:', detailSolution);
    console.log('detailWarranty 요소:', detailWarranty);
    console.log('detailTechnician 요소:', detailTechnician);
    console.log('detailStatus 요소:', detailStatus);
    
    if (detailRepairDate) {
        const repairDate = repair.repairDate || repair.repair_date;
        detailRepairDate.textContent = repairDate ? new Date(repairDate).toLocaleDateString('ko-KR') : '-';
    }
    if (detailDeviceModel) {
        const deviceModel = repair.deviceModel || repair.device_model || '-';
        detailDeviceModel.textContent = deviceModel;
        console.log('detailDeviceModel에 설정된 값:', deviceModel);
    }
    if (detailProblem) {
        detailProblem.textContent = repair.problem || '-';
    }
    if (detailSolution) {
        detailSolution.textContent = repair.solution || '-';
    }
    if (detailWarranty) {
        detailWarranty.textContent = repair.warranty || '-';
    }
    if (detailTechnician) {
        detailTechnician.textContent = repair.technician || '-';
    }
    if (detailStatus) {
        detailStatus.textContent = repair.status || '-';
    }
    
    // 부품 정보 표시
    console.log('부품 정보 표시 시작, repair.parts:', repair.parts);
    const partsDisplay = formatPartsDisplay(repair.parts);
    const detailPartsElement = document.getElementById('detailParts');
    if (detailPartsElement) {
        detailPartsElement.innerHTML = partsDisplay;
        console.log('부품 정보 표시 완료');
    } else {
        console.error('detailParts 요소를 찾을 수 없습니다.');
    }
    
    // 인건비 정보 표시
    const laborDisplay = formatLaborDisplay(repair.labor);
    document.getElementById('detailLabor').innerHTML = laborDisplay;
    
    // 비용 정보 표시
    const supplyAmount = getSupplyAmount(repair);
    const vatAmount = getVatAmount(repair);
    const totalCost = repair.totalCost || repair.total_cost || 0;
    const vatDescription = getVatDescription(repair);
    
    const detailSupplyAmount = document.getElementById('detailSupplyAmount');
    const detailVatAmount = document.getElementById('detailVatAmount');
    const detailTotalCost = document.getElementById('detailTotalCost');
    const detailVatDescription = document.getElementById('detailVatDescription');
    
    if (detailSupplyAmount) {
        detailSupplyAmount.textContent = supplyAmount.toLocaleString('ko-KR') + '원';
    }
    if (detailVatAmount) {
        detailVatAmount.textContent = vatAmount.toLocaleString('ko-KR') + '원';
    }
    if (detailTotalCost) {
        detailTotalCost.textContent = totalCost.toLocaleString('ko-KR') + '원';
    }
    if (detailVatDescription) {
        detailVatDescription.textContent = vatDescription;
    }
    
    // 부가세 섹션 표시/숨김
    const vatSection = document.getElementById('detailVatSection');
    if (vatSection) {
        const vatOption = repair.vatOption || repair.vat_option;
        if (vatOption === 'excluded') {
            vatSection.style.display = 'block';
            } else {
            vatSection.style.display = 'none';
        }
    }
    
    modal.style.display = 'flex';
}

// 수리 이력 상세 모달 닫기
function closeRepairDetailModal() {
    const modal = document.getElementById('repairDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 수리 이력 상세 프린트
function printRepairDetail() {
    const modal = document.getElementById('repairDetailModal');
    if (!modal) {
        console.error('repairDetailModal 요소를 찾을 수 없습니다.');
                return;
            }

    // 프린트용 스타일 생성
    const printStyles = `
        <style>
            @media print {
                body * {
                    visibility: hidden;
                }
                .print-content, .print-content * {
                    visibility: visible;
                }
                .print-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white;
                    color: black;
                    font-family: Arial, sans-serif;
                }
                .print-header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 5px;
                    margin-bottom: 5px;
                }
                .print-header h1 {
                    font-size: 15px;
                    margin: 0;
                    color: #333;
                }
                .print-section {
                    margin-bottom: 5px;
                    page-break-inside: avoid;
                }
                .print-section h3 {
                    font-size: 18px;
                    color: #2c3e50;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 1px;
                    margin-bottom: 5px;
                }
                .print-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 5px;
                    margin-bottom: 5px;
                }
                .print-item {
                    padding: 2px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: #f9f9f9;
                }
                .print-item label {
                    font-weight: bold;
                    display: block;
                    margin-bottom: 5px;
                    color: #555;
                }
                .print-item span {
                    color: #333;
                }
                .print-costs {
                    background: #f0f0f0;
                    padding: 5px;
                    border-radius: 8px;
                    margin-top: 5px;
                }
                .print-cost-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #ccc;
                }
                .print-cost-item.total {
                    font-weight: bold;
                    font-size: 12px;
                    border-top: 2px solid #333;
                    margin-top: 5px;
                    padding-top: 5px;
                }
                .print-cost-item:last-child {
                    border-bottom: none;
                }
                .print-footer {
                    text-align: center;
                    margin-top: 5px;
                    padding-top: 5px;
                    border-top: 1px solid #ccc;
                    font-size: 10px;
                    color: #666;
                }
                .no-print {
                    display: none !important;
                }
            }
        </style>
    `;
    
    // 프린트용 HTML 생성
    const printContent = `
        <div class="print-content">
            <div class="print-header">
                <h1>다나와 수리센터</h1>
                
            </div>
            
            <div class="print-section">               
                <div class="print-grid">
                    <div class="print-item">
                        <label>👤 고객명</label>
                        <span id="printCustomerName">-</span>
                        </div>
                    <div class="print-item">
                        <label>📞 전화번호</label>
                        <span id="printCustomerPhone">-</span>
                        </div>
                    <div class="print-item">
                        <label>🏠 주소</label>
                        <span id="printCustomerAddress">-</span>
                        </div>
                    <div class="print-item">
                        <label>🔢 관리번호</label>
                        <span id="printCustomerId">-</span>
                        </div>
                    </div>
                    </div>
                    
            <div class="print-section">
                <div class="print-grid">
                    <div class="print-item" style="grid-column: 1 / -1;">
                        <label>💻 모델</label>
                        <span id="printDeviceModel">-</span>
                    </div>
                    <div class="print-item" style="grid-column: 1 / -1;">
                        <label>⚠️ 문제</label>
                        <span id="printProblem">-</span>
                    </div>
                    <div class="print-item" style="grid-column: 1 / -1;">
                        <label>🔧 해결방법</label>
                        <span id="printSolution">-</span>
                    </div>
                    </div>
            
            <div class="print-section">
                <h3>🔩 사용 부품</h3>
                <div id="printParts" style="padding: 15px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">-</div>
                    </div>
            
            <div class="print-section">
                <div id="printLabor" style="padding: 15px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">-</div>
                    </div>
            
            <div class="print-section">
                <h3>💰 비용 내역</h3>
                <div class="print-costs">
                    <div class="print-cost-item">
                        <span>💵 공급가액</span>
                        <span id="printSupplyAmount">-</span>
                    </div>
                    <div class="print-cost-item" id="printVatSection" style="display: none;">
                        <span>🧾 부가세 (10%)</span>
                        <span id="printVatAmount">-</span>
                </div>
                    <div class="print-cost-item total">
                        <span>💎 총 비용</span>
                        <span id="printTotalCost">-</span>
            </div>
                    <div style="text-align: center; margin-top: 15px; font-style: italic; color: #666;">
                        <span id="printVatDescription">-</span>
        </div>
            
            <div class="print-footer">
                <p>이 보고서는 시스템에서 자동으로 생성되었습니다.</p>
            </div>
        </div>
    `;
    
    // 프린트용 윈도우 열기
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>다나와 수리센터</title>
                ${printStyles}
            </head>
            <body>
                ${printContent}
            </body>
        </html>
    `);
    
    // 현재 모달의 데이터를 프린트용으로 복사
    const currentData = {
        repairDate: document.getElementById('detailRepairDate').textContent,
        deviceModel: document.getElementById('detailDeviceModel').textContent,
        problem: document.getElementById('detailProblem').textContent,
        solution: document.getElementById('detailSolution').textContent,
        warranty: document.getElementById('detailWarranty').textContent,
        technician: document.getElementById('detailTechnician').textContent,
        status: document.getElementById('detailStatus').textContent,
        parts: document.getElementById('detailParts').innerHTML,
        labor: document.getElementById('detailLabor').innerHTML,
        supplyAmount: document.getElementById('detailSupplyAmount').textContent,
        vatAmount: document.getElementById('detailVatAmount').textContent,
        totalCost: document.getElementById('detailTotalCost').textContent,
        vatDescription: document.getElementById('detailVatDescription').textContent,
        vatSectionVisible: document.getElementById('detailVatSection').style.display !== 'none'
    };
    
    // 고객 정보 가져오기 (전역 currentCustomer 객체에서 가져오기)
    const customerInfo = {
        name: (typeof window.currentCustomer !== 'undefined' && window.currentCustomer.name) || '-',
        phone: (typeof window.currentCustomer !== 'undefined' && window.currentCustomer.phone) || '-',
        address: (typeof window.currentCustomer !== 'undefined' && window.currentCustomer.address) || '-',
        id: currentCustomerId || '-'
    };
    
    console.log('프린트용 고객 정보:', customerInfo);
    
    // 프린트용 데이터 설정
    // 고객 정보
    printWindow.document.getElementById('printCustomerName').textContent = customerInfo.name;
    printWindow.document.getElementById('printCustomerPhone').textContent = customerInfo.phone;
    printWindow.document.getElementById('printCustomerAddress').textContent = customerInfo.address;
    printWindow.document.getElementById('printCustomerId').textContent = customerInfo.id;
    
    // 수리 정보
    printWindow.document.getElementById('printDeviceModel').textContent = currentData.deviceModel;
    printWindow.document.getElementById('printProblem').textContent = currentData.problem;
    printWindow.document.getElementById('printSolution').textContent = currentData.solution;
    printWindow.document.getElementById('printParts').innerHTML = currentData.parts;
    printWindow.document.getElementById('printLabor').innerHTML = currentData.labor;
    printWindow.document.getElementById('printSupplyAmount').textContent = currentData.supplyAmount;
    printWindow.document.getElementById('printVatAmount').textContent = currentData.vatAmount;
    printWindow.document.getElementById('printTotalCost').textContent = currentData.totalCost;
    printWindow.document.getElementById('printVatDescription').textContent = currentData.vatDescription;
    
    // 부가세 섹션 표시/숨김
    if (currentData.vatSectionVisible) {
        printWindow.document.getElementById('printVatSection').style.display = 'flex';
    }
    
    printWindow.document.close();
    
    // 프린트 대화상자 열기
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// 부품 표시 형식 포맷
function formatPartsDisplay(parts) {
    console.log('formatPartsDisplay 호출됨, parts 데이터:', parts);
    console.log('parts 타입:', typeof parts);
    console.log('parts 길이:', parts ? parts.length : 'undefined');
    
    if (!parts || parts.length === 0) {
        console.log('parts 데이터가 없거나 빈 배열입니다.');
        return '<div style="text-align: center; padding: 20px; color: #666; font-style: italic;">사용된 부품이 없습니다.</div>';
    }
    
    // 새로운 형식 (객체 배열)
    if (typeof parts[0] === 'object' && parts[0].name) {
        console.log('새로운 형식의 parts 데이터 포맷:', parts);
        
        // 부품별 총액 계산
        const totalPartsCost = parts.reduce((sum, part) => {
            const quantity = part.quantity || 0;
            const unitPrice = part.unitPrice || 0;
            const totalPrice = part.totalPrice || (quantity * unitPrice);
            console.log(`부품 ${part.name} 계산: 수량=${quantity}, 단가=${unitPrice}, 총액=${totalPrice}`);
            return sum + totalPrice;
        }, 0);
        
        console.log('부품 총액:', totalPartsCost);
        
        const partsHTML = parts.map(part => {
            console.log('부품 데이터 처리:', part);
            // 안전한 숫자 처리
            const quantity = part.quantity || 0;
            const unitPrice = part.unitPrice || 0;
            const totalPrice = part.totalPrice || (quantity * unitPrice);
            
            console.log(`부품 ${part.name}: 수량=${quantity}, 단가=${unitPrice}, 총액=${totalPrice}`);
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 2px;">${part.name}</div>
                        <div style="font-size: 12px; color: #666;">수량: ${quantity}개 × 단가: ${unitPrice.toLocaleString('ko-KR')}원</div>
                    </div>
                    <div style="text-align: right; font-weight: bold; color: #1976d2;">
                        ${totalPrice.toLocaleString('ko-KR')}원
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div style="margin-bottom: 16px;">
                ${partsHTML}
            </div>
            <div style="text-align: right; padding: 12px; background: #f8f9fa; border-radius: 6px; margin-top: 8px;">
                <span style="font-weight: bold; color: #333;">부품 총액: ${totalPartsCost.toLocaleString('ko-KR')}원</span>
            </div>
        `;
    } 
    // 기존 형식 (문자열 배열)
    else {
        console.log('기존 형식의 parts 데이터:', parts);
        return parts.map(part => `<div style="padding: 4px 0;">• ${part}</div>`).join('');
    }
}

// 인건비 표시 형식 포맷
function formatLaborDisplay(labor) {
    console.log('formatLaborDisplay 호출됨, labor 데이터:', labor);
    
    if (!labor || labor.length === 0) {
        console.log('labor 데이터가 없거나 빈 배열입니다.');
        return '-';
    }
    
    // 새로운 형식 (객체 배열)
    if (typeof labor[0] === 'object' && labor[0].description) {
        console.log('새로운 형식의 labor 데이터 포맷:', labor);
        return labor.map(item => {
            // 안전한 숫자 처리
            const amount = item.amount || 0;
            return `${item.description}: ${amount.toLocaleString('ko-KR')}원`;
        }).join('<br>');
    } 
    // 기존 형식 (숫자)
    else if (typeof labor === 'number') {
        console.log('기존 형식의 labor 데이터 포맷:', labor);
        return `수리 작업: ${labor.toLocaleString('ko-KR')}원`;
    }
    // 기타 형식
    else {
        console.log('알 수 없는 labor 데이터 형식:', labor);
        return '-';
    }
}

// 공급가액 계산
function getSupplyAmount(repair) {
    const totalCost = repair.totalCost || repair.total_cost || 0;
    const vatOption = repair.vatOption || repair.vat_option || 'none';
    
    if (vatOption === 'included') {
        // 부가세 포함: 총 비용에서 부가세 제외
        return Math.round(totalCost / 1.1);
    } else if (vatOption === 'excluded') {
        // 부가세 미포함: 총 비용에서 부가세 제외
        return Math.round(totalCost / 1.1);
        } else {
        // 부가세 없음: 총 비용 그대로
        return totalCost;
    }
}

// 부가세 계산
function getVatAmount(repair) {
    const totalCost = repair.totalCost || repair.total_cost || 0;
    const vatOption = repair.vatOption || repair.vat_option || 'none';
    
    if (vatOption === 'included') {
        // 부가세 포함: 총 비용 - 공급가액
        return totalCost - getSupplyAmount(repair);
    } else if (vatOption === 'excluded') {
        // 부가세 미포함: 공급가액 * 0.1
        return Math.round(getSupplyAmount(repair) * 0.1);
            } else {
        // 부가세 없음: 0
        return 0;
    }
}

// 부가세 설명
function getVatDescription(repair) {
    const vatOption = repair.vatOption || 'included';
    if (vatOption === 'included') {
        return '부품비 + 인건비 (부가세 포함)';
    } else if (vatOption === 'excluded') {
        return '부품비 + 인건비 (부가세 미포함)';
        } else {
        return '부품비 + 인건비 (부가세 없음)';
    }
}

// 수리 이력 목록 표시
function displayRepairs(repairs) {
    console.log('displayRepairs 호출됨, repairs 데이터:', repairs);
    console.log('repairs 길이:', repairs.length);
    
    const tbody = document.querySelector('#repairsTableBody');
    if (!tbody) {
        console.error('repairsTable tbody를 찾을 수 없습니다.');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (repairs.length === 0) {
        console.log('수리 이력이 없습니다.');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #666;">수리 이력이 없습니다.</td></tr>';
        return;
    }
    
    repairs.forEach(repair => {
        const row = document.createElement('tr');
        
        // 안전한 숫자 변환 함수
        const formatNumber = (value) => {
            if (value === null || value === undefined || isNaN(value)) {
                return '0';
            }
            return Number(value).toLocaleString('ko-KR');
        };
        
        // 안전한 날짜 포맷팅
        const formatDate = (dateStr) => {
            if (!dateStr) return '-';
            try {
                return new Date(dateStr).toLocaleDateString('ko-KR');
            } catch (e) {
                return dateStr;
            }
        };
        
        // 상태별 CSS 클래스 반환
        const getStatusClass = (status) => {
            switch (status) {
                case '완료': return 'status-completed';
                case '진행중': return 'status-progress';
                case '대기': return 'status-waiting';
                case '위탁접수': return 'status-received';
                case '취소': return 'status-cancelled';
                default: return 'status-default';
            }
        };
        
        // 공급가액, 부가세, 총 비용 계산
        const supplyAmount = getSupplyAmount(repair);
        const vatAmount = getVatAmount(repair);
        const totalCost = repair.totalCost || repair.total_cost || 0;
        
        row.innerHTML = `
            <td style="white-space: nowrap;">${formatDate(repair.repairDate || repair.repair_date)}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(repair.deviceModel || repair.device_model || '-').replace(/"/g, '&quot;')}">${repair.deviceModel || repair.device_model || '-'}</td>
            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(repair.problem || '-').replace(/"/g, '&quot;')}">${repair.problem || '-'}</td>
            <td style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(repair.solution || '-').replace(/"/g, '&quot;')}">${repair.solution || '-'}</td>
            <td style="text-align: right; min-width: 120px;">
                <div style="text-align: right;">
                    <div style="font-size: 11px; color: #666; margin-bottom: 1px;">
                        공급가액: ${formatNumber(supplyAmount)}원
                    </div>
                    <div style="font-size: 11px; color: #666; margin-bottom: 1px;">
                        부가세: ${formatNumber(vatAmount)}원
                    </div>
                    <div style="font-size: 13px; font-weight: bold; color: #1976d2;">
                        총 ${formatNumber(totalCost)}원
                    </div>
                </div>
            </td>
            <td style="text-align: center; white-space: nowrap;">
                <span class="status-badge ${getStatusClass(repair.status)}">${repair.status || '-'}</span>
            </td>
            <td style="white-space: nowrap; font-size: 12px;">${repair.warranty || '-'}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="showRepairDetailModal(${JSON.stringify(repair).replace(/"/g, '&quot;')})" class="btn btn-sm btn-info" title="상세보기">상세</button>
                <button onclick="editRepair(${repair.id})" class="btn btn-sm btn-warning" title="수정">수정</button>
                <button onclick="deleteRepair(${repair.id})" class="btn btn-sm btn-danger" title="삭제">삭제</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// 수리 이력 통계 업데이트
function updateRepairStatistics(repairs) {
    const totalRepairs = repairs.length;
    const completedRepairs = repairs.filter(r => r.status === '완료').length;
    const warrantyRepairs = repairs.filter(r => r.status === '보증중').length;
    
    // 총 수리 비용 계산
    const totalCost = repairs.reduce((sum, repair) => sum + (repair.totalCost || 0), 0);
    
    // 부가세별 통계
    const includedRepairs = repairs.filter(r => r.vatOption === 'included').length;
    const excludedRepairs = repairs.filter(r => r.vatOption === 'excluded').length;
    const noneRepairs = repairs.filter(r => r.vatOption === 'none').length;
    
    // 통계 카드 업데이트
    const statsCard = document.querySelector('.stats-card');
    if (statsCard) {
        statsCard.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${totalRepairs}</div>
                <div class="stat-label">총 수리 건수</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${completedRepairs}</div>
                <div class="stat-label">완료</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${warrantyRepairs}</div>
                <div class="stat-label">보증중</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${totalCost.toLocaleString('ko-KR')}원</div>
                <div class="stat-label">총 수리 비용</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${includedRepairs}</div>
                <div class="stat-label">부가세 포함</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${excludedRepairs}</div>
                <div class="stat-label">부가세 미포함</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${noneRepairs}</div>
                <div class="stat-label">부가세 없음</div>
            </div>
        `;
    }
}

// 수리 이력 검색 및 필터링
function addRepairSearchAndFilter() {
    const searchInput = document.getElementById('repairSearch');
    const statusFilter = document.getElementById('repairStatusFilter');
    const dateFromInput = document.getElementById('repairDateFrom');
    const dateToInput = document.getElementById('repairDateTo');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterRepairs);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterRepairs);
    }
    if (dateFromInput) {
        dateFromInput.addEventListener('change', filterRepairs);
    }
    if (dateToInput) {
        dateToInput.addEventListener('change', filterRepairs);
    }
}

// 수리 이력 필터링
function filterRepairs() {
    const searchTerm = document.getElementById('repairSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('repairStatusFilter')?.value || '';
    const dateFrom = document.getElementById('repairDateFrom')?.value || '';
    const dateTo = document.getElementById('repairDateTo')?.value || '';
    
    const rows = document.querySelectorAll('#repairsTable tbody tr');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return; // 헤더 행이 아닌 경우만 처리
        
        const date = cells[0].textContent;
        const model = cells[1].textContent.toLowerCase();
        const problem = cells[2].textContent.toLowerCase();
        const status = cells[3].textContent;
        
        let show = true;
        
        // 검색어 필터링
        if (searchTerm && !model.includes(searchTerm) && !problem.includes(searchTerm)) {
            show = false;
        }
        
        // 상태 필터링
        if (statusFilter && status !== statusFilter) {
            show = false;
        }
        
        // 날짜 필터링
        if (dateFrom || dateTo) {
            const repairDate = new Date(date);
            if (dateFrom && repairDate < new Date(dateFrom)) {
                show = false;
            }
            if (dateTo && repairDate > new Date(dateTo)) {
                show = false;
            }
        }
        
        row.style.display = show ? '' : 'none';
    });
}

// 수리 이력 통계 추가
function addRepairStatistics() {
    const repairsTab = document.getElementById('repairsTab');
    if (!repairsTab) return;
    
    const sectionHeader = repairsTab.querySelector('.section-header');
    if (sectionHeader && !sectionHeader.querySelector('.stats-card')) {
        const statsCard = document.createElement('div');
        statsCard.className = 'stats-card';
        statsCard.style.cssText = `
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            color: white;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            overflow-x: auto;
        `;
        
        const statItemStyle = `
        text-align: center;
            min-width: 100px;
        `;
        
        const statValueStyle = `
            font-size: 24px;
                font-weight: bold;
            margin-bottom: 5px;
        `;
        
        const statLabelStyle = `
        font-size: 12px;
            opacity: 0.9;
        `;
        
        statsCard.innerHTML = `
            <div class="stat-item" style="${statItemStyle}">
                <div class="stat-value" style="${statValueStyle}">0</div>
                <div class="stat-label" style="${statLabelStyle}">총 수리 건수</div>
            </div>
            <div class="stat-item" style="${statItemStyle}">
                <div class="stat-value" style="${statValueStyle}">0</div>
                <div class="stat-label" style="${statLabelStyle}">완료</div>
            </div>
            <div class="stat-item" style="${statItemStyle}">
                <div class="stat-value" style="${statValueStyle}">0</div>
                <div class="stat-label" style="${statLabelStyle}">보증중</div>
            </div>
            <div class="stat-item" style="${statItemStyle}">
                <div class="stat-value" style="${statValueStyle}">0원</div>
                <div class="stat-label" style="${statLabelStyle}">총 수리 비용</div>
            </div>
            <div class="stat-item" style="${statItemStyle}">
                <div class="stat-value" style="${statValueStyle}">0</div>
                <div class="stat-label" style="${statLabelStyle}">부가세 포함</div>
            </div>
            <div class="stat-item" style="${statItemStyle}">
                <div class="stat-value" style="${statValueStyle}">0</div>
                <div class="stat-label" style="${statLabelStyle}">부가세 미포함</div>
            </div>
            <div class="stat-item" style="${statItemStyle}">
                <div class="stat-value" style="${statValueStyle}">0</div>
                <div class="stat-label" style="${statLabelStyle}">부가세 없음</div>
            </div>
        `;
        
        sectionHeader.appendChild(statsCard);
    }
}

// 수리 이력 로드
async function loadRepairs() {
    console.log('loadRepairs 호출됨, currentCustomerId:', currentCustomerId);
    try {
        const response = await fetch(`/api/repairs?customerId=${currentCustomerId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        console.log('서버 응답:', result);
        
        if (result.success) {
            const repairs = result.data;
            console.log('서버에서 받은 repairs 데이터:', repairs);
            displayRepairs(repairs);
            updateRepairStatistics(repairs);
                } else {
            console.error('서버 응답 실패:', result.message);
            showMessage('수리 이력을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('수리 이력 로드 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 메시지 표시 함수
function showMessage(message, type) {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 새 메시지 생성
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // 스타일 적용
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
                        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ${type === 'success' ? 'background-color: #4caf50;' : 'background-color: #f44336;'}
    `;
    
    document.body.appendChild(messageDiv);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// 함수들을 전역으로 노출
window.loadRepairs = loadRepairs;
window.showRepairDetailModal = showRepairDetailModal;
window.editRepair = editRepair;
window.deleteRepair = deleteRepair;
window.showMessage = showMessage;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    addRepairSearchAndFilter();
    addRepairStatistics();
});
