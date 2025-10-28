// 매입 계산 전용 모듈
class ExpenseCalculator {
    constructor() {
        this.totalExpense = 0;
        this.totalExpenseVat = 0;
        this.expenseCount = 0;
    }

    // 구매/판매 데이터에서 매입 계산 (반품 처리 포함)
    calculateFromPurchases(purchases) {
        this.reset();
        
        purchases.forEach((purchase, index) => {
            try {
                const totalAmount = parseFloat(purchase.total_amount) || 0;
                const vatOption = purchase.tax_option || 'included';
                
                if (totalAmount > 0) {
                    if (purchase.type === '구매') {
                        // 구매: 매입 증가
                        const { supplyAmount, vatAmount } = this.calculateVat(totalAmount, vatOption);
                        this.totalExpense += supplyAmount;
                        this.totalExpenseVat += vatAmount;
                        this.expenseCount++;
                        
                        if (index < 3) {
                            console.log(`구매 ${index + 1}: 총액=${totalAmount}, 공급가액=${supplyAmount}, 부가세=${vatAmount}`);
                        }
                    } else if (purchase.type === '반품' && purchase.original_type === '구매') {
                        // 구매 반품: 매입 상승 (반품받은 금액만큼 매입 증가)
                        const { supplyAmount, vatAmount } = this.calculateVat(totalAmount, vatOption);
                        this.totalExpense += supplyAmount;
                        this.totalExpenseVat += vatAmount;
                        this.expenseCount++;
                        
                        if (index < 3) {
                            console.log(`구매 반품 ${index + 1}: 총액=${totalAmount}, 공급가액=${supplyAmount}, 부가세=${vatAmount}`);
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
            totalExpense: this.totalExpense + this.totalExpenseVat,
            totalExpenseVat: this.totalExpenseVat,
            expenseCount: this.expenseCount,
            supplyAmount: this.totalExpense
        };
    }

    // 초기화
    reset() {
        this.totalExpense = 0;
        this.totalExpenseVat = 0;
        this.expenseCount = 0;
    }
}

// 전역으로 사용할 수 있도록 내보내기
window.ExpenseCalculator = ExpenseCalculator;
