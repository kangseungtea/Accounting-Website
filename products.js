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
});

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
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            search: currentSearch,
            category: currentCategory,
            status: currentStatus
        });
        
        const response = await fetch(`/api/products?${params}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            displayProducts(result.data);
            displayPagination(result.pagination);
            currentPage = page;
        } else {
            showMessage('제품 목록을 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('제품 로드 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
    }
}

// 제품 목록 표시
function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">등록된 제품이 없습니다.</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="product-code">${product.productCode || '-'}</span></td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.brand || '-'}</td>
            <td>${product.price.toLocaleString('ko-KR')}원</td>
            <td class="${product.stockQuantity === 0 ? 'stock-empty' : 'stock-available'}">${product.stockQuantity}개</td>
            <td><span class="status-badge status-${product.status === '활성' ? 'active' : 'inactive'}">${product.status}</span></td>
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

// 3단계 카테고리 데이터 (서버에서 동적으로 로드)
let categoryData = {};

// 카테고리 데이터 로드
async function loadCategoryData() {
    try {
        const response = await fetch('/api/categories', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            categoryData = result.data;
        } else {
            console.error('카테고리 데이터 로드 실패:', result.message);
        }
    } catch (error) {
        console.error('카테고리 데이터 로드 오류:', error);
    }
}

// 하위 카테고리 업데이트
function updateSubCategories() {
    const mainCategory = document.getElementById('mainCategoryFilter').value;
    const subCategorySelect = document.getElementById('subCategoryFilter');
    const detailCategorySelect = document.getElementById('detailCategoryFilter');
    
    // 하위 카테고리 초기화
    subCategorySelect.innerHTML = '<option value="">하위 카테고리</option>';
    detailCategorySelect.innerHTML = '<option value="">상세 카테고리</option>';
    detailCategorySelect.disabled = true;
    
    if (mainCategory && categoryData[mainCategory]) {
        subCategorySelect.disabled = false;
        
        // 하위 카테고리 옵션 추가
        Object.keys(categoryData[mainCategory]).forEach(subCategory => {
            const option = document.createElement('option');
            option.value = subCategory;
            option.textContent = subCategory;
            subCategorySelect.appendChild(option);
        });
    } else {
        subCategorySelect.disabled = true;
    }
    
    // 소분류 초기화
    detailCategorySelect.disabled = true;
    
    // 필터 적용
    filterProducts();
}

// 상세 카테고리 업데이트
function updateDetailCategories() {
    const mainCategory = document.getElementById('mainCategoryFilter').value;
    const subCategory = document.getElementById('subCategoryFilter').value;
    const detailCategorySelect = document.getElementById('detailCategoryFilter');
    
    // 상세 카테고리 초기화
    detailCategorySelect.innerHTML = '<option value="">상세 카테고리</option>';
    
    if (mainCategory && subCategory && categoryData[mainCategory] && categoryData[mainCategory][subCategory]) {
        detailCategorySelect.disabled = false;
        
        // 상세 카테고리 옵션 추가
        categoryData[mainCategory][subCategory].forEach(detailCategory => {
            const option = document.createElement('option');
            option.value = detailCategory;
            option.textContent = detailCategory;
            detailCategorySelect.appendChild(option);
        });
    } else {
        detailCategorySelect.disabled = true;
    }
    
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

// 카테고리 옵션 로드
async function loadCategoryOptions() {
    try {
        const response = await fetch('/api/categories', {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            const categorySelect = document.getElementById('productCategory');
            categorySelect.innerHTML = '<option value="">카테고리 선택</option>';
            
            // 대분류 카테고리 옵션 추가
            Object.keys(result.data).forEach(mainCategory => {
                const option = document.createElement('option');
                option.value = mainCategory;
                option.textContent = mainCategory;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('카테고리 로드 오류:', error);
    }
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
            document.getElementById('productCategory').value = product.category;
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
    try {
        const response = await fetch(`/api/products/${productId}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            const product = result.data;
            const detailContent = document.getElementById('productDetailContent');
            
            detailContent.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px;">
                    <div>
                        ${product.imageUrl ? 
                            `<img src="${product.imageUrl}" style="width: 100%; border-radius: 8px; border: 1px solid #ddd;">` :
                            `<div style="width: 100%; height: 300px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;">이미지 없음</div>`
                        }
                    </div>
                    <div>
                        <h3 style="margin-top: 0;">${product.name}</h3>
                        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 15px; margin-top: 20px;">
                            <strong>제품코드:</strong><span class="product-code">${product.productCode || '-'}</span>
                            <strong>카테고리:</strong><span>${product.category}</span>
                            <strong>브랜드:</strong><span>${product.brand || '-'}</span>
                            <strong>가격:</strong><span style="color: #2196F3; font-size: 1.2em; font-weight: bold;">${product.price.toLocaleString('ko-KR')}원</span>
                            <strong>재고수량:</strong><span class="${product.stockQuantity === 0 ? 'stock-empty' : 'stock-available'}">${product.stockQuantity}개</span>
                            <strong>상태:</strong><span><span class="status-badge status-${product.status === '활성' ? 'active' : 'inactive'}">${product.status}</span></span>
                            <strong>등록일:</strong><span>${new Date(product.registrationDate).toLocaleDateString('ko-KR')}</span>
                        </div>
                        ${product.description ? `
                            <div style="margin-top: 30px;">
                                <strong>제품 설명:</strong>
                                <p style="margin-top: 10px; padding: 15px; background: #f5f5f5; border-radius: 4px; line-height: 1.6;">${product.description}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            document.getElementById('productDetailModal').style.display = 'flex';
        } else {
            showMessage('제품 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('제품 상세 정보 로드 오류:', error);
        showMessage('네트워크 오류가 발생했습니다.', 'error');
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
            
            // 카테고리 데이터 업데이트
            if (result.categoryData) {
                updateCategoryData(result.categoryData);
            }
            
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

