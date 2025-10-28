/**
 * 카테고리 관련 유틸리티 함수들
 */

/**
 * 카테고리 테이블 생성 쿼리 반환
 */
function getCreateCategoriesTableQuery() {
    return `
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            main_category TEXT NOT NULL,
            sub_category TEXT,
            detail_category TEXT,
            code TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
}

/**
 * 카테고리 테이블 재생성 쿼리 반환 (기존 테이블 삭제 후 생성)
 */
function getRecreateCategoriesTableQuery() {
    return `
        DROP TABLE IF EXISTS categories;
        CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            main_category TEXT NOT NULL,
            sub_category TEXT,
            detail_category TEXT,
            code TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
}

module.exports = {
    getCreateCategoriesTableQuery,
    getRecreateCategoriesTableQuery
};
