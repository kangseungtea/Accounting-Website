// 매출 UI 업데이트 전용 모듈
class RevenueUI {
    constructor() {
        this.elements = {
            totalRevenue: document.getElementById('totalRevenue'),
            revenueCount: document.getElementById('revenueCount'),
            totalVat: document.getElementById('totalVat')
        };
    }

    // 요약 카드 업데이트
    updateSummaryCard(summary) {
        if (this.elements.totalRevenue) {
            this.elements.totalRevenue.textContent = summary.totalRevenue.toLocaleString() + '원';
        }
        
        if (this.elements.revenueCount) {
            this.elements.revenueCount.textContent = summary.revenueCount + '건';
        }
    }

    // 월별 매출 업데이트
    updateMonthlyRevenue(totalRevenue, count) {
        const container = document.getElementById('monthlyRevenue');
        if (container) {
            container.innerHTML = `
                <div class="summary-item">
                    <div class="summary-value revenue">${totalRevenue.toLocaleString()}원</div>
                    <div class="summary-label">총 수입</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value revenue">${count}건</div>
                    <div class="summary-label">수입 건수</div>
                </div>
            `;
        }
    }

    // 매출 요약 업데이트 (sales-analysis.js용)
    updateSalesSummary(summary) {
        const container = document.getElementById('salesSummary');
        if (container) {
            container.innerHTML = `
                <div class="summary-item">
                    <div class="summary-value revenue">${summary.count}</div>
                    <div class="summary-label">매출 건수</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value revenue">${summary.supplyAmount.toLocaleString()}원</div>
                    <div class="summary-label">공급가액</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value vat">${summary.vatAmount.toLocaleString()}원</div>
                    <div class="summary-label">부가세</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value revenue">${summary.totalAmount.toLocaleString()}원</div>
                    <div class="summary-label">총금액</div>
                </div>
            `;
        }
    }

    // 로딩 상태 표시
    showLoading() {
        if (this.elements.totalRevenue) {
            this.elements.totalRevenue.textContent = '계산 중...';
        }
    }

    // 에러 상태 표시
    showError(message) {
        if (this.elements.totalRevenue) {
            this.elements.totalRevenue.textContent = '오류';
        }
        console.error('매출 계산 오류:', message);
    }

    // 요소 업데이트 (동적으로 요소 찾기)
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
}

// 전역으로 사용할 수 있도록 내보내기
window.RevenueUI = RevenueUI;
