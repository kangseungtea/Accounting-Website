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
            const cells = this.getTableCells(item, type);
            return `<tr>${cells.join('')}</tr>`;
        }).join('');
    }

    // 테이블 헤더 가져오기
    getTableHeaders(type) {
        switch (type) {
            case 'revenue':
                return ['번호', '거래일', '거래코드', '고객명', '제품명', '수량', '단가', '총액', '상태'];
            case 'expense':
                return ['거래일', '거래코드', '공급업체', '제품명', '수량', '단가', '총액', '상태'];
            case 'vat':
                return ['거래일', '거래코드', '구분', '공급가액', '부가세', '총액', '상태'];
            case 'net':
                return ['거래일', '거래코드', '구분', '매출액', '매입액', '순이익', '마진율'];
            default:
                return ['거래일', '거래코드', '내용', '금액', '상태'];
        }
    }

    // 테이블 셀 가져오기
    getTableCells(item, type) {
        const formatNumber = (num) => new Intl.NumberFormat('ko-KR').format(num || 0);
        const formatDate = (date) => date ? new Date(date).toLocaleDateString('ko-KR') : '-';
        const formatProduct = (product) => {
            if (!product) return '-';
            // 제품명을 11자로 제한하고 말줄임표 추가
            return product.length > 11 ? product.substring(0, 11) + '...' : product;
        };
        const formatCustomer = (customer, customerId) => {
            if (!customer || customer === '-') return '-';
            // 고객명을 클릭 가능한 링크로 변환
            return `<span style="cursor: pointer; color: #007bff; text-decoration: underline;" onclick="openCustomerDetail('${customer}', '${customerId}')">${customer}</span>`;
        };
        const baseStyle = 'padding: 8px; border: 1px solid #dee2e6;';
        
        const cellConfigs = {
            revenue: [
                { value: item.customerId || '-', style: `${baseStyle} text-align: center; font-weight: bold;` },
                { value: formatDate(item.date), style: baseStyle },
                { value: item.code || '-', style: baseStyle },
                { value: formatCustomer(item.customer, item.customerId), style: baseStyle },
                { value: formatProduct(item.product), style: baseStyle },
                { value: `${item.quantity || 0}개`, style: `${baseStyle} text-align: center;` },
                { value: `${formatNumber(item.unitPrice || 0)}원`, style: `${baseStyle} text-align: right;` },
                { value: `${formatNumber(item.totalAmount || 0)}원`, style: `${baseStyle} text-align: right; color: #28a745; font-weight: bold;` },
                { value: item.status || '완료', style: baseStyle }
            ],
            expense: [
                { value: formatDate(item.date), style: baseStyle },
                { value: item.code || '-', style: baseStyle },
                { value: item.supplier || '-', style: baseStyle },
                { value: formatProduct(item.product), style: baseStyle },
                { value: `${item.quantity || 0}개`, style: `${baseStyle} text-align: center;` },
                { value: `${formatNumber(item.unitPrice || 0)}원`, style: `${baseStyle} text-align: right;` },
                { value: `${formatNumber(item.totalAmount || 0)}원`, style: `${baseStyle} text-align: right; color: #dc3545; font-weight: bold;` },
                { value: item.status || '완료', style: baseStyle }
            ],
            vat: [
                { value: formatDate(item.date), style: baseStyle },
                { value: item.code || '-', style: baseStyle },
                { value: item.type || '-', style: baseStyle },
                { value: `${formatNumber(item.supplyPrice || 0)}원`, style: `${baseStyle} text-align: right;` },
                { value: `${formatNumber(item.vatAmount || 0)}원`, style: `${baseStyle} text-align: right;` },
                { value: `${formatNumber(item.totalAmount || 0)}원`, style: `${baseStyle} text-align: right; font-weight: bold;` },
                { value: item.status || '완료', style: baseStyle }
            ],
            net: [
                { value: formatDate(item.date), style: baseStyle },
                { value: item.code || '-', style: baseStyle },
                { value: item.type || '-', style: baseStyle },
                { value: `${formatNumber(item.type === 'revenue' ? item.totalAmount : 0)}원`, style: `${baseStyle} text-align: right; color: #28a745;` },
                { value: `${formatNumber(item.type === 'expense' ? item.totalAmount : 0)}원`, style: `${baseStyle} text-align: right; color: #dc3545;` },
                { value: `${formatNumber(item.type === 'revenue' ? item.totalAmount : -item.totalAmount)}원`, style: `${baseStyle} text-align: right; font-weight: bold; color: ${(item.type === 'revenue' ? item.totalAmount : -item.totalAmount) >= 0 ? '#28a745' : '#dc3545'};` },
                { value: `0%`, style: `${baseStyle} text-align: center;` }
            ],
            default: [
                { value: formatDate(item.date), style: baseStyle },
                { value: item.code || '-', style: baseStyle },
                { value: item.description || '-', style: baseStyle },
                { value: `${formatNumber(item.amount || 0)}원`, style: `${baseStyle} text-align: right;` },
                { value: item.status || '완료', style: baseStyle }
            ]
        };
        
        const config = cellConfigs[type] || cellConfigs.default;
        return config.map(cell => `<td style="${cell.style}">${cell.value}</td>`);
    }

    // 상세 내역 테이블 로딩 상태 표시
    showLoading() {
        const tbody = document.getElementById(this.tbodyId);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">데이터를 불러오는 중...</td></tr>';
        }
    }

    // 상세 내역 테이블 에러 상태 표시
    showError(message) {
        const tbody = document.getElementById(this.tbodyId);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #dc3545;">오류: ${message}</td></tr>`;
        }
    }

    // 상세 내역 테이블 빈 데이터 상태 표시
    showEmpty() {
        const tbody = document.getElementById(this.tbodyId);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">데이터가 없습니다.</td></tr>';
        }
    }

    // 테이블 초기화
    reset() {
        this.showLoading();
    }
}

// 전역 함수: 고객 상세 정보 열기
function openCustomerDetail(customerName, customerId) {
    console.log('=== 고객 상세 정보 열기 ===');
    console.log('고객명:', customerName);
    console.log('고객 번호:', customerId);
    
    // 고객 상세 정보 페이지로 이동
    const url = `/customers/customer-detail.html?id=${customerId}`;
    console.log('생성된 URL:', url);
    
    try {
        // 팝업 차단기 우회를 위한 여러 방법 시도
        let newWindow = null;
        
        // 방법 1: 기본 새 창 열기 (더 안전한 옵션 사용)
        newWindow = window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            console.log('팝업 차단됨. 방법 2 시도...');
            
            // 방법 2: 현재 창에서 이동 (더 안전한 방법)
            if (confirm('팝업이 차단되었습니다. 현재 창에서 고객 상세 정보를 열까요?')) {
                console.log('현재 창에서 이동:', url);
                // location.assign을 사용하여 더 안전하게 이동
                window.location.assign(url);
                return;
            }
        } else {
            console.log('새 창이 성공적으로 열렸습니다.');
            // 새 창에 포커스
            newWindow.focus();
        }
        
    } catch (error) {
        console.error('새 창 열기 오류:', error);
        // 오류 발생 시 현재 창에서 이동
        if (confirm('오류가 발생했습니다. 현재 창에서 고객 상세 정보를 열까요?')) {
            console.log('오류 발생 후 현재 창에서 이동:', url);
            window.location.assign(url);
        }
    }
}

// 전역으로 사용할 수 있도록 내보내기
window.DetailTable = DetailTable;
