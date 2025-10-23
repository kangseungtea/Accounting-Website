// 수리 이력 관리 관련 함수들

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
    
    document.getElementById('repairModalTitle').textContent = '수리 이력 추가';
    
    // 폼 필드 개별 초기화 (reset() 대신)
    document.getElementById('repairDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('deviceModel').value = '';
    document.getElementById('problem').value = '';
    document.getElementById('solution').value = '';
    document.getElementById('parts').value = '';
    document.getElementById('laborCost').value = '';
    document.getElementById('partsCost').value = '';
    document.getElementById('warranty').value = '';
    document.getElementById('repairTechnician').value = '';
    document.getElementById('repairStatus').value = '완료';
    document.getElementById('repairNotes').value = '';
    
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
    const modalContent = modal.querySelector('.modal-content');
    
    // 모달 위치 초기화
    if (modalContent) {
        modalContent.style.position = '';
        modalContent.style.left = '';
        modalContent.style.top = '';
        modalContent.style.transform = '';
        modalContent.style.margin = '';
        modalContent.style.cursor = '';
    }
    
    modal.style.display = 'none';
    // 수정 모드 속성 제거
    document.getElementById('repairForm').removeAttribute('data-repair-id');
}

// 수리 이력 로드
async function loadRepairs() {
    // currentCustomerId 재확인
    if (!currentCustomerId) {
        const urlParams = new URLSearchParams(window.location.search);
        currentCustomerId = urlParams.get('id');
        console.log('loadRepairs에서 재확인한 currentCustomerId:', currentCustomerId);
    }
    
    if (!currentCustomerId) {
        console.error('currentCustomerId가 없어서 수리 이력을 불러올 수 없습니다.');
        return;
    }
    
    try {
        const response = await fetch(`/api/repairs?customerId=${currentCustomerId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            displayRepairs(result.data);
        } else {
            showMessage('수리 이력을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 표시
function displayRepairs(repairs) {
    const tbody = document.getElementById('repairsTableBody');
    tbody.innerHTML = '';
    
    if (repairs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">수리 이력이 없습니다.</td></tr>';
        return;
    }
    
    repairs.forEach(repair => {
        const row = document.createElement('tr');
        const statusBadge = getStatusBadge(repair.status);
        const warrantyStatus = getWarrantyStatus(repair);
        
        row.innerHTML = `
            <td>${new Date(repair.repairDate).toLocaleDateString('ko-KR')}</td>
            <td>${repair.deviceModel || '-'}</td>
            <td>${repair.problem}</td>
            <td>${repair.solution || '-'}</td>
            <td>${repair.totalCost.toLocaleString('ko-KR')}원</td>
            <td>${statusBadge}</td>
            <td>${warrantyStatus}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewRepairDetail(${repair.id})">상세</button>
                    <button class="action-btn edit-btn" onclick="editRepair(${repair.id})">수정</button>
                    <button class="action-btn status-btn" onclick="changeRepairStatus(${repair.id})">상태변경</button>
                    <button class="action-btn delete-btn" onclick="deleteRepair(${repair.id})">삭제</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

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
            document.getElementById('parts').value = repair.parts ? repair.parts.join(', ') : '';
            document.getElementById('laborCost').value = repair.laborCost || '';
            document.getElementById('partsCost').value = repair.partsCost || '';
            document.getElementById('warranty').value = repair.warranty || '';
            document.getElementById('repairTechnician').value = repair.technician || '';
            document.getElementById('repairStatus').value = repair.status || '완료';
            document.getElementById('repairNotes').value = repair.notes || '';
            
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
        const result = await response.json();
        
        if (result.success) {
            showMessage('수리 이력이 삭제되었습니다.', 'success');
            loadRepairs();
        } else {
            showMessage(result.message || '수리 이력 삭제에 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 폼 제출 이벤트 리스너 등록
function initializeRepairForm() {
    document.getElementById('repairForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // currentCustomerId 확인
        if (!currentCustomerId) {
            showMessage('고객 ID가 설정되지 않았습니다. 페이지를 새로고침해주세요.', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        const repairData = Object.fromEntries(formData);
        repairData.customerId = currentCustomerId;
        
        // 필수 필드 확인
        if (!repairData.problem) {
            showMessage('문제는 필수 입력 항목입니다.', 'error');
            return;
        }
        
        // 부품 문자열을 배열로 변환
        if (repairData.parts) {
            repairData.parts = repairData.parts.split(',').map(part => part.trim()).filter(part => part);
        }
        
        // 숫자 필드 변환
        repairData.laborCost = parseFloat(repairData.laborCost) || 0;
        repairData.partsCost = parseFloat(repairData.partsCost) || 0;
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
                credentials: 'include',
                body: JSON.stringify(repairData)
            });

            console.log('응답 상태:', response.status, response.statusText);
            console.log('응답 헤더:', response.headers.get('content-type'));

            // 응답이 JSON인지 확인
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('JSON이 아닌 응답:', text);
                showMessage('서버 오류가 발생했습니다. 페이지를 새로고침해주세요.', 'error');
                return;
            }

            const result = await response.json();
            console.log('서버 응답:', result); // 디버깅용

            if (result.success) {
                showMessage(result.message, 'success');
                closeRepairModal();
                loadRepairs();
            } else {
                showMessage(result.message || '오류가 발생했습니다.', 'error');
            }
        } catch (error) {
            console.error('수리 이력 저장 오류:', error); // 디버깅용
            showMessage('네트워크 오류가 발생했습니다.', 'error');
        }
    });
}

// 수리 상태 변경
async function changeRepairStatus(repairId) {
    try {
        const response = await fetch(`/api/repairs/${repairId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            const repair = result.data;
            const newStatus = prompt(`현재 상태: ${repair.status}\n새로운 상태를 입력하세요 (접수, 위탁접수, 완료, 보증중):`, repair.status);
            
            if (newStatus && newStatus !== repair.status) {
                const updateResponse = await fetch(`/api/repairs/${repairId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ status: newStatus })
                });
                
                const updateResult = await updateResponse.json();
                
                if (updateResult.success) {
                    showMessage('수리 상태가 변경되었습니다.', 'success');
                    loadRepairs();
                } else {
                    showMessage(updateResult.message || '상태 변경에 실패했습니다.', 'error');
                }
            }
        } else {
            showMessage('수리 이력 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 상세 보기
async function viewRepairDetail(repairId) {
    try {
        const response = await fetch(`/api/repairs/${repairId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            const repair = result.data;
            showRepairDetailModal(repair);
        } else {
            showMessage('수리 이력 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 상세 모달 표시
function showRepairDetailModal(repair) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>수리 이력 상세 정보</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 30px;">
                <div class="repair-detail-grid">
                    <div class="detail-item">
                        <label>수리일</label>
                        <span>${new Date(repair.repairDate).toLocaleDateString('ko-KR')}</span>
                    </div>
                       <div class="detail-item">
                        <label>담당 기사</label>
                        <span>${repair.technician || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>모델명</label>
                        <span>${repair.deviceModel || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>상태</label>
                        <span>${getStatusBadge(repair.status)}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>문제</label>
                        <span>${repair.problem}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>해결방법</label>
                        <span>${repair.solution || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <label>인건비</label>
                        <span>${repair.laborCost.toLocaleString('ko-KR')}원</span>
                    </div>
                    <div class="detail-item">
                        <label>부품비</label>
                        <span>${repair.partsCost.toLocaleString('ko-KR')}원</span>
                    </div>
                    <div class="detail-item">
                        <label>총비용</label>
                        <span>${repair.totalCost.toLocaleString('ko-KR')}원</span>
                    </div>
                    <div class="detail-item">
                        <label>보증기간</label>
                        <span>${repair.warranty}일</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>사용 부품</label>
                        <span>${repair.parts ? repair.parts.join(', ') : '-'}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>메모</label>
                        <span>${repair.notes || '-'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 수리 이력 검색 및 필터링
function addRepairSearchAndFilter() {
    const searchContainer = document.querySelector('#repairsTab .section-header');
    if (!searchContainer) return;
    
    const searchHTML = `
        <div class="repair-search-filter" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                <input type="text" id="repairSearch" placeholder="모델명, 문제로 검색..." 
                       style="flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
                <select id="repairStatusFilter" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="">전체 상태</option>
                    <option value="접수">접수</option>
                    <option value="위탁접수">위탁접수</option>
                    <option value="완료">완료</option>
                    <option value="보증중">보증중</option>
                </select>
                <button onclick="clearRepairFilters()" class="btn btn-outline" style="padding: 8px 16px;">초기화</button>
            </div>
        </div>
    `;
    
    searchContainer.insertAdjacentHTML('afterend', searchHTML);
    
    // 이벤트 리스너 등록
    document.getElementById('repairSearch').addEventListener('input', filterRepairs);
    document.getElementById('repairStatusFilter').addEventListener('change', filterRepairs);
}

// 수리 이력 필터링
let allRepairs = [];
let filteredRepairs = [];

async function filterRepairs() {
    const searchTerm = document.getElementById('repairSearch').value.toLowerCase();
    const statusFilter = document.getElementById('repairStatusFilter').value;
    
    filteredRepairs = allRepairs.filter(repair => {
        const matchesSearch = !searchTerm || 
            (repair.deviceModel && repair.deviceModel.toLowerCase().includes(searchTerm)) ||
            repair.problem.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || repair.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    displayRepairs(filteredRepairs);
}

// 필터 초기화
function clearRepairFilters() {
    document.getElementById('repairSearch').value = '';
    document.getElementById('repairStatusFilter').value = '';
    filteredRepairs = [...allRepairs];
    displayRepairs(filteredRepairs);
}

// 수리 통계 표시
function addRepairStatistics() {
    const statsContainer = document.querySelector('#repairsTab .section-header');
    if (!statsContainer) return;
    
    const statsHTML = `
        <div class="repair-stats" style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div class="stat-card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                <h4 style="margin: 0 0 5px 0; color: #333;">총 수리 건수</h4>
                <span id="totalRepairs" style="font-size: 24px; font-weight: bold; color: #1a73e8;">0</span>
            </div>
            <div class="stat-card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                <h4 style="margin: 0 0 5px 0; color: #333;">완료된 수리</h4>
                <span id="completedRepairs" style="font-size: 24px; font-weight: bold; color: #28a745;">0</span>
            </div>
            <div class="stat-card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                <h4 style="margin: 0 0 5px 0; color: #333;">진행중인 수리</h4>
                <span id="inProgressRepairs" style="font-size: 24px; font-weight: bold; color: #ffc107;">0</span>
            </div>
            <div class="stat-card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                <h4 style="margin: 0 0 5px 0; color: #333;">총 수리 비용</h4>
                <span id="totalRepairCost" style="font-size: 24px; font-weight: bold; color: #dc3545;">0원</span>
            </div>
        </div>
    `;
    
    statsContainer.insertAdjacentHTML('afterend', statsHTML);
}

// 통계 업데이트
function updateRepairStatistics(repairs) {
    allRepairs = repairs;
    filteredRepairs = [...repairs];
    
    const totalRepairs = repairs.length;
    const completedRepairs = repairs.filter(r => r.status === '완료').length;
    const inProgressRepairs = repairs.filter(r => ['접수', '진단', '수리중'].includes(r.status)).length;
    const totalCost = repairs.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    
    document.getElementById('totalRepairs').textContent = totalRepairs;
    document.getElementById('completedRepairs').textContent = completedRepairs;
    document.getElementById('inProgressRepairs').textContent = inProgressRepairs;
    document.getElementById('totalRepairCost').textContent = totalCost.toLocaleString('ko-KR') + '원';
}

// 수리 이력 로드 함수 수정
async function loadRepairs() {
    try {
        const response = await fetch(`/api/repairs?customerId=${currentCustomerId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            displayRepairs(result.data);
            updateRepairStatistics(result.data);
        } else {
            showMessage('수리 이력을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 모달 드래그 기능 초기화
function initializeModalDrag() {
    const modal = document.getElementById('repairModal');
    const modalContent = modal.querySelector('.modal-content');
    const modalHeader = modal.querySelector('.modal-header');
    
    if (!modal || !modalContent || !modalHeader) return;
    
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;
    
    // 모달 위치 초기화
    modalContent.style.position = 'absolute';
    modalContent.style.left = '50%';
    modalContent.style.top = '50%';
    modalContent.style.transform = 'translate(-50%, -50%)';
    modalContent.style.margin = '0';
    
    // 마우스 다운 이벤트 (드래그 시작)
    modalHeader.addEventListener('mousedown', dragStart);
    
    // 마우스 이동 이벤트
    document.addEventListener('mousemove', drag);
    
    // 마우스 업 이벤트 (드래그 종료)
    document.addEventListener('mouseup', dragEnd);
    
    // 터치 이벤트 (모바일 지원)
    modalHeader.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);
    
    function dragStart(e) {
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }
        
        if (e.target === modalHeader || modalHeader.contains(e.target)) {
            isDragging = true;
            modalContent.style.cursor = 'grabbing';
        }
    }
    
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }
            
            xOffset = currentX;
            yOffset = currentY;
            
            modalContent.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }
    
    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        modalContent.style.cursor = 'move';
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeRepairModal();
        }
    });
}

// 스마트 기능 초기화
function initializeSmartFeatures() {
    // 1. 자동 완성 기능
    initializeAutoComplete();
    
    // 2. 실시간 비용 계산
    initializeCostCalculation();
    
    // 3. 스마트 제안 기능
    initializeSmartSuggestions();
    
    // 4. 폼 검증 강화
    initializeFormValidation();
    
    // 5. 키보드 단축키
    initializeKeyboardShortcuts();
    
    // 6. textarea 자동 크기 조절
    initializeTextareaAutoResize();
}

// 자동 완성 기능
function initializeAutoComplete() {
    const deviceModelInput = document.getElementById('deviceModel');
    const problemTextarea = document.getElementById('problem');
    const solutionTextarea = document.getElementById('solution');
    const technicianInput = document.getElementById('repairTechnician');
    
    // 모델명 자동 완성 (일반적인 모델들)
    const commonModels = [
        'Samsung Galaxy Book Pro', 'LG Gram', 'MacBook Air', 'MacBook Pro', 'ASUS ZenBook', 'HP Pavilion',
        'Samsung DM500', 'LG 24인치', 'Dell OptiPlex', 'HP EliteDesk', 'Lenovo ThinkCentre',
        'Samsung 24인치', 'LG 27인치', 'Dell UltraSharp', 'ASUS ProArt', 'BenQ PD',
        'Samsung ML-2160', 'HP LaserJet', 'Canon PIXMA', 'Epson L3150', 'Brother DCP',
        '키보드', '마우스', '스피커', '웹캠', '헤드셋'
    ];
    
    deviceModelInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (value.length > 1) {
            const suggestions = commonModels.filter(model => 
                model.toLowerCase().includes(value)
            );
            if (suggestions.length > 0) {
                showSuggestions(this, suggestions);
            }
        }
    });
    
    // 문제 자동 완성
    const commonProblems = [
        '화면이 안 켜짐', '부팅이 안됨', '느려짐', '소음 발생', '과열',
        '화면 깨짐', '키보드 불량', '마우스 불량', '인터넷 연결 안됨',
        '프로그램 오류', '바이러스 감염', '하드디스크 오류', '메모리 부족'
    ];
    
    problemTextarea.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (value.length > 2) {
            const suggestions = commonProblems.filter(problem => 
                problem.toLowerCase().includes(value)
            );
            if (suggestions.length > 0) {
                showSuggestions(this, suggestions);
            }
        }
    });
    
    // 해결방법 자동 완성
    const commonSolutions = [
        '부품 교체', '소프트웨어 재설치', '드라이버 업데이트', '청소',
        '설정 변경', '메모리 증설', '하드디스크 교체', '쿨러 교체',
        '바이러스 치료', '시스템 복원', 'BIOS 업데이트'
    ];
    
    solutionTextarea.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (value.length > 2) {
            const suggestions = commonSolutions.filter(solution => 
                solution.toLowerCase().includes(value)
            );
            if (suggestions.length > 0) {
                showSuggestions(this, suggestions);
            }
        }
    });
    
    // 담당 기사 자동 완성
    const technicians = ['김기사', '이기사', '박기사', '최기사', '정기사'];
    technicianInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (value.length > 1) {
            const suggestions = technicians.filter(tech => 
                tech.toLowerCase().includes(value)
            );
            if (suggestions.length > 0) {
                showSuggestions(this, suggestions);
            }
        }
    });
}

// 제안 표시 함수
function showSuggestions(input, suggestions) {
    // 기존 제안 제거
    const existingSuggestions = document.getElementById('suggestions');
    if (existingSuggestions) existingSuggestions.remove();
    
    if (suggestions.length === 0) return;
    
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.id = 'suggestions';
    suggestionsDiv.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-height: 150px;
        overflow-y: auto;
        z-index: 1000;
        width: 100%;
        margin-top: 2px;
    `;
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
        `;
        item.textContent = suggestion;
        item.addEventListener('click', function() {
            input.value = suggestion;
            suggestionsDiv.remove();
        });
        item.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f8f9fa';
        });
        item.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'white';
        });
        suggestionsDiv.appendChild(item);
    });
    
    // 입력 필드 위치에 제안 표시
    const rect = input.getBoundingClientRect();
    suggestionsDiv.style.position = 'fixed';
    suggestionsDiv.style.top = (rect.bottom + window.scrollY) + 'px';
    suggestionsDiv.style.left = rect.left + 'px';
    suggestionsDiv.style.width = rect.width + 'px';
    
    document.body.appendChild(suggestionsDiv);
    
    // 외부 클릭 시 제안 숨기기
    setTimeout(() => {
        document.addEventListener('click', function hideSuggestions(e) {
            if (!suggestionsDiv.contains(e.target) && e.target !== input) {
                suggestionsDiv.remove();
                document.removeEventListener('click', hideSuggestions);
            }
        });
    }, 100);
}

// 실시간 비용 계산
function initializeCostCalculation() {
    const laborCostInput = document.getElementById('laborCost');
    const partsCostInput = document.getElementById('partsCost');
    const warrantyInput = document.getElementById('warranty');
    
    // 총 비용 표시 영역 생성
    const totalCostDisplay = document.createElement('div');
    totalCostDisplay.id = 'totalCostDisplay';
    totalCostDisplay.style.cssText = `
        background: #e3f2fd;
        padding: 10px;
        border-radius: 4px;
        margin-top: 10px;
        text-align: center;
        font-weight: bold;
        color: #1976d2;
    `;
    
    // 메모 필드와 같은 줄에 총 비용 표시 영역 삽입
    const memoField = document.getElementById('repairNotes');
    if (memoField) {
        const memoContainer = memoField.closest('.form-row');
        if (memoContainer) {
            // 총 비용 표시 영역을 메모 필드 옆에 배치
            totalCostDisplay.style.cssText = `
                background: #e3f2fd;
                padding: 10px;
                border-radius: 4px;
                margin-top: 10px;
                text-align: center;
                font-weight: bold;
                color: #1976d2;
                flex: 1;
                margin-left: 15px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 80px;
            `;
            memoContainer.appendChild(totalCostDisplay);
        }
    }
    
    function updateTotalCost() {
        const laborCost = parseFloat(laborCostInput.value) || 0;
        const partsCost = parseFloat(partsCostInput.value) || 0;
        const totalCost = laborCost + partsCost;
        
        totalCostDisplay.innerHTML = `
            <div>인건비: ${laborCost.toLocaleString('ko-KR')}원</div>
            <div>부품비: ${partsCost.toLocaleString('ko-KR')}원</div>
            <div style="font-size: 18px; margin-top: 5px; color: #d32f2f;">
                총 비용: ${totalCost.toLocaleString('ko-KR')}원
            </div>
        `;
    }
    
    laborCostInput.addEventListener('input', updateTotalCost);
    partsCostInput.addEventListener('input', updateTotalCost);
    
    // 초기 계산
    updateTotalCost();
    
    // 보증기간별 권장 비용 제안 (날짜 범위에서 일수 계산)
    warrantyInput.addEventListener('change', function() {
        const warrantyValue = this.value.trim();
        if (warrantyValue && warrantyValue.includes('~')) {
            const parts = warrantyValue.split('~');
            if (parts.length === 2) {
                const startDate = new Date(parts[0].trim());
                const endDate = new Date(parts[1].trim());
                
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    const warrantyDays = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
                    if (warrantyDays > 0) {
                        const recommendedCost = Math.max(10000, warrantyDays * 100);
                        if (partsCostInput.value === '' || partsCostInput.value === '0') {
                            partsCostInput.value = recommendedCost;
                            updateTotalCost();
                        }
                    }
                }
            }
        }
    });
}

// 스마트 제안 기능
function initializeSmartSuggestions() {
    const problemTextarea = document.getElementById('problem');
    const solutionTextarea = document.getElementById('solution');
    
    // 일반적인 문제 제안
    const commonProblems = [
        '화면이 안 켜짐', '부팅이 안됨', '느려짐', '소음 발생', '과열',
        '화면 깨짐', '키보드 불량', '마우스 불량', '인터넷 연결 안됨',
        '프로그램 오류', '바이러스 감염', '하드디스크 오류', '메모리 부족',
        '배터리 수명 단축', '터치패드 불량', '그래픽카드 오류', '메모리 오류',
        '색상 이상', '화면 깜빡임', '신호 없음', '밝기 조절 안됨',
        '인쇄 안됨', '종이 걸림', '연결 안됨', '작동 안됨', '연결 불안정', '설정 오류'
    ];
    
    // 문제 입력 시 힌트 표시
    if (problemTextarea.value === '') {
        const suggestionText = `일반적인 문제: ${commonProblems.slice(0, 10).join(', ')}`;
        
        const hint = document.createElement('div');
        hint.id = 'problemHint';
        hint.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-top: 5px;
            padding: 5px;
            background: #f8f9fa;
            border-radius: 3px;
        `;
        hint.textContent = suggestionText;
        
        problemTextarea.parentNode.appendChild(hint);
    }
    
    // 문제 입력 시 해결방법 제안
    const problemSolutions = {
        '화면이 안 켜짐': '전원 공급 확인, LCD 패널 교체, 그래픽카드 점검',
        '부팅이 안됨': '하드디스크 점검, 메모리 테스트, BIOS 설정 확인',
        '느려짐': '메모리 증설, 하드디스크 교체, 소프트웨어 최적화',
        '과열': '쿨러 청소, 써멀구리스 교체, 쿨러 교체',
        '소음 발생': '쿨러 청소, 하드디스크 교체, 팬 교체'
    };
    
    problemTextarea.addEventListener('blur', function() {
        const problem = this.value.toLowerCase();
        for (const [key, solution] of Object.entries(problemSolutions)) {
            if (problem.includes(key.toLowerCase()) && solutionTextarea.value === '') {
                solutionTextarea.value = solution;
                break;
            }
        }
    });
}

// 폼 검증 강화
function initializeFormValidation() {
    const form = document.getElementById('repairForm');
    const requiredFields = ['problem'];
    
    // 실시간 검증
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                validateField(this);
            });
            field.addEventListener('input', function() {
                clearFieldError(this);
            });
        }
    });
    
    // 폼 제출 전 전체 검증
    form.addEventListener('submit', function(e) {
        let isValid = true;
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !validateField(field)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            e.preventDefault();
            showMessage('필수 항목을 모두 입력해주세요.', 'error');
        }
    });
}

// 필드 검증 함수
function validateField(field) {
    const value = field.value.trim();
    const isValid = value !== '';
    
    if (!isValid) {
        showFieldError(field, '이 항목은 필수입니다.');
    } else {
        clearFieldError(field);
    }
    
    return isValid;
}

// 필드 에러 표시
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.style.borderColor = '#dc3545';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 12px;
        margin-top: 5px;
    `;
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

// 필드 에러 제거
function clearFieldError(field) {
    field.style.borderColor = '';
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) errorDiv.remove();
}

// 키보드 단축키
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl + S: 저장
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            const form = document.getElementById('repairForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // Ctrl + Enter: 저장
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const form = document.getElementById('repairForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // ESC: 취소
        if (e.key === 'Escape') {
            const modal = document.getElementById('repairModal');
            if (modal && modal.style.display === 'flex') {
                closeRepairModal();
            }
        }
    });
}

// 폼 네비게이션 초기화 (엔터 키로 다음 필드 이동)
function initializeFormNavigation() {
    // 필드 순서 정의
    const fieldOrder = [
        'repairDate',
        'repairTechnician', 
        'repairStatus',
        'warranty',
        'deviceModel',
        'problem',
        'solution',
        'parts',
        'laborCost',
        'partsCost',
        'repairNotes'
    ];
    
    fieldOrder.forEach((fieldId, index) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('keydown', function(e) {
                // textarea 필드들은 Ctrl+Enter로 다음 필드 이동
                if (fieldId === 'deviceModel' || fieldId === 'problem' || fieldId === 'solution' || fieldId === 'repairNotes') {
                    if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        moveToNextField(index);
                    }
                } else {
                    // 일반 input 필드는 Enter로 다음 필드 이동
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        moveToNextField(index);
                    }
                }
            });
        }
    });
    
    // 다음 필드로 이동하는 함수
    function moveToNextField(currentIndex) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < fieldOrder.length) {
            const nextField = document.getElementById(fieldOrder[nextIndex]);
            if (nextField) {
                nextField.focus();
            }
        } else {
            // 마지막 필드에서는 저장 버튼 클릭
            const saveButton = document.querySelector('#repairForm button[type="submit"]');
            if (saveButton) {
                saveButton.click();
            }
        }
    }
}

// textarea 자동 크기 조절 초기화 (가로/세로 모두)
function initializeTextareaAutoResize() {
    const textareas = ['deviceModel', 'problem', 'solution', 'repairNotes'];
    
    textareas.forEach(textareaId => {
        const textarea = document.getElementById(textareaId);
        if (textarea) {
            // 초기 크기 설정
            textarea.style.overflow = 'hidden';
            textarea.style.resize = 'none';
            textarea.style.width = '100%';
            textarea.style.minHeight = '60px';
            textarea.style.minWidth = '200px';
            
            // 입력 시 자동 크기 조절 (가로/세로 모두)
            textarea.addEventListener('input', function() {
                // 높이 조절
                this.style.height = 'auto';
                this.style.height = Math.max(60, this.scrollHeight) + 'px';
                
                // 너비 조절 (텍스트 길이에 따라)
                this.style.width = 'auto';
                this.style.width = '100%'; // 먼저 100%로 설정
                
                // 텍스트 길이에 따른 동적 너비 조절
                const text = this.value;
                if (text.length > 0) {
                    // 임시 요소를 만들어 텍스트 너비 측정
                    const temp = document.createElement('div');
                    temp.style.cssText = `
                        position: absolute;
                        visibility: hidden;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        font: ${getComputedStyle(this).font};
                        padding: ${getComputedStyle(this).padding};
                        border: ${getComputedStyle(this).border};
                        width: auto;
                        max-width: ${this.parentElement.offsetWidth}px;
                    `;
                    temp.textContent = text;
                    document.body.appendChild(temp);
                    
                    const textWidth = temp.offsetWidth;
                    const containerWidth = this.parentElement.offsetWidth;
                    const newWidth = Math.max(200, Math.min(textWidth + 20, containerWidth));
                    
                    document.body.removeChild(temp);
                    this.style.width = newWidth + 'px';
                }
            });
            
            // 초기 크기 조절
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(60, textarea.scrollHeight) + 'px';
            
            // 초기 너비 조절
            const initialText = textarea.value;
            if (initialText.length > 0) {
                const temp = document.createElement('div');
                temp.style.cssText = `
                    position: absolute;
                    visibility: hidden;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font: ${getComputedStyle(textarea).font};
                    padding: ${getComputedStyle(textarea).padding};
                    border: ${getComputedStyle(textarea).border};
                    width: auto;
                    max-width: ${textarea.parentElement.offsetWidth}px;
                `;
                temp.textContent = initialText;
                document.body.appendChild(temp);
                
                const initialTextWidth = temp.offsetWidth;
                const containerWidth = textarea.parentElement.offsetWidth;
                const initialWidth = Math.max(200, Math.min(initialTextWidth + 20, containerWidth));
                
                document.body.removeChild(temp);
                textarea.style.width = initialWidth + 'px';
            }
        }
    });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeRepairForm();
    addRepairSearchAndFilter();
    addRepairStatistics();
});
