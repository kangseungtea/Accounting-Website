const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// JSON 파일 읽기 함수
function loadJSONFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`파일 읽기 오류 (${filePath}):`, error.message);
        return [];
    }
}

// SQLite 데이터베이스 연결
const dbPath = path.join(__dirname, 'data', 'repair_center.db');
const db = new sqlite3.Database(dbPath);

// 마이그레이션 실행
function migrateData() {
    console.log('JSON 데이터를 SQLite로 마이그레이션을 시작합니다...');
    
    // 고객 데이터 마이그레이션
    const customers = loadJSONFile(path.join(__dirname, 'data', 'customers.json'));
    console.log(`고객 데이터 ${customers.length}건 마이그레이션 중...`);
    
    const usedManagementNumbers = new Set();
    
    customers.forEach(customer => {
        let managementNumber = customer.managementNumber || `MNG${customer.id}`;
        
        // 중복된 관리번호 처리
        if (usedManagementNumbers.has(managementNumber)) {
            managementNumber = `${managementNumber}_${customer.id}`;
        }
        usedManagementNumbers.add(managementNumber);
        
        const query = `
            INSERT INTO customers (id, name, company, business_number, phone, email, address, 
                                 management_number, registration_date, last_visit, visit_count, 
                                 status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [
            customer.id,
            customer.name,
            customer.company || null,
            customer.businessNumber || null,
            customer.phone,
            customer.email || null,
            customer.address || null,
            managementNumber,
            customer.registrationDate || new Date().toISOString(),
            customer.lastVisit || null,
            customer.visitCount || 0,
            customer.status || '활성',
            customer.notes || null
        ], (err) => {
            if (err) {
                console.error('고객 데이터 마이그레이션 오류:', err.message);
            }
        });
    });
    
    // 제품 데이터 마이그레이션
    const products = loadJSONFile(path.join(__dirname, 'data', 'products.json'));
    console.log(`제품 데이터 ${products.length}건 마이그레이션 중...`);
    
    products.forEach(product => {
        // 기존 JSON 구조에 맞게 매핑
        const mainCategory = product.category || '기타';
        const subCategory = '기본';
        const detailCategory = '기본';
        
        const query = `
            INSERT INTO products (id, product_code, name, brand, main_category, sub_category, 
                                detail_category, purchase_price, selling_price, stock_quantity, 
                                min_stock, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [
            product.id,
            product.productCode || `P${product.id}`,
            product.name,
            product.brand || null,
            mainCategory,
            subCategory,
            detailCategory,
            product.purchasePrice || 0,
            product.price || 0,
            product.stockQuantity || 0,
            product.minStock || 0,
            product.description || null,
            product.createdAt || new Date().toISOString(),
            product.updatedAt || new Date().toISOString()
        ], (err) => {
            if (err) {
                console.error('제품 데이터 마이그레이션 오류:', err.message);
            }
        });
    });
    
    // 구매 이력 마이그레이션
    const purchases = loadJSONFile(path.join(__dirname, 'data', 'purchases.json'));
    console.log(`구매 이력 ${purchases.length}건 마이그레이션 중...`);
    
    purchases.forEach(purchase => {
        const query = `
            INSERT INTO purchases (id, customer_id, purchase_code, purchase_date, type, 
                                 total_amount, payment_method, status, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [
            purchase.id,
            purchase.customerId,
            purchase.purchaseCode || null,
            purchase.purchaseDate,
            purchase.type,
            purchase.totalAmount,
            purchase.paymentMethod || null,
            purchase.status || '완료',
            purchase.notes || null,
            new Date().toISOString()
        ], function(err) {
            if (err) {
                console.error('구매 이력 마이그레이션 오류:', err.message);
            } else {
                // 구매 상품 마이그레이션
                if (purchase.items && purchase.items.length > 0) {
                    purchase.items.forEach(item => {
                        const itemQuery = `
                            INSERT INTO purchase_items (purchase_id, product_name, quantity, unit_price, total_price)
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        
                        db.run(itemQuery, [
                            purchase.id,
                            item.name,
                            item.quantity,
                            item.unitPrice,
                            item.totalPrice
                        ], (err) => {
                            if (err) {
                                console.error('구매 상품 마이그레이션 오류:', err.message);
                            }
                        });
                    });
                }
            }
        });
    });
    
    // 수리 이력 마이그레이션
    const repairs = loadJSONFile(path.join(__dirname, 'data', 'repairs.json'));
    console.log(`수리 이력 ${repairs.length}건 마이그레이션 중...`);
    
    repairs.forEach(repair => {
        const query = `
            INSERT INTO repairs (id, customer_id, repair_date, device_type, device_model, 
                               problem, solution, parts_cost, labor_cost, total_cost, 
                               warranty, status, technician, notes, vat_option, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [
            repair.id,
            repair.customerId,
            repair.repairDate,
            repair.deviceType || null,
            repair.deviceModel || null,
            repair.problem || null,
            repair.solution || null,
            repair.partsCost || 0,
            repair.laborCost || 0,
            repair.totalCost,
            repair.warranty || null,
            repair.status || '접수',
            repair.technician || null,
            repair.notes || null,
            repair.vatOption || 'included',
            new Date().toISOString()
        ], function(err) {
            if (err) {
                console.error('수리 이력 마이그레이션 오류:', err.message);
            } else {
                // 수리 부품 마이그레이션
                if (repair.parts && repair.parts.length > 0) {
                    repair.parts.forEach(part => {
                        // parts가 문자열 배열인 경우 처리
                        if (typeof part === 'string') {
                            const partQuery = `
                                INSERT INTO repair_parts (repair_id, name, quantity, unit_price, total_price)
                                VALUES (?, ?, ?, ?, ?)
                            `;
                            
                            db.run(partQuery, [
                                repair.id,
                                part,
                                1,
                                0,
                                0
                            ], (err) => {
                                if (err) {
                                    console.error('수리 부품 마이그레이션 오류:', err.message);
                                }
                            });
                        } else if (part.name) {
                            // parts가 객체 배열인 경우 처리
                            const partQuery = `
                                INSERT INTO repair_parts (repair_id, name, quantity, unit_price, total_price)
                                VALUES (?, ?, ?, ?, ?)
                            `;
                            
                            db.run(partQuery, [
                                repair.id,
                                part.name,
                                part.quantity || 1,
                                part.unitPrice || 0,
                                part.totalPrice || (part.quantity * part.unitPrice)
                            ], (err) => {
                                if (err) {
                                    console.error('수리 부품 마이그레이션 오류:', err.message);
                                }
                            });
                        }
                    });
                }
                
                // 수리 인건비 마이그레이션
                if (repair.labor && repair.labor.length > 0) {
                    repair.labor.forEach(labor => {
                        const laborQuery = `
                            INSERT INTO repair_labor (repair_id, description, amount)
                            VALUES (?, ?, ?)
                        `;
                        
                        db.run(laborQuery, [
                            repair.id,
                            labor.description,
                            labor.amount
                        ], (err) => {
                            if (err) {
                                console.error('수리 인건비 마이그레이션 오류:', err.message);
                            }
                        });
                    });
                }
            }
        });
    });
    
    console.log('마이그레이션이 완료되었습니다.');
    
    // 데이터베이스 연결 종료
    db.close((err) => {
        if (err) {
            console.error('데이터베이스 연결 종료 오류:', err.message);
        } else {
            console.log('데이터베이스 연결이 종료되었습니다.');
        }
    });
}

// 마이그레이션 실행
migrateData();
