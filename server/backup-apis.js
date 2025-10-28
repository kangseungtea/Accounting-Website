const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * 백업/복구 API 라우터
 * 
 * 포함된 API:
 * - GET /api/backup/list - 백업 목록 조회
 * - POST /api/backup/create/json - JSON 백업 생성
 * - POST /api/backup/create/sql - SQL 백업 생성
 * - POST /api/backup/restore/json - JSON 백업에서 복구
 * - POST /api/backup/restore/sql - SQL 백업에서 복구
 * - DELETE /api/backup/delete - 백업 파일 삭제
 * - POST /api/backup/schedule/start - 자동 백업 스케줄러 시작
 * - GET /api/backup/download/json - JSON 백업 다운로드
 * - GET /api/backup/download/sql - SQL 백업 다운로드
 * - GET /api/backup/config - 백업 설정 조회
 * - POST /api/backup/config/directories - 백업 디렉토리 설정
 * - POST /api/backup/config/auto-backup - 자동 백업 설정
 * - POST /api/backup/config/compression - 압축 설정
 * - POST /api/backup/config/cloud - 클라우드 백업 설정
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
 * 백업 매니저를 동적으로 가져오는 함수
 */
function getBackupManager() {
    try {
        const BackupRestoreManager = require('./backup-restore');
        const path = require('path');
        
        const dbPath = path.join(__dirname, '../database/data/repair_center.db');
        const backupManager = new BackupRestoreManager(dbPath);
        
        return backupManager;
    } catch (error) {
        console.error('백업 매니저를 가져올 수 없습니다:', error.message);
        return null;
    }
}

/**
 * 백업 목록 조회
 * GET /api/backup/list
 */
router.get('/api/backup/list', (req, res) => {
    try {
        const backupManager = getBackupManager();
        if (!backupManager) {
            return res.status(500).json({
                success: false,
                error: '백업 매니저를 초기화할 수 없습니다.'
            });
        }
        
        const backupList = backupManager.getBackupList();
        res.json({
            success: true,
            data: backupList
        });
    } catch (error) {
        console.error('백업 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 목록을 가져올 수 없습니다.'
        });
    }
});

/**
 * JSON 백업 생성
 * POST /api/backup/create/json
 */
router.post('/api/backup/create/json', async (req, res) => {
    try {
        const backupManager = getBackupManager();
        if (!backupManager) {
            return res.status(500).json({
                success: false,
                error: '백업 매니저를 초기화할 수 없습니다.'
            });
        }
        
        const result = await backupManager.createJsonBackup();
        res.json({
            success: true,
            message: 'JSON 백업이 생성되었습니다.',
            data: result
        });
    } catch (error) {
        console.error('JSON 백업 생성 오류:', error);
        res.status(500).json({
            success: false,
            error: 'JSON 백업 생성에 실패했습니다.'
        });
    }
});

/**
 * SQL 백업 생성
 * POST /api/backup/create/sql
 */
router.post('/api/backup/create/sql', async (req, res) => {
    try {
        const backupManager = getBackupManager();
        if (!backupManager) {
            return res.status(500).json({
                success: false,
                error: '백업 매니저를 초기화할 수 없습니다.'
            });
        }
        
        const result = await backupManager.createSqlBackup();
        res.json({
            success: true,
            message: 'SQL 백업이 생성되었습니다.',
            data: result
        });
    } catch (error) {
        console.error('SQL 백업 생성 오류:', error);
        res.status(500).json({
            success: false,
            error: 'SQL 백업 생성에 실패했습니다.'
        });
    }
});

/**
 * JSON 백업에서 복구
 * POST /api/backup/restore/json
 */
router.post('/api/backup/restore/json', async (req, res) => {
    try {
        const { fileName } = req.body;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                error: '파일명이 필요합니다.'
            });
        }

        const backupManager = getBackupManager();
        if (!backupManager) {
            return res.status(500).json({
                success: false,
                error: '백업 매니저를 초기화할 수 없습니다.'
            });
        }

        const result = await backupManager.restoreFromJson(fileName);
        res.json({
            success: true,
            message: 'JSON 백업에서 복구되었습니다.',
            data: result
        });
    } catch (error) {
        console.error('JSON 복구 오류:', error);
        res.status(500).json({
            success: false,
            error: 'JSON 복구에 실패했습니다: ' + error.message
        });
    }
});

/**
 * SQL 백업에서 복구
 * POST /api/backup/restore/sql
 */
router.post('/api/backup/restore/sql', async (req, res) => {
    try {
        const { fileName } = req.body;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                error: '파일명이 필요합니다.'
            });
        }

        const backupManager = getBackupManager();
        if (!backupManager) {
            return res.status(500).json({
                success: false,
                error: '백업 매니저를 초기화할 수 없습니다.'
            });
        }

        const result = await backupManager.restoreFromSql(fileName);
        res.json({
            success: true,
            message: 'SQL 백업에서 복구되었습니다.',
            data: result
        });
    } catch (error) {
        console.error('SQL 복구 오류:', error);
        res.status(500).json({
            success: false,
            error: 'SQL 복구에 실패했습니다: ' + error.message
        });
    }
});

/**
 * 백업 파일 삭제
 * DELETE /api/backup/delete
 */
router.delete('/api/backup/delete', (req, res) => {
    try {
        const { fileName, type } = req.body;
        
        if (!fileName || !type) {
            return res.status(400).json({
                success: false,
                error: '파일명과 타입이 필요합니다.'
            });
        }

        const backupManager = getBackupManager();
        if (!backupManager) {
            return res.status(500).json({
                success: false,
                error: '백업 매니저를 초기화할 수 없습니다.'
            });
        }

        const result = backupManager.deleteBackup(fileName, type);
        res.json({
            success: result.success,
            message: result.success ? '백업 파일이 삭제되었습니다.' : '파일 삭제에 실패했습니다.',
            data: result
        });
    } catch (error) {
        console.error('백업 파일 삭제 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 파일 삭제에 실패했습니다.'
        });
    }
});

/**
 * 자동 백업 스케줄러 시작
 * POST /api/backup/schedule/start
 */
router.post('/api/backup/schedule/start', (req, res) => {
    try {
        const backupManager = getBackupManager();
        if (!backupManager) {
            return res.status(500).json({
                success: false,
                error: '백업 매니저를 초기화할 수 없습니다.'
            });
        }
        
        backupManager.scheduleAutoBackup();
        res.json({
            success: true,
            message: '자동 백업 스케줄러가 시작되었습니다.'
        });
    } catch (error) {
        console.error('자동 백업 스케줄러 시작 오류:', error);
        res.status(500).json({
            success: false,
            error: '자동 백업 스케줄러 시작에 실패했습니다.'
        });
    }
});

/**
 * JSON 백업 다운로드
 * GET /api/backup/download/json
 */
router.get('/api/backup/download/json', (req, res) => {
    try {
        const { fileName } = req.query;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                error: '파일명이 필요합니다.'
            });
        }

        const backupManager = getBackupManager();
        if (!backupManager) {
            return res.status(500).json({
                success: false,
                error: '백업 매니저를 초기화할 수 없습니다.'
            });
        }

        const filePath = path.join(backupManager.jsonBackupDir, fileName);
        
        if (!require('fs').existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '백업 파일을 찾을 수 없습니다.'
            });
        }
        
        res.download(filePath, fileName);
    } catch (error) {
        console.error('JSON 백업 다운로드 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 다운로드에 실패했습니다.'
        });
    }
});

/**
 * SQL 백업 다운로드
 * GET /api/backup/download/sql
 */
router.get('/api/backup/download/sql', (req, res) => {
    try {
        const { fileName } = req.query;
        
        if (!fileName) {
            return res.status(400).json({
                success: false,
                error: '파일명이 필요합니다.'
            });
        }

        const backupManager = getBackupManager();
        if (!backupManager) {
            return res.status(500).json({
                success: false,
                error: '백업 매니저를 초기화할 수 없습니다.'
            });
        }

        const filePath = path.join(backupManager.sqlBackupDir, fileName);
        
        if (!require('fs').existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: '백업 파일을 찾을 수 없습니다.'
            });
        }
        
        res.download(filePath, fileName);
    } catch (error) {
        console.error('SQL 백업 다운로드 오류:', error);
        res.status(500).json({
            success: false,
            error: '백업 다운로드에 실패했습니다.'
        });
    }
});






module.exports = router;
