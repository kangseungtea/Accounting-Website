// 요약 상세 모달 관련 기능

// 모달 열기
function openSummaryDetailModal(type, title) {
    // 모달 HTML이 없으면 생성
    if (!document.getElementById('summaryDetailModal')) {
        createSummaryModal();
    }
    
    // 날짜 범위 미리 설정
    if (!window.currentStartDate || !window.currentEndDate) {
        updateDateRange();
    }
    
    // 모달 표시
    const modal = document.getElementById('summaryDetailModal');
    const modalTitle = document.getElementById('modalTitle');
    const tableTitle = document.getElementById('tableTitle');
    
    if (modalTitle) modalTitle.textContent = title + ' 상세 내역';
    if (tableTitle) tableTitle.textContent = title + ' 상세 내역';
    
    modal.style.display = 'flex';
    
    // ESC 키 이벤트 리스너 추가
    document.addEventListener('keydown', handleSummaryModalKeydown);
    
    // 데이터 로드
    loadSummaryDetailData(type);
}

// 모달 생성
function createSummaryModal() {
    const modalHTML = `
        <div class="modal" id="summaryDetailModal" style="display: none;">
            <div class="modal-content" style="max-width: 1000px; max-height: 80vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h2 id="modalTitle">상세 내역</h2>
                    <button class="close-btn" onclick="closeSummaryModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                
                <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <label>기간 선택:</label>
                        <select id="dateRange" onchange="updateDateRange()" style="margin-left: 10px; padding: 5px;">
                            <option value="today">오늘</option>
                            <option value="week">이번 주</option>
                            <option value="month" selected>이번 달</option>
                            <option value="quarter">이번 분기</option>
                            <option value="year">올해</option>
                        </select>
                        <button onclick="loadSummaryDetailData()" style="margin-left: 10px; padding: 5px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">조회</button>
                    </div>
                    
                    <div id="summaryInfo" style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div><strong>총 금액:</strong> <span id="totalAmount">0원</span></div>
                            <div><strong>총 건수:</strong> <span id="totalCount">0건</span></div>
                            <div><strong>평균 금액:</strong> <span id="averageAmount">0원</span></div>
                        </div>
                    </div>
                    
                    <div style="overflow-x: auto; max-height: 400px;">
                        <table id="detailTable" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead id="tableHead" style="background: #f8f9fa; position: sticky; top: 0;">
                                <!-- 테이블 헤더가 동적으로 생성됩니다 -->
                            </thead>
                            <tbody id="tableBody">
                                <tr><td colspan="5" style="text-align: center; padding: 20px;">데이터를 불러오는 중...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="modal-footer" style="padding: 15px; background: #f8f9fa; border-top: 1px solid #dee2e6; text-align: right;">
                    <button onclick="closeSummaryModal()" style="padding: 8px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">닫기</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 모달 닫기
function closeSummaryModal() {
    const modal = document.getElementById('summaryDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.removeEventListener('keydown', handleSummaryModalKeydown);
}

// ESC 키 처리
function handleSummaryModalKeydown(event) {
    if (event.key === 'Escape') {
        closeSummaryModal();
    }
}

// 날짜 범위 업데이트
function updateDateRange() {
    const period = document.getElementById('dateRange').value;
    console.log('날짜 범위 선택:', period);
    
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            break;
        case 'week':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - today.getDay());
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
            break;
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
        default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    
    // 날짜를 YYYY-MM-DD 형식으로 변환
    const formatDate = (date) => date.toISOString().split('T')[0];
    window.currentStartDate = formatDate(startDate);
    window.currentEndDate = formatDate(endDate);
}

// 상세 데이터 로드
async function loadSummaryDetailData(type) {
    if (!type) type = window.currentSummaryType || 'revenue';
    
    try {
        // 날짜 범위 설정
        if (!window.currentStartDate || !window.currentEndDate) {
            console.log('날짜 범위 설정 중...');
            updateDateRange();
            console.log('날짜 범위 설정 완료:', { startDate: window.currentStartDate, endDate: window.currentEndDate });
        }
        
        // 날짜가 여전히 없으면 기본값 설정
        if (!window.currentStartDate || !window.currentEndDate) {
            console.warn('날짜 범위 설정 실패, 기본값 사용');
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            window.currentStartDate = startDate.toISOString().split('T')[0];
            window.currentEndDate = endDate.toISOString().split('T')[0];
        }
        
        console.log('데이터 로드 시작:', { type, startDate: window.currentStartDate, endDate: window.currentEndDate });
        
        const url = `/api/summary-details/${type}?startDate=${window.currentStartDate}&endDate=${window.currentEndDate}`;
        console.log('API URL:', url);
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        console.log('API 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API 응답 데이터:', result);
        console.log('API 응답 result.data (첫 3개):', result.data?.slice(0, 3));
        
        if (result.success) {
            updateSummaryDetailTable(result.data, type);
            // summary 객체가 있으면 사용하고, 없으면 data에서 계산
            if (result.summary) {
                updateSummaryDetailInfo(result.summary);
            } else {
                // data에서 요약 정보 계산
                const summary = calculateSummaryFromData(result.data);
                updateSummaryDetailInfo(summary);
            }
        } else {
            console.error('API 오류:', result.message);
            showSummaryError(result.message || '데이터를 불러오는데 실패했습니다.');
        }
    } catch (error) {
        console.error('상세 내역 로드 오류:', error);
        showSummaryError('네트워크 오류가 발생했습니다.');
    }
}

// 상세 테이블 업데이트 (DetailTable 모듈 사용)
function updateSummaryDetailTable(data, type) {
    // DetailTable 모듈이 로드될 때까지 대기
    if (typeof DetailTable !== 'undefined') {
        const detailTable = new DetailTable();
        detailTable.updateDetailTable(data, type);
    } else {
        console.warn('DetailTable 모듈이 아직 로드되지 않았습니다. 1초 후 재시도합니다.');
        setTimeout(() => {
            if (typeof DetailTable !== 'undefined') {
                const detailTable = new DetailTable();
                detailTable.updateDetailTable(data, type);
            } else {
                console.error('DetailTable 모듈을 찾을 수 없습니다. 수동으로 테이블을 업데이트합니다.');
                updateSummaryDetailTableFallback(data, type);
            }
        }, 1000);
    }
}

// DetailTable 모듈이 없을 때의 대체 함수
function updateSummaryDetailTableFallback(data, type) {
    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');
    
    if (!thead || !tbody) {
        console.error('테이블 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 간단한 테이블 렌더링
    const headers = ['날짜', '코드', '내용', '금액'];
    thead.innerHTML = headers.map(h => `<th style="padding: 10px; border: 1px solid #dee2e6;">${h}</th>`).join('');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">데이터가 없습니다.</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(item => {
        const formatNumber = (num) => new Intl.NumberFormat('ko-KR').format(num || 0);
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('ko-KR') : '-';
        
        return `<tr>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${formatDate(item.date)}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${item.code || '-'}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${item.customer || item.product || '-'}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${formatNumber(item.totalAmount || item.amount || 0)}원</td>
        </tr>`;
    }).join('');
}

// 요약 정보 계산
function calculateSummaryFromData(data) {
    if (!data || data.length === 0) {
        return { totalAmount: 0, totalCount: 0, averageAmount: 0 };
    }
    
    const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || parseFloat(item.amount) || 0), 0);
    const totalCount = data.length;
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
    
    return {
        totalAmount,
        totalCount,
        averageAmount
    };
}

// 요약 정보 업데이트
function updateSummaryDetailInfo(summary) {
    document.getElementById('totalAmount').textContent = summary.totalAmount.toLocaleString() + '원';
    document.getElementById('totalCount').textContent = summary.totalCount + '건';
    document.getElementById('averageAmount').textContent = Math.round(summary.averageAmount).toLocaleString() + '원';
}

// 오류 표시
function showSummaryError(message) {
    const tbody = document.getElementById('tableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">오류: ${message}</td></tr>`;
    }
}

