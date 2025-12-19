/ --- BIẾN TOÀN CỤC ---
let productDatabase = []; 
let productDatabaseOriginal = [];
let currentCart = []; 
let dailyTransactions = []; 
let exportedInvoicesLog = []; // (MỚI) Log hóa đơn đã xuất
let selectedProduct = null; 
let devBypassMode = false; // (*** MỚI - LƯU ***) Thêm vào backup

// (MỚI) Biến cho Modal Xác nhận
let confirmModal = null;
let confirmModalConfirmBtn = null;
let confirmModalCancelBtn = null;
let confirmModalTitle = null;
let confirmModalMessage = null;
let onConfirmCallback = () => {}; // Callback để gọi khi nhấn OK

// (MỚI) Biến cho Dark Mode
let themeToggleBtn = null;
let themeIconSun = null;
let themeIconMoon = null;

// (MỚI) Biến cho Modal Hóa đơn đã xuất
let exportedInvoicesModal = null;
let exportedInvoicesList = null;

// (*** SỬA ***) Biến cho Modal Kết thúc Phiên
let endSessionModal = null;
let endSessionModalCancelBtn = null; // Nút Hủy
let endSessionDownloadSalesBtn = null; // (MỚI) Nút tải Bán hàng
let endSessionDownloadInventoryBtn = null; // (MỚI) Nút tải Tồn kho
let endSessionModalConfirmBtn = null; // (MỚI) Nút Xác nhận Xóa

// (*** MỚI ***) Biến cho Modal Thông tin
let infoModal = null;

// (*** MỚI ***) Biến cho Modal Xem CSDL
let databaseViewerModal = null;
let databaseViewerList = null;
let dbModalSearchInput = null;


// --- 1. KHỞI TẠO & SỰ KIỆN ---
document.addEventListener('DOMContentLoaded', () => {
    // Gán biến Modal
    confirmModal = document.getElementById('confirm-modal');
    confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm-btn');
    confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');
    confirmModalTitle = document.getElementById('confirm-modal-title');
    confirmModalMessage = document.getElementById('confirm-modal-message');

// (*** SỬA ***) Gán biến Modal Kết thúc Phiên
    endSessionModal = document.getElementById('end-session-modal');
    endSessionModalCancelBtn = document.getElementById('end-session-modal-cancel-btn');
    endSessionDownloadSalesBtn = document.getElementById('end-session-download-sales');
    endSessionDownloadInventoryBtn = document.getElementById('end-session-download-inventory');
    endSessionModalConfirmBtn = document.getElementById('end-session-modal-confirm-btn');

    // (*** MỚI ***) Gán biến Modal Thông tin
    infoModal = document.getElementById('info-modal');
    
    // (*** MỚI ***) Gán biến Modal Xem CSDL
    databaseViewerModal = document.getElementById('database-viewer-modal');
    databaseViewerList = document.getElementById('database-viewer-list');
    dbModalSearchInput = document.getElementById('db-modal-search-input');

    // Gán biến Dark Mode
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeIconSun = document.getElementById('theme-icon-sun');
    themeIconMoon = document.getElementById('theme-icon-moon');

    // Khởi tạo
    document.getElementById('invoice-date').valueAsDate = new Date();
    loadStateFromStorage(); // Hàm này sẽ tự động gọi updateSessionStatus & updateExportedInvoicesButtonState
    setupThemeToggle(); // (MỚI)
    setupExportedInvoicesModal(); // (MỚI)
    setupInfoModal(); // (*** MỚI ***)
    setupEndSessionModal(); // (*** MỚI ***)
    setupDatabaseViewerModal(); // (*** MỚI ***)
    startClock(); // (MỚI)
    updateFinancialQuarter(); // (*** MỚI ***)
    
    // (*** MỚI ***) CẬP NHẬT TỔNG DOANH THU KHI KHỞI TẠO
    updateLiveTotalAccumulated(); 

    // Gán sự kiện cho các nút
    document.getElementById('load-db-btn').addEventListener('click', handleFileLoad);
    document.getElementById('export-inventory-btn').addEventListener('click', exportInventory);
    document.getElementById('export-sales-report-btn').addEventListener('click', exportDailySalesReport); // (*** MỚI ***)
    document.getElementById('end-session-btn').addEventListener('click', startEndSessionProcess); // (*** SỬA ***)
    document.getElementById('add-product-form').addEventListener('submit', handleAddProduct);
    document.getElementById('product-search').addEventListener('keyup', handleProductSearch);
    document.getElementById('export-invoice-btn').addEventListener('click', exportInvoiceFile);
    document.getElementById('clear-cart-btn').addEventListener('click', () => clearCart(true)); // (SỬA) Bọc trong hàm
    
    // (MỚI) Gán sự kiện cho File Input
    document.getElementById('file-input').addEventListener('change', updateFileNameDisplay);

    // (MỚI) Gán sự kiện cho Modal Nâng cao
    document.getElementById('advanced-mode-btn').addEventListener('click', showAdvancedModal);
    document.getElementById('modal-close-btn-adv').addEventListener('click', hideAdvancedModal);
    document.getElementById('modal-overlay-bg-adv').addEventListener('click', hideAdvancedModal);
    
    document.getElementById('dev-bypass-btn').addEventListener('click', toggleBypassMode);
    document.getElementById('export-empty-invoice-btn').addEventListener('click', exportEmptyInvoice);
    document.getElementById('export-empty-sales-btn').addEventListener('click', exportEmptySalesReport);
    document.getElementById('export-empty-inventory-btn').addEventListener('click', exportEmptyInventory);
    
    // (*** SỬA ***) Gán sự kiện cho Backup/Restore
    document.getElementById('backup-session-btn').addEventListener('click', handleBackupSession);
    document.getElementById('restore-file-input').addEventListener('change', handleRestoreSession);

    // (MỚI) Gán sự kiện cho Modal Xác nhận
    confirmModalConfirmBtn.addEventListener('click', () => {
        onConfirmCallback();
        hideConfirmModal();
    });
    confirmModalCancelBtn.addEventListener('click', hideConfirmModal);
    
    // (*** MỚI ***) Gán sự kiện cho Modal Thông tin (Đã chuyển vào setupInfoModal)
    // document.getElementById('info-mode-btn').addEventListener('click', showInfoModal);
});

// --- (MỚI) HÀM TIỆN ÍCH MODAL XÁC NHẬN ---
/**
 * Hiển thị modal xác nhận (thay thế window.confirm)
 * @param {string} title Tiêu đề của modal
 * @param {string} message Nội dung thông báo
 * @param {function} onConfirm Hàm callback sẽ chạy khi nhấn "Xác nhận"
 * @param {string} confirmBtnClass (Tùy chọn) Class của nút xác nhận (vd: 'btn-danger', 'btn-success')
 */
function showConfirmModal(title, message, onConfirm, confirmBtnClass = 'btn-danger') {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    onConfirmCallback = onConfirm;
    
    // Reset class nút
    confirmModalConfirmBtn.className = ''; // Xóa hết class cũ
    confirmModalConfirmBtn.classList.add('btn-base', confirmBtnClass); // Thêm class mới
    
    confirmModal.classList.remove('hidden');
}

function hideConfirmModal() {
    confirmModal.classList.add('hidden');
    onConfirmCallback = () => {}; // Xóa callback
}

// --- (MỚI) HÀM TIỆN ÍCH DARK MODE ---
function setupThemeToggle() {
    // Cập nhật icon dựa trên trạng thái hiện tại
    function updateIcon() {
        if (document.documentElement.classList.contains('dark')) {
            themeIconMoon.classList.add('hidden');
            themeIconSun.classList.remove('hidden');
        } else {
            themeIconSun.classList.add('hidden');
            themeIconMoon.classList.remove('hidden');
        }
    }
    
    updateIcon(); // Chạy lần đầu
    
    // Gán sự kiện click
    themeToggleBtn.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        updateIcon(); // Cập nhật lại icon
    });
}

// --- (MỚI) HÀM TIỆN ÍCH FILE INPUT ---
function updateFileNameDisplay() {
    const fileInput = document.getElementById('file-input');
    const display = document.getElementById('file-name-display');
    if (fileInput.files.length > 0) {
        display.textContent = fileInput.files[0].name;
        display.classList.remove('italic');
    } else {
        display.textContent = 'Chưa chọn tệp nào.';
        display.classList.add('italic');
    }
}

// --- CÁC HÀM TIỆN ÍCH (Hiển thị thông báo) ---
function showStatus(message, isError = false) {
    const container = document.getElementById('status-container');
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
    statusDiv.textContent = message;
    container.innerHTML = ''; 
    container.appendChild(statusDiv);
    window.scrollTo(0, 0);
    setTimeout(() => { if (container.contains(statusDiv)) container.removeChild(statusDiv); }, 6000);
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

/**
 * (MỚI) Formats a date object or a yyyy-mm-dd string into dd/mm/yyyy.
 * @param {Date | string} dateInput The date object or string to format.
 */
function formatDateDDMMYYYY(dateInput) {
    if (!dateInput) return '';
    
    let dateObj;
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
        // Handle 'yyyy-mm-dd' string from <input type="date">
        const parts = dateInput.split('-');
        if (parts.length === 3) {
            // new Date(year, monthIndex, day) - month is 0-indexed
            dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
            dateObj = new Date(dateInput); // Fallback
        }
    } else {
        dateObj = new Date(dateInput);
    }
    
    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
        return ''; // Return empty string for invalid dates
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

// --- QUẢN LÝ TRẠNG THÁI PHIÊN & GIAO DIỆN ---
function updateSessionStatus() {
    const statusBar = document.getElementById('session-status-bar');
    const isSessionActive = productDatabase.length > 0;

    if (isSessionActive) {
        statusBar.textContent = `Phiên làm việc đang diễn ra. CSDL: ${productDatabase.length} SP. Giao dịch: ${dailyTransactions.length}.`;
        statusBar.className = 'text-center p-3 font-medium status-session-active sticky top-[73px] z-40';
    } else {
        statusBar.textContent = 'Chưa có phiên làm việc. Vui lòng tải Cơ sở dữ liệu để bắt đầu.';
        statusBar.className = 'text-center p-3 font-medium status-session-inactive sticky top-[73px] z-40';
    }
    
    toggleAppControls(isSessionActive, devBypassMode);
    updateExportedInvoicesButtonState(); // (MỚI) Cập nhật nút HĐ đã xuất
    updateLiveTotalAccumulated(); // (*** MỚI ***) Cập nhật tổng doanh thu
    // (*** MỚI ***) Cập nhật trạng thái nút Bypass trong Modal Nâng cao
    updateBypassButtonState(); 
}

function updateBypassButtonState() {
    const btn = document.getElementById('dev-bypass-btn');
    const statusSpan = btn.querySelector('span');
    
    if (!btn || !statusSpan) return;

    if (devBypassMode) {
        statusSpan.textContent = '[BẬT]';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-warning');
    } else {
        statusSpan.textContent = '[TẮT]';
        btn.classList.add('btn-warning');
        btn.classList.remove('btn-success');
    }
}


function toggleAppControls(isSessionActive, isBypassActive = false) {
    document.getElementById('export-inventory-btn').disabled = !isSessionActive;
    document.getElementById('export-sales-report-btn').disabled = !isSessionActive; // (*** MỚI ***)
    document.getElementById('end-session-btn').disabled = !isSessionActive;
    document.getElementById('view-database-btn').disabled = !isSessionActive; // (*** MỚI ***)
    document.getElementById('main-app-controls').disabled = !isSessionActive && !isBypassActive;
    
    const loadDbBtn = document.getElementById('load-db-btn');
    if (isSessionActive) {
        loadDbBtn.textContent = 'Tải lại CSDL (Phiên mới)';
        loadDbBtn.classList.remove('btn-primary');
        loadDbBtn.classList.add('btn-danger');
    } else {
        loadDbBtn.textContent = 'Bắt đầu phiên (Tải CSDL)';
        loadDbBtn.classList.remove('btn-danger');
        loadDbBtn.classList.add('btn-primary');
    }
}

// (MỚI) Cập nhật trạng thái nút "Xem HĐ đã xuất"
function updateExportedInvoicesButtonState() {
    const btn = document.getElementById('view-exports-btn');
    if (!btn) return; // Guard clause
    const isSessionActive = productDatabase.length > 0;
    // Chỉ bật khi phiên hoạt động VÀ có log hóa đơn
    btn.disabled = !(isSessionActive && exportedInvoicesLog.length > 0);
}

// (*** MỚI ***) HÀM TÍNH VÀ CẬP NHẬT TỔNG DOANH THU TỪ dailyTransactions
function updateLiveTotalAccumulated() {
    let totalRevenue = 0;
    
    dailyTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
            // Tổng tiền = Đơn giá * Số lượng (Không cần quan tâm thuế vì đã đơn giản hóa)
            const itemTotal = item.price * item.quantity; 
            totalRevenue += itemTotal;
        });
    });

    const totalDisplayEl = document.getElementById('accumulated-total-display');
    const countDisplayEl = document.getElementById('total-transactions-count');

    if (totalDisplayEl) {
        // Áp dụng làm tròn trước khi format
        const roundedTotal = Math.round(totalRevenue); 
        totalDisplayEl.textContent = currencyFormatter.format(roundedTotal);
    }
    
    if (countDisplayEl) {
        countDisplayEl.textContent = `Đã ghi nhận: ${dailyTransactions.length} giao dịch`;
    }
}


// --- 2. QUẢN LÝ DỮ LIỆU & STATE (LOCALSTORAGE) ---
// (*** SỬA ***) Cập nhật hàm lưu state để bao gồm devBypassMode
function saveStateToStorage() {
    const state = {
        current: productDatabase,
        original: productDatabaseOriginal,
        transactions: dailyTransactions,
        devBypass: devBypassMode // (*** MỚI - LƯU ***) Lưu trạng thái Bypass
    };
    localStorage.setItem('inventoryState', JSON.stringify(state));
    // (MỚI) Log hóa đơn được lưu riêng (trong hàm exportInvoiceFile)
    // vì nó không thuộc về "state" của tồn kho
}

// (*** SỬA ***) Cập nhật hàm tải state để bao gồm devBypassMode
function loadStateFromStorage() {
    // 1. Tải state tồn kho
    const savedState = localStorage.getItem('inventoryState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            if (state.current && state.original) {
                productDatabase = state.current;
                productDatabaseOriginal = state.original;
                dailyTransactions = state.transactions || []; 
                devBypassMode = state.devBypass || false; // (*** MỚI - TẢI ***) Tải trạng thái Bypass
                showStatus('Đã khôi phục dữ liệu từ phiên làm việc trước.', false);
            }
        } catch (e) {
            console.error('Lỗi khôi phục trạng thái:', e);
            localStorage.removeItem('inventoryState');
        }
    }
    
    // 2. (MỚI) Tải log hóa đơn đã xuất
    const savedLogs = localStorage.getItem('exportedInvoicesLog');
    if (savedLogs) {
        try {
            exportedInvoicesLog = JSON.parse(savedLogs);
        } catch (e) {
            console.error('Lỗi khôi phục exportedInvoicesLog:', e);
            localStorage.removeItem('exportedInvoicesLog');
            exportedInvoicesLog = [];
        }
    }
    
    updateSessionStatus(); // Hàm này sẽ tự động gọi updateExportedInvoicesButtonState VÀ updateLiveTotalAccumulated
}

// --- 3. TẢI DATABASE & QUẢN LÝ PHIÊN ---
function handleFileLoad() {
    const fileInput = document.getElementById('file-input');
    if (fileInput.files.length === 0) return showStatus('Vui lòng chọn Cơ sở dữ liệu!', true);

    const startLoad = () => {
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                productDatabase = [];
                productDatabaseOriginal = [];
                dailyTransactions = [];
                currentCart = [];
                exportedInvoicesLog = []; // (MỚI) Xóa log cũ khi nạp CSDL mới
                localStorage.removeItem('exportedInvoicesLog'); // (MỚI)
                devBypassMode = false; // (*** MỚI - RESET ***) Reset Bypass khi tải CSDL mới
                
                // (*** SỬA ***) Xóa cột THUE (20) khỏi COL object
                const COL = {TIN: 16, TEN: 17, DVT: 18, GIA: 19};
                let productsLoaded = 0;
                for (let i = 3; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    // (*** SỬA ***) Cập nhật điều kiện check độ dài
                    if (row && row.length >= COL.GIA && row[COL.TEN]) {
                        const productName = String(row[COL.TEN]).trim();
                        if (productName.length > 0) {
                            productDatabase.push({
                                name: productName,
                                unit: String(row[COL.DVT] || '').trim(),
                                price: parseFloat(row[COL.GIA]) || 0,
                                // (*** SỬA ***) Xóa taxRate
                                stock: parseInt(row[COL.TIN]) || 0
                            });
                            productsLoaded++;
                        }
                    }
                }
                
                productDatabaseOriginal = JSON.parse(JSON.stringify(productDatabase));
                saveStateToStorage();
                renderCart();
                showStatus(`Bắt đầu phiên làm việc thành công! Đã nạp ${productsLoaded} sản phẩm.`);
                fileInput.value = '';
                updateFileNameDisplay();
                updateSessionStatus();

            } catch (error) { 
                showStatus(`Lỗi khi đọc tệp Excel: ${error.message}`, true); 
                updateSessionStatus();
            }
        };
        reader.onerror = () => showStatus('Không thể đọc tệp. Đã xảy ra lỗi.', true);
        reader.readAsArrayBuffer(file);
    };

    if (dailyTransactions.length > 0) {
        // (SỬA) Dùng modal xác nhận
        showConfirmModal(
            'Bắt đầu phiên mới?',
            'Bạn có chắc chắn muốn bắt đầu lại phiên làm việc? TẤT CẢ giao dịch và log hóa đơn đã lưu sẽ bị XÓA.',
            startLoad // Hàm startLoad sẽ là callback
        );
    } else {
        startLoad(); // Nếu không có giao dịch, chạy luôn
    }
}

// (*** SỬA ***)
// Bước 1: Người dùng nhấn nút "Kết thúc phiên"
function startEndSessionProcess() {
    if (productDatabase.length === 0 && dailyTransactions.length === 0) {
        return showStatus('Chưa có dữ liệu nào trong phiên. Vui lòng bắt đầu phiên trước.', true);
    }
    // Hiển thị modal chọn file
    showEndSessionModal();
}

// (*** SỬA ***)
// Bước 4: Người dùng nhấn "Xác nhận" trên modal cuối cùng -> Xóa dữ liệu
function performDataDeletion() {
    productDatabase = [];
    productDatabaseOriginal = [];
    dailyTransactions = [];
    currentCart = [];
    exportedInvoicesLog = [];
    localStorage.removeItem('inventoryState');
    localStorage.removeItem('exportedInvoicesLog');
    devBypassMode = false; // (*** MỚI - RESET ***) Reset Bypass mode

    renderCart();
    document.getElementById('customer-info-form').reset();
    document.getElementById('add-product-form').reset();
    document.getElementById('invoice-date').valueAsDate = new Date();
    selectedProduct = null;
    clearProductSelection();

    showStatus('Phiên làm việc đã kết thúc thành công! Dữ liệu đã được xóa sạch.');
    updateSessionStatus();
}

// (*** MỚI ***) HÀM HIỂN THỊ QUÝ TÀI CHÍNH
/**
 * Cập nhật hiển thị Quý và Năm Tài chính dựa trên ngày giờ của máy
 */
function updateFinancialQuarter() {
    const displayEl = document.getElementById('financial-quarter-display');
    if (!displayEl) {
        console.warn('Element #financial-quarter-display not found.');
        return; 
    }

    // 1. Lấy ngày giờ hiện tại của máy tính
    const now = new Date();
    const month = now.getMonth(); // 0 = Tháng 1, 1 = Tháng 2, ..., 11 = Tháng 12
    const year = now.getFullYear();
    
    // 2. Tính toán Quý (theo lịch Việt Nam)
    // Math.floor(month / 3) + 1
    // - Tháng 0, 1, 2 (Q1) -> Math.floor(0.x) + 1 = 1
    // - Tháng 3, 4, 5 (Q2) -> Math.floor(1.x) + 1 = 2
    // - Tháng 6, 7, 8 (Q3) -> Math.floor(2.x) + 1 = 3
    // - Tháng 9, 10, 11 (Q4) -> Math.floor(3.x) + 1 = 4
    const quarter = Math.floor(month / 3) + 1;
    
    // 3. Tạo chuỗi hiển thị
    const displayText = `Quý ${quarter}, ${year}`;
    
    // 4. Cập nhật HTML
    displayEl.textContent = displayText;
}

// --- 4. TÌM KIẾM & THÊM SẢN PHẨM VÀO GIỎ (ĐÃ NÂNG CẤP) ---
function handleAddProduct(e) {
    e.preventDefault(); 
    
    // Lấy giá trị input ngay lập tức
    const searchInput = document.getElementById('product-search');
    const rawInput = searchInput.value || '';
    
    // --- 1. BYPASS MODE LOGIC (Giữ nguyên) ---
    if (devBypassMode && !selectedProduct) {
        const name = rawInput.trim();
        const quantity = parseFloat(document.getElementById('product-quantity').value);
        
        if (!name || !quantity || quantity <= 0) {
            return showStatus('Bypass Mode: Vui lòng nhập Tên SP và Số Lượng hợp lệ!', true);
        }
        
        const unit = document.getElementById('product-unit').value.trim() || 'Cái';
        const price = parseFloat(document.getElementById('product-price').value) || 0;

        const dummyProduct = { 
            name: name, unit: unit, price: price, quantity: quantity 
        };

        const existingCartItem = currentCart.find(item => item.name === name);
        if (existingCartItem) {
            existingCartItem.quantity += quantity;
            existingCartItem.unit = unit;
            existingCartItem.price = price;
        } else {
            currentCart.push(dummyProduct);
        }
        
        renderCart();
        searchInput.value = '';
        document.getElementById('product-quantity').value = '';
        document.getElementById('product-unit').value = '';
        document.getElementById('product-price').value = '';
        clearProductSelection();
        searchInput.focus();
        showStatus(`Bypass Mode: Đã thêm/cập nhật "${name}" vào giỏ hàng.`, false);
        return;
    }

    // --- 2. "LET IT SLIDE" LOGIC (TỰ ĐỘNG KHỚP THÔNG MINH) ---
    // Hàm hỗ trợ chuẩn hóa chuỗi: Chữ thường + Unicode chuẩn + Xóa khoảng trắng thừa
    const normalizeStr = (str) => {
        if (!str) return '';
        return str
            .toString()
            .normalize('NFC')       // Chuẩn hóa Unicode
            .toLowerCase()          // Về chữ thường
            .replace(/\s+/g, ' ')   // Biến nhiều dấu cách thành 1 dấu cách (VD: "A   B" -> "A B")
            .trim();                // Cắt đầu đuôi
    };

    if (!selectedProduct && rawInput.length > 0) {
        const cleanInput = normalizeStr(rawInput);
        
        // Debug: In ra console để kiểm tra (Nhấn F12 để xem nếu vẫn lỗi)
        console.log(`[AutoMatch] Đang tìm: "${cleanInput}"`);

        // Tìm trong CSDL
        const matchedProduct = productDatabase.find(p => {
            const cleanName = normalizeStr(p.name);
            return cleanName === cleanInput;
        });

        if (matchedProduct) {
            console.log("[AutoMatch] Đã tìm thấy:", matchedProduct.name);
            selectedProduct = matchedProduct;
            
            // Cập nhật lại giao diện cho khớp
            searchInput.value = matchedProduct.name;
            searchInput.classList.add('input-selected');
            document.getElementById('product-search-results').innerHTML = '';
        } else {
            console.log("[AutoMatch] Không tìm thấy khớp chính xác.");
        }
    }

    // --- 3. KIỂM TRA LỖI ---
    if (!selectedProduct) {
        return showStatus('Vui lòng chọn một sản phẩm từ danh sách!', true);
    }

    // --- 4. THÊM VÀO GIỎ (Logic cũ) ---
    const name = selectedProduct.name;
    const quantityInput = document.getElementById('product-quantity');
    const quantity = parseFloat(quantityInput.value);

    // Nếu Autofill chỉ điền tên mà chưa điền số lượng -> Focus vào ô số lượng
    if (!quantity || quantity <= 0) {
        quantityInput.focus();
        return showStatus(`Đã chọn "${name}". Vui lòng nhập số lượng!`, false);
    }
    
    const product = selectedProduct; 
    
    const doAdd = () => {
        const existingCartItem = currentCart.find(item => item.name === name);
        if (existingCartItem) {
            existingCartItem.quantity += quantity;
        } else {
            currentCart.push({ 
                name: product.name, unit: product.unit, price: product.price, 
                quantity: quantity 
            });
        }
        
        renderCart();
        document.getElementById('add-product-form').reset();
        clearProductSelection(); 
        document.getElementById('product-search').focus();
    };
    
    if (quantity > product.stock) {
        showConfirmModal(
            'Cảnh báo Tồn Kho',
            `Sản phẩm "${name}" chỉ còn ${product.stock}. Bạn có chắc chắn muốn bán lố không?`,
            doAdd, 
            'btn-warning'
        );
    } else {
        doAdd(); 
    }
}

function renderCart() {
    const cartBody = document.getElementById('cart-body');
    cartBody.innerHTML = '';
    // (*** SỬA ***) Chỉ cần 1 total
    let totalAmount = 0;
    
    if (currentCart.length === 0) {
        // (*** SỬA ***) Cập nhật colspan
        cartBody.innerHTML = '<tr><td colspan="7" class="text-center italic text-slate-500 dark:text-slate-400 py-6" data-label="">Giỏ hàng đang trống</td></tr>';
    }
    
    currentCart.forEach((item, index) => {
        // (*** SỬA ***) Tính toán đơn giản
        const thanhTien = item.price * item.quantity;
        totalAmount += thanhTien;
        
        const row = cartBody.insertRow();
        
        // (*** MỚI ***) Thay thế cột Số lượng bằng ô điều khiển
        const quantityControlHtml = `
            <div class="flex items-center justify-center space-x-1">
                <button class="btn-quantity-control" onclick="updateQuantity(${index}, -1)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg>
                </button>
                <input type="number" 
                       value="${item.quantity}" 
                       min="1" 
                       class="input-base input-quantity-cart"
                       onchange="handleQuantityInput(${index}, this.value)"
                       onkeyup="handleQuantityInput(${index}, this.value)"
                       inputmode="numeric"
                       pattern="[0-9]*"
                       >
                <button class="btn-quantity-control" onclick="updateQuantity(${index}, 1)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        `;

        // (*** SỬA ***) Cập nhật HTML (bỏ 3 cột thuế)
        row.innerHTML = `<td data-label="STT">${index + 1}</td>
                         <td data-label="Tên hàng hóa" class="font-medium">${item.name}</td>
                         <td data-label="ĐVT">${item.unit}</td>
                         <td data-label="Số lượng" class="font-medium">${quantityControlHtml}</td> 
                         <td data-label="Đơn giá">${currencyFormatter.format(item.price)}</td>
                         <td data-label="Thành tiền" class="font-bold">${currencyFormatter.format(thanhTien)}</td>
                         <td class="cell-action">
                            <button class="btn-secondary !bg-red-50 !text-red-600 dark:!bg-red-900/50 dark:!text-red-400 hover:!bg-red-100 w-full md:w-auto !py-2 !px-3 !text-sm" onclick="removeCartItem(${index})">
                                Xóa
                            </button>
                         </td>`;
    });
    
    // (*** SỬA ***) Xóa total pre-tax
    // document.getElementById('cart-total-pretax').textContent = `Tổng cộng (Chưa thuế): ${currencyFormatter.format(totalPreTax)}`;
    document.getElementById('cart-total-posttax').textContent = `Tổng cộng: ${currencyFormatter.format(totalAmount)}`;
}

// (*** MỚI ***) Hàm cập nhật số lượng khi nhấn nút +/-
function updateQuantity(index, delta) {
    if (index >= currentCart.length) return;
    
    const currentItem = currentCart[index];
    const newQuantity = currentItem.quantity + delta;

    if (newQuantity < 1) {
        // Hỏi người dùng nếu muốn xóa khi số lượng về 0 hoặc âm
        showConfirmModal(
            'Xóa sản phẩm?',
            `Bạn có chắc muốn xóa sản phẩm "${currentItem.name}" khỏi giỏ hàng?`,
            () => removeCartItem(index),
            'btn-danger'
        );
        return;
    }
    
    // Kiểm tra tồn kho (chỉ khi không phải Bypass Mode)
    if (!devBypassMode) {
        const dbProduct = productDatabase.find(p => p.name === currentItem.name);
        if (dbProduct && newQuantity > dbProduct.stock) {
            // Cảnh báo nhưng cho phép bán lố
            showConfirmModal(
                'Cảnh báo Tồn Kho',
                `Sản phẩm "${currentItem.name}" chỉ còn ${dbProduct.stock}. Bạn có chắc chắn muốn bán lố ${newQuantity} không?`,
                () => {
                    currentItem.quantity = newQuantity;
                    renderCart();
                    showStatus(`Cập nhật số lượng cho "${currentItem.name}" (Bán lố).`);
                },
                'btn-warning'
            );
            return;
        }
    }
    
    currentItem.quantity = newQuantity;
    renderCart();
}

// (*** MỚI ***) Hàm cập nhật số lượng khi nhập vào ô input
function handleQuantityInput(index, value) {
    if (index >= currentCart.length) return;

    let newQuantity = parseFloat(value);
    
    // Xử lý giá trị nhập vào
    if (isNaN(newQuantity) || newQuantity <= 0) {
        // Không thể để giá trị NaN hoặc <= 0, hỏi xóa hoặc reset về 1
        showConfirmModal(
            'Số lượng không hợp lệ',
            `Số lượng nhập vào không hợp lệ. Bạn có muốn xóa sản phẩm "${currentCart[index].name}" khỏi giỏ hàng không?`,
            () => removeCartItem(index),
            'btn-danger'
        );
        // Ngăn chặn renderCart() ngay lập tức để người dùng xem thông báo
        return;
    }
    
    newQuantity = Math.round(newQuantity); // Làm tròn số lượng

    const currentItem = currentCart[index];
    
    // Kiểm tra tồn kho (chỉ khi không phải Bypass Mode)
    if (!devBypassMode) {
        const dbProduct = productDatabase.find(p => p.name === currentItem.name);
        if (dbProduct && newQuantity > dbProduct.stock) {
            // Cảnh báo nhưng cho phép bán lố
            showConfirmModal(
                'Cảnh báo Tồn Kho',
                `Sản phẩm "${currentItem.name}" chỉ còn ${dbProduct.stock}. Bạn có chắc chắn muốn bán lố ${newQuantity} không?`,
                () => {
                    currentItem.quantity = newQuantity;
                    renderCart();
                    showStatus(`Cập nhật số lượng cho "${currentItem.name}" (Bán lố).`);
                },
                'btn-warning'
            );
            return;
        }
    }
    
    currentItem.quantity = newQuantity;
    renderCart();
}

function removeCartItem(index) { 
    currentCart.splice(index, 1); 
    renderCart(); 
}

function clearCart(confirmNeeded = true) {
    if (currentCart.length === 0) return; 

    const doClear = () => {
        currentCart = [];
        document.getElementById('customer-info-form').reset();
        document.getElementById('invoice-date').valueAsDate = new Date();
        document.getElementById('save-invoice-only-check').checked = false; // (*** MỚI ***)
        
        // (*** SỬA ***) Reset form bypass (bỏ thuế)
        document.getElementById('product-unit').value = '';
        document.getElementById('product-price').value = '';
        
        renderCart();
        if (confirmNeeded) {
            showStatus('Đã xóa giỏ hàng, sẵn sàng cho đơn mới.', false);
        }
    };

    if (confirmNeeded) {
        // (SỬA) Dùng modal xác nhận
        showConfirmModal(
            'Xóa giỏ hàng?',
            'Bạn có chắc muốn xóa giỏ hàng và thông tin khách hàng hiện tại?',
            doClear
        );
    } else {
        doClear();
    }
}

// --- 5. XUẤT FILE EXCEL (HÓA ĐƠN & BÁO CÁO) ---
function exportInvoiceFile() {
    if (currentCart.length === 0) return showStatus('Giỏ hàng đang trống!', true);
    const customerInfo = getCustomerInfo();
    if (!customerInfo.name || !customerInfo.date) return showStatus('Vui lòng nhập Tên Khách Hàng và Ngày Hóa Đơn!', true);
    
    // (*** MỚI ***) Xác định loại hóa đơn (Trong CSDL, Ngoài CSDL, Hỗn hợp)
    let hasDbProduct = false;
    let hasBypassProduct = false;
    const dbProductNames = new Set(productDatabaseOriginal.map(p => p.name));
    
    for (const item of currentCart) {
        if (dbProductNames.has(item.name)) {
            hasDbProduct = true;
        } else {
            hasBypassProduct = true;
        }
    }
    
    let invoiceType = '';
    if (hasDbProduct && hasBypassProduct) {
        invoiceType = 'Hỗn hợp';
    } else if (hasBypassProduct) {
        invoiceType = 'Ngoài CSDL';
    } else {
        invoiceType = 'Trong CSDL';
    }
    // --- Kết thúc logic xác định loại
    
    
    const transaction = {
        customerInfo: customerInfo,
        items: JSON.parse(JSON.stringify(currentCart)) // Deep copy
    };
    dailyTransactions.push(transaction);

    const dataForExport = buildFlatInvoiceData([transaction]); // Dùng hàm phẳng
    
    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HoaDon');
    const fileName = `HoaDon_${customerInfo.name.replace(/ /g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
    
    // (*** SỬA ***) Lưu vào log để tải lại, TRƯỚC KHI gọi writeFile
    try {
        const exportLogEntry = {
            id: Date.now(),
            customerName: customerInfo.name,
            fileName: fileName,
            timestamp: new Date().toISOString(),
            dataForExport: dataForExport, // Store the data
            worksheetName: 'HoaDon',
            invoiceType: invoiceType // (*** MỚI ***) Thêm loại hóa đơn
        };
        exportedInvoicesLog.push(exportLogEntry);
        localStorage.setItem('exportedInvoicesLog', JSON.stringify(exportedInvoicesLog));
    } catch (e) {
        console.error("Lỗi khi lưu log hóa đơn:", e);
        // Không chặn việc xuất file, chỉ log lỗi
        console.warn("Đã xuất hóa đơn, nhưng có lỗi khi lưu vào log phiên.");
    }

    // (*** SỬA ***) Kiểm tra checkbox "Chỉ lưu"
    const saveOnly = document.getElementById('save-invoice-only-check').checked;
    if (!saveOnly) {
        XLSX.writeFile(workbook, fileName);
    }

    // (*** SỬA ***) Chỉ cập nhật tồn kho cho các sản phẩm "Trong CSDL"
    let inventoryUpdated = false;
    currentCart.forEach(item => {
        if (dbProductNames.has(item.name)) { // Chỉ update nếu là hàng CSDL
            updateInventory(item.name, item.quantity);
            inventoryUpdated = true;
        }
    });
    
    // (*** SỬA ***) Cập nhật thông báo
    let successMessage = '';
    const actionWord = saveOnly ? 'lưu' : 'xuất';
    if (inventoryUpdated) {
        successMessage = `Đã ${actionWord} hóa đơn "${fileName}" và cập nhật tồn kho (hàng CSDL). Giao dịch đã được lưu lại.`;
    } else {
        successMessage = `Đã ${actionWord} hóa đơn (ngoài CSDL) "${fileName}". Tồn kho KHÔNG thay đổi. Giao dịch đã được lưu lại.`;
    }
    showStatus(successMessage, false);


    clearCart(false); // Sẽ tự động reset checkbox
    updateSessionStatus(); // Sẽ tự động gọi updateExportedInvoicesButtonState VÀ updateLiveTotalAccumulated
}

function exportDailySalesReport() {
    if (dailyTransactions.length === 0) {
        // (*** SỬA ***)
        showStatus('Không có giao dịch nào được ghi nhận để xuất báo cáo.', false);
        return;
    }

    const dataForExport = buildFlatInvoiceData(dailyTransactions); // Dùng hàm phẳng
    
    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TongHopBanHang');
    const fileName = `BaoCao_BanHang_TongHop_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showStatus(`Đã xuất báo cáo bán hàng tổng hợp: "${fileName}"`);
}


// (*** SỬA ***) Cập nhật báo cáo tồn kho
function exportInventory() {
    if (productDatabaseOriginal.length === 0 && dailyTransactions.length === 0) {
        // (*** SỬA ***)
        return showStatus('Chưa có dữ liệu tồn kho hoặc giao dịch nào.', false);
    }
    
    // (*** MỚI ***) Thêm cột "Ghi chú"
    const inventoryData = [['Tên hàng hoá/dịch vụ', 'ĐVT', 'Tồn đầu ngày', 'Đã bán', 'Tồn cuối ngày', 'Ghi chú']];
    
    // 1. Xử lý hàng trong CSDL
    const dbProductNames = new Set();
    productDatabaseOriginal.forEach(originalProduct => {
        dbProductNames.add(originalProduct.name); // Thêm vào Set
        const currentProduct = productDatabase.find(p => p.name === originalProduct.name);
        const originalStock = originalProduct.stock;
        const currentStock = currentProduct ? currentProduct.stock : originalStock;
        inventoryData.push([
            originalProduct.name, originalProduct.unit, originalStock,
            originalStock - currentStock, currentStock,
            '' // Ghi chú trống
        ]);
    });
    
    // 2. (*** MỚI ***) Xử lý hàng "Ngoài CSDL" (Bypass)
    const bypassSales = new Map();
    dailyTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
            if (!dbProductNames.has(item.name)) { // Nếu không có trong CSDL
                let entry = bypassSales.get(item.name) || { unit: item.unit, totalSold: 0 };
                entry.totalSold += item.quantity;
                bypassSales.set(item.name, entry);
            }
        });
    });
    
    // Thêm hàng bypass vào báo cáo
    bypassSales.forEach((data, name) => {
        inventoryData.push([
            name, 
            data.unit, 
            0, // Tồn đầu
            data.totalSold, // Đã bán
            -data.totalSold, // Tồn cuối (âm)
            'Xuất ngoài CSDL' // Ghi chú
        ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(inventoryData);
    // (*** SỬA ***) Thêm độ rộng cột Ghi chú
    worksheet['!cols'] = [{ wch: 60 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TonKho');
    const fileName = `BaoCao_TonKho_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showStatus(`Đã xuất báo cáo tồn kho: "${fileName}"`);
}

// --- TÁI CẤU TRÚC: CÁC HÀM HELPER ---
function getCustomerInfo() {
    return {
        name: document.getElementById('customer-name').value,
        buyerName: document.getElementById('customer-buyer-name').value || document.getElementById('customer-name').value,
        address: document.getElementById('customer-address').value,
        tin: document.getElementById('customer-tin').value,
        email: document.getElementById('customer-email').value,
        paymentMethod: document.getElementById('customer-payment-method').value,
        mdvcqhns: document.getElementById('customer-mdvcqhns').value,
        cccd: document.getElementById('customer-cccd').value,
        passport: document.getElementById('customer-passport').value,
        date: document.getElementById('invoice-date').value // This returns 'yyyy-mm-dd'
    };
}

function updateInventory(productName, soldQuantity) {
    const product = productDatabase.find(p => p.name === productName);
    if (product) product.stock -= soldQuantity;
}

/**
 * Xây dựng dữ liệu Hóa đơn phẳng (theo yêu cầu A-M)
 * (SỬA ĐỔI) - Logic gộp STT cho nhiều sản phẩm
 * (*** SỬA - 2025-10-29 ***) - Áp dụng Math.round() cho giá trị tiền tệ
 * (*** SỬA - 2025-10-31 ***) - Đơn giản hóa biến (không còn pre-tax)
 */
function buildFlatInvoiceData(transactions) {
    const data = [[
        'Số thứ tự', 'Ngày hóa đơn', 'Tên khách hàng', 'Địa chỉ', 'Mã số thuế', 'Người mua hàng', 'Email', 
        'Hình thức thanh toán', 'Tên hàng hóa/dịch vụ', 'Đơn vị tính', 'Số lượng', 'Đơn giá', 'Thành tiền'
    ]];

    let sttCounter = 0; // Tăng mỗi giao dịch
    transactions.forEach(transaction => {
        sttCounter++; // STT cho giao dịch này
        const { customerInfo, items } = transaction;

        items.forEach((item, itemIndex) => { // Lấy chỉ số của sản phẩm
            const thanhTien = item.quantity * item.price; // Tính toán trên giá trị gốc
            
            // (*** SỬA ***) Áp dụng làm tròn theo yêu cầu (0 decimal places)
            const roundedPrice = Math.round(item.price);
            const roundedThanhTien = Math.round(thanhTien);
            
            let row;

            if (itemIndex === 0) {
                // Sản phẩm ĐẦU TIÊN của giao dịch
                row = [
                    sttCounter,                 // A: Số thứ tự
                    formatDateDDMMYYYY(customerInfo.date), // B: Ngày hóa đơn (SỬA)
                    customerInfo.name,          // C: Tên khách hàng
                    customerInfo.address,       // D: Địa chỉ
                    customerInfo.tin,           // E: Mã số thuế
                    customerInfo.buyerName,     // F: Người mua hàng
                    customerInfo.email,         // G: Email
                    customerInfo.paymentMethod, // H: Hình thức thanh toán
                    item.name,                  // I: Tên hàng hóa/dịch vụ
                    item.unit,                  // J: Đơn vị tính
                    item.quantity,              // K: Số lượng
                    roundedPrice,               // L: Đơn giá (ĐÃ LÀM TRÒN)
                    roundedThanhTien            // M: Thành tiền (ĐÃ LÀM TRÒN)
                ];
            } else {
                // Sản phẩm THỨ HAI TRỞ ĐI của cùng giao dịch
                row = [
                    sttCounter,                 // A: Số thứ tự (GIỮ NGUYÊN)
                    '',                         // B: (Trống)
                    '',                         // C: (Trống)
                    '',                         // D: (Trống)
                    '',                         // E: (Trống)
                    '',                         // F: (Trống)
                    '',                         // G: (Trống)
                    '',                         // H: (Trống)
                    item.name,                  // I: Tên hàng hóa/dịch vụ
                    item.unit,                  // J: Đơn vị tính
                    item.quantity,              // K: Số lượng
                    roundedPrice,               // L: Đơn giá (ĐÃ LÀM TRÒN)
                    roundedThanhTien            // M: Thành tiền (ĐÃ LÀM TRÒN)
                ];
            }
            data.push(row);
        });
    });
    return data;
}

// --- (MỚI) Đồng hồ (Tách ra) ---
/**
 * Helper function: Formats a Date object into DD/MM/YYYY string.
 * Can optionally format for a specific timezone.
 * (This was missing from your snippet, so I've added it)
 */
function formatClockDate(date, timeZone) {
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        timeZone: timeZone // If undefined, uses user's local timezone
    };
    return new Intl.DateTimeFormat('vi-VN', options).format(date);
}

/**
 * Main function to start and update the clocks.
 * This REPLACES your existing startClock function.
 */
function startClock() {
    // Get elements for Vietnam time
    const vnContainer = document.getElementById('session-time-container');
    const vnLabel = document.getElementById('vietnam-clock-label');
    const vnTimeEl = document.getElementById('current-time-display');
    const vnDateEl = document.getElementById('current-date-display');

    // Get elements for Local time
    const localContainer = document.getElementById('local-time-container');
    const localTimeEl = document.getElementById('local-time-display');
    const localDateEl = document.getElementById('local-date-display');

    // Validate elements
    if (!vnContainer || !vnLabel || !vnTimeEl || !vnDateEl || !localContainer || !localTimeEl || !localDateEl) {
        console.error("Clock elements missing.");
        return;
    }

    // TIMEZONE CHECK
    const userTimezoneOffset = new Date().getTimezoneOffset();
    const isGMT7 = userTimezoneOffset === -420; // GMT+7 is -420 minutes

    // TIME FORMATTERS
    const vnTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });

    const localTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });

    // CONFIGURE UI
    if (isGMT7) {
        // User is in Vietnam timezone → show only VN section
        vnLabel.textContent = "Giờ hiện tại";
        vnContainer.style.display = 'block';
        localContainer.style.display = 'none';
    } else {
        // Different timezone → show both sections
        vnLabel.textContent = "Giờ Việt Nam (GMT +7)";
        vnContainer.style.display = 'block';
        localContainer.style.display = 'block';
    }

    // UPDATE FUNCTION
    function updateClock() {
        const now = new Date();

        if (isGMT7) {
            // Vietnam clock only (local time same as VN)
            vnTimeEl.textContent = localTimeFormatter.format(now);
            vnDateEl.textContent = formatClockDate(now); // <--- CHANGED HERE
        } else {
            // Vietnam clock (converted)
            vnTimeEl.textContent = vnTimeFormatter.format(now);
            vnDateEl.textContent = formatClockDate(now, 'Asia/Ho_Chi_Minh'); // <--- CHANGED HERE

            // Local clock
            localTimeEl.textContent = localTimeFormatter.format(now);
            localDateEl.textContent = formatClockDate(now); // <--- CHANGED HERE
        }
    }

    updateClock();
    setInterval(updateClock, 1000);
}



// --- CÁC HÀM NÂNG CAO (DEVELOPER) ---
function showAdvancedModal() {
    document.getElementById('advanced-modal').classList.remove('hidden');
}
function hideAdvancedModal() {
    document.getElementById('advanced-modal').classList.add('hidden');
}

// --- (*** SỬA ***) QUẢN LÝ MODAL HÓA ĐƠN ĐÃ XUẤT ---
function setupExportedInvoicesModal() {
    exportedInvoicesModal = document.getElementById('exported-invoices-modal');
    exportedInvoicesList = document.getElementById('exported-invoices-list');
    
    document.getElementById('view-exports-btn').addEventListener('click', showExportedInvoicesModal);
    document.getElementById('modal-close-btn-exports').addEventListener('click', hideExportedInvoicesModal);
    document.getElementById('modal-overlay-bg-exports').addEventListener('click', hideExportedInvoicesModal);
}

// (*** MỚI ***) QUẢN LÝ MODAL THÔNG TIN ---
function setupInfoModal() {
    if (!infoModal) return;
    document.getElementById('info-mode-btn').addEventListener('click', showInfoModal);
    document.getElementById('modal-close-btn-info').addEventListener('click', hideInfoModal);
    document.getElementById('modal-overlay-bg-info').addEventListener('click', hideInfoModal);
}

function showInfoModal() {
    if (infoModal) infoModal.classList.remove('hidden');
}

function hideInfoModal() {
    if (infoModal) infoModal.classList.add('hidden');
}

// (*** MỚI ***) QUẢN LÝ MODAL KẾT THÚC PHIÊN ---
function setupEndSessionModal() {
    if (!endSessionModal) return;
    
    // (SỬA) Gán sự kiện cho các nút mới
    endSessionModalCancelBtn.addEventListener('click', hideEndSessionModal);
    endSessionDownloadSalesBtn.addEventListener('click', handleModalDownloadSales);
    endSessionDownloadInventoryBtn.addEventListener('click', handleModalDownloadInventory);
    endSessionModalConfirmBtn.addEventListener('click', handleModalConfirmEnd);
}

function handleModalDownloadSales() {
    if (dailyTransactions.length > 0) {
        exportDailySalesReport(); // Gọi hàm global
        // Tùy chọn: Vô hiệu hóa nút sau khi nhấp
        endSessionDownloadSalesBtn.disabled = true;
        endSessionDownloadSalesBtn.textContent = 'Đã tải Báo Cáo Bán Hàng';
    } else {
        showStatus('Không có dữ liệu bán hàng để xuất.', false);
    }
}

function handleModalDownloadInventory() {
    if (productDatabaseOriginal.length > 0 || dailyTransactions.length > 0) {
        exportInventory(); // Gọi hàm global
        // Tùy chọn: Vô hiệu hóa nút sau khi nhấp
        endSessionDownloadInventoryBtn.disabled = true;
        endSessionDownloadInventoryBtn.textContent = 'Đã tải Báo Cáo Tồn Kho';
    } else {
        showStatus('Không có dữ liệu tồn kho để xuất.', false);
    }
}

function handleModalConfirmEnd() {
    hideEndSessionModal(); // Ẩn modal chọn file
    
    // Hiển thị modal xác nhận CUỐI CÙNG (hộp thoại màu đỏ)
    // Đây là logic cũ từ hàm handleEndSessionContinue()
    showConfirmModal(
        'Xác nhận XÓA DỮ LIỆU?',
        'Tất cả dữ liệu phiên (CSDL, Giao dịch, Log Hóa đơn) sẽ bị XÓA SẠCH. Đây là thao tác KHÔNG THỂ HỒI PHỤC. Bạn có chắc chắn muốn kết thúc?',
        performDataDeletion // Callback là hàm xóa dữ liệu
    );
}

function showEndSessionModal() {
    if (!endSessionModal) return;

    // (SỬA) Logic để BẬT/TẮT các nút TẢI XUỐNG
    const hasSalesData = dailyTransactions.length > 0;
    endSessionDownloadSalesBtn.disabled = !hasSalesData;
    
    const hasInventoryData = productDatabaseOriginal.length > 0 || dailyTransactions.length > 0;
    endSessionDownloadInventoryBtn.disabled = !hasInventoryData;
    
    // Nút Kết thúc & Xóa luôn luôn được bật
    endSessionModalConfirmBtn.disabled = false;

    endSessionModal.classList.remove('hidden');
}

function hideEndSessionModal() {
    if (endSessionModal) endSessionModal.classList.add('hidden');
}

// (*** MỚI ***) QUẢN LÝ MODAL XEM CSDL ---
function setupDatabaseViewerModal() {
    if (!databaseViewerModal) return;
    document.getElementById('view-database-btn').addEventListener('click', showDatabaseViewerModal);
    document.getElementById('modal-close-btn-db').addEventListener('click', hideDatabaseViewerModal);
    document.getElementById('modal-overlay-bg-db').addEventListener('click', hideDatabaseViewerModal);
    dbModalSearchInput.addEventListener('keyup', renderDatabaseViewerList);
}

function showDatabaseViewerModal() {
    if (!databaseViewerModal) return;
    renderDatabaseViewerList(); // Render với search query rỗng
    databaseViewerModal.classList.remove('hidden');
    dbModalSearchInput.focus();
}

function hideDatabaseViewerModal() {
    if (databaseViewerModal) {
        databaseViewerModal.classList.add('hidden');
        dbModalSearchInput.value = ''; // Xóa search query khi đóng
    }
}

function renderDatabaseViewerList() {
    if (!databaseViewerList) return;
    
    const query = dbModalSearchInput.value.toLowerCase();
    const filteredDB = productDatabase.filter(p => p.name.toLowerCase().includes(query));
    
    databaseViewerList.innerHTML = ''; // Xóa nội dung cũ
    
    if (filteredDB.length === 0) {
        const message = productDatabase.length === 0 
            ? 'Cơ sở dữ liệu trống.' 
            : 'Không tìm thấy sản phẩm nào khớp.';
        // (*** SỬA ***) Cập nhật colspan
        databaseViewerList.innerHTML = `<tr><td colspan="5" class="text-center italic text-slate-500 dark:text-slate-400 py-6">${message}</td></tr>`;
        return;
    }
    
    filteredDB.forEach((product, index) => {
        const row = databaseViewerList.insertRow();
        // (*** SỬA ***) Cập nhật HTML (bỏ thuế)
        row.innerHTML = `
            <td class="!p-2 text-center">${index + 1}</td>
            <td class="!p-2 font-medium">${product.name}</td>
            <td class="!p-2">${product.unit}</td>
            <td class="!p-2 text-right">${currencyFormatter.format(product.price)}</td>
            <td class="!p-2 text-right font-medium">${product.stock}</td>
        `;
    });
}


function showExportedInvoicesModal() {
    exportedInvoicesList.innerHTML = ''; // Xóa nội dung cũ
    
    if (exportedInvoicesLog.length === 0) {
        // (*** SỬA ***) Cập nhật colspan
        exportedInvoicesList.innerHTML = '<tr><td colspan="5" class="text-center italic text-slate-500 dark:text-slate-400 py-6" data-label="">Chưa có hóa đơn nào được xuất trong phiên này.</td></tr>';
    } else {
        // Hiển thị từ mới nhất đến cũ nhất
        exportedInvoicesLog.slice().reverse().forEach(logEntry => {
            const row = exportedInvoicesList.insertRow();
            // (*** SỬA ***) Thêm cột "Loại"
            row.innerHTML = `
                <td data-label="Khách hàng" class="font-medium">${logEntry.customerName}</td>
                <td data-label="Thời gian">${new Date(logEntry.timestamp).toLocaleString('vi-VN')}</td>
                <td data-label="Tên file" class="text-sm italic">${logEntry.fileName}</td>
                <td data-label="Loại" class="font-medium">${logEntry.invoiceType || 'Trong CSDL'}</td> <td class="cell-action text-center">
                    <button class="btn-primary !py-1.5 !px-3 !text-sm w-full" onclick="reExportInvoice(${logEntry.id})">
                        Tải lại
                    </button>
                </td>
            `;
        });
    }
    exportedInvoicesModal.classList.remove('hidden');
}

function hideExportedInvoicesModal() {
    exportedInvoicesModal.classList.add('hidden');
}

function reExportInvoice(id) {
    const logEntry = exportedInvoicesLog.find(log => log.id === id);
    if (!logEntry) { 
        return showStatus('Lỗi: Không tìm thấy hóa đơn để tải lại!', true); 
    }
    
    try {
        const worksheet = XLSX.utils.aoa_to_sheet(logEntry.dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, logEntry.worksheetName || 'HoaDon');
        XLSX.writeFile(workbook, logEntry.fileName);
        showStatus(`Đã tải lại: ${logEntry.fileName}`, false);
    } catch (e) {
        console.error("Lỗi khi tải lại hóa đơn:", e);
        showStatus(`Lỗi khi tải lại: ${e.message}`, true);
    }
}


// (*** SỬA ***) Cập nhật logic Bật/Tắt Bypass Mode
function toggleBypassMode() {
    devBypassMode = !devBypassMode;
    const bypassDiv = document.getElementById('bypass-inputs');
    
    updateBypassButtonState(); // Cập nhật trạng thái nút
    
    if (devBypassMode) {
        bypassDiv.classList.remove('hidden'); 
        showStatus('Chế độ Bypass CSDL đã BẬT. Giờ bạn có thể thêm sản phẩm thủ công.', false);
    } else {
        bypassDiv.classList.add('hidden'); 
        showStatus('Chế độ Bypass CSDL đã TẮT.', false);
    }
    // (*** MỚI ***) Lưu trạng thái mới vào localStorage
    saveStateToStorage();
    
    updateSessionStatus();
    handleProductSearch(); 
}

function exportEmptyInvoice() {
    const dataForExport = buildFlatInvoiceData([]); 
    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HoaDon_Trong');
    XLSX.writeFile(workbook, 'Template_HoaDon_Trong.xlsx');
    showStatus('Đã xuất template Hóa Đơn (trống) - định dạng phẳng A-M.', false);
    hideAdvancedModal();
}

function exportEmptySalesReport() {
    const dataForExport = buildFlatInvoiceData([]); // (SỬA) Dùng hàm phẳng
    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TongHopBanHang_Trong');
    XLSX.writeFile(workbook, 'Template_BaoCao_BanHang_TongHop_Trong.xlsx');
    showStatus('Đã xuất template Báo Cáo Bán Hàng (trống) - định dạng phẳng A-M.', false); // (SỬA)
    hideAdvancedModal();
}

// (*** SỬA ***) Cập nhật template tồn kho
function exportEmptyInventory() {
    const inventoryData = [['Tên hàng hoá/dịch vụ', 'ĐVT', 'Tồn đầu ngày', 'Đã bán', 'Tồn cuối ngày', 'Ghi chú']];
    const worksheet = XLSX.utils.aoa_to_sheet(inventoryData);
    worksheet['!cols'] = [{ wch: 60 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TonKho_Trong');
    XLSX.writeFile(workbook, 'Template_BaoCao_TonKho_Trong.xlsx');
    showStatus('Đã xuất template Báo Cáo Tồn Kho (trống).', false);
    hideAdvancedModal();
}

// --- (*** SỬA ***) CÁC HÀM BACKUP & RESTORE
/**
 * Xuất toàn bộ session (inventory state & logs) ra file JSON.
 * (Đã sửa để sao lưu toàn bộ trạng thái cần thiết)
 */
function handleBackupSession() {
    try {
        const inventoryState = localStorage.getItem('inventoryState');
        const exportedInvoicesLog = localStorage.getItem('exportedInvoicesLog');
        
        if (!inventoryState && !exportedInvoicesLog) {
            return showStatus('Không có dữ liệu phiên để backup.', true);
        }

        // Tải toàn bộ state (đã bao gồm devBypass)
        const state = inventoryState ? JSON.parse(inventoryState) : null;
        const logs = exportedInvoicesLog ? JSON.parse(exportedInvoicesLog) : null;
        
        const backupData = {
            // (*** SỬA ***) Đổi tên key để dễ quản lý hơn, và đảm bảo mọi thứ được lưu
            fullSessionData: { 
                productDatabase: state ? state.current : [],
                productDatabaseOriginal: state ? state.original : [],
                dailyTransactions: state ? state.transactions : [],
                devBypassMode: state ? state.devBypass : false,
            },
            exportedInvoicesLog: logs,
            backupMetadata: {
                timestamp: new Date().toISOString(),
                version: "1.6" // Tăng version sau khi update tính năng
            }
        };
        
        const jsonString = JSON.stringify(backupData, null, 2); // Pretty print
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.href = url;
        a.download = `VTNN_ThanhNhan_Backup_${dateStr}_V1_6.json`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('Đã xuất file backup phiên thành công.', false);
        hideAdvancedModal();
    
    } catch (e) {
        console.error('Lỗi khi tạo backup:', e);
        showStatus(`Lỗi khi tạo backup: ${e.message}`, true);
    }
}

/**
 * Xử lý file .json được chọn để khôi phục session.
 * (Đã sửa để khôi phục toàn bộ trạng thái cần thiết)
 */
function handleRestoreSession(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const jsonString = e.target.result;
        
        try {
            const backupData = JSON.parse(jsonString);

            // (*** SỬA ***) Kiểm tra cấu trúc mới (fullSessionData)
            const sessionData = backupData.fullSessionData;
            const logData = backupData.exportedInvoicesLog;
            
            if (sessionData && typeof sessionData.productDatabase !== 'undefined' && typeof sessionData.dailyTransactions !== 'undefined' && typeof logData !== 'undefined') {
                
                // Dùng modal xác nhận
                showConfirmModal(
                    'Xác nhận Khôi Phục Phiên?',
                    'Hành động này sẽ XÓA SẠCH phiên làm việc hiện tại và thay thế bằng dữ liệu từ file. Bạn có chắc chắn muốn tiếp tục?',
                    () => {
                        try {
                            // Tạo lại cấu trúc inventoryState để lưu vào localStorage
                            const newInventoryState = {
                                current: sessionData.productDatabase,
                                original: sessionData.productDatabaseOriginal || [],
                                transactions: sessionData.dailyTransactions,
                                devBypass: sessionData.devBypassMode || false // Lấy trạng thái bypass
                            };

                            localStorage.setItem('inventoryState', JSON.stringify(newInventoryState));
                            
                            // Lưu log hóa đơn
                            if (logData) {
                                localStorage.setItem('exportedInvoicesLog', JSON.stringify(logData));
                            } else {
                                localStorage.removeItem('exportedInvoicesLog');
                            }

                            showStatus('Đã khôi phục phiên thành công! Trang sẽ tự động tải lại...', false);
                            
                            // Tải lại trang để load state mới
                            setTimeout(() => {
                                location.reload();
                            }, 1500);

                        } catch (saveError) {
                            console.error('Lỗi khi lưu state khôi phục:', saveError);
                            showStatus(`Lỗi khi lưu state khôi phục: ${saveError.message}`, true);
                        }
                    },
                    'btn-danger' // Dùng nút đỏ cho hành động nguy hiểm
                );

            } else {
                // (*** SỬA ***) Thêm thông báo nếu cấu trúc file cũ (inventoryState)
                if (backupData.inventoryState) {
                    throw new Error('File backup có vẻ là định dạng cũ. Vui lòng tải file mới nhất hoặc liên hệ hỗ trợ.');
                }
                throw new Error('File backup không hợp lệ hoặc thiếu dữ liệu.');
            }

        } catch (parseError) {
            console.error('Lỗi khi đọc file backup:', parseError);
            showStatus(`Lỗi khi đọc file backup: ${parseError.message}`, true);
        } finally {
            // Reset file input để có thể chọn lại file cũ (nếu fail)
            fileInput.value = '';
            hideAdvancedModal();
        }
    };
    
    reader.onerror = () => {
        showStatus('Không thể đọc file đã chọn.', true);
        fileInput.value = '';
    };
    
    reader.readAsText(file);
}
