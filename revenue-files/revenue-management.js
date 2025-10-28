// 총 매출 관리 전용 JavaScript
class RevenueManagement {
    constructor() {
        this.revenueCalculator = new RevenueCalculator();
        this.revenueUI = new RevenueUI();
        this.detailTable = new DetailTable();
        this.init();
    }

    init() {
        console.log('총 매출 관리 시스템 초기화 중...');
        this.setupEventListeners();
        this.loadInitialData();
    }

    setupEventListeners() {
        // 새로고침 버튼
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadInitialData();
        });

        // 필터 적용 버튼
        document.getElementById('applyFilterBtn').addEventListener('click', () => {
            this.applyFilters();
        });

        // 날짜 변경 시 자동 새로고침
        document.getElementById('dateFrom').addEventListener('change', () => {
            this.loadRevenueData();
        });

        document.getElementById('dateTo').addEventListener('change', () => {
            this.loadRevenueData();
        });

        document.getElementById('typeFilter').addEventListener('change', () => {
            this.loadRevenueData();
        });
    }

    async loadInitialData() {
        try {
            console.log('초기 데이터 로드 시작...');
            
            // 오늘 날짜로 기본 설정
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            document.getElementById('dateFrom').value = startOfMonth.toISOString().split('T')[0];
            document.getElementById('dateTo').value = endOfMonth.toISOString().split('T')[0];

            // 매출 데이터 로드
            await this.loadRevenueData();
            
            console.log('초기 데이터 로드 완료');
        } catch (error) {
            console.error('초기 데이터 로드 오류:', error);
            this.showError('데이터를 불러오는데 실패했습니다.');
        }
    }

    async loadRevenueData() {
        try {
            const startDate = document.getElementById('dateFrom').value;
            const endDate = document.getElementById('dateTo').value;
            const type = document.getElementById('typeFilter').value;

            console.log('매출 데이터 로드:', { startDate, endDate, type });

            // 매출 상세 내역 로드
            await this.loadRevenueDetails(startDate, endDate, type);
            
            // 매출 요약 데이터 로드
            await this.loadRevenueSummary(startDate, endDate);
            
        } catch (error) {
            console.error('매출 데이터 로드 오류:', error);
            this.showError('매출 데이터를 불러오는데 실패했습니다.');
        }
    }

    async loadRevenueDetails(startDate, endDate, type) {
        try {
            // API 파라미터 구성
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (type) params.append('type', type);

            console.log('매출 상세 내역 API 호출:', `/api/summary-details/revenue?${params.toString()}`);

            const response = await fetch(`/api/summary-details/revenue?${params.toString()}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('매출 상세 내역 응답:', result);

            if (result.success) {
                this.updateRevenueTable(result.data);
            } else {
                throw new Error(result.message || '매출 상세 내역 조회에 실패했습니다.');
            }
        } catch (error) {
            console.error('매출 상세 내역 로드 오류:', error);
            this.showTableError('매출 상세 내역을 불러오는데 실패했습니다.');
        }
    }

    async loadRevenueSummary(startDate, endDate) {
        try {
            // 전체 데이터 로드 (수리 + 구매)
            const [repairsResponse, purchasesResponse] = await Promise.all([
                fetch('/api/repairs?limit=10000', { credentials: 'include' }),
                fetch('/api/purchases?limit=10000', { credentials: 'include' })
            ]);

            if (!repairsResponse.ok || !purchasesResponse.ok) {
                throw new Error('데이터 로드에 실패했습니다.');
            }

            const repairsData = await repairsResponse.json();
            const purchasesData = await purchasesResponse.json();

            const repairs = repairsData.repairs || [];
            const purchases = purchasesData.purchases || [];

            console.log('로드된 데이터:', { repairs: repairs.length, purchases: purchases.length });

            // 날짜 필터링
            let filteredRepairs = repairs;
            let filteredPurchases = purchases;

            if (startDate && endDate) {
                filteredRepairs = RevenueUtils.filterByDateRange(repairs, startDate, endDate);
                filteredPurchases = RevenueUtils.filterByDateRange(purchases, startDate, endDate);
            }

            // 매출 계산
            const revenueSummary = this.revenueCalculator.calculateFromRepairs(filteredRepairs);
            const purchaseSummary = this.calculatePurchaseSummary(filteredPurchases);

            // UI 업데이트
            this.updateSummaryCards(revenueSummary, purchaseSummary);

        } catch (error) {
            console.error('매출 요약 로드 오류:', error);
            this.showError('매출 요약을 불러오는데 실패했습니다.');
        }
    }

    updateRevenueTable(data) {
        const tbody = document.getElementById('revenueTableBody');
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="loading">매출 내역이 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((item, index) => {
            const formatNumber = (num) => new Intl.NumberFormat('ko-KR').format(num || 0);
            const formatDate = (date) => date ? new Date(date).toLocaleDateString('ko-KR') : '-';
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${formatDate(item.date)}</td>
                    <td>${item.code || '-'}</td>
                    <td class="customer-link" onclick="revenueManagement.openCustomerDetail('${item.customer || '-'}', '${item.code || ''}')">
                        ${item.customer || '-'}
                    </td>
                    <td>${item.product || '-'}</td>
                    <td>
                        <span class="type-badge type-${item.status || '판매'}">${item.status || '판매'}</span>
                    </td>
                    <td>${formatNumber(item.quantity)}</td>
                    <td>${formatNumber(item.unitPrice)}원</td>
                    <td>${formatNumber(item.totalAmount)}원</td>
                    <td>
                        <span class="status-badge status-완료">완료</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateSummaryCards(revenueSummary, purchaseSummary) {
        // 총 매출 (수리에서 계산된 매출)
        document.getElementById('totalRevenue').textContent = 
            this.formatCurrency(revenueSummary.totalRevenue);
        
        // 거래 건수
        document.getElementById('revenueCount').textContent = 
            `${revenueSummary.revenueCount}건`;
        
        // 공급가액 (부가세 제외)
        const supplyAmount = revenueSummary.totalRevenue - revenueSummary.totalRevenueVat;
        document.getElementById('supplyAmount').textContent = 
            this.formatCurrency(supplyAmount);
        
        // 부가세
        document.getElementById('vatAmount').textContent = 
            this.formatCurrency(revenueSummary.totalRevenueVat);
    }

    calculatePurchaseSummary(purchases) {
        let totalExpense = 0;
        let totalExpenseVat = 0;
        let expenseCount = 0;

        purchases.forEach(purchase => {
            try {
                const totalAmount = parseFloat(purchase.total_amount) || 0;
                const taxOption = purchase.tax_option || 'none';
                
                if (totalAmount > 0) {
                    let supplyAmount, vatAmount;
                    if (taxOption === 'include' || taxOption === 'included') {
                        supplyAmount = Math.round(totalAmount / 1.1);
                        vatAmount = totalAmount - supplyAmount;
                    } else if (taxOption === 'exclude' || taxOption === 'excluded') {
                        supplyAmount = totalAmount;
                        vatAmount = Math.round(totalAmount * 0.1);
                    } else {
                        supplyAmount = totalAmount;
                        vatAmount = 0;
                    }
                    
                    totalExpense += supplyAmount;
                    totalExpenseVat += vatAmount;
                    expenseCount++;
                }
            } catch (error) {
                console.error('구매 데이터 계산 오류:', error, purchase);
            }
        });

        return {
            totalExpense: totalExpense + totalExpenseVat,
            totalExpenseVat: totalExpenseVat,
            expenseCount: expenseCount
        };
    }

    applyFilters() {
        this.loadRevenueData();
    }

    openCustomerDetail(customerName, transactionCode) {
        console.log('고객 상세 정보 열기:', { customerName, transactionCode });
        
        if (!customerName || customerName === 'undefined' || customerName === 'unknown') {
            console.warn('고객명이 없습니다:', customerName);
            alert('고객 정보를 찾을 수 없습니다.');
            return;
        }
        
        // 고객 검색을 위한 파라미터 구성
        const searchParams = new URLSearchParams();
        searchParams.set('name', encodeURIComponent(customerName));
        if (transactionCode) {
            searchParams.set('code', encodeURIComponent(transactionCode));
        }
        
        console.log('고객 상세 정보 열기:', { customerName, transactionCode, searchParams: searchParams.toString() });
        
        // 새 창으로 고객 상세 페이지 열기
        const url = `/customers/customer-detail.html?${searchParams.toString()}`;
        window.open(url, '_blank');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount || 0);
    }

    showError(message) {
        console.error('에러:', message);
        // 간단한 에러 표시
        const tbody = document.getElementById('revenueTableBody');
        tbody.innerHTML = `<tr><td colspan="10" class="loading" style="color: #dc3545;">${message}</td></tr>`;
    }

    showTableError(message) {
        const tbody = document.getElementById('revenueTableBody');
        tbody.innerHTML = `<tr><td colspan="10" class="loading" style="color: #dc3545;">${message}</td></tr>`;
    }
}

// 페이지 로드 시 매출 관리 시스템 시작
document.addEventListener('DOMContentLoaded', () => {
    window.revenueManagement = new RevenueManagement();
});
