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
}

// 모든 화면 숨기기
function hideAllScreens() {
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'none';
}

// 메뉴 함수들
function showCustomers() {
    window.location.href = 'customers.html';
}

function showProducts() {
    alert('제품 관리 페이지 (개발 예정)');
}

function showLedger() {
    alert('장부 관리 페이지 (개발 예정)');
}

function showAccounting() {
    alert('회계 관리 페이지 (개발 예정)');
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
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
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
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            // 로그인 성공 시 대시보드로 이동
            setTimeout(() => {
                showDashboard();
                document.getElementById('userName').textContent = data.user.name;
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
        const response = await fetch('/api/check-auth', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            showDashboard();
            document.getElementById('userName').textContent = result.user.name;
        } else {
            showHome();
        }
    } catch (error) {
        showHome();
    }
}
