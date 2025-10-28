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
}

// 전역 카테고리 매니저 인스턴스
window.categoryManager = new CategoryManager();
