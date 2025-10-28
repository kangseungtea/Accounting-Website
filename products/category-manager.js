// 카테고리 관리 시스템
class CategoryManager {
    constructor() {
        this.categoryData = {};
        this.isLoaded = false;
    }

    // 카테고리 데이터 로드
    async loadCategoryData() {
        try {
            const response = await fetch('/api/categories', {
                credentials: 'include'
            });
            const result = await response.json();
            
            console.log('카테고리 API 응답:', result);
            
            if (result.success) {
                // 데이터베이스에서 카테고리 데이터가 없는 경우 기본 데이터 사용
                if (result.data && result.data.length > 0) {
                    // 배열을 객체로 변환
                    this.categoryData = this.convertArrayToCategoryObject(result.data);
                } else {
                    console.log('데이터베이스에 카테고리 데이터가 없어 기본 데이터를 사용합니다.');
                    this.categoryData = this.getDefaultCategoryData();
                }
                this.isLoaded = true;
                return true;
            } else {
                console.error('카테고리 데이터 로드 실패:', result.message);
                // API 실패 시 기본 데이터 사용
                this.categoryData = this.getDefaultCategoryData();
                this.isLoaded = true;
                return false;
            }
        } catch (error) {
            console.error('카테고리 데이터 로드 오류:', error);
            // 네트워크 오류 시 기본 데이터 사용
            this.categoryData = this.getDefaultCategoryData();
            this.isLoaded = true;
            return false;
        }
    }

    // 배열을 카테고리 객체로 변환
    convertArrayToCategoryObject(dataArray) {
        const categoryObject = {};
        
        dataArray.forEach(item => {
            const mainCategory = item.main_category;
            const subCategory = item.sub_category;
            const detailCategory = item.detail_category;
            
            if (!categoryObject[mainCategory]) {
                categoryObject[mainCategory] = {};
            }
            
            if (!categoryObject[mainCategory][subCategory]) {
                categoryObject[mainCategory][subCategory] = [];
            }
            
            if (detailCategory && !categoryObject[mainCategory][subCategory].includes(detailCategory)) {
                categoryObject[mainCategory][subCategory].push(detailCategory);
            }
        });
        
        return categoryObject;
    }

    // 기본 카테고리 데이터 (통합된 버전)
    getDefaultCategoryData() {
        return {
            '컴퓨터부품': {
                'CPU': ['인텔', 'AMD', 'AMD_CPU'],
                '메모리': ['DDR4', 'DDR5', 'PC용'],
                '그래픽카드': ['NVIDIA', 'AMD'],
                '메인보드': ['ASUS', 'MSI', 'GIGABYTE'],
                '파워': ['ATX', 'SFX', 'TFX'],
                '케이스': ['ATX', 'M-ATX', 'ITX'],
                '팬': ['케이스팬', 'CPU팬', '쿨러팬'],
                '하드디스크': ['HDD', 'SATA', 'NVMe'],
                'SSD': ['SATA', 'M.2', 'NVMe'],
                '광학드라이브': ['DVD', 'Blu-ray', 'CD'],
                '쿨러': ['CPU공랭쿨러', '수랭쿨러', '하이브리드'],
                '기타': ['케이블', '어댑터', '브라켓']
            },
            '소프트웨어': {
                '운영체제': ['Windows', 'macOS', 'Linux'],
                '오피스': ['Microsoft Office', '한글', 'LibreOffice', '한글과컴퓨터'],
                '보안': ['백신', '방화벽', '암호화'],
                '기타': ['게임', '편집툴', '개발툴']
            },
            '주변기기': {
                '모니터': ['삼성', 'LG', 'DELL', 'ASUS', 'MSI'],
                '키보드': ['기계식', '멤브레인', '무선'],
                '마우스': ['게이밍마우스', '무선마우스', '트랙볼', '무선', '유선'],
                '스피커': ['게이밍스피커', '블루투스스피커', '홈시어터', '2.1채널', '5.1채널']
            },
            '프린터': {
                '잉크젯': ['HP', 'Canon', 'Epson', '가정용', '사무용', '포토프린터'],
                '레이저': ['HP', 'Samsung', 'Brother', '흑백레이저', '컬러레이저', '복합기'],
                '토너': ['잉크카트리지', '토너카트리지', '드럼유닛'],
                '용지': ['A4용지', 'A3용지', '사진용지', '라벨용지'],
                '기타부품': ['펌프', '헤드', '롤러', '케이블']
            }
        };
    }

    // 대분류 옵션 업데이트
    updateMainCategoryOptions(selectElementId) {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) return;
        
        selectElement.innerHTML = '<option value="">대분류 선택</option>';
        
        Object.keys(this.categoryData).forEach(mainCategory => {
            const option = document.createElement('option');
            option.value = mainCategory;
            option.textContent = mainCategory;
            selectElement.appendChild(option);
        });
    }

    // 중분류 옵션 업데이트
    updateSubCategoryOptions(mainCategorySelectId, subCategorySelectId, detailCategorySelectId) {
        const mainCategorySelect = document.getElementById(mainCategorySelectId);
        const subCategorySelect = document.getElementById(subCategorySelectId);
        const detailCategorySelect = document.getElementById(detailCategorySelectId);
        
        if (!mainCategorySelect || !subCategorySelect || !detailCategorySelect) return;
        
        const mainCategory = mainCategorySelect.value;
        
        // 중분류 초기화
        subCategorySelect.innerHTML = '<option value="">중분류 선택</option>';
        detailCategorySelect.innerHTML = '<option value="">소분류 선택</option>';
        detailCategorySelect.disabled = true;
        
        if (mainCategory && this.categoryData[mainCategory]) {
            subCategorySelect.disabled = false;
            Object.keys(this.categoryData[mainCategory]).forEach(subCategory => {
                const option = document.createElement('option');
                option.value = subCategory;
                option.textContent = subCategory;
                subCategorySelect.appendChild(option);
            });
        } else {
            subCategorySelect.disabled = true;
        }
    }

    // 소분류 옵션 업데이트
    updateDetailCategoryOptions(mainCategorySelectId, subCategorySelectId, detailCategorySelectId) {
        const mainCategorySelect = document.getElementById(mainCategorySelectId);
        const subCategorySelect = document.getElementById(subCategorySelectId);
        const detailCategorySelect = document.getElementById(detailCategorySelectId);
        
        if (!mainCategorySelect || !subCategorySelect || !detailCategorySelect) return;
        
        const mainCategory = mainCategorySelect.value;
        const subCategory = subCategorySelect.value;
        
        // 소분류 초기화
        detailCategorySelect.innerHTML = '<option value="">소분류 선택</option>';
        
        if (mainCategory && subCategory && this.categoryData[mainCategory] && this.categoryData[mainCategory][subCategory]) {
            detailCategorySelect.disabled = false;
            
            // 소분류가 있는 경우
            if (this.categoryData[mainCategory][subCategory].length > 0) {
                // 소분류 옵션 추가
                this.categoryData[mainCategory][subCategory].forEach(detailCategory => {
                    const option = document.createElement('option');
                    option.value = detailCategory;
                    option.textContent = detailCategory;
                    detailCategorySelect.appendChild(option);
                });
            } else {
                // 소분류가 없는 경우 - "기본" 옵션 추가
                const option = document.createElement('option');
                option.value = '기본';
                option.textContent = '기본';
                detailCategorySelect.appendChild(option);
                detailCategorySelect.value = '기본'; // 자동 선택
            }
        } else {
            detailCategorySelect.disabled = true;
        }
    }

    // 제품 필터용 카테고리 업데이트 (products.js용)
    updateMainCategoryFilter() {
        const mainCategoryFilter = document.getElementById('mainCategoryFilter');
        if (!mainCategoryFilter) return;
        
        // 기존 하드코딩된 옵션 제거하고 동적으로 추가
        mainCategoryFilter.innerHTML = '<option value="">전체 카테고리</option>';
        
        Object.keys(this.categoryData).forEach(mainCategory => {
            const option = document.createElement('option');
            option.value = mainCategory;
            option.textContent = mainCategory;
            mainCategoryFilter.appendChild(option);
        });
    }

    // 제품 필터용 하위 카테고리 업데이트
    updateSubCategories() {
        const mainCategory = document.getElementById('mainCategoryFilter').value;
        const subCategorySelect = document.getElementById('subCategoryFilter');
        const detailCategorySelect = document.getElementById('detailCategoryFilter');
        
        if (!subCategorySelect || !detailCategorySelect) return;
        
        // 하위 카테고리 초기화
        subCategorySelect.innerHTML = '<option value="">하위 카테고리</option>';
        detailCategorySelect.innerHTML = '<option value="">상세 카테고리</option>';
        detailCategorySelect.disabled = true;
        
        if (mainCategory && this.categoryData[mainCategory]) {
            subCategorySelect.disabled = false;
            
            // 하위 카테고리 옵션 추가
            Object.keys(this.categoryData[mainCategory]).forEach(subCategory => {
                const option = document.createElement('option');
                option.value = subCategory;
                option.textContent = subCategory;
                subCategorySelect.appendChild(option);
            });
        } else {
            subCategorySelect.disabled = true;
        }
    }

    // 제품 필터용 상세 카테고리 업데이트
    updateDetailCategories() {
        const mainCategory = document.getElementById('mainCategoryFilter').value;
        const subCategory = document.getElementById('subCategoryFilter').value;
        const detailCategorySelect = document.getElementById('detailCategoryFilter');
        
        if (!detailCategorySelect) return;
        
        // 상세 카테고리 초기화
        detailCategorySelect.innerHTML = '<option value="">상세 카테고리</option>';
        
        if (mainCategory && subCategory && this.categoryData[mainCategory] && this.categoryData[mainCategory][subCategory]) {
            detailCategorySelect.disabled = false;
            
            // 상세 카테고리 옵션 추가
            this.categoryData[mainCategory][subCategory].forEach(detailCategory => {
                const option = document.createElement('option');
                option.value = detailCategory;
                option.textContent = detailCategory;
                detailCategorySelect.appendChild(option);
            });
        } else {
            detailCategorySelect.disabled = true;
        }
    }

    // 카테고리 데이터 새로고침
    async refreshCategoryData() {
        this.isLoaded = false;
        return await this.loadCategoryData();
    }

    // 카테고리 데이터 가져오기
    getCategoryData() {
        return this.categoryData;
    }

    // 카테고리 데이터가 로드되었는지 확인
    isDataLoaded() {
        return this.isLoaded;
    }

    // 카테고리 추가 모달 표시
    async showCategoryModal() {
        try {
            // 카테고리 데이터 로드
            await this.loadCategoryData();
            
            document.getElementById('categoryModal').style.display = 'flex';
            document.getElementById('categoryForm').reset();
            this.updateCategoryForm();
        } catch (error) {
            console.error('카테고리 모달 표시 오류:', error);
            this.showMessage('카테고리 데이터를 불러오는데 실패했습니다.', 'error');
        }
    }

    // 카테고리 모달 닫기
    closeCategoryModal() {
        document.getElementById('categoryModal').style.display = 'none';
        document.getElementById('categoryForm').reset();
    }

    // 카테고리 폼 업데이트
    updateCategoryForm() {
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
            this.updateParentCategoryOptions();
        } else if (level === 'detail') {
            parentGroup.style.display = 'block';
            subParentGroup.style.display = 'block';
            this.updateParentCategoryOptions();
        }
    }

    // 상위 카테고리 옵션 업데이트
    updateParentCategoryOptions() {
        const parentSelect = document.getElementById('parentCategory');
        const subParentSelect = document.getElementById('subParentCategory');
        const level = document.getElementById('categoryLevel').value;
        
        // 상위 카테고리 초기화
        parentSelect.innerHTML = '<option value="">상위 카테고리 선택</option>';
        subParentSelect.innerHTML = '<option value="">중분류 선택</option>';
        
        if (level === 'sub') {
            // 대분류 옵션 추가
            Object.keys(this.categoryData).forEach(mainCategory => {
                const option = document.createElement('option');
                option.value = mainCategory;
                option.textContent = mainCategory;
                parentSelect.appendChild(option);
            });
        } else if (level === 'detail') {
            // 대분류 옵션 추가
            Object.keys(this.categoryData).forEach(mainCategory => {
                const option = document.createElement('option');
                option.value = mainCategory;
                option.textContent = mainCategory;
                parentSelect.appendChild(option);
            });
            
            // 대분류 선택 시 중분류 업데이트
            parentSelect.onchange = () => {
                const selectedMain = parentSelect.value;
                subParentSelect.innerHTML = '<option value="">중분류 선택</option>';
                
                if (selectedMain && this.categoryData[selectedMain]) {
                    Object.keys(this.categoryData[selectedMain]).forEach(subCategory => {
                        const option = document.createElement('option');
                        option.value = subCategory;
                        option.textContent = subCategory;
                        subParentSelect.appendChild(option);
                    });
                }
            };
        }
    }

    // 카테고리 추가
    async addCategory(categoryData) {
        try {
            console.log('카테고리 추가 요청:', categoryData);
            
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(categoryData)
            });
            
            console.log('서버 응답 상태:', response.status);
            console.log('서버 응답 헤더:', response.headers);
            
            const result = await response.json();
            console.log('서버 응답 데이터:', result);
            
            if (result.success) {
                this.showMessage('카테고리가 성공적으로 추가되었습니다!', 'success');
                this.closeCategoryModal();
                
                // 카테고리 데이터 새로고침
                await this.refreshCategoryData();
                
                // 필터 새로고침
                this.updateSubCategories();
                
                // 새 제품 등록 페이지의 카테고리 옵션들도 업데이트
                this.updateProductModalCategories();
                
                return true;
            } else {
                console.error('카테고리 추가 실패:', result);
                this.showMessage(result.message || '카테고리 추가에 실패했습니다.', 'error');
                return false;
            }
        } catch (error) {
            console.error('카테고리 추가 오류:', error);
            this.showMessage('네트워크 오류가 발생했습니다.', 'error');
            return false;
        }
    }

    // 새 제품 등록 페이지의 카테고리 옵션들 업데이트
    updateProductModalCategories() {
        // products.js의 제품 모달 카테고리 옵션들 업데이트
        if (typeof window.updateMainCategoryFilter === 'function') {
            window.updateMainCategoryFilter();
        }
        
        // product-add.html의 카테고리 옵션들 업데이트
        if (typeof window.updateMainCategoryOptions === 'function') {
            window.updateMainCategoryOptions();
        }
        
        // 제품 모달이 열려있다면 카테고리 옵션들 새로고침
        const productMainCategory = document.getElementById('productMainCategory');
        if (productMainCategory) {
            this.updateMainCategoryOptions('productMainCategory');
        }
        
        console.log('제품 등록 페이지 카테고리 옵션 업데이트 완료');
    }

    // 제품 모달용 카테고리 초기화
    async initializeProductModalCategories() {
        try {
            // 카테고리 데이터가 로드되지 않았다면 로드
            if (!this.isDataLoaded()) {
                await this.loadCategoryData();
            }
            
            // 대분류 옵션 업데이트
            this.updateMainCategoryOptions('productMainCategory');
            
            // 중분류, 소분류 초기화
            const subCategorySelect = document.getElementById('productSubCategory');
            const detailCategorySelect = document.getElementById('productDetailCategory');
            
            subCategorySelect.innerHTML = '<option value="">중분류를 선택하세요</option>';
            detailCategorySelect.innerHTML = '<option value="">소분류를 선택하세요</option>';
            subCategorySelect.disabled = true;
            detailCategorySelect.disabled = true;
            
            // 이벤트 리스너 추가
            const mainCategorySelect = document.getElementById('productMainCategory');
            mainCategorySelect.onchange = () => this.updateSubCategoryOptions('productMainCategory', 'productSubCategory', 'productDetailCategory');
            subCategorySelect.onchange = () => this.updateDetailCategoryOptions('productMainCategory', 'productSubCategory', 'productDetailCategory');
            
        } catch (error) {
            console.error('제품 모달 카테고리 초기화 오류:', error);
        }
    }

    // 메시지 표시
    showMessage(message, type) {
        // 기존 메시지 제거
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // 새 메시지 생성
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        // 스타일 적용
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ${type === 'success' ? 'background: #4CAF50;' : 'background: #f44336;'}
        `;
        
        document.body.appendChild(messageDiv);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
}

// 전역 카테고리 매니저 인스턴스
window.categoryManager = new CategoryManager();
