// 백업 관리 JavaScript
class BackupManager {
    constructor() {
        this.currentTab = 'json';
        this.pendingAction = null;
        this.init();
    }

    init() {
        this.loadBackupList();
        this.loadBackupConfig();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 페이지 로드 시 자동 새로고침
        window.addEventListener('load', () => {
            this.loadBackupList();
        });
    }

    // 알림 표시
    showAlert(message, type = 'success') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alert = document.createElement('div');
        alert.id = alertId;
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        alertContainer.appendChild(alert);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                alertElement.remove();
            }
        }, 5000);
    }

    // 로딩 표시
    showLoading(tab, show = true) {
        const loadingElement = document.getElementById(`${tab}Loading`);
        if (loadingElement) {
            loadingElement.classList.toggle('show', show);
        }
    }

    // 탭 전환
    switchTab(tab) {
        // 모든 탭 버튼 비활성화
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 모든 탭 콘텐츠 숨기기
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 선택된 탭 활성화
        document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
        document.getElementById(`${tab}Tab`).classList.add('active');
        
        this.currentTab = tab;
    }

    // 백업 목록 로드
    async loadBackupList() {
        try {
            this.showLoading('json', true);
            this.showLoading('sql', true);
            
            const response = await fetch('/api/backup/list');
            const result = await response.json();
            
            if (result.success) {
                this.displayBackupList(result.data);
                this.updateStats(result.data);
            } else {
                throw new Error(result.error || '백업 목록을 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('백업 목록 로드 오류:', error);
            this.showAlert('백업 목록을 불러오는데 실패했습니다: ' + error.message, 'error');
        } finally {
            this.showLoading('json', false);
            this.showLoading('sql', false);
        }
    }

    // 백업 목록 표시
    displayBackupList(data) {
        this.displayBackupType('json', data.json);
        this.displayBackupType('sql', data.sql);
    }

    // 특정 타입의 백업 목록 표시
    displayBackupType(type, backups) {
        const container = document.getElementById(`${type}BackupList`);
        
        if (backups.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <h3>백업 파일이 없습니다</h3>
                    <p>새로운 ${type.toUpperCase()} 백업을 생성해보세요.</p>
                </div>
            `;
            return;
        }

        const backupItems = backups.map(backup => this.createBackupItem(backup, type)).join('');
        container.innerHTML = backupItems;
    }

    // 백업 아이템 생성
    createBackupItem(backup, type) {
        const size = this.formatFileSize(backup.size);
        const created = new Date(backup.created).toLocaleString('ko-KR');
        
        return `
            <div class="backup-item">
                <div class="status-indicator status-${type}"></div>
                <div class="backup-info">
                    <div class="backup-name">${backup.fileName}</div>
                    <div class="backup-details">
                        <div class="backup-detail">
                            <span>📅</span>
                            <span>${created}</span>
                        </div>
                        <div class="backup-detail">
                            <span>📦</span>
                            <span>${size}</span>
                        </div>
                        <div class="backup-detail">
                            <span>🏷️</span>
                            <span>${type.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div class="backup-actions-item">
                    <button class="btn btn-success btn-small" onclick="restoreBackup('${backup.fileName}', '${type}')">
                        🔄 복구
                    </button>
                    <button class="btn btn-primary btn-small" onclick="downloadBackup('${backup.fileName}', '${type}')">
                        ⬇️ 다운로드
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteBackup('${backup.fileName}', '${type}')">
                        🗑️ 삭제
                    </button>
                </div>
            </div>
        `;
    }

    // 통계 업데이트
    updateStats(data) {
        const totalBackups = data.json.length + data.sql.length;
        const totalSize = data.json.reduce((sum, backup) => sum + backup.size, 0) + 
                         data.sql.reduce((sum, backup) => sum + backup.size, 0);
        
        document.getElementById('totalBackups').textContent = totalBackups;
        document.getElementById('jsonBackups').textContent = data.json.length;
        document.getElementById('sqlBackups').textContent = data.sql.length;
        document.getElementById('totalSize').textContent = this.formatFileSize(totalSize);
    }

    // 파일 크기 포맷팅
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // JSON 백업 생성
    async createJsonBackup() {
        try {
            this.showAlert('JSON 백업을 생성하는 중...', 'success');
            
            const response = await fetch('/api/backup/create/json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert(`JSON 백업이 생성되었습니다: ${result.data.fileName}`, 'success');
                this.loadBackupList();
            } else {
                throw new Error(result.error || 'JSON 백업 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('JSON 백업 생성 오류:', error);
            this.showAlert('JSON 백업 생성에 실패했습니다: ' + error.message, 'error');
        }
    }

    // SQL 백업 생성
    async createSqlBackup() {
        try {
            this.showAlert('SQL 백업을 생성하는 중...', 'success');
            
            const response = await fetch('/api/backup/create/sql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert(`SQL 백업이 생성되었습니다: ${result.data.fileName}`, 'success');
                this.loadBackupList();
            } else {
                throw new Error(result.error || 'SQL 백업 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('SQL 백업 생성 오류:', error);
            this.showAlert('SQL 백업 생성에 실패했습니다: ' + error.message, 'error');
        }
    }

    // 백업 복구
    async restoreBackup(fileName, type) {
        this.showConfirmDialog(
            '백업 복구',
            `정말로 "${fileName}" 백업에서 데이터를 복구하시겠습니까?\n\n주의: 현재 데이터가 모두 삭제되고 백업 데이터로 교체됩니다.`,
            () => this.performRestore(fileName, type)
        );
    }

    // 복구 실행
    async performRestore(fileName, type) {
        try {
            this.showAlert(`${type.toUpperCase()} 백업에서 복구하는 중...`, 'success');
            
            const endpoint = type === 'json' ? '/api/backup/restore/json' : '/api/backup/restore/sql';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileName })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert(`백업에서 복구가 완료되었습니다.`, 'success');
                this.loadBackupList();
            } else {
                throw new Error(result.error || '백업 복구에 실패했습니다.');
            }
        } catch (error) {
            console.error('백업 복구 오류:', error);
            this.showAlert('백업 복구에 실패했습니다: ' + error.message, 'error');
        }
    }

    // 백업 다운로드
    downloadBackup(fileName, type) {
        const endpoint = type === 'json' ? '/api/backup/download/json' : '/api/backup/download/sql';
        const link = document.createElement('a');
        link.href = `${endpoint}?fileName=${encodeURIComponent(fileName)}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 백업 삭제
    deleteBackup(fileName, type) {
        this.showConfirmDialog(
            '백업 삭제',
            `정말로 "${fileName}" 백업 파일을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
            () => this.performDelete(fileName, type)
        );
    }

    // 삭제 실행
    async performDelete(fileName, type) {
        try {
            const response = await fetch('/api/backup/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileName, type })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('백업 파일이 삭제되었습니다.', 'success');
                this.loadBackupList();
            } else {
                throw new Error(result.error || '백업 파일 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('백업 삭제 오류:', error);
            this.showAlert('백업 파일 삭제에 실패했습니다: ' + error.message, 'error');
        }
    }

    // 자동 백업 시작
    async startAutoBackup() {
        try {
            const response = await fetch('/api/backup/schedule/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('자동 백업 스케줄러가 시작되었습니다. 매일 자정에 자동으로 백업됩니다.', 'success');
            } else {
                throw new Error(result.error || '자동 백업 시작에 실패했습니다.');
            }
        } catch (error) {
            console.error('자동 백업 시작 오류:', error);
            this.showAlert('자동 백업 시작에 실패했습니다: ' + error.message, 'error');
        }
    }

    // 확인 대화상자 표시
    showConfirmDialog(title, message, onConfirm) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmDialog').classList.add('show');
        
        this.pendingAction = onConfirm;
    }

    // 확인 대화상자에서 확인
    confirmAction() {
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
        this.cancelAction();
    }

    // 확인 대화상자에서 취소
    cancelAction() {
        document.getElementById('confirmDialog').classList.remove('show');
        this.pendingAction = null;
    }

    // 새로고침
    refreshBackupList() {
        this.loadBackupList();
    }

    // 백업 설정 로드
    async loadBackupConfig() {
        try {
            const response = await fetch('/api/backup/config');
            const result = await response.json();
            
            if (result.success) {
                this.config = result.data.config;
                this.suggestedDirs = result.data.suggestedDirectories;
                this.populateSettingsForm();
                this.populateSuggestedDirs();
            } else {
                throw new Error(result.error || '백업 설정을 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('백업 설정 로드 오류:', error);
            this.showAlert('백업 설정을 불러오는데 실패했습니다: ' + error.message, 'error');
        }
    }

    // 설정 폼에 데이터 채우기
    populateSettingsForm() {
        if (!this.config) return;

        // 디렉토리 설정
        document.getElementById('jsonDir').value = this.config.jsonBackupDir || '';
        document.getElementById('sqlDir').value = this.config.sqlBackupDir || '';

        // 자동 백업 설정
        document.getElementById('autoBackupEnabled').checked = this.config.autoBackupEnabled || false;
        document.getElementById('backupTime').value = this.config.autoBackupTime || '00:00';
        document.getElementById('maxBackupFiles').value = this.config.maxBackupFiles || 30;
        document.getElementById('retentionDays').value = this.config.backupRetentionDays || 30;

        // 고급 설정
        document.getElementById('compressionEnabled').checked = this.config.compressionEnabled || false;
        document.getElementById('cloudBackupEnabled').checked = this.config.cloudBackupEnabled || false;
    }

    // 추천 디렉토리 버튼 생성
    populateSuggestedDirs() {
        if (!this.suggestedDirs) return;

        const container = document.getElementById('suggestedDirs');
        const dirs = [
            { key: 'home', label: '홈 디렉토리', path: this.suggestedDirs.home },
            { key: 'desktop', label: '바탕화면', path: this.suggestedDirs.desktop },
            { key: 'documents', label: '문서', path: this.suggestedDirs.documents },
            { key: 'downloads', label: '다운로드', path: this.suggestedDirs.downloads },
            { key: 'current', label: '현재 위치', path: this.suggestedDirs.current }
        ];

        container.innerHTML = dirs.map(dir => 
            `<button class="dir-btn" onclick="selectSuggestedDir('${dir.key}')">${dir.label}</button>`
        ).join('');
    }

    // 추천 디렉토리 선택
    selectSuggestedDir(key) {
        const path = this.suggestedDirs[key];
        if (path) {
            // 현재 활성화된 입력 필드에 경로 설정
            const activeInput = document.activeElement;
            if (activeInput && (activeInput.id === 'jsonDir' || activeInput.id === 'sqlDir')) {
                activeInput.value = path;
            } else {
                // 기본적으로 JSON 디렉토리에 설정
                document.getElementById('jsonDir').value = path;
                document.getElementById('sqlDir').value = path;
            }
        }
    }

    // 디렉토리 설정 저장
    async saveDirectorySettings() {
        try {
            const jsonDir = document.getElementById('jsonDir').value.trim();
            const sqlDir = document.getElementById('sqlDir').value.trim();

            if (!jsonDir || !sqlDir) {
                this.showAlert('JSON 디렉토리와 SQL 디렉토리 경로를 모두 입력해주세요.', 'error');
                return;
            }

            const response = await fetch('/api/backup/config/directories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ jsonDir, sqlDir })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('백업 디렉토리가 설정되었습니다.', 'success');
                this.loadBackupConfig(); // 설정 다시 로드
            } else {
                throw new Error(result.error || '디렉토리 설정에 실패했습니다.');
            }
        } catch (error) {
            console.error('디렉토리 설정 오류:', error);
            this.showAlert('디렉토리 설정에 실패했습니다: ' + error.message, 'error');
        }
    }

    // 자동 백업 설정 저장
    async saveAutoBackupSettings() {
        try {
            const enabled = document.getElementById('autoBackupEnabled').checked;
            const time = document.getElementById('backupTime').value;
            const maxFiles = parseInt(document.getElementById('maxBackupFiles').value);
            const retentionDays = parseInt(document.getElementById('retentionDays').value);

            const response = await fetch('/api/backup/config/auto-backup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled, time, maxFiles, retentionDays })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('자동 백업 설정이 저장되었습니다.', 'success');
            } else {
                throw new Error(result.error || '자동 백업 설정에 실패했습니다.');
            }
        } catch (error) {
            console.error('자동 백업 설정 오류:', error);
            this.showAlert('자동 백업 설정에 실패했습니다: ' + error.message, 'error');
        }
    }

    // 압축 설정 저장
    async saveCompressionSettings() {
        try {
            const enabled = document.getElementById('compressionEnabled').checked;

            const response = await fetch('/api/backup/config/compression', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('압축 설정이 저장되었습니다.', 'success');
            } else {
                throw new Error(result.error || '압축 설정에 실패했습니다.');
            }
        } catch (error) {
            console.error('압축 설정 오류:', error);
            this.showAlert('압축 설정에 실패했습니다: ' + error.message, 'error');
        }
    }

    // 오래된 백업 파일 정리
    async cleanupOldBackups() {
        this.showConfirmDialog(
            '백업 파일 정리',
            '오래된 백업 파일들을 정리하시겠습니까?\n\n설정된 보관 기간과 최대 파일 수를 기준으로 정리됩니다.',
            () => this.performCleanup()
        );
    }

    // 정리 실행
    async performCleanup() {
        try {
            const response = await fetch('/api/backup/cleanup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(result.message, 'success');
                this.loadBackupList(); // 백업 목록 새로고침
            } else {
                throw new Error(result.error || '백업 파일 정리에 실패했습니다.');
            }
        } catch (error) {
            console.error('백업 파일 정리 오류:', error);
            this.showAlert('백업 파일 정리에 실패했습니다: ' + error.message, 'error');
        }
    }

    // 설정 초기화
    resetSettings() {
        this.showConfirmDialog(
            '설정 초기화',
            '모든 백업 설정을 기본값으로 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.',
            () => this.performReset()
        );
    }

    // 초기화 실행
    async performReset() {
        try {
            const response = await fetch('/api/backup/config/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('설정이 기본값으로 초기화되었습니다.', 'success');
                this.loadBackupConfig(); // 설정 다시 로드
                this.loadBackupList(); // 백업 목록 새로고침
            } else {
                throw new Error(result.error || '설정 초기화에 실패했습니다.');
            }
        } catch (error) {
            console.error('설정 초기화 오류:', error);
            this.showAlert('설정 초기화에 실패했습니다: ' + error.message, 'error');
        }
    }
}

// 전역 함수들 (HTML에서 호출)
let backupManager;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    backupManager = new BackupManager();
});

// 전역 함수들
function switchTab(tab) {
    backupManager.switchTab(tab);
}

function createJsonBackup() {
    backupManager.createJsonBackup();
}

function createSqlBackup() {
    backupManager.createSqlBackup();
}

function restoreBackup(fileName, type) {
    backupManager.restoreBackup(fileName, type);
}

function downloadBackup(fileName, type) {
    backupManager.downloadBackup(fileName, type);
}

function deleteBackup(fileName, type) {
    backupManager.deleteBackup(fileName, type);
}

function startAutoBackup() {
    backupManager.startAutoBackup();
}

function refreshBackupList() {
    backupManager.refreshBackupList();
}

function confirmAction() {
    backupManager.confirmAction();
}

function cancelAction() {
    backupManager.cancelAction();
}

// 설정 관련 전역 함수들
function selectSuggestedDir(key) {
    backupManager.selectSuggestedDir(key);
}

function saveDirectorySettings() {
    backupManager.saveDirectorySettings();
}

function saveAutoBackupSettings() {
    backupManager.saveAutoBackupSettings();
}

function cleanupOldBackups() {
    backupManager.cleanupOldBackups();
}

function resetSettings() {
    backupManager.resetSettings();
}

function browseDirectory(inputId) {
    // 웹 브라우저에서는 파일 선택 대화상자를 사용할 수 없으므로
    // 사용자에게 직접 경로를 입력하도록 안내
    const input = document.getElementById(inputId);
    const currentPath = input.value;
    
    if (currentPath) {
        // 현재 경로를 클립보드에 복사
        navigator.clipboard.writeText(currentPath).then(() => {
            backupManager.showAlert('현재 경로가 클립보드에 복사되었습니다. 파일 탐색기에서 Ctrl+V로 붙여넣기하세요.', 'success');
        });
    } else {
        backupManager.showAlert('경로를 직접 입력하거나 아래 추천 디렉토리 버튼을 사용하세요.', 'success');
    }
}
