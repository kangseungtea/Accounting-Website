const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * 백업 설정 API 라우터
 * 
 * 포함된 API:
 * - GET /api/backup/config - 백업 설정 조회
 * - POST /api/backup/config/directories - 백업 디렉토리 설정
 * - POST /api/backup/config/auto-backup - 자동 백업 설정
 * - POST /api/backup/config/compression - 압축 설정
 * - POST /api/backup/config/cloud - 클라우드 백업 설정
 * - POST /api/backup/config/reset - 설정 리셋
 * - POST /api/backup/cleanup - 백업 파일 정리
 * - POST /api/backup/config/validate-directory - 디렉토리 유효성 검사
 */

/**
 * requireAuth 미들웨어를 동적으로 가져오는 함수
 */
function getRequireAuth() {
    try {
        const authApis = require('./auth-apis');
        return authApis.requireAuth;
    } catch (error) {
        console.error('requireAuth 미들웨어를 가져올 수 없습니다:', error.message);
        return (req, res, next) => {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
            }
            next();
        };
    }
}

/**
 * 백업 설정 매니저를 동적으로 가져오는 함수
 */
function getBackupConfigManager() {
    try {
        const BackupConfigManager = require('./backup-config');
        return new BackupConfigManager();
    } catch (error) {
        console.error('백업 설정 매니저를 가져올 수 없습니다:', error.message);
        return null;
    }
}

/**
 * 백업 설정 조회
 * GET /api/backup/config
 */
router.get('/api/backup/config', (req, res) => {
    try {
        const backupConfigManager = getBackupConfigManager();
        if (!backupConfigManager) {
            return res.status(500).json({
                success: false,
                error: '백업 설정 매니저를 초기화할 수 없습니다.'
            });
        }
        
        const config = backupConfigManager.getConfig();
        const suggestedDirs = backupConfigManager.getSuggestedDirectories();
        
        res.json({
            success: true,
            data: {
                config,
                suggestedDirs
            }
        });
    } catch (error) {
        console.error('백업 설정 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 설정을 가져올 수 없습니다.'
        });
    }
});

/**
 * 백업 디렉토리 설정
 * POST /api/backup/config/directories
 */
router.post('/api/backup/config/directories', (req, res) => {
    try {
        const { jsonDir, sqlDir } = req.body;
        
        if (!jsonDir || !sqlDir) {
            return res.status(400).json({
                success: false,
                error: 'JSON 디렉토리와 SQL 디렉토리가 필요합니다.'
            });
        }

        const backupConfigManager = getBackupConfigManager();
        if (!backupConfigManager) {
            return res.status(500).json({
                success: false,
                error: '백업 설정 매니저를 초기화할 수 없습니다.'
            });
        }

        // 디렉토리 유효성 검사
        const jsonValidation = backupConfigManager.validateDirectory(jsonDir);
        const sqlValidation = backupConfigManager.validateDirectory(sqlDir);

        if (!jsonValidation.valid) {
            return res.status(400).json({
                success: false,
                error: `JSON 디렉토리 오류: ${jsonValidation.error}`
            });
        }

        if (!sqlValidation.valid) {
            return res.status(400).json({
                success: false,
                error: `SQL 디렉토리 오류: ${sqlValidation.error}`
            });
        }

        // 디렉토리 설정 업데이트
        const success = backupConfigManager.setBackupDirectories(jsonValidation.path, sqlValidation.path);
        
        if (success) {
            res.json({
                success: true,
                message: '백업 디렉토리가 설정되었습니다.',
                data: {
                    jsonDir: jsonValidation.path,
                    sqlDir: sqlValidation.path
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: '디렉토리 설정에 실패했습니다.'
            });
        }
    } catch (error) {
        console.error('백업 디렉토리 설정 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 디렉토리 설정에 실패했습니다: ' + error.message
        });
    }
});

/**
 * 자동 백업 설정
 * POST /api/backup/config/auto-backup
 */
router.post('/api/backup/config/auto-backup', (req, res) => {
    try {
        const { enabled, time, maxFiles, retentionDays } = req.body;
        
        const backupConfigManager = getBackupConfigManager();
        if (!backupConfigManager) {
            return res.status(500).json({
                success: false,
                error: '백업 설정 매니저를 초기화할 수 없습니다.'
            });
        }
        
        const success = backupConfigManager.setAutoBackupSettings(
            enabled,
            time,
            maxFiles,
            retentionDays
        );
        
        if (success) {
            res.json({
                success: true,
                message: '자동 백업 설정이 저장되었습니다.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: '자동 백업 설정에 실패했습니다.'
            });
        }
    } catch (error) {
        console.error('자동 백업 설정 오류:', error);
        res.status(500).json({
            success: false,
            error: '자동 백업 설정에 실패했습니다: ' + error.message
        });
    }
});

/**
 * 압축 설정
 * POST /api/backup/config/compression
 */
router.post('/api/backup/config/compression', (req, res) => {
    try {
        const { enabled } = req.body;
        
        const backupConfigManager = getBackupConfigManager();
        if (!backupConfigManager) {
            return res.status(500).json({
                success: false,
                error: '백업 설정 매니저를 초기화할 수 없습니다.'
            });
        }
        
        const success = backupConfigManager.setCompressionSettings(enabled);
        
        if (success) {
            res.json({
                success: true,
                message: '압축 설정이 저장되었습니다.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: '압축 설정에 실패했습니다.'
            });
        }
    } catch (error) {
        console.error('압축 설정 오류:', error);
        res.status(500).json({
            success: false,
            error: '압축 설정에 실패했습니다: ' + error.message
        });
    }
});

/**
 * 클라우드 백업 설정
 * POST /api/backup/config/cloud
 */
router.post('/api/backup/config/cloud', (req, res) => {
    try {
        const { enabled, provider, cloudConfig } = req.body;
        
        const backupConfigManager = getBackupConfigManager();
        if (!backupConfigManager) {
            return res.status(500).json({
                success: false,
                error: '백업 설정 매니저를 초기화할 수 없습니다.'
            });
        }
        
        const success = backupConfigManager.setCloudBackupSettings(enabled, provider, cloudConfig);
        
        if (success) {
            res.json({
                success: true,
                message: '클라우드 백업 설정이 저장되었습니다.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: '클라우드 백업 설정에 실패했습니다.'
            });
        }
    } catch (error) {
        console.error('클라우드 백업 설정 오류:', error);
        res.status(500).json({
            success: false,
            error: '클라우드 백업 설정에 실패했습니다: ' + error.message
        });
    }
});

/**
 * 설정 리셋
 * POST /api/backup/config/reset
 */
router.post('/api/backup/config/reset', (req, res) => {
    try {
        const backupConfigManager = getBackupConfigManager();
        if (!backupConfigManager) {
            return res.status(500).json({
                success: false,
                error: '백업 설정 매니저를 초기화할 수 없습니다.'
            });
        }
        
        const success = backupConfigManager.resetToDefault();
        
        if (success) {
            res.json({
                success: true,
                message: '백업 설정이 기본값으로 리셋되었습니다.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: '설정 리셋에 실패했습니다.'
            });
        }
    } catch (error) {
        console.error('설정 리셋 오류:', error);
        res.status(500).json({
            success: false,
            error: '설정 리셋에 실패했습니다: ' + error.message
        });
    }
});

/**
 * 백업 파일 정리
 * POST /api/backup/cleanup
 */
router.post('/api/backup/cleanup', (req, res) => {
    try {
        const backupConfigManager = getBackupConfigManager();
        if (!backupConfigManager) {
            return res.status(500).json({
                success: false,
                error: '백업 설정 매니저를 초기화할 수 없습니다.'
            });
        }
        
        const result = backupConfigManager.cleanupOldBackups();
        
        if (result.success) {
            res.json({
                success: true,
                message: `백업 파일 정리가 완료되었습니다. (${result.deletedCount}개 파일 삭제)`
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || '백업 파일 정리에 실패했습니다.'
            });
        }
    } catch (error) {
        console.error('백업 파일 정리 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 파일 정리에 실패했습니다: ' + error.message
        });
    }
});

/**
 * 디렉토리 유효성 검사
 * POST /api/backup/config/validate-directory
 */
router.post('/api/backup/config/validate-directory', (req, res) => {
    try {
        const { directory } = req.body;
        
        if (!directory) {
            return res.status(400).json({
                success: false,
                error: '디렉토리 경로가 필요합니다.'
            });
        }

        const backupConfigManager = getBackupConfigManager();
        if (!backupConfigManager) {
            return res.status(500).json({
                success: false,
                error: '백업 설정 매니저를 초기화할 수 없습니다.'
            });
        }

        const validation = backupConfigManager.validateDirectory(directory);
        
        res.json({
            success: true,
            data: validation
        });
    } catch (error) {
        console.error('디렉토리 유효성 검사 오류:', error);
        res.status(500).json({
            success: false,
            error: '디렉토리 유효성 검사에 실패했습니다: ' + error.message
        });
    }
});

module.exports = router;
