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
                    <button class="action-btn view-btn" onclick="viewRepairDetail(${repair.id})">상세</button>
                    <button class="action-btn edit-btn" onclick="editRepair(${repair.id})">수정</button>
                    <button class="action-btn delete-btn" onclick="deleteRepair(${repair.id})">삭제</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 수리 이력 등록 모달 표시
function showAddRepairModal() {
    const modal = document.createElement('div');
    modal.id = 'addRepairModal';
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
            padding: 30px;
            max-width: 600px;
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
                <h2 style="margin: 0; color: #333;">수리 이력 등록</h2>
                <button onclick="closeAddRepairModal()" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">&times;</button>
            </div>
            
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
    `;
    
    document.body.appendChild(modal);
    
    // 오늘 날짜로 설정
    document.getElementById('repairDate').value = new Date().toISOString().split('T')[0];
    
    // 폼 제출 이벤트
    document.getElementById('addRepairForm').addEventListener('submit', addRepair);
}

// 수리 이력 등록
async function addRepair(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        
        const repairData = {
            repair_date: formData.get('repairDate'),
            device_name: formData.get('deviceName'),
            issue_description: formData.get('issueDescription'),
            status: formData.get('repairStatus'),
            total_cost: parseInt(formData.get('totalCost')) || 0,
            notes: formData.get('repairNotes'),
            customer_id: currentCustomerId
        };
        
        console.log('수리 요청 데이터:', repairData);
        
        const response = await fetch('/api/repairs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(repairData),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showMessage('수리 이력이 등록되었습니다.', 'success');
            closeAddRepairModal();
            loadCustomerData(); // 페이지 새로고침
        } else {
            showMessage('수리 이력 등록에 실패했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('수리 이력 등록 오류:', error);
        showMessage('수리 이력을 등록하는 중 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 등록 모달 닫기
function closeAddRepairModal() {
    const modal = document.getElementById('addRepairModal');
    if (modal) {
        modal.remove();
    }
}

// 수리 이력 상세 보기
async function viewRepairDetail(repairId) {
    try {
        const response = await fetch(`/api/repairs/${repairId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('수리 이력을 불러올 수 없습니다.');
        }
        
        const result = await response.json();
        
        if (result.success) {
            const repair = result.data;
            
            // 수리 이력 상세 모달 생성
            const modal = document.createElement('div');
            modal.id = 'repairDetailModal';
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
                    padding: 30px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
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
                        <h2 style="margin: 0; color: #333; font-size: 24px;">수리 이력 상세</h2>
                        <button onclick="closeRepairDetailModal()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #666;
                        ">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #495057; margin-bottom: 15px; font-size: 18px;">기본 정보</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <strong>수리일:</strong><br>
                                <span style="color: #666;">${repair.repair_date ? new Date(repair.repair_date).toLocaleDateString('ko-KR') : '-'}</span>
                            </div>
                            <div>
                                <strong>기기명:</strong><br>
                                <span style="color: #666;">${repair.device_name || '-'}</span>
                            </div>
                            <div>
                                <strong>고장 내용:</strong><br>
                                <span style="color: #666;">${repair.issue_description || '-'}</span>
                            </div>
                            <div>
                                <strong>수리 상태:</strong><br>
                                <span style="color: #666;">${repair.status || '-'}</span>
                            </div>
                            <div>
                                <strong>수리비:</strong><br>
                                <span style="color: #666;">${repair.total_cost ? repair.total_cost.toLocaleString('ko-KR') + '원' : '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${repair.notes ? `
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #495057; margin-bottom: 15px; font-size: 18px;">비고</h3>
                        <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; color: #666;">
                            ${repair.notes}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button onclick="closeRepairDetailModal()" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">닫기</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } else {
            showMessage('수리 이력을 불러오는데 실패했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('수리 이력 상세 조회 오류:', error);
        showMessage('수리 이력을 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 수리 이력 상세 모달 닫기
function closeRepairDetailModal() {
    const modal = document.getElementById('repairDetailModal');
    if (modal) {
        modal.remove();
    }
}

// 수리 이력 수정
async function editRepair(repairId) {
    // 수리 이력 수정 기능 구현
    console.log('수리 이력 수정:', repairId);
    showMessage('수리 이력 수정 기능은 구현 중입니다.', 'info');
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
            loadCustomerData(); // 페이지 새로고침
        } else {
            showMessage('수리 이력 삭제에 실패했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
        }
        
    } catch (error) {
        console.error('수리 이력 삭제 오류:', error);
        showMessage('수리 이력을 삭제하는 중 오류가 발생했습니다.', 'error');
    }
}
