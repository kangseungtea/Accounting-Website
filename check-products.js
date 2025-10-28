const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/data/repair_center.db');
const db = new sqlite3.Database(dbPath);

console.log('데이터베이스 연결 중...');

// 모든 제품 코드 조회
db.all("SELECT id, product_code, name FROM products ORDER BY id DESC LIMIT 20", (err, rows) => {
    if (err) {
        console.error('오류:', err);
    } else {
        console.log('최근 20개 제품 코드:');
        rows.forEach(row => {
            console.log(`ID: ${row.id}, 코드: ${row.product_code}, 이름: ${row.name}`);
        });
    }
    
    // 특정 코드 검색
    const testCode = 'TEST123';
    db.get("SELECT id FROM products WHERE product_code = ?", [testCode], (err, row) => {
        if (err) {
            console.error('검색 오류:', err);
        } else {
            console.log(`\n코드 '${testCode}' 검색 결과:`, row ? '존재함' : '존재하지 않음');
        }
        
        db.close();
    });
});

