// 데이터베이스 스키마 수정 스크립트
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

// purchases 테이블에 original_type과 original_purchase_id 컬럼 추가
function addMissingColumns() {
    return new Promise((resolve, reject) => {
        console.log('누락된 컬럼들을 추가합니다...');
        
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
                
                // 컬럼 존재 확인
                db.all("PRAGMA table_info(purchases)", (err, columns) => {
                    if (err) {
                        console.error('테이블 정보 조회 오류:', err.message);
                        reject(err);
                        return;
                    }
                    
                    console.log('purchases 테이블 컬럼 목록:');
                    columns.forEach(col => {
                        console.log(`- ${col.name} (${col.type})`);
                    });
                    
                    resolve();
                });
            });
        });
    });
}

// 스키마 수정 실행
async function fixSchema() {
    try {
        console.log('데이터베이스 스키마 수정 시작...');
        await addMissingColumns();
        console.log('데이터베이스 스키마 수정 완료!');
    } catch (error) {
        console.error('스키마 수정 실패:', error);
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

fixSchema();
