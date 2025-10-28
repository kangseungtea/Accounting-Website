// 재고 계산 전용 모듈
class StockCalculator {
    constructor() {
        this.totalPurchased = 0;
        this.totalSold = 0;
        this.totalReturned = 0;
        this.totalUsedInRepairs = 0;
    }

    // 구매/판매 데이터에서 재고 계산 (반품 처리 포함)
    calculateFromPurchases(purchases) {
        this.reset();
        
        purchases.forEach((purchase, index) => {
            try {
                const quantity = parseInt(purchase.quantity) || 0;
                
                if (quantity > 0) {
                    if (purchase.type === '구매') {
                        // 구매: 재고 증가
                        this.totalPurchased += quantity;
                        
                        if (index < 3) {
                            console.log(`구매 ${index + 1}: 수량=${quantity}, 재고 증가`);
                        }
                    } else if (purchase.type === '판매') {
                        // 판매: 재고 감소
                        this.totalSold += quantity;
                        
                        if (index < 3) {
                            console.log(`판매 ${index + 1}: 수량=${quantity}, 재고 감소`);
                        }
                    } else if (purchase.type === '반품') {
                        if (purchase.original_type === '판매') {
                            // 판매 반품: 재고 증가
                            this.totalReturned += quantity;
                            
                            if (index < 3) {
                                console.log(`판매 반품 ${index + 1}: 수량=${quantity}, 재고 증가`);
                            }
                        } else if (purchase.original_type === '구매') {
                            // 구매 반품: 재고 감소
                            this.totalReturned -= quantity;
                            
                            if (index < 3) {
                                console.log(`구매 반품 ${index + 1}: 수량=${quantity}, 재고 감소`);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('구매 데이터 계산 오류:', error, purchase);
            }
        });
        
        return this.getSummary();
    }

    // 수리 부품 사용량 계산
    calculateFromRepairParts(repairParts) {
        this.totalUsedInRepairs = 0;
        
        repairParts.forEach((part, index) => {
            try {
                const quantity = parseInt(part.quantity) || 0;
                this.totalUsedInRepairs += quantity;
                
                if (index < 3) {
                    console.log(`수리 부품 ${index + 1}: 수량=${quantity}, 재고 감소`);
                }
            } catch (error) {
                console.error('수리 부품 데이터 계산 오류:', error, part);
            }
        });
        
        return this.getSummary();
    }

    // 통합 재고 계산
    calculateIntegrated(purchases, repairParts) {
        this.calculateFromPurchases(purchases);
        this.calculateFromRepairParts(repairParts);
        
        return this.getSummary();
    }

    // 요약 데이터 반환
    getSummary() {
        const currentStock = this.totalPurchased - this.totalSold + this.totalReturned - this.totalUsedInRepairs;
        
        return {
            totalPurchased: this.totalPurchased,
            totalSold: this.totalSold,
            totalReturned: this.totalReturned,
            totalUsedInRepairs: this.totalUsedInRepairs,
            currentStock: currentStock,
            stockMovement: {
                purchased: this.totalPurchased,
                sold: this.totalSold,
                returned: this.totalReturned,
                usedInRepairs: this.totalUsedInRepairs,
                netChange: currentStock
            }
        };
    }

    // 초기화
    reset() {
        this.totalPurchased = 0;
        this.totalSold = 0;
        this.totalReturned = 0;
        this.totalUsedInRepairs = 0;
    }
}

// 전역으로 사용할 수 있도록 내보내기
window.StockCalculator = StockCalculator;
