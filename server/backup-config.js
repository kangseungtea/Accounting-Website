const fs = require('fs');
const path = require('path');
const os = require('os');

class BackupConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '../config/backup-config.json');
        this.defaultConfig = {
            jsonBackupDir: path.join(__dirname, '../backup/backup-json'),
            sqlBackupDir: path.join(__dirname, '../backup/backup-sql'),
            autoBackupEnabled: true,
            autoBackupTime: '00:00', // 24시간 형식
            maxBackupFiles: 30, // 최대 보관할 백업 파일 수
            backupRetentionDays: 30, // 백업 보관 기간 (일)
            compressionEnabled: false, // 압축 사용 여부
            cloudBackupEnabled: false, // 클라우드 백업 사용 여부
            cloudProvider: 'none', // none, google, dropbox, etc.
            cloudConfig: {}
        };
        this.config = this.loadConfig();
    }

    // 설정 로드
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                const loadedConfig = JSON.parse(configData);
                // 기본 설정과 병합
                return { ...this.defaultConfig, ...loadedConfig };
            }
        } catch (error) {
            console.error('백업 설정 로드 오류:', error);
        }
        return { ...this.defaultConfig };
    }

    // 설정 저장
    saveConfig() {
        try {
            // 설정 디렉토리 생성
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            return true;
        } catch (error) {
            console.error('백업 설정 저장 오류:', error);
            return false;
        }
    }

    // 설정 업데이트
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this.saveConfig();
    }

    // 백업 디렉토리 설정
    setBackupDirectories(jsonDir, sqlDir) {
        // 디렉토리 존재 여부 확인 및 생성
        const dirs = [jsonDir, sqlDir];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                try {
                    fs.mkdirSync(dir, { recursive: true });
                } catch (error) {
                    throw new Error(`디렉토리 생성 실패: ${dir} - ${error.message}`);
                }
            }
        }

        this.config.jsonBackupDir = jsonDir;
        this.config.sqlBackupDir = sqlDir;
        return this.saveConfig();
    }

    // 자동 백업 설정
    setAutoBackupSettings(enabled, time, maxFiles, retentionDays) {
        this.config.autoBackupEnabled = enabled;
        this.config.autoBackupTime = time;
        this.config.maxBackupFiles = maxFiles;
        this.config.backupRetentionDays = retentionDays;
        return this.saveConfig();
    }

    // 압축 설정
    setCompressionSettings(enabled) {
        this.config.compressionEnabled = enabled;
        return this.saveConfig();
    }

    // 클라우드 백업 설정
    setCloudBackupSettings(enabled, provider, cloudConfig) {
        this.config.cloudBackupEnabled = enabled;
        this.config.cloudProvider = provider;
        this.config.cloudConfig = cloudConfig || {};
        return this.saveConfig();
    }

    // 현재 설정 조회
    getConfig() {
        return { ...this.config };
    }

    // 기본 설정으로 리셋
    resetToDefault() {
        this.config = { ...this.defaultConfig };
        return this.saveConfig();
    }

    // 시스템 기본 디렉토리 제안
    getSuggestedDirectories() {
        const homeDir = os.homedir();
        const desktopDir = path.join(homeDir, 'Desktop');
        const documentsDir = path.join(homeDir, 'Documents');
        const downloadsDir = path.join(homeDir, 'Downloads');
        
        return {
            home: homeDir,
            desktop: desktopDir,
            documents: documentsDir,
            downloads: downloadsDir,
            current: this.config.jsonBackupDir,
            custom: null
        };
    }

    // 디렉토리 유효성 검사
    validateDirectory(dirPath) {
        try {
            // 절대 경로로 변환
            const absolutePath = path.resolve(dirPath);
            
            // 디렉토리 존재 여부 확인
            if (!fs.existsSync(absolutePath)) {
                return { valid: false, error: '디렉토리가 존재하지 않습니다.' };
            }

            // 디렉토리인지 확인
            const stats = fs.statSync(absolutePath);
            if (!stats.isDirectory()) {
                return { valid: false, error: '지정된 경로가 디렉토리가 아닙니다.' };
            }

            // 쓰기 권한 확인
            try {
                const testFile = path.join(absolutePath, 'test_write.tmp');
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
            } catch (error) {
                return { valid: false, error: '디렉토리에 쓰기 권한이 없습니다.' };
            }

            return { valid: true, path: absolutePath };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // 백업 파일 정리 (오래된 파일 삭제)
    cleanupOldBackups() {
        try {
            const maxFiles = this.config.maxBackupFiles;
            const retentionDays = this.config.backupRetentionDays;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const dirs = [this.config.jsonBackupDir, this.config.sqlBackupDir];
            let deletedCount = 0;

            dirs.forEach(dir => {
                if (!fs.existsSync(dir)) return;

                const files = fs.readdirSync(dir)
                    .map(file => ({
                        name: file,
                        path: path.join(dir, file),
                        stats: fs.statSync(path.join(dir, file))
                    }))
                    .filter(file => file.stats.isFile())
                    .sort((a, b) => b.stats.mtime - a.stats.mtime);

                // 파일 수 제한
                if (files.length > maxFiles) {
                    const filesToDelete = files.slice(maxFiles);
                    filesToDelete.forEach(file => {
                        try {
                            fs.unlinkSync(file.path);
                            deletedCount++;
                        } catch (error) {
                            console.error(`파일 삭제 실패: ${file.name}`, error);
                        }
                    });
                }

                // 보관 기간 초과 파일 삭제
                files.forEach(file => {
                    if (file.stats.mtime < cutoffDate) {
                        try {
                            fs.unlinkSync(file.path);
                            deletedCount++;
                        } catch (error) {
                            console.error(`파일 삭제 실패: ${file.name}`, error);
                        }
                    }
                });
            });

            return { success: true, deletedCount };
        } catch (error) {
            console.error('백업 파일 정리 오류:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = BackupConfigManager;
