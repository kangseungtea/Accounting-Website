-- 다나와 수리센터 데이터베이스 스키마

-- 고객 테이블
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    business_number TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    management_number TEXT UNIQUE,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_visit DATETIME,
    visit_count INTEGER DEFAULT 0,
    status TEXT DEFAULT '활성' CHECK (status IN ('활성', '비활성')),
    notes TEXT
);

-- 제품 카테고리 테이블
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    main_category TEXT NOT NULL,
    sub_category TEXT NOT NULL,
    detail_category TEXT,
    code TEXT NOT NULL,
    UNIQUE(main_category, sub_category, detail_category)
);

-- 제품 테이블
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    main_category TEXT NOT NULL,
    sub_category TEXT NOT NULL,
    detail_category TEXT,
    purchase_price INTEGER DEFAULT 0,
    selling_price INTEGER DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 구매 이력 테이블
CREATE TABLE purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    purchase_code TEXT UNIQUE,
    purchase_date DATETIME NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('판매', '구매', '선출고')),
    total_amount INTEGER NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT '완료',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 구매 상품 테이블
CREATE TABLE purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 수리 이력 테이블
CREATE TABLE repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    repair_date DATETIME NOT NULL,
    device_type TEXT,
    device_model TEXT,
    problem TEXT,
    solution TEXT,
    parts_cost INTEGER DEFAULT 0,
    labor_cost INTEGER DEFAULT 0,
    total_cost INTEGER NOT NULL,
    warranty TEXT,
    status TEXT DEFAULT '접수',
    technician TEXT,
    notes TEXT,
    vat_option TEXT DEFAULT 'included' CHECK (vat_option IN ('included', 'excluded', 'none')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 수리 부품 테이블
CREATE TABLE repair_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_id INTEGER NOT NULL,
    product_id INTEGER,  -- 제품 ID (외래키)
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    FOREIGN KEY (repair_id) REFERENCES repairs(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 수리 인건비 테이블
CREATE TABLE repair_labor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    FOREIGN KEY (repair_id) REFERENCES repairs(id)
);

-- 방문 이력 테이블
CREATE TABLE visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    visit_date DATETIME NOT NULL,
    purpose TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_management_number ON customers(management_number);
CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_category ON products(main_category, sub_category);
CREATE INDEX idx_purchases_customer ON purchases(customer_id);
CREATE INDEX idx_purchases_date ON purchases(purchase_date);
CREATE INDEX idx_repairs_customer ON repairs(customer_id);
CREATE INDEX idx_repairs_date ON repairs(repair_date);
CREATE INDEX idx_visits_customer ON visits(customer_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
