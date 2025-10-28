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
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
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
                        <h2 style="margin: 0; color: #333; font-size: 24px;">수리 이력 상세</h2>
                        <button onclick="closeRepairDetailModal()" style="
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
                    <div style="
                        padding: 20px 30px;
                        border-top: 1px solid #e9ecef;
                        background: #f8f9fa;
                        border-radius: 0 0 8px 8px;
                        flex-shrink: 0;
                    ">
                        <div style="text-align: center;">
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

// 페이지 로드 시 통계 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 페이지 로드 완료, 수리 이력 통계 초기화 중...');
    
    // 수리 이력 탭이 활성화될 때 통계 업데이트
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
    
    // 현재 탭이 수리 이력인 경우 즉시 로드
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'repairs') {
        console.log('📊 수리 이력 탭이 활성화됨, 즉시 로드 중...');
        setTimeout(() => {
            if (typeof window.loadRepairs === 'function') {
                window.loadRepairs();
            }
        }, 500);
    }
    
    // 페이지 로드 후 약간의 지연을 두고 통계 업데이트 시도
    setTimeout(() => {
        console.log('🔄 페이지 로드 후 통계 업데이트 시도...');
        if (typeof window.loadRepairs === 'function') {
            window.loadRepairs();
        }
    }, 1000);
});

// 수리 이력 탭 전환 시 통계 업데이트
function switchToRepairsTab() {
    console.log('📊 수리 이력 탭으로 전환, 통계 업데이트 중...');
    setTimeout(() => {
        if (typeof window.loadRepairs === 'function') {
            window.loadRepairs();
        }
    }, 200);
}
