// Transactions 테이블 생성 및 마이그레이션 스크립트
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'data', 'repair_center.db');

console.log('Transactions 테이블 생성 및 마이그레이션 시작...');
console.log('데이터베이스 경로:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
        return;
    }
    console.log('데이터베이스에 연결되었습니다.');
    
    createTransactionsTable();
});

function createTransactionsTable() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_date DATETIME NOT NULL,
            transaction_type TEXT NOT NULL CHECK (transaction_type IN (
                'SALE',
                'PURCHASE',
                'REPAIR_PART',
                'REPAIR_LABOR',
                'RETURN',
                'EXPENSE'
            )),
            reference_type TEXT,  -- 'purchase', 'repair', 'repair_part', 'repair_labor' 등
            reference_id INTEGER,  -- 원본 테이블의 ID
            customer_id INTEGER,
            product_id INTEGER,
            amount INTEGER NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
        CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);
    `;
    
    db.exec(createTableSQL, (err) => {
        if (err) {
            console.error('Transactions 테이블 생성 오류:', err.message);
            return;
        }
        console.log('✅ Transactions 테이블이 생성되었습니다.');
        
        migrateExistingData();
    });
}

function migrateExistingData() {
    console.log('\n기존 데이터 마이그레이션 시작...');
    
    // 1. purchases 데이터 마이그레이션
    migratePurchases((err) => {
        if (err) {
            console.error('purchases 마이그레이션 오류:', err);
            return;
        }
        
        // 2. repairs 데이터 마이그레이션
        migrateRepairs((err) => {
            if (err) {
                console.error('repairs 마이그레이션 오류:', err);
                return;
            }
            
            // 3. repair_parts 데이터 마이그레이션
            migrateRepairParts((err) => {
                if (err) {
                    console.error('repair_parts 마이그레이션 오류:', err);
                    return;
                }
                
                // 4. repair_labor 데이터 마이그레이션
                migrateRepairLabor((err) => {
                    if (err) {
                        console.error('repair_labor 마이그레이션 오류:', err);
                        return;
                    }
                    
                    console.log('\n✅ 모든 데이터 마이그레이션이 완료되었습니다.');
                    showSummary();
                });
            });
        });
    });
}

function migratePurchases(callback) {
    const query = `
        INSERT INTO transactions (
            transaction_date,
            transaction_type,
            reference_type,
            reference_id,
            customer_id,
            amount,
            description
        )
        SELECT 
            p.purchase_date,
            CASE 
                WHEN p.type = '판매' THEN 'SALE'
                WHEN p.type = '구매' THEN 'PURCHASE'
                WHEN p.type = '반품' AND p.original_type = '판매' THEN 'RETURN'
                WHEN p.type = '반품' AND p.original_type = '구매' THEN 'EXPENSE'
                ELSE 'PURCHASE'
            END,
            'purchase',
            p.id,
            p.customer_id,
            p.total_amount,
            'Purchase: ' || p.purchase_code
        FROM purchases p
        WHERE NOT EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.reference_type = 'purchase' 
            AND t.reference_id = p.id
        )
    `;
    
    db.run(query, function(err) {
        if (err) {
            console.error('purchases 마이그레이션 오류:', err.message);
            callback(err);
        } else {
            console.log(`✅ purchases: ${this.changes}건이 마이그레이션되었습니다.`);
            callback(null);
        }
    });
}

function migrateRepairs(callback) {
    const query = `
        INSERT INTO transactions (
            transaction_date,
            transaction_type,
            reference_type,
            reference_id,
            customer_id,
            amount,
            description
        )
        SELECT 
            r.repair_date,
            'REPAIR_LABOR',
            'repair',
            r.id,
            r.customer_id,
            r.total_cost,
            'Repair: ' || COALESCE(r.device_model, r.device_type, '수리')
        FROM repairs r
        WHERE r.total_cost > 0
        AND r.status = '완료'
        AND NOT EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.reference_type = 'repair' 
            AND t.reference_id = r.id
        )
    `;
    
    db.run(query, function(err) {
        if (err) {
            console.error('repairs 마이그레이션 오류:', err.message);
            callback(err);
        } else {
            console.log(`✅ repairs: ${this.changes}건이 마이그레이션되었습니다.`);
            callback(null);
        }
    });
}

function migrateRepairParts(callback) {
    const query = `
        INSERT INTO transactions (
            transaction_date,
            transaction_type,
            reference_type,
            reference_id,
            customer_id,
            product_id,
            amount,
            description
        )
        SELECT 
            r.repair_date,
            'REPAIR_PART',
            'repair_part',
            rp.id,
            r.customer_id,
            rp.product_id,
            rp.total_price,
            'Repair Part: ' || rp.name
        FROM repair_parts rp
        JOIN repairs r ON rp.repair_id = r.id
        WHERE NOT EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.reference_type = 'repair_part' 
            AND t.reference_id = rp.id
        )
    `;
    
    db.run(query, function(err) {
        if (err) {
            console.error('repair_parts 마이그레이션 오류:', err.message);
            callback(err);
        } else {
            console.log(`✅ repair_parts: ${this.changes}건이 마이그레이션되었습니다.`);
            callback(null);
        }
    });
}

function migrateRepairLabor(callback) {
    const query = `
        INSERT INTO transactions (
            transaction_date,
            transaction_type,
            reference_type,
            reference_id,
            customer_id,
            amount,
            description
        )
        SELECT 
            r.repair_date,
            'REPAIR_LABOR',
            'repair_labor',
            rl.id,
            r.customer_id,
            rl.amount,
            'Repair Labor: ' || rl.description
        FROM repair_labor rl
        JOIN repairs r ON rl.repair_id = r.id
        WHERE NOT EXISTS (
            SELECT 1 FROM transactions t 
            WHERE t.reference_type = 'repair_labor' 
            AND t.reference_id = rl.id
        )
    `;
    
    db.run(query, function(err) {
        if (err) {
            console.error('repair_labor 마이그레이션 오류:', err.message);
            callback(err);
        } else {
            console.log(`✅ repair_labor: ${this.changes}건이 마이그레이션되었습니다.`);
            callback(null);
        }
    });
}

function showSummary() {
    const summaryQuery = `
        SELECT 
            transaction_type,
            COUNT(*) as count,
            SUM(amount) as total_amount
        FROM transactions
        GROUP BY transaction_type
        ORDER BY transaction_type
    `;
    
    db.all(summaryQuery, [], (err, rows) => {
        if (err) {
            console.error('요약 조회 오류:', err.message);
            return;
        }
        
        console.log('\n📊 Transactions 테이블 요약:');
        console.log('타입\t\t\t건수\t\t총액');
        console.log('='.repeat(50));
        rows.forEach(row => {
            console.log(`${row.transaction_type}\t\t${row.count}건\t\t${row.total_amount.toLocaleString()}원`);
        });
        
        db.close();
    });
}

