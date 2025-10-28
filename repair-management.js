// 수리 이력 관리 관련 함수들 (목록, 수정, 삭제, 상세보기)

// currentCustomerId 전역 변수 확인
if (typeof currentCustomerId === 'undefined') {
    console.error('currentCustomerId가 정의되지 않았습니다. customer-detail.js가 먼저 로드되어야 합니다.');
}

// 수리 이력 수정
async function editRepair(repairId) {
    try {
        const response = await fetch(`/api/repairs/${repairId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            const repair = result.data;
            document.getElementById('repairModalTitle').textContent = '수리 이력 수정';
            
            // 폼에 기존 데이터 채우기
            document.getElementById('repairDate').value = new Date(repair.repairDate).toISOString().split('T')[0];
            document.getElementById('deviceModel').value = repair.deviceModel || '';
            document.getElementById('problem').value = repair.problem;
            document.getElementById('solution').value = repair.solution || '';
            
            // 부품 데이터 로드
            loadPartsData(repair.parts || []);
            
            // 인건비 데이터 로드
            console.log('수리 이력 수정 - 인건비 데이터:', repair.labor);
            loadLaborData(repair.labor || []);
            
            document.getElementById('warranty').value = repair.warranty || '';
            document.getElementById('repairTechnician').value = repair.technician || '';
            document.getElementById('repairStatus').value = repair.status || '완료';
            
            // 부가세 옵션 로드
            const vatOption = repair.vatOption || 'included';
            const vatRadio = document.querySelector(`input[name="vatOption"][value="${vatOption}"]`);
            if (vatRadio) {
                vatRadio.checked = true;
            }
            
            // 수정 모드임을 표시
            document.getElementById('repairForm').setAttribute('data-repair-id', repairId);
            document.getElementById('repairModal').style.display = 'flex';
            
            // 스마트 기능 초기화
            initializeSmartFeatures();
            initializeModalDrag();
        } else {
            showMessage('수리 이력 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
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
function showRepairDetailModal(repair) {
    const modal = document.getElementById('repairDetailModal');
    if (!modal) {
        console.error('repairDetailModal 요소를 찾을 수 없습니다.');
            return;
        }
        
    // 수리 이력 상세 정보 표시
    document.getElementById('detailRepairDate').textContent = new Date(repair.repairDate).toLocaleDateString('ko-KR');
    document.getElementById('detailDeviceModel').textContent = repair.deviceModel || '-';
    document.getElementById('detailProblem').textContent = repair.problem;
    document.getElementById('detailSolution').textContent = repair.solution || '-';
    document.getElementById('detailWarranty').textContent = repair.warranty || '-';
    document.getElementById('detailTechnician').textContent = repair.technician || '-';
    document.getElementById('detailStatus').textContent = repair.status;
    
    // 부품 정보 표시
    const partsDisplay = formatPartsDisplay(repair.parts);
    document.getElementById('detailParts').innerHTML = partsDisplay;
    
    // 인건비 정보 표시
    const laborDisplay = formatLaborDisplay(repair.labor);
    document.getElementById('detailLabor').innerHTML = laborDisplay;
    
    // 비용 정보 표시
    const supplyAmount = getSupplyAmount(repair);
    const vatAmount = getVatAmount(repair);
    const totalCost = repair.totalCost || 0;
    const vatDescription = getVatDescription(repair);
    
    document.getElementById('detailSupplyAmount').textContent = supplyAmount.toLocaleString('ko-KR') + '원';
    document.getElementById('detailVatAmount').textContent = vatAmount.toLocaleString('ko-KR') + '원';
    document.getElementById('detailTotalCost').textContent = totalCost.toLocaleString('ko-KR') + '원';
    document.getElementById('detailVatDescription').textContent = vatDescription;
    
    // 부가세 섹션 표시/숨김
    const vatSection = document.getElementById('detailVatSection');
    if (vatSection) {
        if (repair.vatOption === 'excluded') {
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
    if (!parts || parts.length === 0) return '-';
    
    // 새로운 형식 (객체 배열)
    if (typeof parts[0] === 'object' && parts[0].name) {
        return parts.map(part => 
            `${part.name} (${part.quantity}개 × ${part.unitPrice.toLocaleString('ko-KR')}원 = ${part.totalPrice.toLocaleString('ko-KR')}원)`
        ).join('<br>');
    } 
    // 기존 형식 (문자열 배열)
    else {
        return parts.join(', ');
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
        return labor.map(item => 
            `${item.description}: ${item.amount.toLocaleString('ko-KR')}원`
        ).join('<br>');
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
        
        // 공급가액, 부가세, 총 비용 계산
        const supplyAmount = getSupplyAmount(repair);
        const vatAmount = getVatAmount(repair);
        const totalCost = repair.totalCost || repair.total_cost || 0;
        
        row.innerHTML = `
            <td>${formatDate(repair.repairDate || repair.repair_date)}</td>
            <td>${repair.deviceModel || repair.device_model || '-'}</td>
            <td>${repair.problem || '-'}</td>
            <td>${repair.status || '-'}</td>
            <td>${repair.technician || '-'}</td>
            <td>
                <div style="text-align: right;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
                        공급가액: ${formatNumber(supplyAmount)}원
            </div>
                    <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
                        부가세: ${formatNumber(vatAmount)}원
            </div>
                    <div style="font-size: 14px; font-weight: bold; color: #1976d2;">
                        총 ${formatNumber(totalCost)}원
            </div>
            </div>
            </td>
            <td>
                <button onclick="showRepairDetailModal(${JSON.stringify(repair).replace(/"/g, '&quot;')})" class="btn btn-sm btn-info">상세</button>
                <button onclick="editRepair(${repair.id})" class="btn btn-sm btn-warning">수정</button>
                <button onclick="deleteRepair(${repair.id})" class="btn btn-sm btn-danger">삭제</button>
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

// loadRepairs 함수를 전역으로 노출
window.loadRepairs = loadRepairs;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    addRepairSearchAndFilter();
    addRepairStatistics();
});
