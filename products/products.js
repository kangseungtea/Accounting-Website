// 제품 관리 관련 변수
let currentPage = 1;
let currentSearch = '';
let currentCategory = '';
let currentStatus = '';
let editingProductId = null;

// 페이지 로드 시 초기화
window.addEventListener('load', async () => {
    console.log('🚀 페이지 로드 시작');
    
    try {
        console.log('👤 사용자 상태 확인 중...');
        const userStatus = await checkUserStatus();
        if (!userStatus) {
            console.log('❌ 사용자 인증 실패, 로그인 페이지로 이동');
            return;
        }
        console.log('✅ 사용자 상태 확인 완료');
        
        console.log('📁 카테고리 데이터 로드 중...');
        try {
            await loadCategoryData();
            console.log('✅ 카테고리 데이터 로드 완료');
        } catch (error) {
            console.warn('⚠️ 카테고리 데이터 로드 실패, 계속 진행:', error);
        }
        
        console.log('📦 제품 목록 로드 시작...');
        await loadProducts();
        console.log('✅ 제품 목록 로드 완료');
        
        console.log('🔄 재고 동기화 백그라운드 실행...');
        syncAllStockSilently();
        
        console.log('🎉 페이지 초기화 완료!');
    } catch (error) {
        console.error('💥 페이지 초기화 오류:', error);
    }
});

// 모든 제품 재고 조용히 동기화 (알림 없이)
async function syncAllStockSilently() {
    try {
        console.log('🔄 모든 제품 재고 동기화 시작...');
        const response = await fetch('/api/debug/sync-all-stock', {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ 재고 동기화 완료: ${result.syncedCount}/${result.totalCount}개 제품`);
            if (result.errorCount > 0) {
                console.warn(`⚠️ ${result.errorCount}개 제품에서 오류 발생`);
            }
        } else {
            console.error('재고 동기화 실패:', result.message);
        }
    } catch (error) {
        console.error('재고 동기화 오류:', error);
    }
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
            return true;
        } else {
            console.log('❌ 사용자 인증 실패:', result.message);
            window.location.href = '../shared/index.html';
            return false;
        }
    } catch (error) {
        console.error('❌ 사용자 상태 확인 오류:', error);
        window.location.href = '../shared/index.html';
        return false;
    }
}

// 제품 목록 로드
async function loadProducts(page = 1) {
    try {
        console.log('🚀 제품 목록 로드 시작, 페이지:', page);
        console.log('🔍 현재 필터 상태:', {
            search: currentSearch,
            category: currentCategory,
            status: currentStatus
        });
        
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            search: currentSearch,
            category: currentCategory,
            status: currentStatus
        });
        
        console.log('📡 API 요청 URL:', `/api/products?${params}`);
        const response = await fetch(`/api/products?${params}`, {
            credentials: 'include'
        });
        
        console.log('📊 API 응답 상태:', response.status);
        console.log('📋 API 응답 Content-Type:', response.headers.get('content-type'));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ JSON이 아닌 응답:', text.substring(0, 200));
            throw new Error('서버에서 JSON이 아닌 응답을 반환했습니다.');
        }
        
        const result = await response.json();
        console.log('📦 API 응답 데이터:', result);
        
        if (result.success) {
            console.log('✅ 제품 데이터 개수:', result.data.length);
            console.log('📄 페이지네이션 정보:', result.pagination);
            displayProducts(result.data);
            displayPagination(result.pagination);
            currentPage = page;
            console.log('🎉 제품 목록 로드 완료!');
        } else {
            console.error('❌ API 오류:', result.message);
            showMessage('제품 목록을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('💥 제품 로드 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 제품 목록 표시 (상태별 그룹화)
function displayProducts(products) {
    console.log('🎨 displayProducts 호출됨, 제품 수:', products.length);
    const tbody = document.getElementById('productsTableBody');
    console.log('🔍 tbody 요소:', tbody);
    
    if (!tbody) {
        console.error('❌ productsTableBody 요소를 찾을 수 없습니다!');
        return;
    }
    
    console.log('🧹 tbody 내용 초기화');
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        console.log('📭 제품 데이터가 없음, 빈 메시지 표시');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">등록된 제품이 없습니다.</td></tr>';
        return;
    }
    
    // 제품명별로 그룹화
    const groupedProducts = {};
    products.forEach(product => {
        const productName = product.name || '제품명 없음';
        if (!groupedProducts[productName]) {
            groupedProducts[productName] = [];
        }
        groupedProducts[productName].push(product);
    });
    
    // 그룹화된 제품들을 표시
    Object.keys(groupedProducts).forEach(productName => {
        const productGroup = groupedProducts[productName];
        
        // 제품명 그룹 헤더 (여러 상태가 있는 경우만)
        if (productGroup.length > 1) {
            const headerRow = document.createElement('tr');
            headerRow.className = 'product-group-header';
            headerRow.innerHTML = `
                <td colspan="8" style="background: #f8f9fa; font-weight: bold; color: #495057; padding: 12px; border-left: 4px solid #007bff;">
                    📦 ${productName} (${productGroup.length}개 상태)
                </td>
            `;
            tbody.appendChild(headerRow);
        }
        
        // 각 상태별 제품 표시
        productGroup.forEach(product => {
            console.log('제품 데이터:', product);
            const row = document.createElement('tr');
            
            // 그룹 내에서 들여쓰기 (여러 상태가 있는 경우)
            const indentClass = productGroup.length > 1 ? 'product-group-item' : '';
            
            // 안전한 숫자 변환 함수
            const formatNumber = (value) => {
                if (value === null || value === undefined || isNaN(value)) {
                    return '0';
                }
                return Number(value).toLocaleString('ko-KR');
            };
            
            // 안전한 재고 수량 처리
            const stockQuantity = product.stock_quantity || product.stockQuantity || 0;
            let stockClass, stockColor;
            if (stockQuantity < 0) {
                stockClass = 'stock-negative';
                stockColor = '#ff6b6b'; // 빨간색 (음수)
            } else if (stockQuantity === 0) {
                stockClass = 'stock-empty';
                stockColor = '#dc3545'; // 빨간색 (0개)
            } else {
                stockClass = 'stock-available';
                stockColor = '#28a745'; // 초록색 (양수)
            }
            
            // 상태별 색상 클래스
            const statusClass = getStatusClass(product.status);
            
            row.className = indentClass;
            row.innerHTML = `
                <td class="product-code-cell"><span class="product-code">${product.product_code || product.productCode || '-'}</span></td>
                <td class="product-name-cell">${productGroup.length > 1 ? '└ ' : ''}${product.name || '-'}</td>
                <td class="product-category-cell">${product.main_category || product.category || '-'}</td>
                <td class="product-brand-cell">${product.brand || '-'}</td>
                <td class="product-price-cell">${formatNumber(product.price)}원</td>
                <td class="product-stock-cell ${stockClass}" style="color: ${stockColor}; font-weight: bold;">${stockQuantity}개</td>
                <td class="product-status-cell"><span class="status-badge ${statusClass}">${product.status || '정품'}</span></td>
                <td class="product-action-cell">
                    <div class="action-buttons">
                        <button class="action-btn view-btn" onclick="viewProductDetail(${product.id})">상세</button>
                        <button class="action-btn edit-btn" onclick="editProduct(${product.id})">수정</button>
                        <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">삭제</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

// 상태별 색상 클래스 반환
function getStatusClass(status) {
    switch(status) {
        case '정품':
            return 'status-new';
        case '중고':
            return 'status-used';
        case '벌크':
            return 'status-bulk';
        case '리퍼':
            return 'status-refurb';
        case '불량품':
            return 'status-defective';
        default:
            return 'status-default';
    }
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
    try {
        if (typeof window.categoryManager === 'undefined') {
            console.warn('⚠️ categoryManager가 아직 로드되지 않았습니다. 잠시 후 다시 시도합니다.');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (typeof window.categoryManager !== 'undefined') {
            await window.categoryManager.loadCategoryData();
            updateMainCategoryFilter();
        } else {
            console.warn('⚠️ categoryManager를 사용할 수 없습니다. 카테고리 필터를 건너뜁니다.');
        }
    } catch (error) {
        console.error('❌ 카테고리 데이터 로드 오류:', error);
    }
}

// 제품 목록 필터의 대분류 옵션 업데이트
function updateMainCategoryFilter() {
    try {
        if (typeof window.categoryManager !== 'undefined') {
            window.categoryManager.updateMainCategoryFilter();
        } else {
            console.warn('⚠️ categoryManager를 사용할 수 없습니다. 카테고리 필터 업데이트를 건너뜁니다.');
        }
    } catch (error) {
        console.error('❌ 카테고리 필터 업데이트 오류:', error);
    }
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

// 새 제품 등록 모달 표시 (iframe 방식)
function openProductAddModal() {
    const modal = document.getElementById('productAddModal');
    const frame = document.getElementById('productAddFrame');
    
    if (modal && frame) {
        // iframe에 product-add.html 로드
        frame.src = 'product-add.html';
        modal.style.display = 'flex';
    }
}

// 제품 등록 모달 닫기
function closeProductAddModal() {
    const modal = document.getElementById('productAddModal');
    if (modal) {
        modal.style.display = 'none';
        // 제품 목록 새로고침
        loadProducts();
    }
}

// 새 제품 등록 모달 표시 (기존 모달 방식 - 사용 안 함)
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
            document.getElementById('productStock').value = product.stock_quantity || product.stockQuantity || 0;
            document.getElementById('productStatus').value = product.status || '정품';
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



// 재고 디버깅 함수
async function debugStock(productId) {
    try {
        console.log('재고 디버깅 시작, 제품 ID:', productId);
        
        const response = await fetch(`/api/debug/stock/${productId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('재고 디버깅 결과:', result);
        
        if (result.success) {
            const { product, breakdown } = result;
            
            let debugHTML = `
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #495057;">🔍 재고 디버깅 결과</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <h5 style="color: #6c757d; margin-bottom: 10px;">제품 정보</h5>
                            <div style="font-size: 14px; line-height: 1.6;">
                                <div><strong>제품명:</strong> ${product.name}</div>
                                <div><strong>현재 재고:</strong> <span style="color: ${product.currentStock === 0 ? '#dc3545' : '#28a745'}; font-weight: bold;">${product.currentStock}개</span></div>
                                <div><strong>계산된 재고:</strong> <span style="color: ${product.calculatedStock === 0 ? '#dc3545' : '#28a745'}; font-weight: bold;">${product.calculatedStock}개</span></div>
                            </div>
                        </div>
                        <div>
                            <h5 style="color: #6c757d; margin-bottom: 10px;">재고 분석</h5>
                            <div style="font-size: 14px; line-height: 1.6;">
                                <div><strong>구매량:</strong> <span style="color: #28a745;">${breakdown.totalPurchased}개</span></div>
                                <div><strong>판매량:</strong> <span style="color: #dc3545;">${breakdown.totalSold}개</span></div>
                                <div><strong>반품량:</strong> <span style="color: #17a2b8;">${breakdown.totalReturned}개</span></div>
                                <div><strong>수리부품 사용량:</strong> <span style="color: #ff9800;">${breakdown.totalUsedInRepairs}개</span></div>
                                <div><strong>재고 차이:</strong> <span style="color: ${product.stockDifference === 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">${product.stockDifference}개</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 기존 디버깅 결과가 있으면 제거
            const existingDebug = document.getElementById('debugResult');
            if (existingDebug) {
                existingDebug.remove();
            }
            
            // 새로운 디버깅 결과 추가
            const debugDiv = document.createElement('div');
            debugDiv.id = 'debugResult';
            debugDiv.innerHTML = debugHTML;
            
            const modal = document.getElementById('productDetailModal');
            if (modal) {
                const detailContent = document.getElementById('productDetailContent');
                if (detailContent) {
                    detailContent.appendChild(debugDiv);
                }
            } else {
                showMessage('제품 상세 모달을 찾을 수 없습니다.', 'error');
            }
        } else {
            showMessage('재고 디버깅에 실패했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
        }
    } catch (error) {
        console.error('재고 디버깅 오류:', error);
        showMessage('재고 디버깅 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// 재고 동기화 함수
async function syncStock(productId) {
    if (!confirm('재고를 구매/판매 이력 및 수리 부품 사용 이력 기반으로 동기화하시겠습니까?')) {
        return;
    }
    
    try {
        console.log('재고 동기화 시작, 제품 ID:', productId);
        
        const response = await fetch(`/api/debug/sync-stock/${productId}`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('재고 동기화 결과:', result);
        
        if (result.success) {
            const { productName, calculatedStock, purchases, repairs } = result;
            
            // 재고 동기화 완료 메시지
            showMessage(`✅ 재고가 동기화되었습니다!\n${productName}: ${calculatedStock}개\n\n📊 상세 내역:\n• 구매 이력: ${purchases}건\n• 수리 이력: ${repairs}건`, 'success');
            
            // 제품 상세 정보 새로고침
            await viewProductDetail(productId);
        } else {
            showMessage('재고 동기화에 실패했습니다: ' + (result.message || '알 수 없는 오류'), 'error');
        }
    } catch (error) {
        console.error('재고 동기화 오류:', error);
        showMessage('재고 동기화 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// 제품 모달 닫기
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    editingProductId = null;
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
    productData.price = parseInt(productData.price) || 0;
    productData.stockQuantity = parseInt(productData.stockQuantity) || 0;
    
    // 디버깅: 재고수량 확인
    console.log('🔍 제품 등록 - 재고수량 디버깅:');
    console.log('  - 원본 stockQuantity:', productData.stockQuantity);
    console.log('  - 변환 후 stockQuantity:', productData.stockQuantity);
    console.log('  - 전체 productData:', productData);
    
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
    if (!productData.status) {
        productData.status = '정품';
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

// 카테고리 추가 모달 표시 (category-manager.js 사용)
async function showCategoryModal() {
    await window.categoryManager.showCategoryModal();
}

// 카테고리 모달 닫기 (category-manager.js 사용)
function closeCategoryModal() {
    window.categoryManager.closeCategoryModal();
}

// 카테고리 데이터 로드 함수는 위에 정의됨

// 카테고리 폼 업데이트 (category-manager.js 사용)
function updateCategoryForm() {
    window.categoryManager.updateCategoryForm();
}

// 카테고리 폼 제출 (category-manager.js 사용)
document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const categoryData = Object.fromEntries(formData);
    
    const success = await window.categoryManager.addCategory(categoryData);
    
    if (success) {
        // 제품 목록 새로고침 (카테고리 필터가 변경될 수 있음)
        loadProducts();
        
        // 제품 모달의 카테고리 옵션들도 업데이트
        if (typeof window.categoryManager !== 'undefined') {
            window.categoryManager.updateProductModalCategories();
        }
    }
});

// 카테고리 데이터 업데이트 (category-manager.js 사용)
function updateCategoryData(newCategoryData) {
    // category-manager.js에서 자동으로 처리됨
    console.log('카테고리 데이터 업데이트는 category-manager.js에서 처리됩니다.');
}

// DOMContentLoaded 이벤트 리스너는 제거됨 (window.load와 중복)

// 로그아웃
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            window.location.href = '../shared/index.html';
        } else {
            window.location.href = '../shared/index.html';
        }
    } catch (error) {
        window.location.href = '../shared/index.html';
    }
}

// 제품 상세 보기 함수
async function viewProductDetail(productId) {
    console.log('🔍 제품 상세 조회 시작, ID:', productId);
    
    try {
        // 제품 정보 조회
        const response = await fetch(`/api/products/${productId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 제품 상세 API 응답:', result);
        
        if (result.success) {
            const product = result.data;
            console.log('🔍 제품 데이터 상세:', product);
            console.log('💰 가격 정보:', {
                price: product.price,
                priceType: typeof product.price,
                isNull: product.price === null,
                isUndefined: product.price === undefined,
                isNaN: isNaN(product.price)
            });
            const stockQuantity = product.stock_quantity || product.stockQuantity || 0;
            
            // 재고 수량에 따른 색상 결정
            let stockColor;
            if (stockQuantity < 0) {
                stockColor = '#ff6b6b'; // 빨간색 (음수)
            } else if (stockQuantity === 0) {
                stockColor = '#dc3545'; // 빨간색 (0개)
            } else {
                stockColor = '#28a745'; // 초록색 (양수)
            }
            
            // 제품 상세 정보 HTML 생성
            const productDetailContent = document.getElementById('productDetailContent');
            if (!productDetailContent) {
                console.error('❌ productDetailContent 요소를 찾을 수 없습니다!');
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
            
            productDetailContent.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 40px; margin-bottom: 30px;">
                    <!-- 제품 이미지 영역 -->
                    <div style="text-align: center;">
                        ${product.imageUrl ? 
                            `<img src="${product.imageUrl}" style="width: 100%; max-width: 400px; border-radius: 12px; border: 2px solid #e9ecef; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">` :
                            `<div style="width: 100%; height: 300px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6c757d; border: 2px dashed #dee2e6;">
                                <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                                <div style="font-size: 16px; font-weight: 500;">이미지 없음</div>
                            </div>`
                        }
                    </div>
                    
                    <!-- 제품 정보 영역 -->
                    <div>
                        <h3 style="margin-top: 0; margin-bottom: 20px; color: #333; font-size: 24px; font-weight: 600;">${product.name || '-'}</h3>
                        
                     <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 5px; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
                         <!-- 첫 번째 행: 제품코드, 카테고리, 브랜드, 가격 -->
                         <div style="display: flex; flex-direction: column; gap: 8px;">
                             <strong style="color: #495057; font-weight: 600;">제품코드:</strong>
                             <span class="product-code" style="color: #007bff; font-weight: 600; font-family: 'Courier New', monospace;">${product.productCode || product.product_code || '-'}</span>
                         </div>
                         
                         <div style="display: flex; flex-direction: column; gap: 8px;">
                             <strong style="color: #495057; font-weight: 600;">카테고리:</strong>
                             <span style="color: #6c757d;">${product.category || product.main_category || '-'}</span>
                         </div>
                         
                         <div style="display: flex; flex-direction: column; gap: 8px;">
                             <strong style="color: #495057; font-weight: 600;">브랜드:</strong>
                             <span style="color: #6c757d;">${product.brand || '-'}</span>
                         </div>
                         
                         <div style="display: flex; flex-direction: column; gap: 8px;">
                             <strong style="color: #495057; font-weight: 600;">가격:</strong>
                             <span style="color: #28a745; font-size: 20px; font-weight: bold;">${formatNumber(product.price)}원</span>
                         </div>
                         
                         <!-- 두 번째 행: 재고수량, 상태, 등록일, 빈 공간 -->
                         <div style="display: flex; flex-direction: column; gap: 8px;">
                             <strong style="color: #495057; font-weight: 600;">재고수량:</strong>
                             <span class="${stockQuantity < 0 ? 'stock-negative' : stockQuantity === 0 ? 'stock-empty' : 'stock-available'}" style="font-size: 18px; font-weight: bold; color: ${stockColor};">${stockQuantity}개</span>
                         </div>
                         
                         <div style="display: flex; flex-direction: column; gap: 8px;">
                             <strong style="color: #495057; font-weight: 600;">상태:</strong>
                             <span><span class="status-badge status-${product.status === '정품' ? 'active' : 'inactive'}" style="background: ${product.status === '정품' ? '#28a745' : '#6c757d'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${product.status || '정품'}</span></span>
                         </div>
                         
                         <div style="display: flex; flex-direction: column; gap: 8px;">
                             <strong style="color: #495057; font-weight: 600;">등록일:</strong>
                             <span style="color: #6c757d;">${formatDate(product.registrationDate || product.registration_date || product.created_at)}</span>
                         </div>
                         
                         <div style="display: flex; flex-direction: column; gap: 8px;">
                             <!-- 빈 공간 -->
                         </div>
                     </div>
                        
                        ${product.description ? `
                        <div style="margin-bottom: 30px;">
                            <h4 style="color: #495057; margin-bottom: 12px; font-size: 16px;">제품 설명</h4>
                            <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff; line-height: 1.6; color: #495057;">
                                ${product.description}
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- 액션 버튼들 -->
                        <div style="display: flex; gap: 12px; margin-top: 20px;">
                            <button onclick="debugStock(${product.id})" style="background: #ff9800; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                                🔍 재고 디버깅
                            </button>
                            <button onclick="syncStock(${product.id})" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                                🔄 재고 동기화
                            </button>
                            <button onclick="editProduct(${product.id})" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                                ✏️ 제품 수정
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 구매/판매 이력 섹션 -->
                <div style="border-top: 2px solid #e9ecef; padding-top: 30px;">
                    <h4 style="margin-bottom: 20px; color: #333; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                        📊 구매/판매 이력
                    </h4>
                    <div id="productPurchasesList" style="background: #f8f9fa; border-radius: 8px; padding: 20px; min-height: 200px;">
                        <div style="text-align: center; padding: 40px; color: #6c757d;">
                            <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                            <p style="margin: 0; font-size: 16px;">구매/판매 이력을 불러오는 중...</p>
                        </div>
                    </div>
                </div>
            `;
            
            // 모달 표시
            const modal = document.getElementById('productDetailModal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('✅ 제품 상세 모달 표시됨');
                
                // DOM 렌더링 완료 후 구매 이력 로드
                setTimeout(() => {
                    loadProductPurchases(productId);
                }, 100);
            } else {
                console.error('❌ productDetailModal 요소를 찾을 수 없습니다!');
                showMessage('제품 상세 모달을 찾을 수 없습니다.', 'error');
            }
        } else {
            showMessage('제품 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('❌ 제품 상세 조회 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 제품 상세 모달 닫기
function closeProductDetailModal() {
    const modal = document.getElementById('productDetailModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ 제품 상세 모달 닫힘');
    }
}

// 제품별 구매 이력 로드
async function loadProductPurchases(productId) {
    try {
        console.log('📊 제품별 구매 이력 로드 시작, 제품 ID:', productId);
        
        const response = await fetch(`/api/products/${productId}/purchases`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 제품별 구매 이력 API 응답:', result);
        
        const purchasesList = document.getElementById('productPurchasesList');
        if (!purchasesList) {
            console.error('❌ productPurchasesList 요소를 찾을 수 없습니다!');
            return;
        }
        
        if (result.success) {
            const purchases = result.data;
            console.log('📊 구매 이력 데이터:', purchases);
            
            if (purchases.length === 0) {
                purchasesList.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6c757d;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                        <p style="margin: 0; font-size: 16px;">아직 구매/판매 이력이 없습니다.</p>
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
                
                // 구매/판매 이력 HTML 생성
                const purchasesHTML = `
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <thead>
                                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                    <th style="padding: 16px 12px; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">구매코드</th>
                                    <th style="padding: 16px 12px; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">구매일</th>
                                    <th style="padding: 16px 12px; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">고객명</th>
                                    <th style="padding: 16px 12px; text-align: center; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">구분</th>
                                    <th style="padding: 16px 12px; text-align: right; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">단가</th>
                                    <th style="padding: 16px 12px; text-align: right; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">공급가액</th>
                                    <th style="padding: 16px 12px; text-align: right; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">부가세</th>
                                    <th style="padding: 16px 12px; text-align: right; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">총금액</th>
                                    <th style="padding: 16px 12px; text-align: center; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">결제방법</th>
                                    <th style="padding: 16px 12px; text-align: center; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">수량</th>
                                    <th style="padding: 16px 12px; text-align: center; border: 1px solid #dee2e6; font-weight: 600; color: #495057;">액션</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${purchases.map(purchase => {
                                    // 구매/판매 이력인 경우 (API에서 직접 반환하는 데이터)
                                    if (purchase.type === '구매' || purchase.type === '판매') {
                                        const typeClass = purchase.type === '판매' ? 'type-sale' : 
                                                        purchase.type === '구매' ? 'type-purchase' : 'type-preorder';
                                        const typeIcon = purchase.type === '판매' ? '💰' : 
                                                       purchase.type === '구매' ? '🛒' : '📤';
                                        const typeColor = purchase.type === '판매' ? '#dc3545' : 
                                                        purchase.type === '구매' ? '#28a745' : '#6c757d';
                                        
                                        return `
                                            <tr style="border-bottom: 1px solid #dee2e6; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='white'">
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; font-weight: 600; color: #007bff;">${purchase.purchase_code || '-'}</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; color: #6c757d;">${formatDate(purchase.purchase_date)}</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; color: #495057;">${purchase.customer_name || '-'}</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: center;">
                                                    <span style="background: ${typeColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                                                        ${typeIcon} ${purchase.type}
                                                    </span>
                                                </td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: right; font-weight: 600; color: #495057;">${formatNumber(purchase.unit_price || 0)}원</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: right; color: #495057;">${formatNumber(Math.round(purchase.total_price / 1.1))}원</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: right; color: #495057;">${formatNumber(purchase.total_price - Math.round(purchase.total_price / 1.1))}원</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; color: #2196F3;">${formatNumber(purchase.total_price)}원</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: center; color: #6c757d;">${purchase.payment_method || '-'}</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #495057;">${formatNumber(purchase.quantity || 0)}개</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: center;">
                                                    <button onclick="viewPurchaseDetail(${purchase.id})" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#0056b3'" onmouseout="this.style.backgroundColor='#007bff'">상세</button>
                                                </td>
                                            </tr>
                                        `;
                                    } 
                                    // 수리 부품 사용 내역인 경우
                                    else if (purchase.source_type === '수리부품') {
                                        return `
                                            <tr style="border-bottom: 1px solid #dee2e6; background: #fff8e1; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#fff3cd'" onmouseout="this.style.backgroundColor='#fff8e1'">
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; font-weight: 600; color: #ff9800;">수리 #${purchase.id}</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; color: #6c757d;">${formatDate(purchase.repair_date)}</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; color: #495057;">${purchase.customer_name || '-'}</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: center;">
                                                    <span style="background: #ff9800; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                                                        🔧 수리부품
                                                    </span>
                                                </td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: right; font-weight: 600; color: #495057;">${formatNumber(purchase.unit_price || 0)}원</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: right; color: #495057;">${formatNumber(Math.round(purchase.total_price / 1.1))}원</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: right; color: #495057;">${formatNumber(purchase.total_price - Math.round(purchase.total_price / 1.1))}원</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: right; font-weight: bold; color: #ff9800;">${formatNumber(purchase.total_price)}원</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: center; color: #6c757d;">-</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; color: #495057;">${formatNumber(purchase.quantity || 0)}개</td>
                                                <td style="padding: 16px 12px; border: 1px solid #dee2e6; text-align: center;">
                                                    <button onclick="viewRepairDetail(${purchase.id})" style="background: #ff9800; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.backgroundColor='#e68900'" onmouseout="this.style.backgroundColor='#ff9800'">상세</button>
                                                </td>
                                            </tr>
                                        `;
                                    }
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                
                purchasesList.innerHTML = purchasesHTML;
            }
        } else {
            purchasesList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <p style="margin: 0; font-size: 16px;">구매/판매 이력을 불러오는데 실패했습니다.</p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #6c757d;">${result.message || '알 수 없는 오류가 발생했습니다.'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ 제품별 구매 이력 로드 오류:', error);
        const purchasesList = document.getElementById('productPurchasesList');
        if (purchasesList) {
            purchasesList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <p style="margin: 0; font-size: 16px;">네트워크 오류가 발생했습니다.</p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #6c757d;">${error.message}</p>
                </div>
            `;
        }
    }
}

// 함수들을 전역으로 노출
window.viewProductDetail = viewProductDetail;
window.closeProductDetailModal = closeProductDetailModal;
window.editProduct = editProduct;
// 구매 이력 상세 보기 함수
async function viewPurchaseDetail(purchaseId) {
    try {
        const response = await fetch(`/api/purchases/${purchaseId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('구매 이력을 불러올 수 없습니다.');
        }
        
        const result = await response.json();
        
        if (result.success) {
            const purchase = result.data;
            
            // 구매 이력 상세 모달 생성
            const modal = document.createElement('div');
            modal.id = 'purchaseDetailModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            
            // 공급가액과 부가세 계산
            const totalAmount = purchase.total_amount || 0;
            const supplyPrice = Math.round(totalAmount / 1.1);
            const vatAmount = totalAmount - supplyPrice;
            
            // 날짜 포맷팅
            const formatDate = (dateStr) => {
                if (!dateStr) return '-';
                try {
                    return new Date(dateStr).toLocaleDateString('ko-KR');
                } catch (e) {
                    return dateStr;
                }
            };
            
            // 숫자 포맷팅
            const formatNumber = (value) => {
                if (value === null || value === undefined || isNaN(value)) {
                    return '0';
                }
                return Number(value).toLocaleString('ko-KR');
            };
            
            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 8px;
                    padding: 30px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #e9ecef;
                        padding-bottom: 15px;
                    ">
                        <h2 style="margin: 0; color: #333; font-size: 24px;">구매 이력 상세</h2>
                        <button onclick="closePurchaseDetailModal()" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #666;
                            padding: 0;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">&times;</button>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #495057; margin-bottom: 15px; font-size: 18px;">기본 정보</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <strong>구매코드:</strong><br>
                                <span style="color: #666;">${purchase.purchase_code || '-'}</span>
                            </div>
                            <div>
                                <strong>구매일:</strong><br>
                                <span style="color: #666;">${formatDate(purchase.purchase_date)}</span>
                            </div>
                            <div>
                                <strong>구분:</strong><br>
                                <span style="color: #666;">${purchase.type || '-'}</span>
                            </div>
                            <div>
                                <strong>결제방법:</strong><br>
                                <span style="color: #666;">${purchase.payment_method || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #495057; margin-bottom: 15px; font-size: 18px;">금액 정보</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">공급가액</div>
                                <div style="font-size: 18px; font-weight: bold; color: #28a745;">${formatNumber(supplyPrice)}원</div>
                            </div>
                            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">부가세</div>
                                <div style="font-size: 18px; font-weight: bold; color: #dc3545;">${formatNumber(vatAmount)}원</div>
                            </div>
                            <div style="text-align: center; padding: 15px; background: #e3f2fd; border-radius: 6px;">
                                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">총금액</div>
                                <div style="font-size: 20px; font-weight: bold; color: #2196F3;">${formatNumber(totalAmount)}원</div>
                            </div>
                        </div>
                    </div>
                    
                    ${purchase.items && purchase.items.length > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #495057; margin-bottom: 15px; font-size: 18px;">상품 목록</h3>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                <thead>
                                    <tr style="background: #f8f9fa;">
                                        <th style="padding: 12px 8px; text-align: left; border: 1px solid #dee2e6;">상품명</th>
                                        <th style="padding: 12px 8px; text-align: center; border: 1px solid #dee2e6;">수량</th>
                                        <th style="padding: 12px 8px; text-align: right; border: 1px solid #dee2e6;">단가</th>
                                        <th style="padding: 12px 8px; text-align: right; border: 1px solid #dee2e6;">금액</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${purchase.items.map(item => `
                                        <tr>
                                            <td style="padding: 12px 8px; border: 1px solid #dee2e6;">${item.name || '-'}</td>
                                            <td style="padding: 12px 8px; text-align: center; border: 1px solid #dee2e6;">${item.quantity || 0}개</td>
                                            <td style="padding: 12px 8px; text-align: right; border: 1px solid #dee2e6;">${formatNumber(item.unit_price || 0)}원</td>
                                            <td style="padding: 12px 8px; text-align: right; border: 1px solid #dee2e6; font-weight: bold;">${formatNumber(item.total_price || 0)}원</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${purchase.notes ? `
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #495057; margin-bottom: 15px; font-size: 18px;">비고</h3>
                        <div style="padding: 15px; background: #f8f9fa; border-radius: 6px; color: #666;">
                            ${purchase.notes}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button onclick="closePurchaseDetailModal()" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">닫기</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } else {
            showMessage('구매 이력을 불러오는데 실패했습니다: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('구매 이력 상세 조회 오류:', error);
        showMessage('구매 이력을 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 구매 이력 상세 모달 닫기 함수
function closePurchaseDetailModal() {
    const modal = document.getElementById('purchaseDetailModal');
    if (modal) {
        modal.remove();
    }
}

window.deleteProduct = deleteProduct;
window.showMessage = showMessage;
window.updateProductSubCategories = updateProductSubCategories;
window.updateProductDetailCategories = updateProductDetailCategories;
window.viewPurchaseDetail = viewPurchaseDetail;
window.closePurchaseDetailModal = closePurchaseDetailModal;

