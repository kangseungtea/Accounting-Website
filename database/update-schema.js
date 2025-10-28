// 데이터베이스 스키마 업데이트 스크립트
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'data', 'repair_center.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
        return;
    }
    console.log('데이터베이스에 연결되었습니다.');
});

// purchases 테이블에 새로운 컬럼 추가
function updatePurchasesTable() {
    return new Promise((resolve, reject) => {
        // original_type 컬럼 추가
        db.run(`ALTER TABLE purchases ADD COLUMN original_type TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('original_type 컬럼 추가 오류:', err.message);
                reject(err);
                return;
            }
            console.log('original_type 컬럼 추가 완료');
            
            // original_purchase_id 컬럼 추가
            db.run(`ALTER TABLE purchases ADD COLUMN original_purchase_id INTEGER`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('original_purchase_id 컬럼 추가 오류:', err.message);
                    reject(err);
                    return;
                }
                console.log('original_purchase_id 컬럼 추가 완료');
                
                // 외래키 제약조건 추가
                db.run(`PRAGMA foreign_keys = ON`, (err) => {
                    if (err) {
                        console.error('외래키 활성화 오류:', err.message);
                        reject(err);
                        return;
                    }
                    console.log('외래키 활성화 완료');
                    resolve();
                });
            });
        });
    });
}

// 스키마 업데이트 실행
async function updateSchema() {
    try {
        console.log('데이터베이스 스키마 업데이트 시작...');
        await updatePurchasesTable();
        console.log('데이터베이스 스키마 업데이트 완료!');
    } catch (error) {
        console.error('스키마 업데이트 실패:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('데이터베이스 연결 종료 오류:', err.message);
            } else {
                console.log('데이터베이스 연결이 종료되었습니다.');
            }
        });
    }
}

updateSchema();
