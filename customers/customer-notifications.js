// 고객 알림 JavaScript
let allRepairs = [];
let allCustomers = [];
let notificationSettings = {
    repairCompleteSms: true,
    repairCompleteEmail: true,
    warrantyExpirySms: true,
    warrantyExpiryEmail: true,
    warrantyAlertDays: 14
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('고객 알림 페이지 로드됨');
    loadNotificationSettings();
    loadRepairs();
    loadCustomers();
    checkNotifications();
});

// 알림 설정 로드
function loadNotificationSettings() {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
        notificationSettings = { ...notificationSettings, ...JSON.parse(savedSettings) };
    }
    
    // UI에 설정 반영
    document.getElementById('repairCompleteSms').checked = notificationSettings.repairCompleteSms;
    document.getElementById('repairCompleteEmail').checked = notificationSettings.repairCompleteEmail;
    document.getElementById('warrantyExpirySms').checked = notificationSettings.warrantyExpirySms;
    document.getElementById('warrantyExpiryEmail').checked = notificationSettings.warrantyExpiryEmail;
    document.getElementById('warrantyAlertDays').value = notificationSettings.warrantyAlertDays;
}

// 수리 이력 로드
async function loadRepairs() {
    try {
        const response = await fetch('/api/repairs?limit=10000');
        if (!response.ok) {
            throw new Error('수리 이력을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        allRepairs = data.repairs || [];
        
        console.log('수리 이력 로드됨:', allRepairs.length, '건');
    } catch (error) {
        console.error('수리 이력 로드 오류:', error);
        alert('수리 이력을 불러오는데 실패했습니다.');
    }
}

// 고객 목록 로드
async function loadCustomers() {
    try {
        const response = await fetch('/api/customers?limit=1000');
        if (!response.ok) {
            throw new Error('고객 목록을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        allCustomers = data.customers || [];
        
        console.log('고객 목록 로드됨:', allCustomers.length, '명');
    } catch (error) {
        console.error('고객 목록 로드 오류:', error);
        alert('고객 목록을 불러오는데 실패했습니다.');
    }
}

// 알림 확인 및 표시
function checkNotifications() {
    console.log('알림 확인 중...');
    
    const repairCompleteNotifications = [];
    const warrantyExpiryNotifications = [];
    
    // 수리 완료 알림 확인
    allRepairs.forEach(repair => {
        if (repair.status === '완료' && !repair.notification_sent) {
            repairCompleteNotifications.push({
                id: repair.id,
                type: '수리 완료',
                customerName: repair.customer_name,
                deviceModel: repair.device_model,
                repairDate: repair.repair_date,
                urgent: true
            });
        }
    });
    
    // 보증 만료 알림 확인
    const alertDays = notificationSettings.warrantyAlertDays;
    const today = new Date();
    const alertDate = new Date(today.getTime() + (alertDays * 24 * 60 * 60 * 1000));
    
    allRepairs.forEach(repair => {
        if (repair.status === '보증중' && repair.warranty_end_date) {
            const warrantyEndDate = new Date(repair.warranty_end_date);
            if (warrantyEndDate <= alertDate) {
                const daysLeft = Math.ceil((warrantyEndDate - today) / (1000 * 60 * 60 * 24));
                warrantyExpiryNotifications.push({
                    id: repair.id,
                    type: '보증 만료',
                    customerName: repair.customer_name,
                    deviceModel: repair.device_model,
                    warrantyEndDate: repair.warranty_end_date,
                    daysLeft: daysLeft,
                    urgent: daysLeft <= 7,
                    warning: daysLeft <= 14 && daysLeft > 7
                });
            }
        }
    });
    
    displayNotifications(repairCompleteNotifications, warrantyExpiryNotifications);
}

// 알림 표시
function displayNotifications(repairComplete, warrantyExpiry) {
    displayRepairCompleteNotifications(repairComplete);
    displayWarrantyExpiryNotifications(warrantyExpiry);
}

// 수리 완료 알림 표시
function displayRepairCompleteNotifications(notifications) {
    const container = document.getElementById('repairCompleteNotifications');
    container.innerHTML = '';
    
    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state">수리 완료 알림이 없습니다.</div>';
        return;
    }
    
    notifications.forEach(notification => {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.urgent ? 'urgent' : 'info'}`;
        
        item.innerHTML = `
            <div class="notification-header">
                <span class="notification-type">${notification.type}</span>
                <span class="notification-date">${formatDate(notification.repairDate)}</span>
            </div>
            <div class="notification-content">
                <strong>${notification.customerName}</strong>님의 <strong>${notification.deviceModel}</strong> 수리가 완료되었습니다.
            </div>
            <div class="notification-actions">
                <button class="btn-notification btn-send" onclick="sendRepairCompleteNotification(${notification.id})">
                    알림 발송
                </button>
                <button class="btn-notification btn-dismiss" onclick="dismissNotification(${notification.id}, 'repairComplete')">
                    무시
                </button>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// 보증 만료 알림 표시
function displayWarrantyExpiryNotifications(notifications) {
    const container = document.getElementById('warrantyExpiryNotifications');
    container.innerHTML = '';
    
    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state">보증 만료 알림이 없습니다.</div>';
        return;
    }
    
    notifications.forEach(notification => {
        const item = document.createElement('div');
        let className = 'notification-item';
        if (notification.urgent) className += ' urgent';
        else if (notification.warning) className += ' warning';
        else className += ' info';
        
        item.className = className;
        
        item.innerHTML = `
            <div class="notification-header">
                <span class="notification-type">${notification.type}</span>
                <span class="notification-date">${formatDate(notification.warrantyEndDate)}</span>
            </div>
            <div class="notification-content">
                <strong>${notification.customerName}</strong>님의 <strong>${notification.deviceModel}</strong> 보증이 
                <strong>${notification.daysLeft}일 후</strong> 만료됩니다.
            </div>
            <div class="notification-actions">
                <button class="btn-notification btn-send" onclick="sendWarrantyExpiryNotification(${notification.id})">
                    알림 발송
                </button>
                <button class="btn-notification btn-dismiss" onclick="dismissNotification(${notification.id}, 'warrantyExpiry')">
                    무시
                </button>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// 수리 완료 알림 발송
async function sendRepairCompleteNotification(repairId) {
    try {
        const repair = allRepairs.find(r => r.id === repairId);
        if (!repair) {
            alert('수리 정보를 찾을 수 없습니다.');
            return;
        }
        
        const customer = allCustomers.find(c => c.id === repair.customer_id);
        if (!customer) {
            alert('고객 정보를 찾을 수 없습니다.');
            return;
        }
        
        // SMS 발송
        if (notificationSettings.repairCompleteSms && customer.phone) {
            await sendSMS(customer.phone, `안녕하세요 ${customer.name}님, ${repair.device_model} 수리가 완료되었습니다.`);
        }
        
        // 이메일 발송
        if (notificationSettings.repairCompleteEmail && customer.email) {
            await sendEmail(customer.email, '수리 완료 알림', `안녕하세요 ${customer.name}님, ${repair.device_model} 수리가 완료되었습니다.`);
        }
        
        // 알림 발송 로그 추가
        addNotificationLog('수리 완료', customer.name, repair.device_model, '발송 완료');
        
        alert('알림이 발송되었습니다.');
        checkNotifications(); // 알림 목록 새로고침
        
    } catch (error) {
        console.error('알림 발송 오류:', error);
        alert('알림 발송에 실패했습니다.');
    }
}

// 보증 만료 알림 발송
async function sendWarrantyExpiryNotification(repairId) {
    try {
        const repair = allRepairs.find(r => r.id === repairId);
        if (!repair) {
            alert('수리 정보를 찾을 수 없습니다.');
            return;
        }
        
        const customer = allCustomers.find(c => c.id === repair.customer_id);
        if (!customer) {
            alert('고객 정보를 찾을 수 없습니다.');
            return;
        }
        
        const daysLeft = Math.ceil((new Date(repair.warranty_end_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        // SMS 발송
        if (notificationSettings.warrantyExpirySms && customer.phone) {
            await sendSMS(customer.phone, `안녕하세요 ${customer.name}님, ${repair.device_model} 보증이 ${daysLeft}일 후 만료됩니다.`);
        }
        
        // 이메일 발송
        if (notificationSettings.warrantyExpiryEmail && customer.email) {
            await sendEmail(customer.email, '보증 만료 알림', `안녕하세요 ${customer.name}님, ${repair.device_model} 보증이 ${daysLeft}일 후 만료됩니다.`);
        }
        
        // 알림 발송 로그 추가
        addNotificationLog('보증 만료', customer.name, repair.device_model, '발송 완료');
        
        alert('알림이 발송되었습니다.');
        checkNotifications(); // 알림 목록 새로고침
        
    } catch (error) {
        console.error('알림 발송 오류:', error);
        alert('알림 발송에 실패했습니다.');
    }
}

// 알림 무시
function dismissNotification(repairId, type) {
    if (confirm('이 알림을 무시하시겠습니까?')) {
        addNotificationLog(type, '알 수 없음', '알 수 없음', '무시됨');
        checkNotifications(); // 알림 목록 새로고침
    }
}

// 알림 발송 로그 추가
function addNotificationLog(type, customerName, deviceModel, status) {
    const logContainer = document.getElementById('notificationLog');
    const logItem = document.createElement('div');
    logItem.className = 'notification-item info';
    
    const now = new Date();
    logItem.innerHTML = `
        <div class="notification-header">
            <span class="notification-type">${type}</span>
            <span class="notification-date">${formatDateTime(now)}</span>
        </div>
        <div class="notification-content">
            <strong>${customerName}</strong>님의 <strong>${deviceModel}</strong> - ${status}
        </div>
    `;
    
    logContainer.insertBefore(logItem, logContainer.firstChild);
}

// SMS 발송 (시뮬레이션)
async function sendSMS(phone, message) {
    console.log(`SMS 발송: ${phone} - ${message}`);
    // 실제 SMS 발송 API 연동 필요
    return new Promise(resolve => setTimeout(resolve, 1000));
}

// 이메일 발송 (시뮬레이션)
async function sendEmail(email, subject, message) {
    console.log(`이메일 발송: ${email} - ${subject} - ${message}`);
    // 실제 이메일 발송 API 연동 필요
    return new Promise(resolve => setTimeout(resolve, 1000));
}

// 알림 설정 저장
function saveNotificationSettings() {
    notificationSettings.repairCompleteSms = document.getElementById('repairCompleteSms').checked;
    notificationSettings.repairCompleteEmail = document.getElementById('repairCompleteEmail').checked;
    notificationSettings.warrantyExpirySms = document.getElementById('warrantyExpirySms').checked;
    notificationSettings.warrantyExpiryEmail = document.getElementById('warrantyExpiryEmail').checked;
    notificationSettings.warrantyAlertDays = parseInt(document.getElementById('warrantyAlertDays').value);
    
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    alert('설정이 저장되었습니다.');
    
    // 알림 재확인
    checkNotifications();
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

// 날짜시간 포맷팅
function formatDateTime(date) {
    return date.toLocaleString('ko-KR');
}

// 전역 함수로 등록
window.sendRepairCompleteNotification = sendRepairCompleteNotification;
window.sendWarrantyExpiryNotification = sendWarrantyExpiryNotification;
window.dismissNotification = dismissNotification;
window.saveNotificationSettings = saveNotificationSettings;
