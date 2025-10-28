// 제품 관리 관련 변수
let currentPage = 1;
let currentSearch = '';
let currentCategory = '';
let currentStatus = '';
let editingProductId = null;

// 페이지 로드 시 초기화
window.addEventListener('load', async () => {
    await checkUserStatus();
    await loadCategoryData();
    loadProducts();
    
    // 테스트용 제품 추가 버튼 (개발 환경에서만)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        addTestProductButton();
    }
});

// 테스트용 제품 추가 버튼
function addTestProductButton() {
    const header = document.querySelector('.page-header');
    if (header) {
        const testBtn = document.createElement('button');
        testBtn.textContent = '테스트 제품 추가';
        testBtn.style.marginLeft = '10px';
        testBtn.style.padding = '8px 16px';
        testBtn.style.backgroundColor = '#4CAF50';
        testBtn.style.color = 'white';
        testBtn.style.border = 'none';
        testBtn.style.borderRadius = '4px';
        testBtn.style.cursor = 'pointer';
        testBtn.onclick = addTestProduct;
        header.appendChild(testBtn);
    }
}

// 테스트 제품 추가
async function addTestProduct() {
    const testProducts = [
        {
            name: '테스트 제품 1',
            description: '테스트용 제품입니다.',
            price: 100000,
            stockQuantity: 10,
            mainCategory: '컴퓨터부품',
            subCategory: 'CPU',
            detailCategory: '인텔',
            status: '활성'
        },
        {
            name: '테스트 제품 2',
            description: '테스트용 제품입니다.',
            price: 50000,
            stockQuantity: 5,
            mainCategory: '컴퓨터부품',
            subCategory: '메모리',
            detailCategory: 'DDR4',
            status: '활성'
        }
    ];
    
    for (const product of testProducts) {
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(product)
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('테스트 제품 추가 성공:', product.name);
            } else {
                console.error('테스트 제품 추가 실패:', result.message);
            }
        } catch (error) {
            console.error('테스트 제품 추가 오류:', error);
        }
    }
    
    // 제품 목록 새로고침
    loadProducts();
    showMessage('테스트 제품이 추가되었습니다.', 'success');
}

// 사용자 상태 확인
async function checkUserStatus() {
    try {
        const response = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success && result.isLoggedIn) {
            document.getElementById('userName').textContent = result.user.username;
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        window.location.href = 'index.html';
    }
}

// 제품 목록 로드
async function loadProducts(page = 1) {
    try {
        console.log('제품 목록 로드 시작, 페이지:', page);
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            search: currentSearch,
            category: currentCategory,
            status: currentStatus
        });
        
        console.log('API 요청 URL:', `/api/products?${params}`);
        const response = await fetch(`/api/products?${params}`, {
            credentials: 'include'
        });
        
        console.log('API 응답 상태:', response.status);
        console.log('API 응답 Content-Type:', response.headers.get('content-type'));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('JSON이 아닌 응답:', text.substring(0, 200));
            throw new Error('서버에서 JSON이 아닌 응답을 반환했습니다.');
        }
        
        const result = await response.json();
        console.log('API 응답 데이터:', result);
        
        if (result.success) {
            console.log('제품 데이터 개수:', result.data.length);
            displayProducts(result.data);
            displayPagination(result.pagination);
            currentPage = page;
        } else {
            console.error('API 오류:', result.message);
            showMessage('제품 목록을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('제품 로드 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 제품 목록 표시
function displayProducts(products) {
    console.log('displayProducts 호출됨, 제품 수:', products.length);
    const tbody = document.getElementById('productsTableBody');
    console.log('tbody 요소:', tbody);
    
    if (!tbody) {
        console.error('productsTableBody 요소를 찾을 수 없습니다!');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        console.log('제품 데이터가 없음, 빈 메시지 표시');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">등록된 제품이 없습니다.</td></tr>';
        return;
    }
    
    products.forEach(product => {
        console.log('제품 데이터:', product);
        const row = document.createElement('tr');
        
        // 안전한 숫자 변환 함수
        const formatNumber = (value) => {
            if (value === null || value === undefined || isNaN(value)) {
                return '0';
            }
            return Number(value).toLocaleString('ko-KR');
        };
        
        // 안전한 재고 수량 처리
        const stockQuantity = product.stock_quantity || product.stockQuantity || 0;
        const stockClass = stockQuantity === 0 ? 'stock-empty' : 'stock-available';
        
        row.innerHTML = `
            <td><span class="product-code">${product.product_code || product.productCode || '-'}</span></td>
            <td>${product.name || '-'}</td>
            <td>${product.main_category || product.category || '-'}</td>
            <td>${product.brand || '-'}</td>
            <td>${formatNumber(product.price)}원</td>
            <td class="${stockClass}">${stockQuantity}개</td>
            <td><span class="status-badge status-${product.status === '활성' ? 'active' : 'inactive'}">${product.status || '활성'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewProductDetail(${product.id})">상세</button>
                    <button class="action-btn edit-btn" onclick="editProduct(${product.id})">수정</button>
                    <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">삭제</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 페이지네이션 표시
function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';
    
    if (pagination.totalPages <= 1) return;
    
    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '이전';
    prevBtn.disabled = pagination.currentPage === 1;
    prevBtn.onclick = () => loadProducts(pagination.currentPage - 1);
    paginationDiv.appendChild(prevBtn);
    
    // 페이지 번호들
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === pagination.currentPage ? 'active' : '';
        pageBtn.onclick = () => loadProducts(i);
        paginationDiv.appendChild(pageBtn);
    }
    
    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '다음';
    nextBtn.disabled = pagination.currentPage === pagination.totalPages;
    nextBtn.onclick = () => loadProducts(pagination.currentPage + 1);
    paginationDiv.appendChild(nextBtn);
    
    // 페이지 정보
    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `${pagination.currentPage} / ${pagination.totalPages} 페이지 (총 ${pagination.totalItems}개)`;
    paginationDiv.appendChild(info);
}

// 제품 검색
function searchProducts() {
    currentSearch = document.getElementById('productSearch').value;
    loadProducts(1);
}

// 카테고리 데이터 로드 (카테고리 매니저 사용)
async function loadCategoryData() {
    await window.categoryManager.loadCategoryData();
    updateMainCategoryFilter();
}

// 제품 목록 필터의 대분류 옵션 업데이트
function updateMainCategoryFilter() {
    window.categoryManager.updateMainCategoryFilter();
}

// 하위 카테고리 업데이트
function updateSubCategories() {
    window.categoryManager.updateSubCategories();
    // 필터 적용
    filterProducts();
}

// 상세 카테고리 업데이트
function updateDetailCategories() {
    window.categoryManager.updateDetailCategories();
    // 필터 적용
    filterProducts();
}

// 제품 필터링
function filterProducts() {
    const mainCategory = document.getElementById('mainCategoryFilter').value;
    const subCategory = document.getElementById('subCategoryFilter').value;
    const detailCategory = document.getElementById('detailCategoryFilter').value;
    
    // 카테고리 조합
    if (detailCategory) {
        currentCategory = `${mainCategory}-${subCategory}-${detailCategory}`;
    } else if (subCategory) {
        currentCategory = `${mainCategory}-${subCategory}`;
    } else if (mainCategory) {
        currentCategory = mainCategory;
    } else {
        currentCategory = '';
    }
    
    currentStatus = document.getElementById('statusFilter').value;
    loadProducts(1);
}

// 필터 초기화
function clearProductFilters() {
    document.getElementById('productSearch').value = '';
    document.getElementById('mainCategoryFilter').value = '';
    document.getElementById('subCategoryFilter').value = '';
    document.getElementById('detailCategoryFilter').value = '';
    document.getElementById('statusFilter').value = '';
    
    // 카테고리 필터 비활성화
    document.getElementById('subCategoryFilter').disabled = true;
    document.getElementById('detailCategoryFilter').disabled = true;
    
    // 하위 카테고리 초기화
    document.getElementById('subCategoryFilter').innerHTML = '<option value="">하위 카테고리</option>';
    document.getElementById('detailCategoryFilter').innerHTML = '<option value="">상세 카테고리</option>';
    
    currentSearch = '';
    currentCategory = '';
    currentStatus = '';
    loadProducts(1);
}

// 카테고리 옵션 로드 (3단계 카테고리 시스템)
async function loadCategoryOptions() {
    try {
        // 카테고리 데이터가 로드되지 않았다면 로드
        if (!window.categoryManager.isDataLoaded()) {
            await window.categoryManager.loadCategoryData();
        }
        
        // 대분류 옵션 업데이트
        window.categoryManager.updateMainCategoryOptions('productMainCategory');
        
        // 중분류, 소분류 초기화
        const subCategorySelect = document.getElementById('productSubCategory');
        const detailCategorySelect = document.getElementById('productDetailCategory');
        
        subCategorySelect.innerHTML = '<option value="">중분류 선택</option>';
        detailCategorySelect.innerHTML = '<option value="">소분류 선택</option>';
        subCategorySelect.disabled = true;
        detailCategorySelect.disabled = true;
        
        // 이벤트 리스너 추가
        const mainCategorySelect = document.getElementById('productMainCategory');
        mainCategorySelect.onchange = updateProductSubCategories;
        subCategorySelect.onchange = updateProductDetailCategories;
        
    } catch (error) {
        console.error('카테고리 로드 오류:', error);
    }
}

// 제품 모달에서 중분류 카테고리 업데이트
function updateProductSubCategories() {
    window.categoryManager.updateSubCategoryOptions('productMainCategory', 'productSubCategory', 'productDetailCategory');
}

// 제품 모달에서 소분류 카테고리 업데이트
function updateProductDetailCategories() {
    window.categoryManager.updateDetailCategoryOptions('productMainCategory', 'productSubCategory', 'productDetailCategory');
}

// 새 제품 등록 모달 표시
async function showAddProductModal() {
    document.getElementById('productModalTitle').textContent = '새 제품 등록';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    editingProductId = null;
    
    // 카테고리 옵션 로드
    await loadCategoryOptions();
    
    document.getElementById('productModal').style.display = 'flex';
}

// 제품 수정 모달 표시
async function editProduct(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            const product = result.data;
            document.getElementById('productModalTitle').textContent = '제품 정보 수정';
            
            // 카테고리 옵션 로드
            await loadCategoryOptions();
            
            document.getElementById('productName').value = product.name;
            document.getElementById('productCode').value = product.productCode || '';
            
            // 3단계 카테고리 설정
            const mainCategory = product.main_category || product.mainCategory || '';
            const subCategory = product.sub_category || product.subCategory || '';
            const detailCategory = product.detail_category || product.detailCategory || '';
            
            document.getElementById('productMainCategory').value = mainCategory;
            
            // 대분류가 있으면 중분류 업데이트
            if (mainCategory) {
                updateProductSubCategories();
                setTimeout(() => {
                    document.getElementById('productSubCategory').value = subCategory;
                    
                    // 중분류가 있으면 소분류 업데이트
                    if (subCategory) {
                        updateProductDetailCategories();
                        setTimeout(() => {
                            document.getElementById('productDetailCategory').value = detailCategory;
                        }, 100);
                    }
                }, 100);
            }
            
            document.getElementById('productBrand').value = product.brand || '';
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stockQuantity;
            document.getElementById('productStatus').value = product.status;
            document.getElementById('productDescription').value = product.description || '';
            
            // 이미지 미리보기 (이미지 URL이 있는 경우)
            if (product.imageUrl) {
                document.getElementById('imagePreview').style.display = 'block';
                document.getElementById('previewImg').src = product.imageUrl;
            } else {
                document.getElementById('imagePreview').style.display = 'none';
            }
            
            editingProductId = productId;
            document.getElementById('productModal').style.display = 'flex';
        } else {
            showMessage('제품 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('제품 정보 로드 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 제품 삭제
async function deleteProduct(productId) {
    if (!confirm('정말로 이 제품을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            showMessage('제품이 삭제되었습니다.', 'success');
            loadProducts(currentPage);
        } else {
            showMessage(result.message || '제품 삭제에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('제품 삭제 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 제품 상세 보기
async function viewProductDetail(productId) {
    console.log('제품 상세 조회 시작, ID:', productId);
    try {
        const response = await fetch(`/api/products/${productId}`, {
            credentials: 'include'
        });
        
        console.log('제품 상세 API 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('JSON이 아닌 응답:', text.substring(0, 200));
            throw new Error('서버에서 JSON이 아닌 응답을 반환했습니다.');
        }
        
        const result = await response.json();
        console.log('제품 상세 API 응답:', result);
        
        if (result.success) {
            const product = result.data;
            const detailContent = document.getElementById('productDetailContent');
            
            if (!detailContent) {
                console.error('productDetailContent 요소를 찾을 수 없습니다!');
                showMessage('제품 상세 모달을 찾을 수 없습니다.', 'error');
                return;
            }
            
            // 안전한 숫자 변환 함수
            const formatNumber = (value) => {
                if (value === null || value === undefined || isNaN(value)) {
                    return '0';
                }
                return Number(value).toLocaleString('ko-KR');
            };
            
            // 안전한 날짜 포맷팅
            const formatDate = (dateStr) => {
                if (!dateStr) return '-';
                try {
                    return new Date(dateStr).toLocaleDateString('ko-KR');
                } catch (e) {
                    return dateStr;
                }
            };
            
            const stockQuantity = product.stockQuantity || product.stock_quantity || 0;
            
            detailContent.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px;">
                    <div>
                        ${product.imageUrl ? 
                            `<img src="${product.imageUrl}" style="width: 100%; border-radius: 8px; border: 1px solid #ddd;">` :
                            `<div style="width: 100%; height: 300px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">이미지 없음</div>`
                        }
                    </div>
                    <div>
                        <h3 style="margin-top: 0;">${product.name || '-'}</h3>
                        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 15px; margin-top: 20px;">
                            <strong>제품코드:</strong><span class="product-code">${product.productCode || product.product_code || '-'}</span>
                            <strong>카테고리:</strong><span>${product.category || product.main_category || '-'}</span>
                            <strong>브랜드:</strong><span>${product.brand || '-'}</span>
                            <strong>가격:</strong><span style="color: #2196F3; font-size: 1.2em; font-weight: bold;">${formatNumber(product.price)}원</span>
                            <strong>재고수량:</strong><span class="${stockQuantity === 0 ? 'stock-empty' : 'stock-available'}">${stockQuantity}개</span>
                            <strong>상태:</strong><span><span class="status-badge status-${product.status === '활성' ? 'active' : 'inactive'}">${product.status || '활성'}</span></span>
                            <strong>등록일:</strong><span>${formatDate(product.registrationDate || product.registration_date)}</span>
                        </div>
                        ${product.description ? `
                            <div style="margin-top: 30px;">
                                <strong>제품 설명:</strong>
                                <p style="margin-top: 10px; padding: 15px; background: #f5f5f5; border-radius: 4px; line-height: 1.6;">${product.description}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div style="margin-top: 40px; border-top: 2px solid #e0e0e0; padding-top: 30px;">
                    <h4 style="margin-bottom: 20px; color: #333;">📊 구매/판매 이력 및 수리 부품 사용 내역</h4>
                    <div id="productPurchasesList" style="max-height: 400px; overflow-y: auto;">
                        <div style="text-align: center; padding: 20px; color: #666;">
                            <div class="spinner" style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <span style="margin-left: 10px;">구매/판매 이력 및 수리 부품 사용 내역을 불러오는 중...</span>
                        </div>
                    </div>
                </div>
            `;
            
            const modal = document.getElementById('productDetailModal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('제품 상세 모달 표시됨');
                
                // 구매 이력 로드
                loadProductPurchases(productId);
            } else {
                console.error('productDetailModal 요소를 찾을 수 없습니다!');
                showMessage('제품 상세 모달을 찾을 수 없습니다.', 'error');
            }
        } else {
            showMessage('제품 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('제품 상세 정보 로드 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 제품별 구매 이력 로드
async function loadProductPurchases(productId) {
    try {
        console.log('제품별 구매 이력 로드 시작, 제품 ID:', productId);
        
        const response = await fetch(`/api/products/${productId}/purchases`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('제품별 구매 이력 API 응답:', result);
        
        const purchasesList = document.getElementById('productPurchasesList');
        if (!purchasesList) {
            console.error('productPurchasesList 요소를 찾을 수 없습니다!');
            return;
        }
        
        if (result.success) {
            const purchases = result.data;
            console.log('구매 이력 데이터:', purchases);
            
            if (purchases.length === 0) {
                purchasesList.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                        <p>아직 구매/판매 이력 및 수리 부품 사용 내역이 없습니다.</p>
                    </div>
                `;
            } else {
                // 안전한 숫자 변환 함수
                const formatNumber = (value) => {
                    if (value === null || value === undefined || isNaN(value)) {
                        return '0';
                    }
                    return Number(value).toLocaleString('ko-KR');
                };
                
                // 안전한 날짜 포맷팅
                const formatDate = (dateStr) => {
                    if (!dateStr) return '-';
                    try {
                        return new Date(dateStr).toLocaleDateString('ko-KR');
                    } catch (e) {
                        return dateStr;
                    }
                };
                
                // 구매/판매 이력 및 수리 부품 사용 내역 HTML 생성
                const purchasesHTML = purchases.map(purchase => {
                    // 구매/판매 이력인 경우
                    if (purchase.source_type === '구매/판매') {
                        const typeClass = purchase.type === '판매' ? 'type-sale' : 
                                        purchase.type === '구매' ? 'type-purchase' : 'type-preorder';
                        const typeIcon = purchase.type === '판매' ? '💰' : 
                                       purchase.type === '구매' ? '🛒' : '📤';
                        
                        return `
                            <div style="border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
                                <div style="background: #f8f9fa; padding: 12px 16px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="font-size: 18px;">${typeIcon}</span>
                                        <span class="status-badge ${typeClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${purchase.type}</span>
                                        <span style="font-weight: 600; color: #333;">${purchase.purchase_code || '-'}</span>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 14px; color: #666;">${formatDate(purchase.purchase_date)}</div>
                                        <div style="font-size: 16px; font-weight: bold; color: #2196F3;">${formatNumber(purchase.total_amount)}원</div>
                                    </div>
                                </div>
                                <div style="padding: 16px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
                                    <div><strong>고객:</strong> ${purchase.customer_name || '-'}</div>
                                    <div><strong>결제방법:</strong> ${purchase.payment_method || '-'}</div>
                                    <div><strong>공급가액:</strong> ${formatNumber(Math.round(purchase.total_amount / 1.1))}원</div>
                                    <div><strong>부가세:</strong> ${formatNumber(purchase.total_amount - Math.round(purchase.total_amount / 1.1))}원</div>
                                    <div><strong>합계:</strong> ${formatNumber(purchase.total_amount)}원</div>
                                    ${purchase.notes ? `<div><strong>메모:</strong> ${purchase.notes}</div>` : ''}
                                </div>
                            </div>
                        `;
                    } 
                    // 수리 부품 사용 내역인 경우
                    else if (purchase.source_type === '수리부품') {
                        return `
                            <div style="border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
                                <div style="background: #fff3e0; padding: 12px 16px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="font-size: 18px;">🔧</span>
                                        <span class="status-badge type-repair" style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: #ff9800; color: white;">수리부품</span>
                                        <span style="font-weight: 600; color: #333;">수리 #${purchase.id}</span>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 14px; color: #666;">${formatDate(purchase.purchase_date)}</div>
                                        <div style="font-size: 16px; font-weight: bold; color: #ff9800;">${formatNumber(purchase.total_price)}원</div>
                                    </div>
                                </div>
                                <div style="padding: 16px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
                                    <div><strong>고객:</strong> ${purchase.customer_name || '-'}</div>
                                    <div><strong>기사:</strong> ${purchase.technician || '-'}</div>
                                    <div><strong>상태:</strong> ${purchase.status || '-'}</div>
                                    <div><strong>수량:</strong> ${purchase.quantity}개</div>
                                    <div><strong>단가:</strong> ${formatNumber(purchase.unit_price)}원</div>
                                    <div><strong>총액:</strong> ${formatNumber(purchase.total_price)}원</div>
                                </div>
                            </div>
                        `;
                    }
                }).join('');
                
                purchasesList.innerHTML = purchasesHTML;
            }
        } else {
            purchasesList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #f44336;">
                    <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
                    <p>구매/판매 이력 및 수리 부품 사용 내역을 불러오는데 실패했습니다.</p>
                    <p style="font-size: 14px; color: #666;">${result.message || '알 수 없는 오류가 발생했습니다.'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('제품별 구매 이력 로드 오류:', error);
        const purchasesList = document.getElementById('productPurchasesList');
        if (purchasesList) {
            purchasesList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #f44336;">
                    <div style="font-size: 24px; margin-bottom: 8px;">❌</div>
                    <p>네트워크 오류가 발생했습니다.</p>
                    <p style="font-size: 14px; color: #666;">${error.message}</p>
                </div>
            `;
        }
    }
}

// 제품 모달 닫기
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    editingProductId = null;
}

// 제품 상세 모달 닫기
function closeProductDetailModal() {
    document.getElementById('productDetailModal').style.display = 'none';
}

// 이미지 미리보기
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// 제품 폼 제출
document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = Object.fromEntries(formData);
    
    // 이미지 파일은 일단 제외 (향후 파일 업로드 기능 추가 가능)
    delete productData.image;
    
    // 숫자 필드 변환
    productData.price = parseInt(productData.price);
    productData.stockQuantity = parseInt(productData.stockQuantity);
    
    // 3단계 카테고리 데이터 정리
    if (!productData.mainCategory) {
        productData.mainCategory = '';
    }
    if (!productData.subCategory) {
        productData.subCategory = '';
    }
    if (!productData.detailCategory) {
        productData.detailCategory = '';
    }
    
    const isEdit = editingProductId !== null;
    
    try {
        const url = isEdit ? `/api/products/${editingProductId}` : '/api/products';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(productData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(result.message, 'success');
            closeProductModal();
            loadProducts(currentPage);
        } else {
            showMessage(result.message || '오류가 발생했습니다.', 'error');
        }
    } catch (error) {
        console.error('제품 저장 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
});

// 메시지 표시 함수
function showMessage(message, type) {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 새 메시지 생성
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // 페이지 상단에 삽입
    const productsPage = document.querySelector('.products-page');
    productsPage.insertBefore(messageDiv, productsPage.firstChild);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// 카테고리 추가 모달 표시
function showCategoryModal() {
    document.getElementById('categoryModal').style.display = 'flex';
    document.getElementById('categoryForm').reset();
    updateCategoryForm();
}

// 카테고리 모달 닫기
function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    document.getElementById('categoryForm').reset();
}

// 카테고리 폼 업데이트
function updateCategoryForm() {
    const level = document.getElementById('categoryLevel').value;
    const parentGroup = document.getElementById('parentCategoryGroup');
    const subParentGroup = document.getElementById('subParentCategoryGroup');
    const parentSelect = document.getElementById('parentCategory');
    const subParentSelect = document.getElementById('subParentCategory');
    
    // 모든 그룹 숨기기
    parentGroup.style.display = 'none';
    subParentGroup.style.display = 'none';
    
    // 레벨에 따라 필요한 필드 표시
    if (level === 'sub') {
        parentGroup.style.display = 'block';
        updateParentCategoryOptions();
    } else if (level === 'detail') {
        parentGroup.style.display = 'block';
        subParentGroup.style.display = 'block';
        updateParentCategoryOptions();
    }
}

// 상위 카테고리 옵션 업데이트
function updateParentCategoryOptions() {
    const parentSelect = document.getElementById('parentCategory');
    const subParentSelect = document.getElementById('subParentCategory');
    const level = document.getElementById('categoryLevel').value;
    
    // 상위 카테고리 초기화
    parentSelect.innerHTML = '<option value="">상위 카테고리 선택</option>';
    subParentSelect.innerHTML = '<option value="">중분류 선택</option>';
    
    if (level === 'sub') {
        // 대분류 옵션 추가
        Object.keys(categoryData).forEach(mainCategory => {
            const option = document.createElement('option');
            option.value = mainCategory;
            option.textContent = mainCategory;
            parentSelect.appendChild(option);
        });
    } else if (level === 'detail') {
        // 대분류 옵션 추가
        Object.keys(categoryData).forEach(mainCategory => {
            const option = document.createElement('option');
            option.value = mainCategory;
            option.textContent = mainCategory;
            parentSelect.appendChild(option);
        });
        
        // 대분류 선택 시 중분류 업데이트
        parentSelect.onchange = function() {
            const selectedMain = this.value;
            subParentSelect.innerHTML = '<option value="">중분류 선택</option>';
            
            if (selectedMain && categoryData[selectedMain]) {
                Object.keys(categoryData[selectedMain]).forEach(subCategory => {
                    const option = document.createElement('option');
                    option.value = subCategory;
                    option.textContent = subCategory;
                    subParentSelect.appendChild(option);
                });
            }
        };
    }
}

// 카테고리 폼 제출
document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const categoryData = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(categoryData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('카테고리가 성공적으로 추가되었습니다!', 'success');
            closeCategoryModal();
            
            // 카테고리 데이터 새로고침
            await loadCategoryData();
            
            // 필터 새로고침
            updateSubCategories();
        } else {
            showMessage(result.message || '카테고리 추가에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('카테고리 추가 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
});

// 카테고리 데이터 업데이트
function updateCategoryData(newCategoryData) {
    // 서버에서 받은 새로운 카테고리 데이터로 업데이트
    if (newCategoryData) {
        Object.assign(categoryData, newCategoryData);
    }
}

// 로그아웃
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            window.location.href = 'index.html';
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        window.location.href = 'index.html';
    }
}

// 함수들을 전역으로 노출
window.viewProductDetail = viewProductDetail;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.closeProductDetailModal = closeProductDetailModal;
window.showMessage = showMessage;
window.updateProductSubCategories = updateProductSubCategories;
window.updateProductDetailCategories = updateProductDetailCategories;

