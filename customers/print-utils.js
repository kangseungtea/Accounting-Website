/**
 * 수리 내역 프린트 유틸리티 함수들
 */

/**
 * 수리 내역 프린트 창을 엽니다
 * @param {Object} repairData - 수리 데이터 객체
 */
function printRepairDetail(repairData) {
    console.log('🖨️ 프린트 시작:', repairData);
    
    // 프린트 창 생성 (A4 비율)
    const printWindow = window.open('', '_blank', 'width=794,height=1123');
    
    if (!printWindow) {
        console.error('팝업 창이 차단되었습니다.');
        alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
        return;
    }
    
    console.log('✅ 프린트 창 생성 성공');
    
    // 템플릿 로드
    loadPrintTemplate(printWindow, repairData);
}

/**
 * 프린트 템플릿을 로드하고 데이터를 설정합니다
 * @param {Window} printWindow - 프린트 창 객체
 * @param {Object} repairData - 수리 데이터 객체
 */
function loadPrintTemplate(printWindow, repairData) {
    console.log('📄 프린트 템플릿 로드 시작');
    
    // 로딩 상태 표시
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>수리 내역 - 로딩 중...</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 20px; 
                    background: #f5f5f5; 
                }
                .loading { 
                    font-size: 18px; 
                    color: #666; 
                }
            </style>
        </head>
        <body>
            <div class="loading">프린트 템플릿을 로드하는 중...</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    
    // HTML 템플릿 로드
    fetch('/customers/print-templates/repair-detail-print.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            console.log('✅ HTML 템플릿 로드 완료');
            printWindow.document.write(html);
            printWindow.document.close();
            
            // CSS 로드
            return fetch('/customers/print-templates/repair-detail-print.css');
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`CSS 로드 실패: HTTP ${response.status}`);
            }
            return response.text();
        })
        .then(css => {
            console.log('✅ CSS 템플릿 로드 완료');
            
            // CSS를 head에 추가
            const style = printWindow.document.createElement('style');
            style.textContent = css;
            printWindow.document.head.appendChild(style);
            
            // 데이터 설정
            populatePrintData(printWindow, repairData);
            
            // 프린트 실행
            setTimeout(() => {
                console.log('🖨️ 프린트 실행');
                printWindow.focus();
                printWindow.print();
            }, 800);
        })
        .catch(error => {
            console.error('❌ 템플릿 로드 실패:', error);
            
            // 에러 페이지 표시
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>프린트 오류</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            padding: 20px; 
                            background: #f5f5f5; 
                        }
                        .error { 
                            color: #d32f2f; 
                            font-size: 10px; 
                            margin-bottom: 5px; 
                        }
                        .details { 
                            color: #666; 
                            font-size: 10px; 
                        }
                    </style>
                </head>
                <body>
                    <div class="error">프린트 템플릿을 로드할 수 없습니다</div>
                    <div class="details">${error.message}</div>
                    <div class="details">페이지를 새로고침하고 다시 시도해주세요.</div>
                </body>
                </html>
            `);
            printWindow.document.close();
            
            alert(`프린트 템플릿 로드 실패: ${error.message}`);
        });
}

/**
 * 프린트 창에 데이터를 설정합니다
 * @param {Window} printWindow - 프린트 창 객체
 * @param {Object} repairData - 수리 데이터 객체
 */
function populatePrintData(printWindow, repairData) {
    console.log('📋 프린트 데이터 설정 시작');
    console.log('📊 받은 데이터:', repairData);
    
    const doc = printWindow.document;
    
    // 데이터 검증
    if (!repairData || typeof repairData !== 'object') {
        console.error('❌ 잘못된 데이터 형식:', repairData);
        return;
    }
    
    try {
        // 기본 정보 설정
        if (doc.getElementById('printRepairDate')) {
            doc.getElementById('printRepairDate').textContent = repairData.repairDate || '-';
        }
        if (doc.getElementById('printCustomerName')) {
            doc.getElementById('printCustomerName').textContent = repairData.customerName || '-';
        }
        if (doc.getElementById('printCustomerPhone')) {
            doc.getElementById('printCustomerPhone').textContent = repairData.customerPhone || '-';
        }
        if (doc.getElementById('printCustomerAddress')) {
            doc.getElementById('printCustomerAddress').textContent = repairData.customerAddress || '-';
        }
        if (doc.getElementById('printManagementNumber')) {
            doc.getElementById('printManagementNumber').textContent = repairData.managementNumber || '-';
        }
        
        // 장비 정보 설정
        if (doc.getElementById('printDeviceModel')) {
            doc.getElementById('printDeviceModel').textContent = repairData.deviceModel || '-';
        }
        
        // 문제 및 해결 설정
        if (doc.getElementById('printProblem')) {
            doc.getElementById('printProblem').textContent = repairData.problem || '-';
        }
        if (doc.getElementById('printSolution')) {
            doc.getElementById('printSolution').textContent = repairData.solution || '-';
        }
        
        // 부품 및 비용 설정
        if (doc.getElementById('printPartsList')) {
            const partsElement = doc.getElementById('printPartsList');
            if (repairData.partsList && repairData.partsList !== '사용된 부품이 없습니다.') {
                partsElement.innerHTML = repairData.partsList;
            } else {
                partsElement.textContent = '사용된 부품이 없습니다.';
            }
        }
        if (doc.getElementById('printTotalCost')) {
            const totalCost = repairData.totalCost || 0;
            doc.getElementById('printTotalCost').textContent = `총 비용: ${totalCost.toLocaleString()}원`;
        }
        
        
        console.log('✅ 프린트 데이터 설정 완료');
        
        // 데이터 설정 검증
        const requiredElements = [
            'printRepairDate', 'printCustomerName', 'printCustomerPhone', 
            'printCustomerAddress', 'printManagementNumber', 'printDeviceModel',
            'printProblem', 'printSolution', 'printTotalCost'
        ];
        
        let missingElements = [];
        requiredElements.forEach(id => {
            const element = doc.getElementById(id);
            if (!element) {
                missingElements.push(id);
            }
        });
        
        if (missingElements.length > 0) {
            console.warn('⚠️ 누락된 요소들:', missingElements);
        } else {
            console.log('✅ 모든 필수 요소가 정상적으로 설정됨');
        }
        
    } catch (error) {
        console.error('❌ 프린트 데이터 설정 실패:', error);
        console.error('❌ 오류 상세:', {
            message: error.message,
            stack: error.stack,
            repairData: repairData
        });
    }
}

/**
 * 모달에서 데이터를 추출하여 프린트용 객체로 변환합니다
 * @param {HTMLElement} modal - 수리 상세 모달 요소
 * @returns {Object} 프린트용 데이터 객체
 */
function extractRepairDataFromModal(modal) {
    if (!modal) {
        console.error('모달 요소를 찾을 수 없습니다.');
        return {};
    }
    
    console.log('🔍 모달에서 데이터 추출 중...');
    
    const data = {
        repairDate: modal.querySelector('#detailRepairDate')?.textContent || '-',
        customerName: modal.querySelector('#detailCustomerName')?.textContent || '-',
        customerPhone: modal.querySelector('#detailCustomerPhone')?.textContent || '-',
        customerAddress: modal.querySelector('#detailCustomerAddress')?.textContent || '-',
        managementNumber: modal.querySelector('#detailManagementNumber')?.textContent || '-',
        deviceModel: modal.querySelector('#detailDeviceModel')?.textContent || '-',
        problem: modal.querySelector('#detailProblem')?.textContent || '-',
        solution: modal.querySelector('#detailSolution')?.textContent || '-',
        totalCost: modal.querySelector('#detailTotalCost')?.textContent || '0'
    };
    
    // 총 비용에서 숫자만 추출
    if (data.totalCost && data.totalCost !== '-') {
        const costMatch = data.totalCost.match(/[\d,]+/);
        if (costMatch) {
            data.totalCost = parseInt(costMatch[0].replace(/,/g, ''));
        }
    }
    
    // 부품 목록 처리 - 실제 HTML 테이블 추출
    const partsList = modal.querySelector('#detailParts');
    if (partsList) {
        const partsContent = partsList.innerHTML;
        if (partsContent && partsContent.trim() !== '' && !partsContent.includes('사용된 부품이 없습니다')) {
            data.partsList = partsContent;
        } else {
            data.partsList = '사용된 부품이 없습니다.';
        }
    } else {
        data.partsList = '사용된 부품이 없습니다.';
    }
    
    console.log('📋 추출된 데이터:', data);
    return data;
}

// 전역 함수로 등록
window.printRepairDetail = printRepairDetail;
window.printRepairDetailUtils = printRepairDetail; // 무한 재귀 방지를 위한 별칭
window.extractRepairDataFromModal = extractRepairDataFromModal;
