/**
 * 수리 내역 프린트 유틸리티 함수들
 */

/**
 * 수리 내역 프린트 창을 엽니다
 * @param {Object} repairData - 수리 데이터 객체
 */
function printRepairDetail(repairData) {
    console.log('🖨️ 프린트 시작:', repairData);
    console.log('🖨️ 데이터 타입:', typeof repairData);
    console.log('🖨️ 데이터가 null/undefined인가?', repairData == null);
    console.log('🖨️ 데이터 키들:', repairData ? Object.keys(repairData) : 'N/A');
    
    if (!repairData) {
        console.error('❌ repairData가 null 또는 undefined입니다.');
        alert('수리 데이터가 없습니다. 먼저 수리 이력을 선택해주세요.');
        return;
    }
    
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
        // 부품 리스트 설정
        if (doc.getElementById('printPartsList')) {
            const partsElement = doc.getElementById('printPartsList');
            if (repairData.partsList && repairData.partsList !== '사용된 부품이 없습니다.') {
                partsElement.innerHTML = repairData.partsList;
            } else {
                partsElement.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">사용된 부품이 없습니다.</div>';
            }
        }
        
        // 인건비 리스트 설정
        if (doc.getElementById('printLaborList')) {
            const laborElement = doc.getElementById('printLaborList');
            if (repairData.laborList && repairData.laborList !== '인건비 내역이 없습니다.') {
                laborElement.innerHTML = repairData.laborList;
            } else {
                laborElement.innerHTML = '<div style="text-align: center; color: #666; padding: 10px;">인건비 내역이 없습니다.</div>';
            }
        }
        
        // 비용 요약 설정
        let partsTotal = repairData.partsTotal || 0;
        let laborTotal = repairData.laborTotal || 0;
        
        // 부품 총액이 0이고 부품 리스트가 있으면 자동 계산
        if (partsTotal === 0 && repairData.partsList && repairData.partsList !== '사용된 부품이 없습니다.') {
            const partsMatches = repairData.partsList.match(/(\d+)원/g);
            if (partsMatches) {
                partsTotal = partsMatches.reduce((sum, match) => {
                    const amount = parseInt(match.replace(/[^\d]/g, ''));
                    return sum + (isNaN(amount) ? 0 : amount);
                }, 0);
            }
            
            // 부품 총액이 0이어도 부품 리스트에 실제 부품이 있는지 확인
            // 부품명이 있는지 확인 (예: "H310 보드", "CPU" 등)
            const hasParts = repairData.partsList.includes('<strong>') || 
                           repairData.partsList.includes('보드') || 
                           repairData.partsList.includes('CPU') ||
                           repairData.partsList.includes('메모리') ||
                           repairData.partsList.includes('하드') ||
                           repairData.partsList.includes('그래픽') ||
                           repairData.partsList.includes('파워') ||
                           repairData.partsList.includes('케이스') ||
                           repairData.partsList.includes('쿨러') ||
                           repairData.partsList.includes('SSD') ||
                           repairData.partsList.includes('HDD');
            
            // 부품이 실제로 없고 총액도 0이면 "사용된 부품이 없습니다" 표시
            if (partsTotal === 0 && !hasParts) {
                const partsElement = doc.getElementById('printPartsList');
                if (partsElement) {
                    partsElement.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">사용된 부품이 없습니다.</div>';
                }
            }
        }
        
        // 인건비 총액이 0이고 인건비 리스트가 있으면 자동 계산
        if (laborTotal === 0 && repairData.laborList && repairData.laborList !== '인건비 내역이 없습니다.') {
            const laborMatches = repairData.laborList.match(/(\d+)원/g);
            if (laborMatches) {
                laborTotal = laborMatches.reduce((sum, match) => {
                    const amount = parseInt(match.replace(/[^\d]/g, ''));
                    return sum + (isNaN(amount) ? 0 : amount);
                }, 0);
            }
        }
        
        // 기본 금액 (부품비 + 인건비)
        const baseAmount = partsTotal + laborTotal;
        
        console.log('💰 비용 계산 디버깅:', {
            partsTotal,
            laborTotal,
            baseAmount,
            repairDataVatOption: repairData.vatOption,
            repairDataVat_option: repairData.vat_option
        });
        
        // 부가세 옵션 확인
        const vatOption = repairData.vatOption || repairData.vat_option || 'included';
        
        let totalCost, supplyAmount, vatAmount, vatDescription;
        
        if (vatOption === 'included') {
            // 부가세 포함: 기본 금액이 이미 부가세 포함된 금액
            totalCost = baseAmount;
            supplyAmount = Math.round(baseAmount / 1.1);
            vatAmount = baseAmount - supplyAmount;
            vatDescription = '부품비 + 인건비 (부가세 포함)';
        } else if (vatOption === 'excluded') {
            // 부가세 미포함: 기본 금액에 부가세 추가
            supplyAmount = baseAmount;
            vatAmount = Math.round(baseAmount * 0.1);
            totalCost = supplyAmount + vatAmount;
            vatDescription = '부품비 + 인건비 (부가세 미포함)';
        } else {
            // 부가세 없음: 기본 금액 그대로
            totalCost = baseAmount;
            supplyAmount = baseAmount;
            vatAmount = 0;
            vatDescription = '부품비 + 인건비 (부가세 없음)';
        }
        
        console.log('💰 최종 계산 결과:', {
            vatOption,
            totalCost,
            supplyAmount,
            vatAmount,
            vatDescription
        });
        
        // 공급가액 표시
        if (doc.getElementById('printSupplyAmount')) {
            doc.getElementById('printSupplyAmount').textContent = `${supplyAmount.toLocaleString('ko-KR')}원`;
        }
        
        // 부가세 표시 (부가세가 있는 경우만)
        const vatSection = doc.getElementById('printVatSection');
        if (vatSection) {
            if (vatAmount > 0) {
                vatSection.style.display = 'flex';
                const vatAmountElement = doc.getElementById('printVatAmount');
                if (vatAmountElement) {
                    vatAmountElement.textContent = `${vatAmount.toLocaleString('ko-KR')}원`;
                }
            } else {
                vatSection.style.display = 'none';
            }
        }
        
        // 총 비용 표시
        if (doc.getElementById('printTotalCost')) {
            doc.getElementById('printTotalCost').textContent = `${totalCost.toLocaleString('ko-KR')}원`;
        }
        
        // 부가세 설명 표시
        if (doc.getElementById('printVatDescription')) {
            doc.getElementById('printVatDescription').textContent = vatDescription;
        }
        
        
        console.log('✅ 프린트 데이터 설정 완료');
        
        // 데이터 설정 검증
        const requiredElements = [
            'printRepairDate', 'printCustomerName', 'printCustomerPhone', 
            'printCustomerAddress', 'printManagementNumber', 'printDeviceModel',
            'printProblem', 'printSolution', 'printPartsList', 'printLaborList',
            'printSupplyAmount', 'printTotalCost', 'printVatDescription'
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
        console.error('❌ 모달 요소를 찾을 수 없습니다.');
        return {};
    }
    
    console.log('🔍 모달에서 데이터 추출 중...');
    console.log('🔍 모달 요소:', modal);
    console.log('🔍 모달 ID:', modal.id);
    
    const data = {
        repairDate: modal.querySelector('#detailRepairDate')?.textContent || '-',
        customerName: modal.querySelector('#detailCustomerName')?.textContent || '-',
        customerPhone: modal.querySelector('#detailCustomerPhone')?.textContent || '-',
        customerAddress: modal.querySelector('#detailCustomerAddress')?.textContent || '-',
        managementNumber: modal.querySelector('#detailManagementNumber')?.textContent || '-',
        deviceModel: modal.querySelector('#detailDeviceModel')?.textContent || '-',
        problem: modal.querySelector('#detailProblem')?.textContent || '-',
        solution: modal.querySelector('#detailSolution')?.textContent || '-',
        totalCost: modal.querySelector('#detailTotalCost')?.textContent || '0',
        vatOption: 'included' // 기본값으로 부가세 포함 설정
    };
    
    // 부가세 옵션 추출 (실제 데이터베이스에서 가져온 값 사용)
    // repair 객체에서 vat_option을 직접 가져와야 함
    if (window.currentRepairData && window.currentRepairData.vat_option) {
        data.vatOption = window.currentRepairData.vat_option;
        console.log('🔍 부가세 옵션 추출:', data.vatOption);
    }
    
    // 총 비용에서 숫자만 추출
    if (data.totalCost && data.totalCost !== '-') {
        const costMatch = data.totalCost.match(/[\d,]+/);
        if (costMatch) {
            data.totalCost = parseInt(costMatch[0].replace(/,/g, ''));
        }
    }
    
    // 부품 목록 처리 - 실제 데이터베이스에서 가져온 데이터 사용
    if (window.currentRepairData && window.currentRepairData.parts && Array.isArray(window.currentRepairData.parts)) {
        const parts = window.currentRepairData.parts;
        if (parts.length > 0) {
            const partsHtml = parts.map(part => {
                const quantity = part.quantity || 1;
                const unitPrice = part.unit_price || part.unitPrice || 0;
                const totalPrice = part.total_price || part.totalPrice || (quantity * unitPrice);
                
                return `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">
                    <strong>${part.name || '부품명 없음'}</strong> - ${quantity}개 × ${unitPrice.toLocaleString('ko-KR')}원 = ${totalPrice.toLocaleString('ko-KR')}원
                </div>`;
            }).join('');
            data.partsList = partsHtml;
            
            // 부품 총액 계산
            data.partsTotal = parts.reduce((sum, part) => {
                const quantity = part.quantity || 1;
                const unitPrice = part.unit_price || part.unitPrice || 0;
                const totalPrice = part.total_price || part.totalPrice || (quantity * unitPrice);
                return sum + totalPrice;
            }, 0);
        } else {
            data.partsList = '사용된 부품이 없습니다.';
            data.partsTotal = 0;
        }
    } else {
        // 대체 방법: 모달에서 HTML 추출
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
    }
    
    // 인건비 목록 처리 - 실제 데이터베이스에서 가져온 데이터 사용
    if (window.currentRepairData && window.currentRepairData.labor && Array.isArray(window.currentRepairData.labor)) {
        const labor = window.currentRepairData.labor;
        if (labor.length > 0) {
            const laborHtml = labor.map(item => {
                const cost = item.cost || item.amount || 0;
                const name = item.name || item.description || '인건비';
                
                return `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">
                    ${name} - ${cost.toLocaleString('ko-KR')}원
                </div>`;
            }).join('');
            data.laborList = laborHtml;
            
            // 인건비 총액 계산
            data.laborTotal = labor.reduce((sum, item) => {
                const cost = item.cost || item.amount || 0;
                return sum + cost;
            }, 0);
        } else {
            data.laborList = '인건비 내역이 없습니다.';
            data.laborTotal = 0;
        }
    } else {
        // 대체 방법: 모달에서 HTML 추출
        const laborList = modal.querySelector('#detailLabor');
        if (laborList) {
            const laborContent = laborList.innerHTML;
            if (laborContent && laborContent.trim() !== '' && !laborContent.includes('인건비 내역이 없습니다')) {
                data.laborList = laborContent;
            } else {
                data.laborList = '인건비 내역이 없습니다.';
            }
        } else {
            data.laborList = '인건비 내역이 없습니다.';
        }
    }
    
    // 부품 총액과 인건비 총액은 이미 위에서 계산됨
    // 추가로 모달에서 추출할 필요가 있는 경우에만 처리
    if (!data.partsTotal && data.partsTotal !== 0) {
        const partsTotalElement = modal.querySelector('#detailPartsTotal');
        if (partsTotalElement) {
            const partsTotalText = partsTotalElement.textContent || '0';
            const partsTotalMatch = partsTotalText.match(/[\d,]+/);
            if (partsTotalMatch) {
                data.partsTotal = parseInt(partsTotalMatch[0].replace(/,/g, ''));
            } else {
                data.partsTotal = 0;
            }
        } else {
            data.partsTotal = 0;
        }
    }
    
    if (!data.laborTotal && data.laborTotal !== 0) {
        const laborTotalElement = modal.querySelector('#detailLaborTotal');
        if (laborTotalElement) {
            const laborTotalText = laborTotalElement.textContent || '0';
            const laborTotalMatch = laborTotalText.match(/[\d,]+/);
            if (laborTotalMatch) {
                data.laborTotal = parseInt(laborTotalMatch[0].replace(/,/g, ''));
            } else {
                data.laborTotal = 0;
            }
        } else {
            data.laborTotal = 0;
        }
    }
    
    // 부품과 인건비 총액이 0이면 HTML에서 자동 계산
    console.log('🔍 부품 자동 계산 디버깅:', {
        partsTotal: data.partsTotal,
        partsList: data.partsList,
        partsListLength: data.partsList ? data.partsList.length : 0
    });
    
    if (data.partsTotal === 0 && data.partsList && data.partsList !== '사용된 부품이 없습니다.') {
        // 총액만 추출 (단가 제외) - "= 60,000원" 패턴만 매치
        const partsMatches = data.partsList.match(/= ([\d,]+)원/g);
        console.log('🔍 부품 금액 매치:', partsMatches);
        if (partsMatches) {
            data.partsTotal = partsMatches.reduce((sum, match) => {
                const amount = parseInt(match.replace(/[^\d]/g, ''));
                console.log('🔍 부품 금액 추출:', { match, amount });
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
            console.log('🔍 부품 총액 계산 결과:', data.partsTotal);
        }
    }
    
    console.log('🔍 인건비 자동 계산 디버깅:', {
        laborTotal: data.laborTotal,
        laborList: data.laborList,
        laborListLength: data.laborList ? data.laborList.length : 0
    });
    
    if (data.laborTotal === 0 && data.laborList && data.laborList !== '인건비 내역이 없습니다.') {
        // 인건비 금액만 추출 - "- 40,000원" 패턴만 매치
        const laborMatches = data.laborList.match(/- ([\d,]+)원/g);
        console.log('🔍 인건비 금액 매치:', laborMatches);
        if (laborMatches) {
            data.laborTotal = laborMatches.reduce((sum, match) => {
                const amount = parseInt(match.replace(/[^\d]/g, ''));
                console.log('🔍 인건비 금액 추출:', { match, amount });
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
            console.log('🔍 인건비 총액 계산 결과:', data.laborTotal);
        }
    }
    
    console.log('📋 추출된 데이터:', data);
    return data;
}

// 전역 함수로 등록
window.printRepairDetail = printRepairDetail;
window.extractRepairDataFromModal = extractRepairDataFromModal;
