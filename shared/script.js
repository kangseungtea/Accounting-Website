// DOM 요소들
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const loginFormDiv = document.querySelector('.login-form');
const registerFormDiv = document.querySelector('.register-form');

// 폼 전환 기능
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'block';
    registerFormDiv.classList.add('form-transition');
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerFormDiv.style.display = 'none';
    loginFormDiv.style.display = 'block';
    loginFormDiv.classList.add('form-transition');
});

// 깜냥컴퓨터 클릭 시 로그인 폼 표시
function showLoginForm() {
    const homeScreen = document.querySelector('.home-screen');
    registerFormDiv.style.display = 'none';
    loginFormDiv.style.display = 'block';
    loginFormDiv.classList.add('form-transition');
    if (homeScreen) {
        homeScreen.style.display = 'none';
    }
}

// 홈 화면 표시
function showHome() {
    hideAllScreens();
    document.getElementById('homeScreen').style.display = 'block';
    document.getElementById('navMenu').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
}

// 대시보드 표시
function showDashboard() {
    hideAllScreens();
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('navMenu').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'flex';
    loadDashboardAnalysis();
}

// 대시보드 분석 데이터 로드
async function loadDashboardAnalysis() {
    try {
        console.log('대시보드 분석 데이터 로드 시작');
        await Promise.all([
            loadRepairsData(),
            loadPurchasesData()
        ]);
        updateAnalysis();
    } catch (error) {
        console.error('대시보드 분석 데이터 로드 오류:', error);
    }
}

// 수리 데이터 로드 (매출)
let allRepairs = [];
async function loadRepairsData() {
    try {
        console.log('수리 데이터 로드 시작...');
        const response = await fetch('/api/repairs?limit=10000');
        if (!response.ok) {
            throw new Error(`수리 이력을 불러오는데 실패했습니다. (${response.status})`);
        }
        const data = await response.json();
        console.log('수리 API 응답:', data);
        
        // 다양한 응답 형식 지원
        allRepairs = data.repairs || data.data || [];
        console.log('수리 데이터 로드됨:', allRepairs.length, '건');
        
        // 수리 데이터 샘플 출력 (디버깅용)
        if (allRepairs.length > 0) {
            console.log('첫 번째 수리 데이터:', allRepairs[0]);
        }
    } catch (error) {
        console.error('수리 데이터 로드 오류:', error);
        allRepairs = [];
        // 오류 시 사용자에게 알림
        showMessage('수리 데이터를 불러오는데 실패했습니다. 일부 분석 기능이 제한될 수 있습니다.', 'warning');
    }
}

// 구매 데이터 로드 (매입)
let allPurchases = [];
async function loadPurchasesData() {
    try {
        console.log('구매 데이터 로드 시작...');
        const response = await fetch('/api/purchases?limit=10000');
        if (!response.ok) {
            throw new Error(`구매 이력을 불러오는데 실패했습니다. (${response.status})`);
        }
        const data = await response.json();
        console.log('구매 API 응답:', data);
        
        // 다양한 응답 형식 지원
        allPurchases = data.purchases || data.data || [];
        console.log('구매 데이터 로드됨:', allPurchases.length, '건');
        
        // 구매 데이터 샘플 출력 (디버깅용)
        if (allPurchases.length > 0) {
            console.log('첫 번째 구매 데이터:', allPurchases[0]);
        }
    } catch (error) {
        console.error('구매 데이터 로드 오류:', error);
        allPurchases = [];
        // 오류 시 사용자에게 알림
        showMessage('구매 데이터를 불러오는데 실패했습니다. 일부 분석 기능이 제한될 수 있습니다.', 'warning');
    }
}

// 분석 업데이트
function updateAnalysis() {
    const period = document.getElementById('analysisPeriod').value;
    console.log('분석 업데이트:', period);
    
    // 기간별 데이터 그룹화
    const groupedData = groupDataByPeriod(allRepairs, allPurchases, period);
    
    // 요약 데이터 계산
    const summary = calculateSummary(allRepairs, allPurchases);
    
    // UI 업데이트
    updateSummaryCards(summary);
    updateAnalysisTable(groupedData);
}

// 기간별 데이터 그룹화
function groupDataByPeriod(repairs, purchases, period) {
    console.log('기간별 데이터 그룹화 시작:', period);
    const grouped = {};
    
    // 수리 데이터 그룹화 (매출)
    repairs.forEach((repair, index) => {
        try {
            const date = new Date(repair.repair_date);
            if (isNaN(date.getTime())) {
                console.warn('잘못된 날짜 형식:', repair.repair_date);
                return;
            }
            
            const key = getPeriodKey(date, period);
            
            if (!grouped[key]) {
                grouped[key] = {
                    period: key,
                    sales: { count: 0, supplyAmount: 0, vatAmount: 0, totalAmount: 0 },
                    purchase: { count: 0, supplyAmount: 0, vatAmount: 0, totalAmount: 0 }
                };
            }
            
            const totalCost = parseFloat(repair.total_cost) || 0;
            const vatOption = repair.vat_option || 'none';
            
            if (totalCost > 0) {
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
                
                grouped[key].sales.count++;
                grouped[key].sales.supplyAmount += supplyAmount;
                grouped[key].sales.vatAmount += vatAmount;
                grouped[key].sales.totalAmount += totalCost;
            }
        } catch (error) {
            console.error('수리 데이터 그룹화 오류:', error, repair);
        }
    });
    
    // 구매 데이터 그룹화 (매입)
    purchases.forEach((purchase, index) => {
        try {
            const date = new Date(purchase.purchase_date);
            if (isNaN(date.getTime())) {
                console.warn('잘못된 날짜 형식:', purchase.purchase_date);
                return;
            }
            
            const key = getPeriodKey(date, period);
            
            if (!grouped[key]) {
                grouped[key] = {
                    period: key,
                    sales: { count: 0, supplyAmount: 0, vatAmount: 0, totalAmount: 0 },
                    purchase: { count: 0, supplyAmount: 0, vatAmount: 0, totalAmount: 0 }
                };
            }
            
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
                
                grouped[key].purchase.count++;
                grouped[key].purchase.supplyAmount += supplyAmount;
                grouped[key].purchase.vatAmount += vatAmount;
                grouped[key].purchase.totalAmount += totalAmount;
            }
        } catch (error) {
            console.error('구매 데이터 그룹화 오류:', error, purchase);
        }
    });
    
    const result = Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
    console.log('그룹화된 데이터:', result.length, '개 기간');
    return result;
}

// 기간 키 생성
function getPeriodKey(date, period) {
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

// 요약 데이터 계산
function calculateSummary(repairs, purchases) {
    console.log('요약 데이터 계산 시작...');
    console.log('수리 데이터:', repairs.length, '건');
    console.log('구매 데이터:', purchases.length, '건');
    
    let totalRevenue = 0;
    let totalRevenueVat = 0;
    let totalExpense = 0;
    let totalExpenseVat = 0;
    let revenueCount = 0;
    let expenseCount = 0;
    
    // 매출 계산 (수리 이력)
    repairs.forEach((repair, index) => {
        try {
            const totalCost = parseFloat(repair.total_cost) || 0;
            const vatOption = repair.vat_option || 'none';
            
            if (totalCost > 0) {
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
                
                totalRevenue += supplyAmount;
                totalRevenueVat += vatAmount;
                revenueCount++;
                
                if (index < 3) { // 처음 3개만 로그
                    console.log(`수리 ${index + 1}: 총액=${totalCost}, 부가세옵션=${vatOption}, 공급가액=${supplyAmount}, 부가세=${vatAmount}`);
                }
            }
        } catch (error) {
            console.error('수리 데이터 계산 오류:', error, repair);
        }
    });
    
    // 매입 계산 (구매 이력)
    purchases.forEach((purchase, index) => {
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
                
                if (index < 3) { // 처음 3개만 로그
                    console.log(`구매 ${index + 1}: 총액=${totalAmount}, 부가세옵션=${taxOption}, 공급가액=${supplyAmount}, 부가세=${vatAmount}`);
                }
            }
        } catch (error) {
            console.error('구매 데이터 계산 오류:', error, purchase);
        }
    });
    
    const netProfit = (totalRevenue + totalRevenueVat) - (totalExpense + totalExpenseVat);
    const profitMargin = (totalRevenue + totalRevenueVat) > 0 ? Math.round((netProfit / (totalRevenue + totalRevenueVat)) * 100) : 0;
    
    const summary = {
        totalRevenue: totalRevenue + totalRevenueVat,
        totalExpense: totalExpense + totalExpenseVat,
        totalVat: totalRevenueVat + totalExpenseVat,
        netProfit: netProfit,
        profitMargin: profitMargin,
        revenueCount: revenueCount,
        expenseCount: expenseCount
    };
    
    console.log('계산된 요약 데이터:', summary);
    return summary;
}

// 요약 카드 업데이트
function updateSummaryCards(summary) {
    document.getElementById('totalRevenue').textContent = summary.totalRevenue.toLocaleString() + '원';
    document.getElementById('revenueCount').textContent = summary.revenueCount + '건';
    
    document.getElementById('totalExpense').textContent = summary.totalExpense.toLocaleString() + '원';
    document.getElementById('expenseCount').textContent = summary.expenseCount + '건';
    
    const netProfitElement = document.getElementById('netProfit');
    netProfitElement.textContent = summary.netProfit.toLocaleString() + '원';
    netProfitElement.className = summary.netProfit >= 0 ? 'card-value positive' : 'card-value negative';
    
    document.getElementById('profitMargin').textContent = summary.profitMargin + '%';
    
    document.getElementById('totalVat').textContent = summary.totalVat.toLocaleString() + '원';
}

// 분석 테이블 업데이트
function updateAnalysisTable(data) {
    const tbody = document.getElementById('analysisTableBody');
    
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

// 새로고침
function refreshAnalysis() {
    console.log('분석 새로고침');
    loadDashboardAnalysis();
}

// 전역 함수로 등록
window.updateAnalysis = updateAnalysis;
window.refreshAnalysis = refreshAnalysis;

// 모든 화면 숨기기
function hideAllScreens() {
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'none';
}

// 메뉴 함수들
function showCustomers() {
    window.location.href = '../customers/customers.html';
}

function showProducts() {
    window.location.href = '../products/products.html';
}

function showLedger() {
    alert('장부 관리 페이지 (개발 예정)');
}

function showAccounting() {
    window.location.href = '../accounting/accounting.html';
}

function showSettings() {
    alert('설정 페이지 (개발 예정)');
}

// 로그아웃
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            showHome();
            alert('로그아웃되었습니다.');
        } else {
            showHome();
            alert('로그아웃되었습니다.');
        }
    } catch (error) {
        showHome();
        alert('로그아웃되었습니다.');
    }
}

// 메시지 표시 함수
function showMessage(message, type) {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 새 메시지 생성
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // 폼 앞에 삽입
    const form = type === 'success' ? loginForm : registerForm;
    form.parentNode.insertBefore(messageDiv, form);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// 로딩 상태 설정
function setLoading(form, loading) {
    if (loading) {
        form.classList.add('loading');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
    } else {
        form.classList.remove('loading');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
    }
}

// 로그인 폼 제출
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showMessage('모든 필드를 입력해주세요.', 'error');
        return;
    }
    
    setLoading(loginForm, true);
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            // 로그인 성공 시 대시보드로 이동
            setTimeout(() => {
                showDashboard();
                document.getElementById('userName').textContent = data.user.username;
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    } finally {
        setLoading(loginForm, false);
    }
});

// 회원가입 폼 제출
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value;
    
    if (!name || !username || !password || !phone) {
        showMessage('모든 필드를 입력해주세요.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('비밀번호는 6자 이상이어야 합니다.', 'error');
        return;
    }
    
    setLoading(registerForm, true);
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, username, password, phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            // 회원가입 성공 시 로그인 폼으로 전환
            setTimeout(() => {
                registerFormDiv.style.display = 'none';
                loginFormDiv.style.display = 'block';
                // 폼 초기화
                registerForm.reset();
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    } finally {
        setLoading(registerForm, false);
    }
});

// 입력 필드 포커스 효과
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.classList.remove('focused');
        }
    });
});


// 페이지 로드 시 사용자 상태 확인
window.addEventListener('load', () => {
    // 서버에서 사용자 상태 확인
    checkUserStatus();
});

// 사용자 상태 확인
async function checkUserStatus() {
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success && result.isLoggedIn) {
            showDashboard();
            document.getElementById('userName').textContent = result.user.username;
        } else {
            showHome();
        }
    } catch (error) {
        showHome();
    }
}
