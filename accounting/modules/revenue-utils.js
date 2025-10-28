// 매출 관련 유틸리티 함수들
class RevenueUtils {
    // 기간별 데이터 그룹화
    static groupByPeriod(repairs, period = 'monthly') {
        const grouped = {};
        
        repairs.forEach(repair => {
            const date = new Date(repair.repair_date);
            const key = this.getPeriodKey(date, period);
            
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(repair);
        });
        
        return grouped;
    }

    // 기간 키 생성
    static getPeriodKey(date, period) {
        switch (period) {
            case 'daily':
                return date.toISOString().split('T')[0];
            case 'monthly':
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            case 'yearly':
                return String(date.getFullYear());
            default:
                return date.toISOString().split('T')[0];
        }
    }

    // 날짜 범위 필터링
    static filterByDateRange(repairs, startDate, endDate) {
        return repairs.filter(repair => {
            const repairDate = new Date(repair.repair_date);
            return repairDate >= startDate && repairDate <= endDate;
        });
    }

    // CSV 내보내기
    static exportToCSV(data, filename) {
        const csvContent = this.generateCSV(data);
        this.downloadCSV(csvContent, filename);
    }

    static generateCSV(data) {
        const headers = ['기간', '매출 공급가액', '매출 부가세', '매출 총금액', '매입 공급가액', '매입 부가세', '매입 총금액', '순이익'];
        const rows = data.map(item => {
            const netAmount = item.sales.totalAmount - item.purchase.totalAmount;
            return [
                item.period,
                item.sales.supplyAmount,
                item.sales.vatAmount,
                item.sales.totalAmount,
                item.purchase.supplyAmount,
                item.purchase.vatAmount,
                item.purchase.totalAmount,
                netAmount
            ];
        });
        
        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    static downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 금액 포맷팅
    static formatCurrency(amount) {
        return amount.toLocaleString() + '원';
    }

    // 수익률 계산
    static calculateProfitMargin(revenue, expense) {
        if (revenue <= 0) return 0;
        return Math.round(((revenue - expense) / revenue) * 100);
    }

    // 이번 달 날짜 범위 가져오기
    static getCurrentMonthRange() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { startOfMonth, endOfMonth };
    }
}

// 전역으로 사용할 수 있도록 내보내기
window.RevenueUtils = RevenueUtils;
