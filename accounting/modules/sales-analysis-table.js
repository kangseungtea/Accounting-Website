// 분석 테이블 전용 모듈
class SalesAnalysisTable {
    constructor() {
        this.tableId = 'analysisTable';
        this.tbodyId = 'analysisTableBody';
    }

    // 분석 테이블 업데이트 (메인 대시보드용)
    updateAnalysisTable(data) {
        const tbody = document.getElementById(this.tbodyId);
        
        if (!tbody) {
            console.warn('analysisTableBody 요소를 찾을 수 없습니다.');
            return;
        }
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">분석할 데이터가 없습니다.</td></tr>';
            return;
        }
        
        let html = '';
        let totalSalesSupply = 0, totalSalesVat = 0, totalSalesAmount = 0;
        let totalPurchaseSupply = 0, totalPurchaseVat = 0, totalPurchaseAmount = 0;
        
        data.forEach(item => {
            const netAmount = item.sales.totalAmount - item.purchase.totalAmount;
            const netClass = netAmount >= 0 ? 'positive' : 'negative';
            
            totalSalesSupply += item.sales.supplyAmount;
            totalSalesVat += item.sales.vatAmount;
            totalSalesAmount += item.sales.totalAmount;
            totalPurchaseSupply += item.purchase.supplyAmount;
            totalPurchaseVat += item.purchase.vatAmount;
            totalPurchaseAmount += item.purchase.totalAmount;
            
            html += `
                <tr>
                    <td>${item.period}</td>
                    <td class="number">${item.sales.supplyAmount.toLocaleString()}원</td>
                    <td class="number">${item.sales.vatAmount.toLocaleString()}원</td>
                    <td class="number">${item.sales.totalAmount.toLocaleString()}원</td>
                    <td class="number">${item.purchase.supplyAmount.toLocaleString()}원</td>
                    <td class="number">${item.purchase.vatAmount.toLocaleString()}원</td>
                    <td class="number">${item.purchase.totalAmount.toLocaleString()}원</td>
                    <td class="number ${netClass}">${netAmount.toLocaleString()}원</td>
                </tr>
            `;
        });
        
        // 총계 행
        const totalNet = totalSalesAmount - totalPurchaseAmount;
        const totalNetClass = totalNet >= 0 ? 'positive' : 'negative';
        
        html += `
            <tr class="total-row">
                <td><strong>총계</strong></td>
                <td class="number"><strong>${totalSalesSupply.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totalSalesVat.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totalSalesAmount.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totalPurchaseSupply.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totalPurchaseVat.toLocaleString()}원</strong></td>
                <td class="number"><strong>${totalPurchaseAmount.toLocaleString()}원</strong></td>
                <td class="number ${totalNetClass}"><strong>${totalNet.toLocaleString()}원</strong></td>
            </tr>
        `;
        
        tbody.innerHTML = html;
    }

    // 분석 테이블 업데이트 (매출 분석 페이지용)
    updateAnalysisTableForSalesPage(data) {
        const container = document.getElementById(this.tableId);
        
        if (!container) {
            console.warn('analysisTable 요소를 찾을 수 없습니다.');
            return;
        }
        
        if (data.length === 0) {
            container.innerHTML = '<div class="empty-state">분석할 데이터가 없습니다.</div>';
            return;
        }
        
        // 총계 계산
        const totals = data.reduce((acc, item) => {
            acc.sales.supplyAmount += item.sales.supplyAmount;
            acc.sales.vatAmount += item.sales.vatAmount;
            acc.sales.totalAmount += item.sales.totalAmount;
            acc.purchase.supplyAmount += item.purchase.supplyAmount;
            acc.purchase.vatAmount += item.purchase.vatAmount;
            acc.purchase.totalAmount += item.purchase.totalAmount;
            return acc;
        }, {
            sales: { supplyAmount: 0, vatAmount: 0, totalAmount: 0 },
            purchase: { supplyAmount: 0, vatAmount: 0, totalAmount: 0 }
        });
        
        const netAmount = totals.sales.totalAmount - totals.purchase.totalAmount;
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>기간</th>
                        <th class="number">매출 공급가액</th>
                        <th class="number">매출 부가세</th>
                        <th class="number">매출 총금액</th>
                        <th class="number">매입 공급가액</th>
                        <th class="number">매입 부가세</th>
                        <th class="number">매입 총금액</th>
                        <th class="number">순이익</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(item => {
            const netAmount = item.sales.totalAmount - item.purchase.totalAmount;
            const netClass = netAmount >= 0 ? 'positive' : 'negative';
            
            html += `
                <tr>
                    <td>${item.period}</td>
                    <td class="number">${item.sales.supplyAmount.toLocaleString()}원</td>
                    <td class="number">${item.sales.vatAmount.toLocaleString()}원</td>
                    <td class="number">${item.sales.totalAmount.toLocaleString()}원</td>
                    <td class="number">${item.purchase.supplyAmount.toLocaleString()}원</td>
                    <td class="number">${item.purchase.vatAmount.toLocaleString()}원</td>
                    <td class="number">${item.purchase.totalAmount.toLocaleString()}원</td>
                    <td class="number ${netClass}">${netAmount.toLocaleString()}원</td>
                </tr>
            `;
        });
        
        // 총계 행
        const totalNetClass = netAmount >= 0 ? 'positive' : 'negative';
        html += `
                <tr class="total-row">
                    <td><strong>총계</strong></td>
                    <td class="number"><strong>${totals.sales.supplyAmount.toLocaleString()}원</strong></td>
                    <td class="number"><strong>${totals.sales.vatAmount.toLocaleString()}원</strong></td>
                    <td class="number"><strong>${totals.sales.totalAmount.toLocaleString()}원</strong></td>
                    <td class="number"><strong>${totals.purchase.supplyAmount.toLocaleString()}원</strong></td>
                    <td class="number"><strong>${totals.purchase.vatAmount.toLocaleString()}원</strong></td>
                    <td class="number"><strong>${totals.purchase.totalAmount.toLocaleString()}원</strong></td>
                    <td class="number ${totalNetClass}"><strong>${netAmount.toLocaleString()}원</strong></td>
                </tr>
            </tbody>
        </table>
        `;
        
        container.innerHTML = html;
    }

    // 로딩 상태 표시
    showLoading() {
        const tbody = document.getElementById(this.tbodyId);
        const container = document.getElementById(this.tableId);
        
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">데이터를 분석하는 중...</td></tr>';
        }
        
        if (container && !tbody) {
            container.innerHTML = '<div class="loading">데이터를 분석하는 중...</div>';
        }
    }

    // 에러 상태 표시
    showError(message) {
        const tbody = document.getElementById(this.tbodyId);
        const container = document.getElementById(this.tableId);
        
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="error">오류: ${message}</td></tr>`;
        }
        
        if (container && !tbody) {
            container.innerHTML = `<div class="error">오류: ${message}</div>`;
        }
    }

    // 빈 상태 표시
    showEmpty() {
        const tbody = document.getElementById(this.tbodyId);
        const container = document.getElementById(this.tableId);
        
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">분석할 데이터가 없습니다.</td></tr>';
        }
        
        if (container && !tbody) {
            container.innerHTML = '<div class="empty-state">분석할 데이터가 없습니다.</div>';
        }
    }

    // 테이블 초기화
    reset() {
        this.showLoading();
    }
}

// 전역으로 사용할 수 있도록 내보내기
window.SalesAnalysisTable = SalesAnalysisTable;
