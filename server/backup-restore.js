const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const BackupConfigManager = require('./backup-config');

class BackupRestoreManager {
    constructor(dbPath, configManager = null) {
        this.dbPath = dbPath;
        this.configManager = configManager || new BackupConfigManager();
        this.config = this.configManager.getConfig();
        
        // 설정에서 백업 디렉토리 가져오기
        this.backupDir = path.dirname(this.config.jsonBackupDir);
        this.jsonBackupDir = this.config.jsonBackupDir;
        this.sqlBackupDir = this.config.sqlBackupDir;
        
        // 백업 디렉토리 생성
        this.ensureBackupDirectories();
    }

    // 백업 디렉토리 생성
    ensureBackupDirectories() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        if (!fs.existsSync(this.jsonBackupDir)) {
            fs.mkdirSync(this.jsonBackupDir, { recursive: true });
        }
        if (!fs.existsSync(this.sqlBackupDir)) {
            fs.mkdirSync(this.sqlBackupDir, { recursive: true });
        }
    }

    // 현재 시간을 기반으로 백업 파일명 생성
    generateBackupFileName(type = 'json') {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                         now.toTimeString().split(' ')[0].replace(/:/g, '-');
        return `backup_${timestamp}.${type}`;
    }

    // JSON 백업 생성
    async createJsonBackup() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            const backupData = {};
            const tables = ['customers', 'products', 'purchases', 'purchase_items', 'repairs', 'repair_parts', 'repair_labor', 'visits', 'categories'];

            let completedTables = 0;
            const totalTables = tables.length;

            tables.forEach(table => {
                db.all(`SELECT * FROM ${table}`, (err, rows) => {
                    if (err) {
                        console.error(`테이블 ${table} 백업 오류:`, err);
                        reject(err);
                        return;
                    }
                    
                    backupData[table] = rows;
                    completedTables++;
                    
                    if (completedTables === totalTables) {
                        const fileName = this.generateBackupFileName('json');
                        const filePath = path.join(this.jsonBackupDir, fileName);
                        
                        fs.writeFile(filePath, JSON.stringify(backupData, null, 2), (err) => {
                            db.close();
                            if (err) {
                                reject(err);
                            } else {
                                resolve({
                                    success: true,
                                    fileName: fileName,
                                    filePath: filePath,
                                    recordCount: Object.values(backupData).reduce((sum, rows) => sum + rows.length, 0)
                                });
                            }
                        });
                    }
                });
            });
        });
    }

    // SQL 백업 생성 (데이터베이스 파일 복사)
    async createSqlBackup() {
        return new Promise((resolve, reject) => {
            const fileName = this.generateBackupFileName('db');
            const filePath = path.join(this.sqlBackupDir, fileName);
            
            fs.copyFile(this.dbPath, filePath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        fileName: fileName,
                        filePath: filePath
                    });
                }
            });
        });
    }

    // 백업 목록 조회
    getBackupList() {
        const jsonBackups = fs.readdirSync(this.jsonBackupDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(this.jsonBackupDir, file);
                const stats = fs.statSync(filePath);
                return {
                    fileName: file,
                    type: 'json',
                    size: stats.size,
                    created: stats.birthtime,
                    path: filePath
                };
            })
            .sort((a, b) => b.created - a.created);

        const sqlBackups = fs.readdirSync(this.sqlBackupDir)
            .filter(file => file.endsWith('.db'))
            .map(file => {
                const filePath = path.join(this.sqlBackupDir, file);
                const stats = fs.statSync(filePath);
                return {
                    fileName: file,
                    type: 'sql',
                    size: stats.size,
                    created: stats.birthtime,
                    path: filePath
                };
            })
            .sort((a, b) => b.created - a.created);

        return {
            json: jsonBackups,
            sql: sqlBackups,
            total: jsonBackups.length + sqlBackups.length
        };
    }

    // JSON 백업에서 복구
    async restoreFromJson(fileName) {
        return new Promise((resolve, reject) => {
            const filePath = path.join(this.jsonBackupDir, fileName);
            
            if (!fs.existsSync(filePath)) {
                reject(new Error('백업 파일을 찾을 수 없습니다.'));
                return;
            }

            const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const db = new sqlite3.Database(this.dbPath);
            
            // 트랜잭션 시작
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                // 모든 테이블 데이터 삭제
                const tables = ['customers', 'products', 'purchases', 'purchase_items', 'repairs', 'repair_parts', 'repair_labor', 'visits', 'categories'];
                tables.forEach(table => {
                    db.run(`DELETE FROM ${table}`);
                });

                // 데이터 복구
                let completedTables = 0;
                const totalTables = Object.keys(backupData).length;

                Object.entries(backupData).forEach(([table, rows]) => {
                    if (rows.length === 0) {
                        completedTables++;
                        if (completedTables === totalTables) {
                            db.run('COMMIT', (err) => {
                                db.close();
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve({
                                        success: true,
                                        restoredTables: Object.keys(backupData),
                                        totalRecords: Object.values(backupData).reduce((sum, rows) => sum + rows.length, 0)
                                    });
                                }
                            });
                        }
                        return;
                    }

                    // 컬럼명 추출
                    const columns = Object.keys(rows[0]);
                    const placeholders = columns.map(() => '?').join(', ');
                    const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

                    let insertedRows = 0;
                    rows.forEach((row, index) => {
                        const values = columns.map(col => row[col]);
                        db.run(insertQuery, values, (err) => {
                            if (err) {
                                console.error(`행 ${index + 1} 삽입 오류:`, err);
                            }
                            insertedRows++;
                            
                            if (insertedRows === rows.length) {
                                completedTables++;
                                if (completedTables === totalTables) {
                                    db.run('COMMIT', (err) => {
                                        db.close();
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve({
                                                success: true,
                                                restoredTables: Object.keys(backupData),
                                                totalRecords: Object.values(backupData).reduce((sum, rows) => sum + rows.length, 0)
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    });
                });
            });
        });
    }

    // SQL 백업에서 복구
    async restoreFromSql(fileName) {
        return new Promise((resolve, reject) => {
            const sourcePath = path.join(this.sqlBackupDir, fileName);
            
            if (!fs.existsSync(sourcePath)) {
                reject(new Error('백업 파일을 찾을 수 없습니다.'));
                return;
            }

            // 기존 데이터베이스 백업
            const backupPath = this.dbPath + '.backup';
            fs.copyFile(this.dbPath, backupPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // 백업 파일로 복구
                fs.copyFile(sourcePath, this.dbPath, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            success: true,
                            fileName: fileName,
                            backupCreated: backupPath
                        });
                    }
                });
            });
        });
    }

    // 백업 파일 삭제
    deleteBackup(fileName, type) {
        const dir = type === 'json' ? this.jsonBackupDir : this.sqlBackupDir;
        const filePath = path.join(dir, fileName);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return { success: true, fileName: fileName };
        } else {
            return { success: false, error: '파일을 찾을 수 없습니다.' };
        }
    }

    // 자동 백업 (매일 자정에 실행)
    scheduleAutoBackup() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            this.createJsonBackup()
                .then(result => {
                    console.log('자동 백업 완료:', result.fileName);
                    // 다음 자정까지 대기
                    this.scheduleAutoBackup();
                })
                .catch(err => {
                    console.error('자동 백업 실패:', err);
                    // 1시간 후 재시도
                    setTimeout(() => this.scheduleAutoBackup(), 60 * 60 * 1000);
                });
        }, msUntilMidnight);
    }
}

module.exports = BackupRestoreManager;
