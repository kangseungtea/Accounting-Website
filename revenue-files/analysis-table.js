// 매출 상세 내역 테이블 전용 모듈
class DetailTable {
    constructor() {
        this.tableId = 'tableHead';
        this.tbodyId = 'tableBody';
    }

    // 매출 상세 내역 테이블 업데이트
    updateDetailTable(data, type) {
        const thead = document.getElementById(this.tableId);
        const tbody = document.getElementById(this.tbodyId);
        
        if (!thead || !tbody) {
            console.warn('상세 내역 테이블 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 헤더 설정
        const headers = this.getTableHeaders(type);
        thead.innerHTML = headers.map(header => `<th style="padding: 10px; border: 1px solid #dee2e6;">${header}</th>`).join('');
        
        // 데이터 설정
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align: center; padding: 20px;">데이터가 없습니다.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = data.map((item, index) => {
            const cells = this.getTableCells(item, type, index + 1);
            return `<tr>${cells.join('')}</tr>`;
        }).join('');
    }

    // 테이블 헤더 가져오기 (총 매출 전용)
    getTableHeaders(type) {
        // 총 매출에 필요한 헤더만 반환
        return ['번호', '거래일', '거래코드', '고객명', '제품명', '수량', '단가', '총액', '상태'];
    }

    // 테이블 셀 가져오기 (총 매출 전용)
    getTableCells(item, type, rowNumber = 1) {
        console.log('getTableCells 호출:', { item: item?.code, rowNumber, type });
        
        // 데이터 검증
        if (!item) {
            console.warn('item이 null 또는 undefined입니다.');
            return ['<td colspan="9" style="text-align: center; color: #dc3545;">데이터 오류</td>'];
        }
        
        const formatNumber = (num) => new Intl.NumberFormat('ko-KR').format(num || 0);
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('ko-KR') : '-';
        const baseStyle = 'padding: 8px; border: 1px solid #dee2e6;';
        
        // 총 매출에 필요한 셀만 반환 (번호 포함)
        return [
            { value: rowNumber, style: baseStyle }, // 번호
            { value: formatDate(item.date), style: baseStyle },
            { value: item.code || '-', style: baseStyle },
            { 
                value: item.customer || '-', 
                style: baseStyle + ' cursor: pointer; color: #007bff; text-decoration: underline;',
                clickable: true,
                customerId: item.customer_id || item.customerId
            },
            { value: item.product || '-', style: baseStyle },
            { value: formatNumber(item.quantity), style: baseStyle },
            { value: formatNumber(item.unitPrice) + '원', style: baseStyle },
            { value: formatNumber(item.totalAmount) + '원', style: baseStyle },
            { value: item.status || '-', style: baseStyle }
        ].map((cell, index) => {
            if (cell.clickable) {
                // 고객명과 거래코드를 조합하여 고유 식별자 생성
                const customerName = cell.value;
                const transactionCode = item.code || '';
                const uniqueId = `${customerName}_${transactionCode}`;
                
                console.log('고객 셀 생성:', { 
                    customerName, 
                    transactionCode, 
                    uniqueId, 
                    clickable: cell.clickable 
                });
                
                return `<td style="${cell.style}" onclick="openCustomerDetail('${customerName}', '${transactionCode}')">${cell.value}</td>`;
            }
            return `<td style="${cell.style}">${cell.value}</td>`;
        });
    }

    // 상세 내역 테이블 로딩 상태 표시
    showDetailLoading() {
        const tbody = document.getElementById('tableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">데이터를 불러오는 중...</td></tr>';
        }
    }

    // 상세 내역 테이블 에러 상태 표시
    showDetailError(message) {
        const tbody = document.getElementById('tableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #dc3545;">오류: ${message}</td></tr>`;
        }
    }

    // 테이블 초기화
    reset() {
        this.showDetailLoading();
    }

    // 고객 상세 정보 열기
    openCustomerDetail(customerName, transactionCode = '') {
        console.log('고객 상세 정보 열기 시도:', { customerName, transactionCode });
        
        if (!customerName || customerName === 'undefined' || customerName === 'unknown') {
            console.warn('고객명이 없습니다:', customerName);
            alert('고객 정보를 찾을 수 없습니다.');
            return;
        }
        
        // 고객 검색을 위한 파라미터 구성 (URL 인코딩 포함)
        const searchParams = new URLSearchParams();
        searchParams.set('name', encodeURIComponent(customerName));
        if (transactionCode) {
            searchParams.set('code', encodeURIComponent(transactionCode));
        }
        
        console.log('고객 상세 정보 열기:', { customerName, transactionCode, searchParams: searchParams.toString() });
        
        // 기존 고객 상세 모달이 있다면 사용
        if (typeof openCustomerDetailModal === 'function') {
            console.log('openCustomerDetailModal 함수 사용');
            openCustomerDetailModal(customerName, transactionCode);
        } else if (typeof showCustomerDetail === 'function') {
            console.log('showCustomerDetail 함수 사용');
            showCustomerDetail(customerName, transactionCode);
        } else {
            console.log('새 창으로 고객 상세 페이지 열기');
            // 기본 동작: 새 창으로 고객 상세 페이지 열기
            const url = `/customers/customer-detail.html?${searchParams.toString()}`;
            window.open(url, '_blank');
        }
    }
}

// 전역으로 사용할 수 있도록 내보내기
window.DetailTable = DetailTable;

// 전역 함수로도 내보내기 (HTML에서 직접 호출 가능하도록)
window.openCustomerDetail = function(customerName, transactionCode = '') {
    console.log('전역 openCustomerDetail 함수 호출:', { customerName, transactionCode });
    try {
        const detailTable = new DetailTable();
        detailTable.openCustomerDetail(customerName, transactionCode);
    } catch (error) {
        console.error('고객 상세 정보 열기 오류:', error);
        alert('고객 상세 정보를 열 수 없습니다: ' + error.message);
    }
};
