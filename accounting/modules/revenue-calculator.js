// 매출 계산 전용 모듈
class RevenueCalculator {
    constructor() {
        this.totalRevenue = 0;
        this.totalRevenueVat = 0;
        this.revenueCount = 0;
    }

    // 수리 데이터에서 매출 계산
    calculateFromRepairs(repairs) {
        this.reset();
        
        repairs.forEach((repair, index) => {
            try {
                const totalCost = parseFloat(repair.total_cost) || 0;
                const vatOption = repair.vat_option || 'none';
                
                if (totalCost > 0) {
                    const { supplyAmount, vatAmount } = this.calculateVat(totalCost, vatOption);
                    
                    this.totalRevenue += supplyAmount;
                    this.totalRevenueVat += vatAmount;
                    this.revenueCount++;
                    
                    if (index < 3) { // 처음 3개만 로그
                        console.log(`수리 ${index + 1}: 총액=${totalCost}, 부가세옵션=${vatOption}, 공급가액=${supplyAmount}, 부가세=${vatAmount}`);
                    }
                }
            } catch (error) {
                console.error('수리 데이터 계산 오류:', error, repair);
            }
        });
        
        return this.getSummary();
    }

    // 구매/판매 데이터에서 매출 계산 (반품 처리 포함)
    calculateFromPurchases(purchases) {
        this.reset();
        
        purchases.forEach((purchase, index) => {
            try {
                const totalAmount = parseFloat(purchase.total_amount) || 0;
                const vatOption = purchase.tax_option || 'included';
                
                if (totalAmount > 0) {
                    if (purchase.type === '판매') {
                        // 판매: 매출 증가
                        const { supplyAmount, vatAmount } = this.calculateVat(totalAmount, vatOption);
                        this.totalRevenue += supplyAmount;
                        this.totalRevenueVat += vatAmount;
                        this.revenueCount++;
                        
                        if (index < 3) {
                            console.log(`판매 ${index + 1}: 총액=${totalAmount}, 공급가액=${supplyAmount}, 부가세=${vatAmount}`);
                        }
                    } else if (purchase.type === '반품' && purchase.original_type === '판매') {
                        // 판매 반품: 매출 차감
                        const { supplyAmount, vatAmount } = this.calculateVat(totalAmount, vatOption);
                        this.totalRevenue -= supplyAmount;
                        this.totalRevenueVat -= vatAmount;
                        this.revenueCount--;
                        
                        if (index < 3) {
                            console.log(`판매 반품 ${index + 1}: 총액=${totalAmount}, 공급가액=${supplyAmount}, 부가세=${vatAmount}`);
                        }
                    }
                }
            } catch (error) {
                console.error('구매 데이터 계산 오류:', error, purchase);
            }
        });
        
        return this.getSummary();
    }

    // 부가세 계산
    calculateVat(totalCost, vatOption) {
        let supplyAmount, vatAmount;
        
        if (vatOption === 'include' || vatOption === 'included') {
            supplyAmount = Math.round(totalCost / 1.1);
            vatAmount = totalCost - supplyAmount;
        } else if (vatOption === 'exclude' || vatOption === 'excluded') {
            supplyAmount = totalCost;
            vatAmount = Math.round(totalCost * 0.1);
        } else {
            supplyAmount = totalCost;
            vatAmount = 0;
        }
        
        return { supplyAmount, vatAmount };
    }

    // 요약 데이터 반환
    getSummary() {
        return {
            totalRevenue: this.totalRevenue + this.totalRevenueVat,
            totalRevenueVat: this.totalRevenueVat,
            revenueCount: this.revenueCount,
            supplyAmount: this.totalRevenue
        };
    }

    // 초기화
    reset() {
        this.totalRevenue = 0;
        this.totalRevenueVat = 0;
        this.revenueCount = 0;
    }
}

// 전역으로 사용할 수 있도록 내보내기
window.RevenueCalculator = RevenueCalculator;
