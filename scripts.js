/**
 * AutoLux - Car Showroom JavaScript
 * Vanilla ES6+ implementation with full functionality
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Format currency to VND
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
};

// Format number with thousand separators
const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num);
};

// Debounce function for search
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Throttle function for scroll events
const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// LocalStorage helpers
const storage = {
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error writing to localStorage:', e);
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Error removing from localStorage:', e);
        }
    }
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================

const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="toast-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-width="2"/><polyline points="22 4 12 14.01 9 11.01" stroke-width="2"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="toast-icon"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke-width="2"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="toast-icon"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke-width="2"/><line x1="12" y1="8" x2="12.01" y2="8" stroke-width="2"/></svg>'
    };
    
    toast.innerHTML = `
        ${icons[type] || icons.info}
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// ============================================
// MODAL MANAGEMENT
// ============================================

const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// ============================================
// STATE MANAGEMENT
// ============================================

const AppState = {
    cars: [],
    filteredCars: [],
    currentPage: 1,
    itemsPerPage: 9,
    favorites: storage.get('favorites') || [],
    cart: storage.get('cart') || [],
    compareList: storage.get('compareList') || [],
    currentUser: storage.get('currentUser') || null,
    filters: {
        search: '',
        brand: '',
        year: '',
        fuel: '',
        price: ''
    },
    sortBy: 'default'
};

// ============================================
// DATA LOADING
// ============================================

const loadCarData = async (useUsedCars = false, loadAll = false) => {
    try {
        const response = await fetch('mock-data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();
        
        // Choose between new cars, used cars, or all cars
        if (loadAll) {
            // Load both new and used cars for compare page
            AppState.cars = [...data.cars, ...data.usedCars];
        } else {
            // Load only new or used cars
            AppState.cars = useUsedCars ? data.usedCars : data.cars;
        }
        AppState.filteredCars = [...AppState.cars];
        
        // Hide skeleton loader
        const skeletonLoader = document.getElementById('skeleton-loader');
        if (skeletonLoader) {
            skeletonLoader.style.display = 'none';
        }
        
        // Initialize UI - only call if functions exist
        if (typeof populateFilters === 'function') {
            populateFilters();
        }
        if (typeof renderCars === 'function') {
            renderCars();
        }
        if (typeof updateBadges === 'function') {
            updateBadges();
        }
    } catch (error) {
        console.error('Error loading car data:', error);
        const skeletonLoader = document.getElementById('skeleton-loader');
        if (skeletonLoader) {
            skeletonLoader.style.display = 'none';
        }
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }
        showToast('Không thể tải dữ liệu xe. Vui lòng thử lại sau.', 'error');
    }
};

// ============================================
// FILTER & SORT
// ============================================

const populateFilters = () => {
    const brands = [...new Set(AppState.cars.map(car => car.brand))];
    const years = [...new Set(AppState.cars.map(car => car.year))].sort((a, b) => b - a);
    
    const brandSelect = document.getElementById('filter-brand');
    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        brandSelect.appendChild(option);
    });
    
    const yearSelect = document.getElementById('filter-year');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
};

const applyFilters = () => {
    let filtered = [...AppState.cars];
    
    // Search filter
    if (AppState.filters.search) {
        const searchLower = AppState.filters.search.toLowerCase();
        filtered = filtered.filter(car => 
            car.name.toLowerCase().includes(searchLower) ||
            car.brand.toLowerCase().includes(searchLower) ||
            car.model.toLowerCase().includes(searchLower)
        );
    }
    
    // Brand filter
    if (AppState.filters.brand) {
        filtered = filtered.filter(car => car.brand === AppState.filters.brand);
    }
    
    // Year filter
    if (AppState.filters.year) {
        filtered = filtered.filter(car => car.year === parseInt(AppState.filters.year));
    }
    
    // Fuel filter
    if (AppState.filters.fuel) {
        filtered = filtered.filter(car => car.fuel === AppState.filters.fuel);
    }
    
    // Price filter
    if (AppState.filters.price) {
        const [min, max] = AppState.filters.price.split('-').map(Number);
        filtered = filtered.filter(car => {
            const priceInMillions = car.price / 1000000;
            return priceInMillions >= min && priceInMillions <= max;
        });
    }
    
    // Apply sorting
    switch (AppState.sortBy) {
        case 'price-asc':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'year-desc':
            filtered.sort((a, b) => b.year - a.year);
            break;
        case 'km-asc':
            filtered.sort((a, b) => a.km - b.km);
            break;
    }
    
    AppState.filteredCars = filtered;
    AppState.currentPage = 1;
    renderCars();
};

// ============================================
// CAR RENDERING
// ============================================

const renderCars = () => {
    const grid = document.getElementById('car-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (AppState.filteredCars.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Pagination
    const startIndex = (AppState.currentPage - 1) * AppState.itemsPerPage;
    const endIndex = startIndex + AppState.itemsPerPage;
    const carsToShow = AppState.filteredCars.slice(startIndex, endIndex);
    
    grid.innerHTML = carsToShow.map(car => createCarCard(car)).join('');
    renderPagination();
};

const createCarCard = (car) => {
    const isFavorite = AppState.favorites.includes(car.id);
    const isInCompare = AppState.compareList.some(c => c.id === car.id);
    
    return `
        <div class="car-card" data-car-id="${car.id}">
            <div class="car-card-image">
                <img src="${car.images[0]}" alt="${car.name}" loading="lazy">
                ${car.badge ? `<span class="car-badge badge-${car.badge.toLowerCase()}">${car.badge}</span>` : ''}
                <div class="car-card-actions">
                    <button class="card-action-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${car.id})" aria-label="Add to favorites">
                        <svg viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="card-action-btn ${isInCompare ? 'active' : ''}" onclick="toggleCompare(${car.id})" aria-label="Add to compare">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke-width="2"/>
                            <polyline points="15 3 21 3 21 9" stroke-width="2"/>
                            <line x1="10" y1="14" x2="21" y2="3" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="car-card-content" onclick="showCarDetail(${car.id})">
                <h3 class="car-card-title">${car.name}</h3>
                <div class="car-card-meta">
                    <span>📅 ${car.year}</span>
                    <span>🛣️ ${formatNumber(car.km)} km</span>
                    <span>⚙️ ${car.transmission}</span>
                </div>
                <div class="car-card-price">${formatCurrency(car.price)}</div>
                <div class="car-card-rating">
                    ${'⭐'.repeat(Math.floor(car.rating))}
                    <span>(${car.rating})</span>
                </div>
            </div>
        </div>
    `;
};

const renderPagination = () => {
    const totalPages = Math.ceil(AppState.filteredCars.length / AppState.itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = `
        <button onclick="changePage(${AppState.currentPage - 1})" ${AppState.currentPage === 1 ? 'disabled' : ''}>
            ← Trước
        </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= AppState.currentPage - 1 && i <= AppState.currentPage + 1)) {
            html += `
                <button class="${i === AppState.currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === AppState.currentPage - 2 || i === AppState.currentPage + 2) {
            html += '<span>...</span>';
        }
    }
    
    html += `
        <button onclick="changePage(${AppState.currentPage + 1})" ${AppState.currentPage === totalPages ? 'disabled' : ''}>
            Sau →
        </button>
    `;
    
    pagination.innerHTML = html;
};

const changePage = (page) => {
    const totalPages = Math.ceil(AppState.filteredCars.length / AppState.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    AppState.currentPage = page;
    renderCars();
    document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
};

// ============================================
// CAR DETAIL
// ============================================

const showCarDetail = (carId) => {
    const car = AppState.cars.find(c => c.id === carId);
    if (!car) return;
    
    const content = document.getElementById('car-detail-content');
    const isFavorite = AppState.favorites.includes(car.id);
    
    content.innerHTML = `
        <div class="car-detail">
            <div class="car-detail-gallery">
                <img src="${car.images[0]}" alt="${car.name}" class="car-detail-main-image" id="detail-main-image" onclick="openGallery(${car.id}, 0)">
                <div class="car-detail-thumbnails">
                    ${car.images.map((img, idx) => `
                        <img src="${img}" alt="${car.name}" class="car-detail-thumbnail ${idx === 0 ? 'active' : ''}" onclick="changeDetailImage('${img}', ${idx})">
                    `).join('')}
                </div>
            </div>
            <div class="car-detail-info">
                <h2>${car.name}</h2>
                ${car.badge ? `<span class="car-badge badge-${car.badge.toLowerCase()}">${car.badge}</span>` : ''}
                <div class="car-detail-price">${formatCurrency(car.price)}</div>
                
                <div class="car-detail-specs">
                    <h3>Thông số kỹ thuật</h3>
                    <div class="spec-grid">
                        <div class="spec-item">
                            <span class="spec-label">Hãng xe</span>
                            <span class="spec-value">${car.brand}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Model</span>
                            <span class="spec-value">${car.model}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Năm sản xuất</span>
                            <span class="spec-value">${car.year}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Số km</span>
                            <span class="spec-value">${formatNumber(car.km)} km</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Nhiên liệu</span>
                            <span class="spec-value">${car.fuel}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Hộp số</span>
                            <span class="spec-value">${car.transmission}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Số ghế</span>
                            <span class="spec-value">${car.seats} chỗ</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Màu sắc</span>
                            <span class="spec-value">${car.color}</span>
                        </div>
                    </div>
                </div>
                
                <div class="car-detail-description">
                    <h3>Mô tả</h3>
                    <p>${car.description}</p>
                </div>
                
                <div class="car-detail-actions">
                    <button class="btn btn-primary" onclick="addToCart(${car.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="9" cy="21" r="1" stroke-width="2"/>
                            <circle cx="20" cy="21" r="1" stroke-width="2"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke-width="2"/>
                        </svg>
                        Thêm vào giỏ
                    </button>
                    <button class="btn btn-secondary" onclick="toggleFavorite(${car.id}); updateCarDetailFavorite(${car.id})">
                        <svg viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke-width="2"/>
                        </svg>
                        ${isFavorite ? 'Đã yêu thích' : 'Yêu thích'}
                    </button>
                    <button class="btn btn-secondary" onclick="openTestDriveModal(${car.id})">
                        🚗 Đặt lịch lái thử
                    </button>
                </div>
            </div>
        </div>
    `;
    
    openModal('car-detail-modal');
};

const changeDetailImage = (imgSrc, idx) => {
    document.getElementById('detail-main-image').src = imgSrc;
    document.querySelectorAll('.car-detail-thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === idx);
    });
};

const updateCarDetailFavorite = (carId) => {
    const isFavorite = AppState.favorites.includes(carId);
    const btn = event.target.closest('button');
    const svg = btn.querySelector('svg');
    svg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    btn.innerHTML = btn.innerHTML.replace(/Yêu thích|Đã yêu thích/, isFavorite ? 'Đã yêu thích' : 'Yêu thích');
};

// ============================================
// GALLERY
// ============================================

let currentGallery = { carId: null, images: [], currentIndex: 0 };

const openGallery = (carId, startIndex = 0) => {
    const car = AppState.cars.find(c => c.id === carId);
    if (!car) return;
    
    currentGallery = {
        carId: car.id,
        images: car.images,
        currentIndex: startIndex
    };
    
    updateGalleryImage();
    openModal('gallery-modal');
};

const updateGalleryImage = () => {
    const img = document.getElementById('gallery-image');
    const thumbnails = document.getElementById('gallery-thumbnails');
    
    img.src = currentGallery.images[currentGallery.currentIndex];
    
    thumbnails.innerHTML = currentGallery.images.map((imgSrc, idx) => `
        <img src="${imgSrc}" class="gallery-thumbnail ${idx === currentGallery.currentIndex ? 'active' : ''}" 
             onclick="currentGallery.currentIndex = ${idx}; updateGalleryImage()">
    `).join('');
};

const navigateGallery = (direction) => {
    const newIndex = currentGallery.currentIndex + direction;
    if (newIndex >= 0 && newIndex < currentGallery.images.length) {
        currentGallery.currentIndex = newIndex;
        updateGalleryImage();
    }
};

// ============================================
// FAVORITES
// ============================================

const toggleFavorite = (carId) => {
    const index = AppState.favorites.indexOf(carId);
    
    if (index > -1) {
        AppState.favorites.splice(index, 1);
        showToast('Đã xóa khỏi yêu thích', 'info');
    } else {
        AppState.favorites.push(carId);
        showToast('Đã thêm vào yêu thích', 'success');
    }
    
    storage.set('favorites', AppState.favorites);
    updateBadges();
    renderCars();
};

// ============================================
// COMPARE
// ============================================

const toggleCompare = (carId) => {
    const car = AppState.cars.find(c => c.id === carId);
    if (!car) return;
    
    const index = AppState.compareList.findIndex(c => c.id === carId);
    
    if (index > -1) {
        AppState.compareList.splice(index, 1);
        showToast('Đã xóa khỏi danh sách so sánh', 'info');
    } else {
        if (AppState.compareList.length >= 3) {
            showToast('Chỉ có thể so sánh tối đa 3 xe', 'error');
            return;
        }
        AppState.compareList.push(car);
        showToast('Đã thêm vào danh sách so sánh', 'success');
    }
    
    storage.set('compareList', AppState.compareList);
    renderCars();
    renderCompare();
};

const renderCompare = () => {
    const grid = document.getElementById('compare-grid');
    
    if (AppState.compareList.length === 0) {
        grid.innerHTML = `
            <div class="compare-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="2"/>
                </svg>
                <p>Chọn xe để so sánh</p>
                <a href="catalog.html" class="btn btn-secondary">Xem danh sách xe</a>
            </div>
        `;
        return;
    }
    
    // Create detailed comparison table
    const specs = [
        { label: 'Giá bán', key: 'price', format: (v) => formatCurrency(v) },
        { label: 'Hãng xe', key: 'brand' },
        { label: 'Model', key: 'model' },
        { label: 'Năm sản xuất', key: 'year' },
        { label: 'Số km đã đi', key: 'km', format: (v) => formatNumber(v) + ' km' },
        { label: 'Nhiên liệu', key: 'fuel' },
        { label: 'Hộp số', key: 'transmission' },
        { label: 'Số ghế', key: 'seats', format: (v) => v + ' chỗ' },
        { label: 'Màu sắc', key: 'color' },
        { label: 'Đánh giá', key: 'rating', format: (v) => '⭐'.repeat(Math.floor(v)) + ` (${v})` }
    ];
    
    grid.innerHTML = `
        <div class="compare-table-wrapper">
            <table class="compare-table">
                <thead>
                    <tr>
                        <th class="compare-spec-header">Thông số</th>
                        ${AppState.compareList.map(car => `
                            <th class="compare-car-header">
                                <button class="compare-remove-btn" onclick="toggleCompare(${car.id})" title="Xóa">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/>
                                        <line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/>
                                    </svg>
                                </button>
                                <img src="${car.images[0]}" alt="${car.name}" class="compare-car-image">
                                <h3 class="compare-car-name">${car.name}</h3>
                                ${car.badge ? `<span class="car-badge badge-${car.badge.toLowerCase()}">${car.badge}</span>` : ''}
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${specs.map(spec => `
                        <tr>
                            <td class="compare-spec-label">${spec.label}</td>
                            ${AppState.compareList.map(car => {
                                const value = car[spec.key];
                                const displayValue = spec.format ? spec.format(value) : value;
                                
                                // Highlight best value
                                let isHighlight = false;
                                if (spec.key === 'price') {
                                    isHighlight = value === Math.min(...AppState.compareList.map(c => c.price));
                                } else if (spec.key === 'year') {
                                    isHighlight = value === Math.max(...AppState.compareList.map(c => c.year));
                                } else if (spec.key === 'km') {
                                    isHighlight = value === Math.min(...AppState.compareList.map(c => c.km));
                                } else if (spec.key === 'rating') {
                                    isHighlight = value === Math.max(...AppState.compareList.map(c => c.rating));
                                }
                                
                                return `<td class="compare-spec-value ${isHighlight ? 'highlight' : ''}">${displayValue}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="compare-actions-bottom">
            ${AppState.compareList.map(car => `
                <div class="compare-action-group">
                    <button class="btn btn-primary" onclick="showCarDetail(${car.id})">Xem chi tiết</button>
                    <button class="btn btn-secondary" onclick="addToCart(${car.id})">Thêm vào giỏ</button>
                </div>
            `).join('')}
        </div>
    `;
};

// ============================================
// CART & CHECKOUT
// ============================================

const addToCart = (carId) => {
    const car = AppState.cars.find(c => c.id === carId);
    if (!car) return;
    
    const existingItem = AppState.cart.find(item => item.id === carId);
    
    if (existingItem) {
        showToast('Xe này đã có trong giỏ hàng', 'info');
        return;
    }
    
    AppState.cart.push({ ...car, quantity: 1 });
    storage.set('cart', AppState.cart);
    updateBadges();
    showToast('Đã thêm vào giỏ hàng', 'success');
};

const removeFromCart = (carId) => {
    AppState.cart = AppState.cart.filter(item => item.id !== carId);
    storage.set('cart', AppState.cart);
    updateBadges();
    renderCart();
    showToast('Đã xóa khỏi giỏ hàng', 'info');
};

const renderCart = () => {
    const content = document.getElementById('cart-content');
    const total = document.getElementById('cart-total');
    
    if (AppState.cart.length === 0) {
        content.innerHTML = '<div class="cart-empty">Giỏ hàng trống</div>';
        total.textContent = '0 VNĐ';
        return;
    }
    
    const totalAmount = AppState.cart.reduce((sum, item) => sum + item.price, 0);
    
    content.innerHTML = AppState.cart.map(item => `
        <div class="cart-item">
            <img src="${item.images[0]}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">${formatCurrency(item.price)}</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Xóa</button>
        </div>
    `).join('');
    
    total.textContent = formatCurrency(totalAmount);
};

const showCheckout = () => {
    if (AppState.cart.length === 0) {
        showToast('Giỏ hàng trống', 'error');
        return;
    }
    
    const summary = document.getElementById('checkout-summary');
    const totalAmount = AppState.cart.reduce((sum, item) => sum + item.price, 0);
    
    summary.innerHTML = `
        <h4>Tóm tắt đơn hàng</h4>
        ${AppState.cart.map(item => `
            <div class="checkout-item">
                <span>${item.name}</span>
                <span>${formatCurrency(item.price)}</span>
            </div>
        `).join('')}
        <div class="checkout-item" style="font-weight: 700; font-size: 1.2em; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--border-color);">
            <span>Tổng cộng:</span>
            <span>${formatCurrency(totalAmount)}</span>
        </div>
    `;
    
    closeModal('cart-modal');
    openModal('checkout-modal');
};

// ============================================
// LOAN CALCULATOR
// ============================================

const calculateLoan = () => {
    const price = parseFloat(document.getElementById('loan-price').value) || 0;
    const down = parseFloat(document.getElementById('loan-down').value) || 0;
    const rate = parseFloat(document.getElementById('loan-rate').value) || 0;
    const term = parseInt(document.getElementById('loan-term').value) || 0;
    
    if (price <= 0 || term <= 0) {
        showToast('Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }
    
    const loanAmount = price - down;
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
    const totalPayment = monthlyPayment * term;
    const totalInterest = totalPayment - loanAmount;
    
    document.getElementById('loan-amount').textContent = formatCurrency(loanAmount);
    document.getElementById('monthly-payment').textContent = formatCurrency(monthlyPayment);
    document.getElementById('total-interest').textContent = formatCurrency(totalInterest);
    document.getElementById('total-payment').textContent = formatCurrency(totalPayment);
    
    showToast('Đã tính toán xong', 'success');
};

// ============================================
// AUTHENTICATION
// ============================================

const showAuthModal = () => {
    if (AppState.currentUser) {
        // User is logged in, redirect to account page
        window.location.href = 'account.html';
    } else {
        openModal('auth-modal');
    }
};

const handleLogin = (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Mock authentication
    const user = { name: email.split('@')[0], email };
    AppState.currentUser = user;
    storage.set('currentUser', user);
    
    closeModal('auth-modal');
    updateAuthButton();
    showToast(`Chào mừng ${user.name}!`, 'success');
};

const handleRegister = (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    // Validate password match
    if (password !== confirmPassword) {
        showToast('Mật khẩu không khớp! Vui lòng nhập lại.', 'error');
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
        return;
    }
    
    // Mock registration
    const user = { name, email };
    AppState.currentUser = user;
    storage.set('currentUser', user);
    
    closeModal('auth-modal');
    updateAuthButton();
    showToast(`Đăng ký thành công! Chào mừng ${user.name}!`, 'success');
};

const updateAuthButton = () => {
    const btn = document.getElementById('auth-btn');
    if (AppState.currentUser) {
        btn.textContent = AppState.currentUser.name;
    } else {
        btn.textContent = 'Đăng nhập';
    }
};

// ============================================
// TEST DRIVE
// ============================================

let currentTestDriveCar = null;

const openTestDriveModal = (carId) => {
    currentTestDriveCar = carId;
    closeModal('car-detail-modal');
    openModal('test-drive-modal');
};

const handleTestDrive = (e) => {
    e.preventDefault();
    
    if (!AppState.currentUser) {
        closeModal('test-drive-modal');
        showToast('Vui lòng đăng nhập để đặt lịch lái thử', 'error');
        openModal('auth-modal');
        return;
    }
    
    const name = document.getElementById('test-name').value;
    const phone = document.getElementById('test-phone').value;
    const date = document.getElementById('test-date').value;
    const time = document.getElementById('test-time').value;
    
    // Save to localStorage
    const testDrives = storage.get('testDrives') || [];
    testDrives.push({
        carId: currentTestDriveCar,
        name,
        phone,
        date,
        time,
        timestamp: new Date().toISOString()
    });
    storage.set('testDrives', testDrives);
    
    closeModal('test-drive-modal');
    showToast('Đặt lịch lái thử thành công! Chúng tôi sẽ liên hệ với bạn sớm.', 'success');
    
    e.target.reset();
};

// ============================================
// CONTACT FORM
// ============================================

const handleContact = (e) => {
    e.preventDefault();
    
    const name = document.getElementById('contact-name').value;
    const phone = document.getElementById('contact-phone').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;
    
    // Mock submission
    console.log('Contact form submitted:', { name, phone, email, message });
    
    showToast('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.', 'success');
    e.target.reset();
};

// ============================================
// CHECKOUT FORM
// ============================================

const handleCheckout = (e) => {
    e.preventDefault();
    
    const name = document.getElementById('checkout-name').value;
    const phone = document.getElementById('checkout-phone').value;
    const email = document.getElementById('checkout-email').value;
    const address = document.getElementById('checkout-address').value;
    
    // Mock order
    const order = {
        id: Date.now(),
        customer: { name, phone, email, address },
        items: [...AppState.cart],
        total: AppState.cart.reduce((sum, item) => sum + item.price, 0),
        timestamp: new Date().toISOString()
    };
    
    // Save order
    const orders = storage.get('orders') || [];
    orders.push(order);
    storage.set('orders', orders);
    
    // Clear cart
    AppState.cart = [];
    storage.set('cart', AppState.cart);
    updateBadges();
    
    closeModal('checkout-modal');
    showToast('Đặt hàng thành công! Mã đơn hàng: #' + order.id, 'success');
    
    e.target.reset();
};

// ============================================
// NAVIGATION
// ============================================

const toggleMobileMenu = () => {
    const menu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('hamburger');
    
    menu.classList.toggle('active');
    hamburger.classList.toggle('active');
};

// Navigation link handling (for mobile menu close)
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        // Close mobile menu
        const menu = document.getElementById('nav-menu');
        const hamburger = document.getElementById('hamburger');
        if (menu && hamburger) {
            menu.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
});

// ============================================
// SCROLL EFFECTS
// ============================================

// Parallax effect for hero
const handleParallax = throttle(() => {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelector('.hero-bg.parallax');
    if (parallax) {
        parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
}, 10);

// Sticky header
const handleScroll = throttle(() => {
    const header = document.getElementById('header');
    if (window.pageYOffset > 100) {
        header.style.boxShadow = 'var(--shadow-lg)';
    } else {
        header.style.boxShadow = 'var(--shadow-sm)';
    }
}, 100);

window.addEventListener('scroll', () => {
    handleParallax();
    handleScroll();
});

// ============================================
// ANIMATED COUNTERS
// ============================================

const animateCounter = (element, target, duration = 2000) => {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    const isDecimal = target % 1 !== 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = isDecimal ? target.toFixed(1) : Math.floor(target);
            clearInterval(timer);
        } else {
            element.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
        }
    }, 16);
};

const initCounters = () => {
    const counters = document.querySelectorAll('.stat-number, .stat-number-large');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetStr = entry.target.getAttribute('data-target');
                const target = parseFloat(targetStr);
                animateCounter(entry.target, target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => observer.observe(counter));
};

// ============================================
// UPDATE BADGES
// ============================================

const updateBadges = () => {
    document.getElementById('favorites-count').textContent = AppState.favorites.length;
    document.getElementById('cart-count').textContent = AppState.cart.length;
};

// ============================================
// EVENT LISTENERS
// ============================================

const initCatalogEventListeners = () => {
    // Search with debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            AppState.filters.search = e.target.value;
            applyFilters();
        }, 300));
    }

    // Filter changes
    const filterBrand = document.getElementById('filter-brand');
    if (filterBrand) {
        filterBrand.addEventListener('change', (e) => {
            AppState.filters.brand = e.target.value;
            applyFilters();
        });
    }

    const filterYear = document.getElementById('filter-year');
    if (filterYear) {
        filterYear.addEventListener('change', (e) => {
            AppState.filters.year = e.target.value;
            applyFilters();
        });
    }

    const filterFuel = document.getElementById('filter-fuel');
    if (filterFuel) {
        filterFuel.addEventListener('change', (e) => {
            AppState.filters.fuel = e.target.value;
            applyFilters();
        });
    }

    const filterPrice = document.getElementById('filter-price');
    if (filterPrice) {
        filterPrice.addEventListener('change', (e) => {
            AppState.filters.price = e.target.value;
            applyFilters();
        });
    }

    // Sort
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            AppState.sortBy = e.target.value;
            applyFilters();
        });
    }

    // Clear filters
    const clearFilters = document.getElementById('clear-filters');
    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            AppState.filters = {
                search: '',
                brand: '',
                year: '',
                fuel: '',
                price: ''
            };
            AppState.sortBy = 'default';
            
            if (searchInput) searchInput.value = '';
            if (filterBrand) filterBrand.value = '';
            if (filterYear) filterYear.value = '';
            if (filterFuel) filterFuel.value = '';
            if (filterPrice) filterPrice.value = '';
            if (sortSelect) sortSelect.value = 'default';
            
            applyFilters();
            showToast('Đã xóa bộ lọc', 'info');
        });
    }
};

const initGlobalEventListeners = () => {
    // Mobile menu
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', toggleMobileMenu);
    }

    // Auth
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        authBtn.addEventListener('click', showAuthModal);
    }

    // Cart
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            renderCart();
            openModal('cart-modal');
        });
    }

    // Favorites button
    const favoritesBtn = document.getElementById('favorites-btn');
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', () => {
            if (AppState.favorites.length === 0) {
                showToast('Chưa có xe yêu thích', 'info');
                return;
            }
            
            // Redirect to catalog page with favorites filter
            window.location.href = 'catalog.html?favorites=true';
        });
    }

    // Keyboard navigation for gallery
    document.addEventListener('keydown', (e) => {
        const galleryModal = document.getElementById('gallery-modal');
        if (galleryModal && galleryModal.classList.contains('active')) {
            if (e.key === 'ArrowLeft') navigateGallery(-1);
            if (e.key === 'ArrowRight') navigateGallery(1);
        }
    });
};

const initModalEventListeners = () => {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            if (loginForm) loginForm.classList.toggle('hidden', targetTab !== 'login');
            if (registerForm) registerForm.classList.toggle('hidden', targetTab !== 'register');
        });
    });

    // Auth forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', showCheckout);
    }

    // Checkout form
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }

    // Calculator
    const calculateBtn = document.getElementById('calculate-loan');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateLoan);
    }

    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContact);
    }

    // Test drive form
    const testDriveForm = document.getElementById('test-drive-form');
    if (testDriveForm) {
        testDriveForm.addEventListener('submit', handleTestDrive);
    }

    // Gallery navigation
    const galleryPrev = document.getElementById('gallery-prev');
    if (galleryPrev) {
        galleryPrev.addEventListener('click', () => navigateGallery(-1));
    }

    const galleryNext = document.getElementById('gallery-next');
    if (galleryNext) {
        galleryNext.addEventListener('click', () => navigateGallery(1));
    }
};

// ============================================
// PAGE-SPECIFIC INITIALIZATION
// ============================================

const initHomePage = async () => {
    // Load all cars (both new and used) for home page
    try {
        const response = await fetch('mock-data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();
        
        // New Cars - Select premium new cars from different brands
        const newCarIds = [1, 2, 3, 4, 5, 6, 7, 8]; // 8 new cars
        const newCars = data.cars.filter(car => newCarIds.includes(car.id));
        
        const newCarsGrid = document.getElementById('new-cars');
        if (newCarsGrid && newCars.length > 0) {
            newCarsGrid.innerHTML = newCars.map(car => createCarCard(car)).join('');
        }
        
        // Used Cars - Select quality used cars with good prices
        const usedCarIds = [101, 102, 103, 104, 105, 106, 107, 108]; // 8 used cars
        const usedCars = data.usedCars.filter(car => usedCarIds.includes(car.id));
        
        const usedCarsGrid = document.getElementById('used-cars');
        if (usedCarsGrid && usedCars.length > 0) {
            usedCarsGrid.innerHTML = usedCars.map(car => createCarCard(car)).join('');
        }
        
        // Store all cars in AppState for other functions
        AppState.cars = [...data.cars, ...data.usedCars];
        
        // Update badges
        if (typeof updateBadges === 'function') {
            updateBadges();
        }
    } catch (error) {
        console.error('Error loading home page data:', error);
        showToast('Không thể tải dữ liệu xe. Vui lòng thử lại sau.', 'error');
    }
    
    // Initialize counters
    if (typeof initCounters === 'function') {
        initCounters();
    }
};

const initCatalogPage = () => {
    // Load new cars with filters
    loadCarData(false); // false = load new cars
    // Initialize event listeners
    initCatalogEventListeners();
};

const initUsedCarsPage = () => {
    // Load used cars with filters
    loadCarData(true); // true = load used cars
    // Initialize event listeners
    initCatalogEventListeners();
};

const initComparePage = async () => {
    // Load all cars (both new and used) for comparison
    try {
        const response = await fetch('mock-data.json');
        if (!response.ok) throw new Error('Failed to load data');
        const data = await response.json();
        
        // Load both new and used cars
        AppState.cars = [...data.cars, ...data.usedCars];
        
        // Update badges
        if (typeof updateBadges === 'function') {
            updateBadges();
        }
        
        // Render compare section
        if (typeof renderCompare === 'function') {
            renderCompare();
        }
    } catch (error) {
        console.error('Error loading compare page data:', error);
        showToast('Không thể tải dữ liệu xe. Vui lòng thử lại sau.', 'error');
    }
    
    // Clear compare button
    const clearBtn = document.getElementById('clear-compare');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            AppState.compareList = [];
            storage.set('compareList', []);
            if (typeof renderCompare === 'function') {
                renderCompare();
            }
            showToast('Đã xóa tất cả xe khỏi danh sách so sánh', 'info');
        });
    }
};

const initAccountPage = () => {
    const loginRequired = document.getElementById('login-required');
    const accountContent = document.getElementById('account-content');
    
    if (AppState.currentUser) {
        // Show account content
        loginRequired.classList.add('hidden');
        accountContent.classList.remove('hidden');
        
        // Update account info
        document.getElementById('account-name').textContent = AppState.currentUser.name;
        document.getElementById('account-email').textContent = AppState.currentUser.email;
        document.getElementById('account-avatar-text').textContent = AppState.currentUser.name.charAt(0).toUpperCase();
        
        // Update stats
        document.getElementById('stat-favorites').textContent = AppState.favorites.length;
        document.getElementById('stat-orders').textContent = (storage.get('orders') || []).length;
        document.getElementById('stat-test-drives').textContent = (storage.get('testDrives') || []).length;
        document.getElementById('stat-compare').textContent = AppState.compareList.length;
        
        // Load favorites - load all cars (new and used)
        loadCarData(false, true).then(() => {
            renderAccountFavorites();
            renderAccountOrders();
            renderAccountTestDrives();
        }).catch(error => {
            console.error('Error loading car data for account page:', error);
        });
        
        // Settings form
        document.getElementById('settings-name').value = AppState.currentUser.name;
        document.getElementById('settings-email').value = AppState.currentUser.email;
        document.getElementById('settings-phone').value = AppState.currentUser.phone || '';
        document.getElementById('settings-address').value = AppState.currentUser.address || '';
    } else {
        // Show login required
        loginRequired.classList.remove('hidden');
        accountContent.classList.add('hidden');
    }
    
    // Account tabs
    document.querySelectorAll('.account-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Update active tab
            document.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active pane
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AppState.currentUser = null;
            storage.remove('currentUser');
            showToast('Đã đăng xuất', 'info');
            window.location.reload();
        });
    }
    
    // Settings form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            AppState.currentUser.name = document.getElementById('settings-name').value;
            AppState.currentUser.email = document.getElementById('settings-email').value;
            AppState.currentUser.phone = document.getElementById('settings-phone').value;
            AppState.currentUser.address = document.getElementById('settings-address').value;
            storage.set('currentUser', AppState.currentUser);
            showToast('Đã lưu thay đổi', 'success');
            updateAuthButton();
        });
    }
    
    // Clear data button
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu? Hành động này không thể hoàn tác.')) {
                localStorage.clear();
                showToast('Đã xóa tất cả dữ liệu', 'info');
                setTimeout(() => window.location.href = 'index.html', 1000);
            }
        });
    }
};

const renderAccountFavorites = () => {
    const grid = document.getElementById('favorites-grid');
    const empty = document.getElementById('favorites-empty');
    
    if (AppState.favorites.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }
    
    grid.style.display = 'grid';
    empty.style.display = 'none';
    
    const favoriteCars = AppState.cars.filter(car => AppState.favorites.includes(car.id));
    grid.innerHTML = favoriteCars.map(car => createCarCard(car)).join('');
};

const renderAccountOrders = () => {
    const list = document.getElementById('orders-list');
    const empty = document.getElementById('orders-empty');
    const orders = storage.get('orders') || [];
    
    if (orders.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }
    
    list.style.display = 'block';
    empty.style.display = 'none';
    
    list.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">Đơn hàng #${order.id}</span>
                <span class="order-status completed">Đã xác nhận</span>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <img src="${item.images[0]}" alt="${item.name}" class="order-item-image">
                        <div>
                            <div>${item.name}</div>
                            <div style="color: var(--text-secondary); font-size: var(--font-size-sm);">
                                ${formatCurrency(item.price)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="order-footer">
                <span style="color: var(--text-secondary); font-size: var(--font-size-sm);">
                    ${new Date(order.timestamp).toLocaleDateString('vi-VN')}
                </span>
                <span class="order-total">${formatCurrency(order.total)}</span>
            </div>
        </div>
    `).join('');
};

const renderAccountTestDrives = () => {
    const list = document.getElementById('test-drives-list');
    const empty = document.getElementById('test-drives-empty');
    const testDrives = storage.get('testDrives') || [];
    
    if (testDrives.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }
    
    list.style.display = 'block';
    empty.style.display = 'none';
    
    list.innerHTML = testDrives.map(td => {
        const car = AppState.cars.find(c => c.id === td.carId);
        if (!car) return '';
        
        return `
            <div class="test-drive-card">
                <img src="${car.images[0]}" alt="${car.name}" style="width: 120px; height: 80px; object-fit: cover; border-radius: var(--radius-md);">
                <div class="test-drive-info">
                    <div class="test-drive-car">${car.name}</div>
                    <div class="test-drive-details">
                        <div>👤 ${td.name}</div>
                        <div>📞 ${td.phone}</div>
                        <div>📅 ${new Date(td.date).toLocaleDateString('vi-VN')} - ${td.time}</div>
                    </div>
                </div>
                <div class="test-drive-actions">
                    <span class="order-status pending">Chờ xác nhận</span>
                </div>
            </div>
        `;
    }).join('');
};

const initCalculatorPage = () => {
    // Calculator is already initialized via event listeners
};

const initContactPage = () => {
    // Contact form is already initialized via event listeners
};

// ============================================
// INITIALIZATION
// ============================================

const init = () => {
    // Update auth button
    updateAuthButton();
    
    // Update badges
    updateBadges();
    
    // Set minimum date for test drive
    const today = new Date().toISOString().split('T')[0];
    const testDateInput = document.getElementById('test-date');
    if (testDateInput) {
        testDateInput.setAttribute('min', today);
    }
    
    // Initialize modals container
    const modalsContainer = document.getElementById('modals-container');
    if (modalsContainer) {
        modalsContainer.innerHTML = `
            <!-- Car Detail Modal -->
            <div class="modal" id="car-detail-modal">
                <div class="modal-content modal-large">
                    <button class="modal-close" onclick="closeModal('car-detail-modal')">&times;</button>
                    <div id="car-detail-content"></div>
                </div>
            </div>

            <!-- Auth Modal -->
            <div class="modal" id="auth-modal">
                <div class="modal-content">
                    <button class="modal-close" onclick="closeModal('auth-modal')">&times;</button>
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="login">Đăng nhập</button>
                        <button class="auth-tab" data-tab="register">Đăng ký</button>
                    </div>
                    <form id="login-form" class="auth-form">
                        <h3>Đăng nhập</h3>
                        <div class="input-group">
                            <label for="login-email">Email</label>
                            <input type="email" id="login-email" required>
                        </div>
                        <div class="input-group">
                            <label for="login-password">Mật khẩu</label>
                            <input type="password" id="login-password" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Đăng nhập</button>
                    </form>
                    <form id="register-form" class="auth-form hidden">
                        <h3>Đăng ký</h3>
                        <div class="input-group">
                            <label for="register-name">Họ tên</label>
                            <input type="text" id="register-name" required>
                        </div>
                        <div class="input-group">
                            <label for="register-email">Email</label>
                            <input type="email" id="register-email" required>
                        </div>
                        <div class="input-group">
                            <label for="register-password">Mật khẩu</label>
                            <input type="password" id="register-password" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Đăng ký</button>
                    </form>
                </div>
            </div>

            <!-- Cart Modal -->
            <div class="modal" id="cart-modal">
                <div class="modal-content">
                    <button class="modal-close" onclick="closeModal('cart-modal')">&times;</button>
                    <h3>Giỏ hàng</h3>
                    <div id="cart-content"></div>
                    <div class="cart-footer">
                        <div class="cart-total">
                            <span>Tổng cộng:</span>
                            <span id="cart-total">0 VNĐ</span>
                        </div>
                        <button class="btn btn-primary btn-block" id="checkout-btn">Thanh toán</button>
                    </div>
                </div>
            </div>

            <!-- Checkout Modal -->
            <div class="modal" id="checkout-modal">
                <div class="modal-content">
                    <button class="modal-close" onclick="closeModal('checkout-modal')">&times;</button>
                    <h3>Thanh toán</h3>
                    <form id="checkout-form">
                        <div class="input-group">
                            <label for="checkout-name">Họ tên *</label>
                            <input type="text" id="checkout-name" required>
                        </div>
                        <div class="input-group">
                            <label for="checkout-phone">Số điện thoại *</label>
                            <input type="tel" id="checkout-phone" required>
                        </div>
                        <div class="input-group">
                            <label for="checkout-email">Email *</label>
                            <input type="email" id="checkout-email" required>
                        </div>
                        <div class="input-group">
                            <label for="checkout-address">Địa chỉ *</label>
                            <textarea id="checkout-address" rows="3" required></textarea>
                        </div>
                        <div class="checkout-summary" id="checkout-summary"></div>
                        <button type="submit" class="btn btn-primary btn-block">Xác nhận đơn hàng</button>
                    </form>
                </div>
            </div>

            <!-- Gallery Modal -->
            <div class="modal" id="gallery-modal">
                <div class="modal-content modal-gallery">
                    <button class="modal-close" onclick="closeModal('gallery-modal')">&times;</button>
                    <div class="gallery-container">
                        <button class="gallery-nav gallery-prev" id="gallery-prev">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M15 18l-6-6 6-6" stroke-width="2"/>
                            </svg>
                        </button>
                        <img id="gallery-image" src="" alt="Car image">
                        <button class="gallery-nav gallery-next" id="gallery-next">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M9 18l6-6-6-6" stroke-width="2"/>
                            </svg>
                        </button>
                    </div>
                    <div class="gallery-thumbnails" id="gallery-thumbnails"></div>
                </div>
            </div>

            <!-- Test Drive Modal -->
            <div class="modal" id="test-drive-modal">
                <div class="modal-content">
                    <button class="modal-close" onclick="closeModal('test-drive-modal')">&times;</button>
                    <h3>Đặt lịch lái thử</h3>
                    <form id="test-drive-form">
                        <div class="input-group">
                            <label for="test-name">Họ tên *</label>
                            <input type="text" id="test-name" required>
                        </div>
                        <div class="input-group">
                            <label for="test-phone">Số điện thoại *</label>
                            <input type="tel" id="test-phone" required>
                        </div>
                        <div class="input-group">
                            <label for="test-date">Ngày lái thử *</label>
                            <input type="date" id="test-date" required>
                        </div>
                        <div class="input-group">
                            <label for="test-time">Giờ lái thử *</label>
                            <input type="time" id="test-time" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Đặt lịch</button>
                    </form>
                </div>
            </div>
        `;
    }
    
    // Initialize global event listeners
    initGlobalEventListeners();
    
    // Initialize modal event listeners after modals are created
    setTimeout(() => {
        initModalEventListeners();
    }, 100);
    
    // Detect current page and initialize accordingly
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);
    
    if (page === '' || page === 'index.html') {
        initHomePage();
    } else if (page === 'catalog.html') {
        initCatalogPage();
    } else if (page === 'used-cars.html') {
        initUsedCarsPage();
    } else if (page === 'compare.html') {
        initComparePage();
    } else if (page === 'calculator.html') {
        initCalculatorPage();
    } else if (page === 'contact.html') {
        initContactPage();
    } else if (page === 'account.html') {
        initAccountPage();
    }
    
    console.log('AutoLux initialized successfully!');
};

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================
// EXPOSE GLOBAL FUNCTIONS
// ============================================

// Make functions available globally for onclick handlers
window.showCarDetail = showCarDetail;
window.toggleFavorite = toggleFavorite;
window.toggleCompare = toggleCompare;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.changePage = changePage;
window.openModal = openModal;
window.closeModal = closeModal;
window.openGallery = openGallery;
window.navigateGallery = navigateGallery;
window.changeDetailImage = changeDetailImage;
window.updateCarDetailFavorite = updateCarDetailFavorite;
window.openTestDriveModal = openTestDriveModal;

// ============================================
// FAVORITES POPUP FUNCTIONS
// ============================================

const showFavoritesPopup = () => {
    console.log('showFavoritesPopup called'); // Debug log
    
    // Remove existing modal if any
    const existingModal = document.getElementById('favorites-popup-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create and show modal
    createFavoritesModal();
    renderFavoritesPopup();
    
    const modal = document.getElementById('favorites-popup-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

const closeFavoritesPopup = () => {
    const modal = document.getElementById('favorites-popup-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Remove modal after animation
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
};

const createFavoritesModal = () => {
    const modalHTML = `
        <div class="favorites-modal" id="favorites-popup-modal">
            <div class="favorites-modal-content">
                <div class="favorites-modal-header">
                    <h2 class="favorites-modal-title">
                        ❤️ Xe yêu thích
                    </h2>
                    <button class="favorites-modal-close" onclick="closeFavoritesPopup()">×</button>
                </div>
                <div class="favorites-modal-body">
                    <div class="favorites-stats-mini">
                        <div class="stat-mini">
                            <span class="stat-mini-number" id="popup-total-favorites">0</span>
                            <span class="stat-mini-label">Xe yêu thích</span>
                        </div>
                        <div class="stat-mini">
                            <span class="stat-mini-number" id="popup-avg-price">0 VNĐ</span>
                            <span class="stat-mini-label">Giá trung bình</span>
                        </div>
                    </div>
                    <div class="favorites-popup-grid" id="favorites-popup-grid"></div>
                </div>
                <div class="favorites-modal-footer">
                    <div class="favorites-modal-info">
                        <span id="favorites-count-text">0 xe được chọn</span>
                    </div>
                    <div class="favorites-modal-actions">
                        <button class="favorites-modal-btn danger" onclick="clearAllFavoritesPopup()">
                            🗑️ Xóa tất cả
                        </button>
                        <button class="favorites-modal-btn primary" onclick="closeFavoritesPopup()">
                            ✅ Hoàn tất
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Close modal when clicking outside
    const modal = document.getElementById('favorites-popup-modal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFavoritesPopup();
        }
    });
};

const renderFavoritesPopup = () => {
    const grid = document.getElementById('favorites-popup-grid');
    const totalFavoritesEl = document.getElementById('popup-total-favorites');
    const avgPriceEl = document.getElementById('popup-avg-price');
    const countTextEl = document.getElementById('favorites-count-text');
    
    if (!grid) return;
    
    // Get favorite cars
    const favoriteCars = AppState.cars.filter(car => AppState.favorites.includes(car.id));
    
    // Update stats
    if (totalFavoritesEl) {
        totalFavoritesEl.textContent = favoriteCars.length;
    }
    
    if (avgPriceEl && favoriteCars.length > 0) {
        const avgPrice = favoriteCars.reduce((sum, car) => sum + car.price, 0) / favoriteCars.length;
        avgPriceEl.textContent = formatCurrency(avgPrice);
    } else if (avgPriceEl) {
        avgPriceEl.textContent = '0 VNĐ';
    }
    
    if (countTextEl) {
        countTextEl.textContent = `${favoriteCars.length} xe được chọn`;
    }
    
    // Render favorites or empty state
    if (favoriteCars.length === 0) {
        grid.innerHTML = `
            <div class="favorites-empty">
                <div style="font-size: 48px; margin-bottom: 16px;">💔</div>
                <h3>Chưa có xe yêu thích</h3>
                <p>Hãy thêm những chiếc xe bạn quan tâm vào danh sách yêu thích</p>
                <div class="favorites-empty-actions">
                    <button class="favorites-empty-btn" onclick="closeFavoritesPopup(); window.location.href='catalog.html'">
                        🔍 Khám phá xe mới
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Render favorite cars
    grid.innerHTML = favoriteCars.map(car => createFavoritePopupCard(car)).join('');
};

const createFavoritePopupCard = (car) => {
    return `
        <div class="favorite-popup-card">
            <div class="favorite-popup-card-image">
                <img src="${car.images[0]}" alt="${car.name}" loading="lazy">
                ${car.badge ? `<span class="favorite-popup-badge">${car.badge}</span>` : ''}
                <button class="favorite-remove-btn" onclick="removeFavoriteFromPopup(${car.id})" title="Xóa khỏi yêu thích">×</button>
            </div>
            <div class="favorite-popup-card-content">
                <h3 class="favorite-popup-card-title">${car.name}</h3>
                <div class="favorite-popup-card-meta">
                    <span>📅 ${car.year}</span>
                    <span>🛣️ ${formatNumber(car.km)} km</span>
                    <span>⚙️ ${car.transmission}</span>
                </div>
                <div class="favorite-popup-card-price">${formatCurrency(car.price)}</div>
                <div class="favorite-popup-card-actions">
                    <button class="favorite-popup-btn" onclick="showCarDetailFromPopup(${car.id})">
                        👁️ Chi tiết
                    </button>
                    <button class="favorite-popup-btn" onclick="toggleCompareFromPopup(${car.id})">
                        ⚖️ So sánh
                    </button>
                </div>
            </div>
        </div>
    `;
};

const removeFavoriteFromPopup = (carId) => {
    toggleFavorite(carId);
    renderFavoritesPopup();
};

const showCarDetailFromPopup = (carId) => {
    closeFavoritesPopup();
    showCarDetail(carId);
};

const toggleCompareFromPopup = (carId) => {
    toggleCompare(carId);
    showToast('Đã thêm vào danh sách so sánh', 'success');
};

const clearAllFavoritesPopup = () => {
    if (AppState.favorites.length === 0) {
        showToast('Danh sách yêu thích đã trống', 'info');
        return;
    }
    
    if (confirm('Bạn có chắc muốn xóa tất cả xe yêu thích?')) {
        AppState.favorites = [];
        storage.set('favorites', AppState.favorites);
        updateBadges();
        renderFavoritesPopup();
        showToast('Đã xóa tất cả xe yêu thích', 'success');
    }
};

// Initialize favorites button click handler
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, setting up favorites button'); // Debug log
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        const favoritesBtn = document.getElementById('favorites-btn');
        console.log('Favorites button found:', favoritesBtn); // Debug log
        
        if (favoritesBtn) {
            // Remove any existing listeners
            favoritesBtn.replaceWith(favoritesBtn.cloneNode(true));
            const newFavoritesBtn = document.getElementById('favorites-btn');
            
            newFavoritesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Favorites button clicked'); // Debug log
                showFavoritesPopup();
            });
        }
    }, 100);
});
// Test function - temporary
window.testFavoritesPopup = () => {
    console.log('Test function called');
    showFavoritesPopup();
};

// Alternative way to bind event
window.addEventListener('load', () => {
    console.log('Window loaded');
    const favoritesBtn = document.getElementById('favorites-btn');
    if (favoritesBtn) {
        console.log('Adding click listener to favorites button');
        favoritesBtn.onclick = (e) => {
            e.preventDefault();
            console.log('Favorites button clicked via onclick');
            showFavoritesPopup();
        };
    }
});