// --- BIẾN TOÀN CỤC ---
let productDatabase = []; 
let productDatabaseOriginal = [];
let currentCart = []; 
let dailyTransactions = []; 
let exportedInvoicesLog = []; 
let selectedProduct = null; 
let devBypassMode = false; 

// Biến cho Modal
let confirmModal = null;
let confirmModalConfirmBtn = null;
let confirmModalCancelBtn = null;
let confirmModalTitle = null;
let confirmModalMessage = null;
let onConfirmCallback = () => {}; 

// Biến cho Dark Mode
let themeToggleBtn = null;
let themeIconSun = null;
let themeIconMoon = null;

// Biến cho Modal Hóa đơn đã xuất
let exportedInvoicesModal = null;
let exportedInvoicesList = null;

// Biến cho Modal Kết thúc Phiên
let endSessionModal = null;
let endSessionModalCancelBtn = null; 
let endSessionDownloadSalesBtn = null; 
let endSessionDownloadInventoryBtn = null; 
let endSessionModalConfirmBtn = null; 

// Biến cho Modal Thông tin
let infoModal = null;

// Biến cho Modal Xem CSDL
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

    endSessionModal = document.getElementById('end-session-modal');
    endSessionModalCancelBtn = document.getElementById('end-session-modal-cancel-btn');
    endSessionDownloadSalesBtn = document.getElementById('end-session-download-sales');
    endSessionDownloadInventoryBtn = document.getElementById('end-session-download-inventory');
    endSessionModalConfirmBtn = document.getElementById('end-session-modal-confirm-btn');

    infoModal = document.getElementById('info-modal');
    
    databaseViewerModal = document.getElementById('database-viewer-modal');
    databaseViewerList = document.getElementById('database-viewer-list');
    dbModalSearchInput = document.getElementById('db-modal-search-input');

    // Gán biến Dark Mode
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeIconSun = document.getElementById('theme-icon-sun');
    themeIconMoon = document.getElementById('theme-icon-moon');

    // Khởi tạo
    document.getElementById('invoice-date').valueAsDate = new Date();
    syncTrueDate(); // Tự động lấy ngày chuẩn từ Internet
    loadStateFromStorage(); 
    checkNegativeStock();
    initRetailCustomerCheckbox();
    setupNegativeStockModal();
    setupThemeToggle(); 
    setupExportedInvoicesModal(); 
    setupInfoModal(); 
    setupEndSessionModal(); 
    setupDatabaseViewerModal(); 
    startClock(); 
    updateFinancialQuarter(); 
    updateLiveTotalAccumulated(); 

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            syncTrueDate();
        }
    });

    window.addEventListener('focus', () => {
        syncTrueDate();
    });

    // Gán sự kiện cho các nút
    document.getElementById('load-db-btn').addEventListener('click', handleFileLoad);
    document.getElementById('export-inventory-btn').addEventListener('click', exportInventory);
    document.getElementById('export-sales-report-btn').addEventListener('click', exportDailySalesReport); 
    document.getElementById('end-session-btn').addEventListener('click', startEndSessionProcess); 
    document.getElementById('add-product-form').addEventListener('submit', handleAddProduct);
    document.getElementById('product-search').addEventListener('keyup', handleProductSearch);
    document.getElementById('export-invoice-btn').addEventListener('click', exportInvoiceFile);
    document.getElementById('clear-cart-btn').addEventListener('click', () => clearCart(true)); 
    
    document.getElementById('file-input').addEventListener('change', updateFileNameDisplay);

    document.getElementById('advanced-mode-btn').addEventListener('click', showAdvancedModal);
    document.getElementById('modal-close-btn-adv').addEventListener('click', hideAdvancedModal);
    document.getElementById('modal-overlay-bg-adv').addEventListener('click', hideAdvancedModal);
    
    document.getElementById('dev-bypass-btn').addEventListener('click', toggleBypassMode);
    document.getElementById('export-empty-invoice-btn').addEventListener('click', exportEmptyInvoice);
    document.getElementById('export-empty-sales-btn').addEventListener('click', exportEmptySalesReport);
    document.getElementById('export-empty-inventory-btn').addEventListener('click', exportEmptyInventory);
    
    document.getElementById('backup-session-btn').addEventListener('click', handleBackupSession);
    document.getElementById('restore-file-input').addEventListener('change', handleRestoreSession);

    // Gán sự kiện cho Modal Xác nhận
    confirmModalConfirmBtn.addEventListener('click', () => {
        onConfirmCallback();
        hideConfirmModal();
    });
    confirmModalCancelBtn.addEventListener('click', hideConfirmModal);
});

// --- CÁC HÀM UI CƠ BẢN ---
function showConfirmModal(title, message, onConfirm, confirmBtnClass = 'btn-danger') {
    confirmModalTitle.textContent = title;
    confirmModalMessage.innerHTML = message;
    onConfirmCallback = onConfirm;
    confirmModalConfirmBtn.className = ''; 
    confirmModalConfirmBtn.classList.add('btn-base', confirmBtnClass); 
    confirmModal.classList.remove('hidden');
}

function hideConfirmModal() {
    confirmModal.classList.add('hidden');
    onConfirmCallback = () => {}; 
}

function setupThemeToggle() {
    function updateIcon() {
        if (document.documentElement.classList.contains('dark')) {
            themeIconMoon.classList.add('hidden');
            themeIconSun.classList.remove('hidden');
        } else {
            themeIconSun.classList.add('hidden');
            themeIconMoon.classList.remove('hidden');
        }
    }
    updateIcon(); 
    themeToggleBtn.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        updateIcon(); 
    });
}

function updateFileNameDisplay() {
    const fileInput = document.getElementById('file-input');
    const display = document.getElementById('file-name-display');

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];

        // --- VALIDATION CHECK: MUST START WITH "CSDL" ---
        if (!file.name.startsWith('CSDL')) {
            // 1. Show Error
            showStatus(`Lỗi: Tệp "${file.name}" không hợp lệ! Tên file phải bắt đầu bằng "CSDL".`, true);

            // 2. Clear the invalid input so they can pick again
            fileInput.value = ''; 

            // 3. Reset display text
            display.textContent = 'Chưa chọn tệp nào.';
            display.classList.add('italic');
            return; // Stop here, do not lock the input
        }

        // --- VALID FILE LOGIC ---
        display.textContent = file.name;
        display.classList.remove('italic');

        // Lock the input immediately so they can't change it unless they end the session
        fileInput.disabled = true; 
        
        // Optional: Let them know it's good
        showStatus('Đã chọn tệp hợp lệ. Vui lòng nhấn "Bắt đầu phiên".', false);

    } else {
        display.textContent = 'Chưa chọn tệp nào.';
        display.classList.add('italic');
    }
}
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

function formatDateDDMMYYYY(dateInput) {
    if (!dateInput) return '';
    let dateObj;
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
        const parts = dateInput.split('-');
        if (parts.length === 3) {
            dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
            dateObj = new Date(dateInput); 
        }
    } else {
        dateObj = new Date(dateInput);
    }
    if (isNaN(dateObj.getTime())) return ''; 
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); 
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

// --- NEW FUNCTION: Check for Negative Stock ---
function checkNegativeStock() {
    // 1. Filter products with stock < 0
    const negativeProducts = productDatabase.filter(p => p.stock < 0);

    // 2. If no issues, stop here
    if (negativeProducts.length === 0) return;

    // 3. Populate the list in the modal
    const listContainer = document.getElementById('negative-stock-list');
    listContainer.innerHTML = ''; // Clear old alerts

    negativeProducts.forEach(p => {
        const li = document.createElement('li');
        // Displays: "Product Name (Stock: -5)"
        li.textContent = `• ${p.name} (Kho: ${p.stock})`; 
        listContainer.appendChild(li);
    });

    // 4. Show the modal
    document.getElementById('negative-stock-modal').classList.remove('hidden');
}

// --- NEW FUNCTION: Setup Modal Event Listener ---
function setupNegativeStockModal() {
    const closeBtn = document.getElementById('negative-modal-close');
    const modal = document.getElementById('negative-stock-modal');
    
    if(closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
}

// --- QUẢN LÝ TRẠNG THÁI PHIÊN ---
function updateSessionStatus() {
    const statusBar = document.getElementById('session-status-bar');
    const isSessionActive = productDatabase.length > 0;

    // Kiểm tra nhanh xem có dữ liệu nào bị âm không
    const hasDataErrors = productDatabase.some(p => 
        p.stock < 0 || (p.batches && p.batches.some(b => b.stock < 0))
    );

    if (isSessionActive) {
        if (hasDataErrors) {
            // TRƯỜNG HỢP: Đang hoạt động NHƯNG có lỗi (Màu Đỏ)
            statusBar.className = 'text-center p-3 font-medium bg-red-100 text-red-800 border-b border-red-200 sticky top-[73px] z-40 flex justify-center items-center';
            
            // Dùng innerHTML để chèn nút bấm
            statusBar.innerHTML = `
                <span>Phiên làm việc đang diễn ra. <span class="font-bold">Có dữ liệu bất thường.</span></span>
                <button onclick="showDatabaseErrors()" class="ml-3 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors shadow-sm font-bold">
                    Xem lỗi
                </button>
            `;
        } else {
            // TRƯỜNG HỢP: Hoạt động bình thường (Màu Xanh - Giữ nguyên logic cũ)
            statusBar.textContent = `Phiên làm việc đang diễn ra. CSDL: ${productDatabase.length} SP. Giao dịch: ${dailyTransactions.length}.`;
            statusBar.className = 'text-center p-3 font-medium status-session-active sticky top-[73px] z-40';
        }
    } else {
        // TRƯỜNG HỢP: Chưa bắt đầu
        statusBar.textContent = 'Chưa có phiên làm việc. Vui lòng tải Cơ sở dữ liệu để bắt đầu.';
        statusBar.className = 'text-center p-3 font-medium status-session-inactive sticky top-[73px] z-40';
    }
    
    toggleAppControls(isSessionActive, devBypassMode);
    updateExportedInvoicesButtonState(); 
    updateLiveTotalAccumulated(); 
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
    // Other buttons (keep existing logic)
    document.getElementById('export-inventory-btn').disabled = !isSessionActive;
    document.getElementById('export-sales-report-btn').disabled = !isSessionActive; 
    document.getElementById('end-session-btn').disabled = !isSessionActive;
    document.getElementById('view-database-btn').disabled = !isSessionActive; 
    document.getElementById('main-app-controls').disabled = !isSessionActive && !isBypassActive;
    
    // --- MODIFIED SECTION START ---
    const loadDbBtn = document.getElementById('load-db-btn');
    const fileInput = document.getElementById('file-input');

    if (isSessionActive) {
        // LOCK MODE: Session is active, so we lock the input and button
        loadDbBtn.textContent = 'CSDL Đang Hoạt Động (Đã khóa)';
        
        // Disable the button and the file input
        loadDbBtn.disabled = true;
        fileInput.disabled = true;

        // Change styling to look "locked" (greyed out)
        loadDbBtn.classList.remove('btn-primary', 'btn-danger');
        loadDbBtn.classList.add('btn-secondary', 'cursor-not-allowed', 'opacity-50');
    } else {
        // RELEASE MODE: Session is finished/empty, unlock everything
        loadDbBtn.textContent = 'Bắt đầu phiên';
        
        // Re-enable the button and the file input
        loadDbBtn.disabled = false;
        fileInput.disabled = false;

        // Reset styling to primary blue
        loadDbBtn.classList.remove('btn-secondary', 'cursor-not-allowed', 'opacity-50', 'btn-danger');
        loadDbBtn.classList.add('btn-primary');
    }
    // --- MODIFIED SECTION END ---
}

function updateExportedInvoicesButtonState() {
    const btn = document.getElementById('view-exports-btn');
    if (!btn) return; 
    const isSessionActive = productDatabase.length > 0;
    btn.disabled = !(isSessionActive && exportedInvoicesLog.length > 0);
}

function updateLiveTotalAccumulated() {
    let totalRevenue = 0;
    dailyTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
            const itemTotal = item.price * item.quantity; 
            totalRevenue += itemTotal;
        });
    });
    const totalDisplayEl = document.getElementById('accumulated-total-display');
    const countDisplayEl = document.getElementById('total-transactions-count');
    if (totalDisplayEl) {
        const roundedTotal = Math.round(totalRevenue); 
        totalDisplayEl.textContent = currencyFormatter.format(roundedTotal);
    }
    if (countDisplayEl) {
        countDisplayEl.textContent = `Đã ghi nhận: ${dailyTransactions.length} giao dịch`;
    }
}

// --- QUẢN LÝ LOCALSTORAGE ---
function saveStateToStorage() {
    const state = {
        current: productDatabase,
        original: productDatabaseOriginal,
        transactions: dailyTransactions,
        devBypass: devBypassMode 
    };
    localStorage.setItem('inventoryState', JSON.stringify(state));
}

function loadStateFromStorage() {
    const savedState = localStorage.getItem('inventoryState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            if (state.current && state.original) {
                productDatabase = state.current;
                productDatabaseOriginal = state.original;
                dailyTransactions = state.transactions || []; 
                devBypassMode = state.devBypass || false; 
                showStatus('Đã khôi phục dữ liệu từ phiên làm việc trước.', false);
            }
        } catch (e) {
            console.error('Lỗi khôi phục trạng thái:', e);
            localStorage.removeItem('inventoryState');
        }
    }
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
    updateSessionStatus(); 
}

// --- XỬ LÝ DATABASE ---

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

                // Reset dữ liệu
                productDatabase = [];
                productDatabaseOriginal = [];
                dailyTransactions = [];
                currentCart = [];
                exportedInvoicesLog = []; 
                localStorage.removeItem('exportedInvoicesLog'); 
                devBypassMode = false; 
                
                // Cấu hình cột Excel
                const COL = { TEN: 4, MA: 5, DVT: 27, TIN: 25, GIA: 28 }; 
                
                const aggregationMap = new Map();
                let productsLoaded = 0;
                
                // Loop through rows
                for (let i = 3; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (row && row.length > 4) {
                        const productName = String(row[COL.TEN] || '').trim();
                        const productId = String(row[COL.MA] || '').trim();
                        
                        if (productId.length > 0 || productName.length > 0) {
                            const unit = String(row[COL.DVT] || '').trim();
                            const price = parseFloat(row[COL.GIA]) || 0;
                            const stock = parseInt(row[COL.TIN]) || 0;
                            
                            // Key priority: ID -> Name
                            const key = productId.length > 0 ? productId : productName;

                            // Create the Batch Object
                            const batchEntry = {
                                price: price,
                                stock: stock,
                                originalStock: stock 
                            };

                            if (aggregationMap.has(key)) {
                                // SẢN PHẨM ĐÃ CÓ: Cộng dồn tồn kho, Thêm Batch
                                const existingProduct = aggregationMap.get(key);
                                existingProduct.stock += stock; 
                                existingProduct.batches.push(batchEntry); 
                            } else {
                                // SẢN PHẨM MỚI
                                aggregationMap.set(key, {
                                    id: productId,
                                    name: productName,
                                    unit: unit,
                                    stock: stock, 
                                    price: price, 
                                    batches: [batchEntry] 
                                });
                            }
                        }
                    }
                }
                
                // Finalize Products: Set Price
                productDatabase = Array.from(aggregationMap.values()).map(p => {
                    p.price = getCurrentActivePrice(p);
                    return p;
                });

                productsLoaded = productDatabase.length;
                productDatabaseOriginal = JSON.parse(JSON.stringify(productDatabase));
                
                // --- THAY ĐỔI MỚI TẠI ĐÂY ---
                // Định nghĩa hàm sẽ chạy khi mọi thứ OK (Callback)
                const onValidationSuccess = () => {
                    saveStateToStorage();
                    renderCart();
                    syncTrueDate();
                    showStatus(`Bắt đầu phiên làm việc thành công! Đã nạp ${productsLoaded} sản phẩm.`);
                    fileInput.value = '';
                    updateFileNameDisplay();
                    updateSessionStatus();
                };

                // Chạy hàm kiểm tra lỗi trước
                validateAndWarnNegativeStock(onValidationSuccess);
                // ----------------------------

            } catch (error) { 
                console.error(error);
                showStatus(`Lỗi khi đọc tệp Excel: ${error.message}`, true); 
                updateSessionStatus();
            }
        };
        reader.onerror = () => showStatus('Không thể đọc tệp. Đã xảy ra lỗi.', true);
        reader.readAsArrayBuffer(file);
    };

    if (dailyTransactions.length > 0) {
        showConfirmModal('Bắt đầu phiên mới?', 'Bạn có chắc chắn muốn bắt đầu lại phiên làm việc? TẤT CẢ giao dịch và log hóa đơn đã lưu sẽ bị XÓA.', startLoad);
    } else {
        startLoad(); 
    }
}

function validateAndWarnNegativeStock(onSuccessCallback) {
    let errorItems = [];
    
    // 1. Quét dữ liệu để tìm lỗi
    productDatabase.forEach(product => {
        // Lỗi 1: Tổng tồn kho âm
        if (product.stock < 0) {
            errorItems.push({
                name: product.name,
                stock: product.stock,
                issue: 'Tổng tồn kho âm'
            });
        } 
        // Lỗi 2: Có lô nhập (batch) âm
        else if (product.batches && product.batches.length > 0) {
            const hasNegativeBatch = product.batches.some(batch => batch.stock < 0);
            if (hasNegativeBatch) {
                errorItems.push({
                    name: product.name,
                    stock: product.stock,
                    issue: 'Có lô nhập có giá trị âm'
                });
            }
        }
    });

    // 2. Nếu có lỗi, dựng HTML bảng cảnh báo
    if (errorItems.length > 0) {
        // Giới hạn hiển thị 5 dòng để modal không quá dài
        const displayItems = errorItems.slice(0, 5);
        const remaining = errorItems.length - 5;

        let tableRows = displayItems.map(item => `
            <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                <td class="p-2 text-left font-medium text-gray-700 dark:text-gray-300">${item.name}</td>
                <td class="p-2 text-center font-bold text-red-600">${item.stock}</td>
                <td class="p-2 text-right text-sm text-gray-500 italic">${item.issue}</td>
            </tr>
        `).join('');

        // Thêm dòng "... và X lỗi khác" nếu danh sách quá dài
        if (remaining > 0) {
            tableRows += `
                <tr>
                    <td colspan="3" class="p-2 text-center text-sm text-gray-500 font-medium">
                        ... và còn ${remaining} sản phẩm lỗi khác ...
                    </td>
                </tr>
            `;
        }

        // Tạo cấu trúc HTML hoàn chỉnh cho Modal
        const messageHtml = `
            <div class="space-y-3">
                <div class="bg-red-100 text-red-700 p-3 rounded-md text-sm font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Phát hiện dữ liệu bất thường trong file Excel!
                </div>
                
                <div class="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-md">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                            <tr>
                                <th class="p-2 text-left">Tên sản phẩm</th>
                                <th class="p-2 text-center">Tồn kho</th>
                                <th class="p-2 text-right">Vấn đề</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>

                <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Tiếp tục nạp dữ liệu này có thể dẫn đến sai lệch khi trừ kho hoặc tính doanh thu. 
                    <br><b>Bạn có chắc chắn muốn tiếp tục?</b>
                </p>
            </div>
        `;

        showConfirmModal('CẢNH BÁO DỮ LIỆU', messageHtml, onSuccessCallback, 'btn-danger');
    } else {
        // Không có lỗi, chạy tiếp bình thường
        onSuccessCallback();
    }
}

function showDatabaseErrors() {
    // Tái sử dụng hàm validateAndWarnNegativeStock để hiện bảng lỗi.
    // Tham số callback là hideConfirmModal: nghĩa là khi bấm "Đồng ý" hoặc "Đóng", 
    // nó chỉ tắt modal đi chứ không làm gì thêm (vì phiên đã chạy rồi).
    validateAndWarnNegativeStock(hideConfirmModal);
}

function startEndSessionProcess() {
    if (productDatabase.length === 0 && dailyTransactions.length === 0) {
        return showStatus('Chưa có dữ liệu nào trong phiên. Vui lòng bắt đầu phiên trước.', true);
    }
    showEndSessionModal();
}

function performDataDeletion() {
    productDatabase = [];
    productDatabaseOriginal = [];
    dailyTransactions = [];
    currentCart = [];
    exportedInvoicesLog = [];
    localStorage.removeItem('inventoryState');
    localStorage.removeItem('exportedInvoicesLog');
    devBypassMode = false; 

    renderCart();
    document.getElementById('customer-info-form').reset();
    document.getElementById('add-product-form').reset();
    // document.getElementById('invoice-date').valueAsDate = new Date();
    selectedProduct = null;
    clearProductSelection();

    showStatus('Phiên làm việc đã kết thúc thành công! Dữ liệu đã được xóa sạch.');
    updateSessionStatus();
}

function updateFinancialQuarter() {
    const displayEl = document.getElementById('financial-quarter-display');
    if (!displayEl) return; 
    const now = new Date();
    const month = now.getMonth(); 
    const year = now.getFullYear();
    const quarter = Math.floor(month / 3) + 1;
    displayEl.textContent = `Quý ${quarter}, ${year}`;
}

// --- TÌM KIẾM & THÊM SẢN PHẨM (NUCLEAR OPTION) ---
function handleProductSearch(e) {
    if (!productDatabase.length && !devBypassMode) return; 
    const keyword = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('product-search-results');
    resultsDiv.innerHTML = '';
    
    // Nếu đang bypass, không cần search CSDL
    if (devBypassMode) return;

    if (keyword.length < 2) {
        selectedProduct = null;
        e.target.classList.remove('input-selected');
        return;
    }

    const filtered = productDatabase.filter(p => p.name.toLowerCase().includes(keyword));
    
    if (filtered.length === 0) {
        const noResult = document.createElement('div');
        noResult.className = 'p-3 text-sm text-gray-500 italic';
        noResult.textContent = 'Không tìm thấy sản phẩm.';
        resultsDiv.appendChild(noResult);
    } else {
        filtered.slice(0, 10).forEach(product => {
            const div = document.createElement('div');
            div.className = 'search-item border-b border-gray-100 dark:border-slate-700 last:border-0';
            div.innerHTML = `
                <div class="font-medium text-gray-800 dark:text-slate-200">${product.name}</div>
                <div class="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex justify-between">
                    <span>ĐVT: ${product.unit} | Giá: ${currencyFormatter.format(product.price)}</span>
                    <span class="${product.stock <= 5 ? 'text-red-500 font-bold' : 'text-emerald-600'}">Kho: ${product.stock}</span>
                </div>
            `;
            div.addEventListener('click', () => {
                selectProduct(product);
                resultsDiv.innerHTML = '';
            });
            resultsDiv.appendChild(div);
        });
    }
}

function selectProduct(product) {
    selectedProduct = product;
    const searchInput = document.getElementById('product-search');
    searchInput.value = product.name;
    searchInput.classList.add('input-selected'); // Hiệu ứng xanh
    document.getElementById('product-quantity').focus(); // Chuyển sang ô số lượng
}

function clearProductSelection() {
    selectedProduct = null;
    const searchInput = document.getElementById('product-search');
    searchInput.value = '';
    searchInput.classList.remove('input-selected');
    document.getElementById('product-search-results').innerHTML = '';
}

function handleAddProduct(e) {
    e.preventDefault(); 
    
    const searchInput = document.getElementById('product-search');
    const rawInput = searchInput.value || '';
    
    // --- 1. BYPASS MODE LOGIC (Unchanged) ---
    if (devBypassMode && !selectedProduct) {
        const name = rawInput.trim();
        const quantity = parseFloat(document.getElementById('product-quantity').value);
        if (!name || !quantity || quantity <= 0) return showStatus('Bypass: Nhập tên & SL hợp lệ!', true);
        
        const unit = document.getElementById('product-unit').value.trim() || 'Cái';
        const price = parseFloat(document.getElementById('product-price').value) || 0;
        const existing = currentCart.find(i => i.name === name);
        if(existing) { existing.quantity += quantity; existing.price = price; }
        else { currentCart.push({id: '', name, unit, price, quantity}); }
        renderCart(); document.getElementById('add-product-form').reset(); clearProductSelection(); searchInput.focus();
        return showStatus(`Bypass: Đã thêm "${name}"`, false);
    }

    // --- 2. LOGIC TỰ ĐỘNG KHỚP (Unchanged) ---
    const skeletonString = (str) => {
        if (!str) return '';
        return str.toString()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, '');
    };

    if (!selectedProduct && rawInput.length > 0) {
        const inputSkeleton = skeletonString(rawInput);
        const matchedProduct = productDatabase.find(p => {
            const dbSkeleton = skeletonString(p.name);
            return dbSkeleton === inputSkeleton;
        });

        if (matchedProduct) {
            selectedProduct = matchedProduct;
            searchInput.value = matchedProduct.name;
            searchInput.classList.add('input-selected');
            document.getElementById('product-search-results').innerHTML = '';
        }
    }

    // --- 3. CHECK ERRORS ---
    if (!selectedProduct) {
        return showStatus(`Không tìm thấy SP nào khớp với "${rawInput}". Vui lòng chọn từ danh sách!`, true);
    }

    // --- 4. ADD TO CART WITH FIFO PRICE ---
    const name = selectedProduct.name;
    const quantityInput = document.getElementById('product-quantity');
    const quantity = parseFloat(quantityInput.value);

    if (!quantity || quantity <= 0) {
        quantityInput.focus();
        return showStatus(`Đã khớp "${name}". Vui lòng nhập số lượng!`, false);
    }
    
    // !!! HERE IS THE CHANGE: GET DYNAMIC PRICE !!!
    // We update the selectedProduct price property to ensure it's fresh
    const fifoPrice = getCurrentActivePrice(selectedProduct);
    
    const doAdd = () => {
        const existingCartItem = currentCart.find(item => item.name === name);
        if (existingCartItem) {
            existingCartItem.quantity += quantity;
            // Note: We don't update price of existing cart item to avoid confusion 
            // if they added item, then changed batch, then added more. 
            // But usually, it updates to latest. Let's keep existing behavior or update:
            existingCartItem.price = fifoPrice; 
        } else {
            currentCart.push({ 
                id: selectedProduct.id || '', 
                name: selectedProduct.name, 
                unit: selectedProduct.unit, 
                price: fifoPrice, // Use the FIFO Price
                quantity: quantity 
            });
        }
        
        renderCart();
        document.getElementById('add-product-form').reset();
        clearProductSelection(); 
        document.getElementById('product-search').focus();
    };
    
    // Check Total Stock
    if (quantity > selectedProduct.stock) {
        showConfirmModal('Cảnh báo Tồn Kho', `Sản phẩm "${name}" chỉ còn tổng cộng ${selectedProduct.stock}. Bạn có chắc chắn muốn bán lố không?`, doAdd, 'btn-warning');
    } else {
        doAdd(); 
    }
}

function getCurrentActivePrice(product) {
    // If no batches (legacy data or bypass), return the static price
    if (!product.batches || product.batches.length === 0) return product.price;

    // Look from TOP (Index 0) to BOTTOM
    for (const batch of product.batches) {
        if (batch.stock > 0) {
            return batch.price; // Return price of the first batch with stock
        }
    }
    
    // If all batches are 0, return the price of the last batch (newest)
    return product.batches[product.batches.length - 1].price;
}


function validateAndWarnNegativeStock(onSuccessCallback) {
    let errorItems = [];
    
    // 1. Quét dữ liệu để tìm lỗi
    productDatabase.forEach(product => {
        // Lỗi 1: Tổng tồn kho âm
        if (product.stock < 0) {
            errorItems.push({
                name: product.name,
                stock: product.stock,
                issue: 'Tổng tồn kho bị âm'
            });
        } 
        // Lỗi 2: Có lô nhập (batch) âm
        else if (product.batches && product.batches.length > 0) {
            const hasNegativeBatch = product.batches.some(batch => batch.stock < 0);
            if (hasNegativeBatch) {
                errorItems.push({
                    name: product.name,
                    stock: product.stock,
                    issue: 'Có lô nhập có giá trị âm'
                });
            }
        }
    });

    // 2. Nếu có lỗi, dựng HTML bảng cảnh báo
    if (errorItems.length > 0) {
        // Giới hạn hiển thị 5 dòng để modal không quá dài
        const displayItems = errorItems.slice(0, 5);
        const remaining = errorItems.length - 5;

        let tableRows = displayItems.map(item => `
            <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                <td class="p-2 text-left font-medium text-gray-700 dark:text-gray-300">${item.name}</td>
                <td class="p-2 text-center font-bold text-red-600">${item.stock}</td>
                <td class="p-2 text-right text-sm text-gray-500 italic">${item.issue}</td>
            </tr>
        `).join('');

        // Thêm dòng "... và X lỗi khác" nếu danh sách quá dài
        if (remaining > 0) {
            tableRows += `
                <tr>
                    <td colspan="3" class="p-2 text-center text-sm text-gray-500 font-medium">
                        ... và còn ${remaining} sản phẩm lỗi khác ...
                    </td>
                </tr>
            `;
        }

        // Tạo cấu trúc HTML hoàn chỉnh cho Modal
        const messageHtml = `
            <div class="space-y-3">
                <div class="bg-red-100 text-red-700 p-3 rounded-md text-sm font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Phát hiện dữ liệu bất thường trong Cơ sở dữ Liệu
                </div>
                
                <div class="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-md">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                            <tr>
                                <th class="p-2 text-left">Tên sản phẩm</th>
                                <th class="p-2 text-center">Tồn kho</th>
                                <th class="p-2 text-right">Vấn đề</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>

                <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Tiếp tục có thể dẫn đến dữ liệu bị sai. Vui lòng chụp màn hình và thông báo đến người hỗ trợ của bạn.
                    <br><b>Bạn có chắc chắn muốn tiếp tục?</b>
                </p>
            </div>
        `;

        showConfirmModal('CẢNH BÁO DỮ LIỆU', messageHtml, onSuccessCallback, 'btn-danger');
    } else {
        // Không có lỗi, chạy tiếp bình thường
        onSuccessCallback();
    }
}

// --- GIỎ HÀNG ---
function renderCart() {
    const cartBody = document.getElementById('cart-body');
    cartBody.innerHTML = '';
    let totalAmount = 0;
    
    if (currentCart.length === 0) {
        cartBody.innerHTML = '<tr><td colspan="7" class="text-center italic text-slate-500 dark:text-slate-400 py-6" data-label="">Giỏ hàng đang trống</td></tr>';
    }
    
    currentCart.forEach((item, index) => {
        const thanhTien = item.price * item.quantity;
        totalAmount += thanhTien;
        
        const row = cartBody.insertRow();
        const quantityControlHtml = `
            <div class="flex items-center justify-center space-x-1">
                <button class="btn-quantity-control" onclick="updateQuantity(${index}, -1)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg>
                </button>
                <input type="number" value="${item.quantity}" min="1" class="input-base input-quantity-cart" onchange="handleQuantityInput(${index}, this.value)" onkeyup="handleQuantityInput(${index}, this.value)" inputmode="numeric" pattern="[0-9]*">
                <button class="btn-quantity-control" onclick="updateQuantity(${index}, 1)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>
        `;

        row.innerHTML = `<td data-label="STT">${index + 1}</td>
                         <td data-label="Tên hàng hóa" class="font-medium">${item.name}</td>
                         <td data-label="ĐVT">${item.unit}</td>
                         <td data-label="Số lượng" class="font-medium">${quantityControlHtml}</td> 
                         <td data-label="Đơn giá">${currencyFormatter.format(item.price)}</td>
                         <td data-label="Thành tiền" class="font-bold">${currencyFormatter.format(thanhTien)}</td>
                         <td class="cell-action">
                            <button class="btn-secondary !bg-red-50 !text-red-600 dark:!bg-red-900/50 dark:!text-red-400 hover:!bg-red-100 w-full md:w-auto !py-2 !px-3 !text-sm" onclick="removeCartItem(${index})">Xóa</button>
                         </td>`;
    });
    
    document.getElementById('cart-total-posttax').textContent = `Tổng cộng: ${currencyFormatter.format(totalAmount)}`;
}

function updateQuantity(index, delta) {
    if (index >= currentCart.length) return;
    const currentItem = currentCart[index];
    const newQuantity = currentItem.quantity + delta;

    if (newQuantity < 1) {
        showConfirmModal('Xóa sản phẩm?', `Bạn có chắc muốn xóa sản phẩm "${currentItem.name}" khỏi giỏ hàng?`, () => removeCartItem(index), 'btn-danger');
        return;
    }
    
    if (!devBypassMode) {
        const dbProduct = productDatabase.find(p => p.name === currentItem.name);
        if (dbProduct && newQuantity > dbProduct.stock) {
            showConfirmModal('Cảnh báo Tồn Kho', `Sản phẩm "${currentItem.name}" chỉ còn ${dbProduct.stock}. Bạn có chắc chắn muốn bán lố ${newQuantity} không?`, () => {
                    currentItem.quantity = newQuantity;
                    renderCart();
                    showStatus(`Cập nhật số lượng cho "${currentItem.name}" (Bán lố).`);
                }, 'btn-warning');
            return;
        }
    }
    
    currentItem.quantity = newQuantity;
    renderCart();
}

function handleQuantityInput(index, value) {
    if (index >= currentCart.length) return;
    let newQuantity = parseFloat(value);
    
    if (isNaN(newQuantity) || newQuantity <= 0) {
        showConfirmModal('Số lượng không hợp lệ', `Số lượng nhập vào không hợp lệ. Xóa "${currentCart[index].name}" khỏi giỏ hàng?`, () => removeCartItem(index), 'btn-danger');
        return;
    }
    
    newQuantity = Math.round(newQuantity); 
    const currentItem = currentCart[index];
    
    if (!devBypassMode) {
        const dbProduct = productDatabase.find(p => p.name === currentItem.name);
        if (dbProduct && newQuantity > dbProduct.stock) {
            showConfirmModal('Cảnh báo Tồn Kho', `Sản phẩm "${currentItem.name}" chỉ còn ${dbProduct.stock}. Bán lố?`, () => {
                    currentItem.quantity = newQuantity;
                    renderCart();
                    showStatus(`Cập nhật số lượng cho "${currentItem.name}" (Bán lố).`);
                }, 'btn-warning');
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
        syncTrueDate(); // Đã sửa: Gọi hàm lấy giờ chuẩn thay vì giờ máy tính
        document.getElementById('save-invoice-only-check').checked = false; 
        document.getElementById('product-unit').value = '';
        document.getElementById('product-price').value = '';
        
        renderCart();
        if (confirmNeeded) showStatus('Đã xóa giỏ hàng, sẵn sàng cho đơn mới.', false);
    };

    if (confirmNeeded) {
        showConfirmModal('Xóa giỏ hàng?', 'Bạn có chắc muốn xóa giỏ hàng và thông tin khách hàng hiện tại?', doClear);
    } else {
        doClear();
    }
}

// --- XUẤT FILE ---
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
        date: document.getElementById('invoice-date').value 
    };
}

function updateInventory(productName, soldQuantity) {
    const product = productDatabase.find(p => p.name === productName);
    if (!product) return;

    // 1. Deduct from Total Stock (Legacy visual aid)
    product.stock -= soldQuantity;

    // 2. Deduct from Batches (FIFO Logic)
    if (product.batches && product.batches.length > 0) {
        let quantityToDeduct = soldQuantity;

        // Iterate Batches from Top (Oldest) to Bottom (Newest)
        for (let i = 0; i < product.batches.length; i++) {
            if (quantityToDeduct <= 0) break;

            let batch = product.batches[i];
            
            if (batch.stock > 0) {
                if (batch.stock >= quantityToDeduct) {
                    // This batch can fulfill the remaining order
                    batch.stock -= quantityToDeduct;
                    quantityToDeduct = 0;
                } else {
                    // This batch is not enough, take all of it and move to next
                    quantityToDeduct -= batch.stock;
                    batch.stock = 0;
                }
            }
        }
    }
    
    // 3. Update the main display price for next time (in case batch ran out)
    product.price = getCurrentActivePrice(product);
}

function buildFlatInvoiceData(transactions) {
    // Add "Mã hàng" as the last column for export
    const data = [[
        'Số thứ tự', 'Ngày hóa đơn', 'Tên khách hàng', 'Địa chỉ', 'Mã số thuế', 'Người mua hàng', 'Email', 
        'Hình thức thanh toán', 'Tên hàng hóa/dịch vụ', 'Đơn vị tính', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Mã hàng'
    ]];

    let sttCounter = 0; 
    transactions.forEach(transaction => {
        sttCounter++; 
        const { customerInfo, items } = transaction;

        items.forEach((item, itemIndex) => { 
            const thanhTien = item.quantity * item.price; 
            const roundedPrice = Math.round(item.price);
            const roundedThanhTien = Math.round(thanhTien);
            const productId = item.id || ''; // Get Product ID
            
            let row;
            if (itemIndex === 0) {
                row = [
                    sttCounter,                 
                    formatDateDDMMYYYY(customerInfo.date), 
                    customerInfo.name,          
                    customerInfo.address,       
                    customerInfo.tin,           
                    customerInfo.buyerName,     
                    customerInfo.email,         
                    customerInfo.paymentMethod, 
                    item.name,                  
                    item.unit,                  
                    item.quantity,              
                    roundedPrice,               
                    roundedThanhTien,
                    productId // Added Product ID
                ];
            } else {
                row = [sttCounter, '', '', '', '', '', '', '', item.name, item.unit, item.quantity, roundedPrice, roundedThanhTien, productId];
            }
            data.push(row);
        });
    });
    return data;
}

function exportInvoiceFile() {
    if (currentCart.length === 0) return showStatus('Giỏ hàng đang trống!', true);
    const customerInfo = getCustomerInfo();
    if (!customerInfo.name || !customerInfo.date) return showStatus('Vui lòng nhập Tên Khách Hàng và Ngày Hóa Đơn!', true);
    
    let hasDbProduct = false;
    let hasBypassProduct = false;
    const dbProductNames = new Set(productDatabaseOriginal.map(p => p.name));
    for (const item of currentCart) {
        if (dbProductNames.has(item.name)) hasDbProduct = true;
        else hasBypassProduct = true;
    }
    let invoiceType = '';
    if (hasDbProduct && hasBypassProduct) invoiceType = 'Hỗn hợp';
    else if (hasBypassProduct) invoiceType = 'Ngoài CSDL';
    else invoiceType = 'Trong CSDL';
    
    const transaction = {
        customerInfo: customerInfo,
        items: JSON.parse(JSON.stringify(currentCart)) 
    };
    dailyTransactions.push(transaction);

    const dataForExport = buildFlatInvoiceData([transaction]); 
    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HoaDon');
    const fileName = `HoaDon_${customerInfo.name.replace(/ /g, '_')}_${customerInfo.date}.xlsx`;
    
    try {
        const exportLogEntry = {
            id: Date.now(),
            customerName: customerInfo.name,
            fileName: fileName,
            timestamp: new Date().toISOString(),
            dataForExport: dataForExport,
            worksheetName: 'HoaDon',
            invoiceType: invoiceType
        };
        exportedInvoicesLog.push(exportLogEntry);
        localStorage.setItem('exportedInvoicesLog', JSON.stringify(exportedInvoicesLog));
    } catch (e) {
        console.warn("Lỗi log hóa đơn:", e);
    }

    const saveOnly = document.getElementById('save-invoice-only-check').checked;
    if (!saveOnly) XLSX.writeFile(workbook, fileName);

    let inventoryUpdated = false;
    currentCart.forEach(item => {
        if (dbProductNames.has(item.name)) { 
            updateInventory(item.name, item.quantity);
            inventoryUpdated = true;
        }
    });
    
    let successMessage = '';
    const actionWord = saveOnly ? 'lưu' : 'xuất';
    if (inventoryUpdated) successMessage = `Đã ${actionWord} hóa đơn "${fileName}" và cập nhật tồn kho (hàng CSDL).`;
    else successMessage = `Đã ${actionWord} hóa đơn (ngoài CSDL) "${fileName}". Tồn kho KHÔNG thay đổi.`;
    
    showStatus(successMessage, false);
    clearCart(false); 
    updateSessionStatus(); 
}

function exportDailySalesReport() {
    if (dailyTransactions.length === 0) return showStatus('Không có giao dịch nào để xuất báo cáo.', false);
    const dataForExport = buildFlatInvoiceData(dailyTransactions); 
    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TongHopBanHang');
    const currentDateStr = document.getElementById('invoice-date').value || new Date().toISOString().slice(0,10);
    const fileName = `BaoCao_BanHang_TongHop_${currentDateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showStatus(`Đã xuất báo cáo bán hàng tổng hợp: "${fileName}"`);
}

function exportInventory() {
    if (productDatabaseOriginal.length === 0 && dailyTransactions.length === 0) return showStatus('Chưa có dữ liệu tồn kho hoặc giao dịch nào.', false);
    
    // Updated header with "Mã hàng" at the end
    const inventoryData = [['Tên hàng hoá/dịch vụ', 'ĐVT', 'Tồn đầu ngày', 'Đã bán', 'Tồn cuối ngày', 'Ghi chú', 'Mã hàng']];
    const dbProductNames = new Set();
    
    productDatabaseOriginal.forEach(originalProduct => {
        dbProductNames.add(originalProduct.name); 
        const currentProduct = productDatabase.find(p => p.name === originalProduct.name);
        const originalStock = originalProduct.stock;
        const currentStock = currentProduct ? currentProduct.stock : originalStock;
        
        // Add ID to the export row
        inventoryData.push([
            originalProduct.name, 
            originalProduct.unit, 
            originalStock, 
            originalStock - currentStock, 
            currentStock, 
            '',
            originalProduct.id || '' // Product ID
        ]);
    });
    
    const bypassSales = new Map();
    dailyTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
            if (!dbProductNames.has(item.name)) { 
                let entry = bypassSales.get(item.name) || { unit: item.unit, totalSold: 0, id: item.id };
                entry.totalSold += item.quantity;
                bypassSales.set(item.name, entry);
            }
        });
    });
    
    bypassSales.forEach((data, name) => {
        // Add ID for bypass items (if they have one, likely empty string)
        inventoryData.push([name, data.unit, 0, data.totalSold, -data.totalSold, 'Xuất ngoài CSDL', data.id || '']);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(inventoryData);
    worksheet['!cols'] = [{ wch: 60 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TonKho');
    const currentDateStr = document.getElementById('invoice-date').value || new Date().toISOString().slice(0,10);
    const fileName = `BaoCao_TonKho_${currentDateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showStatus(`Đã xuất báo cáo tồn kho: "${fileName}"`);
}

// --- CLOCK & DATE ---
function formatClockDate(date, timeZone) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timeZone };
    return new Intl.DateTimeFormat('vi-VN', options).format(date);
}

function startClock() {
    const vnContainer = document.getElementById('session-time-container');
    const vnLabel = document.getElementById('vietnam-clock-label');
    const vnTimeEl = document.getElementById('current-time-display');
    const vnDateEl = document.getElementById('current-date-display');
    const localContainer = document.getElementById('local-time-container');
    const localTimeEl = document.getElementById('local-time-display');
    const localDateEl = document.getElementById('local-date-display');

    if (!vnContainer || !vnLabel || !vnTimeEl || !vnDateEl || !localContainer || !localTimeEl || !localDateEl) return;

    const userTimezoneOffset = new Date().getTimezoneOffset();
    const isGMT7 = userTimezoneOffset === -420; 

    const vnTimeFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const localTimeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    if (isGMT7) {
        vnLabel.textContent = "Giờ hiện tại";
        vnContainer.style.display = 'block';
        localContainer.style.display = 'none';
    } else {
        vnLabel.textContent = "Giờ Việt Nam (GMT +7)";
        vnContainer.style.display = 'block';
        localContainer.style.display = 'block';
    }

    function updateClock() {
        const now = new Date();
        if (isGMT7) {
            vnTimeEl.textContent = localTimeFormatter.format(now);
            vnDateEl.textContent = formatClockDate(now); 
        } else {
            vnTimeEl.textContent = vnTimeFormatter.format(now);
            vnDateEl.textContent = formatClockDate(now, 'Asia/Ho_Chi_Minh'); 
            localTimeEl.textContent = localTimeFormatter.format(now);
            localDateEl.textContent = formatClockDate(now); 
        }
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// --- MODAL HELPERS ---
function showAdvancedModal() { document.getElementById('advanced-modal').classList.remove('hidden'); }
function hideAdvancedModal() { document.getElementById('advanced-modal').classList.add('hidden'); }

function setupExportedInvoicesModal() {
    exportedInvoicesModal = document.getElementById('exported-invoices-modal');
    exportedInvoicesList = document.getElementById('exported-invoices-list');
    document.getElementById('view-exports-btn').addEventListener('click', showExportedInvoicesModal);
    document.getElementById('modal-close-btn-exports').addEventListener('click', hideExportedInvoicesModal);
    document.getElementById('modal-overlay-bg-exports').addEventListener('click', hideExportedInvoicesModal);
}

function showExportedInvoicesModal() {
    exportedInvoicesList.innerHTML = ''; 
    if (exportedInvoicesLog.length === 0) {
        exportedInvoicesList.innerHTML = '<tr><td colspan="5" class="text-center italic text-slate-500 dark:text-slate-400 py-6" data-label="">Chưa có hóa đơn nào được xuất trong phiên này.</td></tr>';
    } else {
        exportedInvoicesLog.slice().reverse().forEach(logEntry => {
            const row = exportedInvoicesList.insertRow();
            row.innerHTML = `<td data-label="Khách hàng" class="font-medium">${logEntry.customerName}</td><td data-label="Thời gian">${new Date(logEntry.timestamp).toLocaleString('vi-VN')}</td><td data-label="Tên file" class="text-sm italic">${logEntry.fileName}</td><td data-label="Loại" class="font-medium">${logEntry.invoiceType || 'Trong CSDL'}</td> <td class="cell-action text-center"><button class="btn-primary !py-1.5 !px-3 !text-sm w-full" onclick="reExportInvoice(${logEntry.id})">Tải lại</button></td>`;
        });
    }
    exportedInvoicesModal.classList.remove('hidden');
}
function hideExportedInvoicesModal() { exportedInvoicesModal.classList.add('hidden'); }

function reExportInvoice(id) {
    const logEntry = exportedInvoicesLog.find(log => log.id === id);
    if (!logEntry) return showStatus('Lỗi: Không tìm thấy hóa đơn để tải lại!', true); 
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

function setupInfoModal() {
    if (!infoModal) return;
    document.getElementById('info-mode-btn').addEventListener('click', showInfoModal);
    document.getElementById('modal-close-btn-info').addEventListener('click', hideInfoModal);
    document.getElementById('modal-overlay-bg-info').addEventListener('click', hideInfoModal);
}
function showInfoModal() { if (infoModal) infoModal.classList.remove('hidden'); }
function hideInfoModal() { if (infoModal) infoModal.classList.add('hidden'); }

function setupEndSessionModal() {
    if (!endSessionModal) return;
    endSessionModalCancelBtn.addEventListener('click', hideEndSessionModal);
    endSessionDownloadSalesBtn.addEventListener('click', handleModalDownloadSales);
    endSessionDownloadInventoryBtn.addEventListener('click', handleModalDownloadInventory);
    endSessionModalConfirmBtn.addEventListener('click', handleModalConfirmEnd);
}
function handleModalDownloadSales() {
    if (dailyTransactions.length > 0) { exportDailySalesReport(); endSessionDownloadSalesBtn.disabled = true; endSessionDownloadSalesBtn.textContent = 'Đã tải Báo Cáo Bán Hàng'; }
    else showStatus('Không có dữ liệu bán hàng để xuất.', false);
}
function handleModalDownloadInventory() {
    if (productDatabaseOriginal.length > 0 || dailyTransactions.length > 0) { exportInventory(); endSessionDownloadInventoryBtn.disabled = true; endSessionDownloadInventoryBtn.textContent = 'Đã tải Báo Cáo Tồn Kho'; }
    else showStatus('Không có dữ liệu tồn kho để xuất.', false);
}
function handleModalConfirmEnd() {
    hideEndSessionModal(); 
    showConfirmModal('Xác nhận XÓA DỮ LIỆU?', 'Tất cả dữ liệu phiên sẽ bị XÓA SẠCH. Bạn có chắc chắn muốn kết thúc?', performDataDeletion);
}
function showEndSessionModal() {
    if (!endSessionModal) return;
    const hasSalesData = dailyTransactions.length > 0;
    endSessionDownloadSalesBtn.disabled = !hasSalesData;
    const hasInventoryData = productDatabaseOriginal.length > 0 || dailyTransactions.length > 0;
    endSessionDownloadInventoryBtn.disabled = !hasInventoryData;
    endSessionModalConfirmBtn.disabled = false;
    endSessionModal.classList.remove('hidden');
}
function hideEndSessionModal() { if (endSessionModal) endSessionModal.classList.add('hidden'); }

function setupDatabaseViewerModal() {
    if (!databaseViewerModal) return;
    document.getElementById('view-database-btn').addEventListener('click', showDatabaseViewerModal);
    document.getElementById('modal-close-btn-db').addEventListener('click', hideDatabaseViewerModal);
    document.getElementById('modal-overlay-bg-db').addEventListener('click', hideDatabaseViewerModal);
    dbModalSearchInput.addEventListener('keyup', renderDatabaseViewerList);
}
function showDatabaseViewerModal() { if (!databaseViewerModal) return; renderDatabaseViewerList(); databaseViewerModal.classList.remove('hidden'); dbModalSearchInput.focus(); }
function hideDatabaseViewerModal() { if (databaseViewerModal) { databaseViewerModal.classList.add('hidden'); dbModalSearchInput.value = ''; } }
function renderDatabaseViewerList() {
    if (!databaseViewerList) return;
    const query = dbModalSearchInput.value.toLowerCase();
    const filteredDB = productDatabase.filter(p => p.name.toLowerCase().includes(query));
    databaseViewerList.innerHTML = ''; 
    if (filteredDB.length === 0) {
        const message = productDatabase.length === 0 ? 'Cơ sở dữ liệu trống.' : 'Không tìm thấy sản phẩm nào khớp.';
        databaseViewerList.innerHTML = `<tr><td colspan="5" class="text-center italic text-slate-500 dark:text-slate-400 py-6">${message}</td></tr>`;
        return;
    }
    filteredDB.forEach((product, index) => {
        const row = databaseViewerList.insertRow();
        row.innerHTML = `<td class="!p-2 text-center">${index + 1}</td><td class="!p-2 font-medium">${product.name}</td><td class="!p-2">${product.unit}</td><td class="!p-2 text-right">${currencyFormatter.format(product.price)}</td><td class="!p-2 text-right font-medium">${product.stock}</td>`;
    });
}

// --- UTILS KHÁC ---
function toggleBypassMode() {
    devBypassMode = !devBypassMode;
    const bypassDiv = document.getElementById('bypass-inputs');
    updateBypassButtonState(); 
    if (devBypassMode) {
        bypassDiv.classList.remove('hidden'); showStatus('Chế độ Bypass CSDL đã BẬT.', false);
    } else {
        bypassDiv.classList.add('hidden'); showStatus('Chế độ Bypass CSDL đã TẮT.', false);
    }
    saveStateToStorage();
    updateSessionStatus();
    if(document.getElementById('product-search').value) handleProductSearch({target: document.getElementById('product-search')});
}

function exportEmptyInvoice() {
    const dataForExport = buildFlatInvoiceData([]); 
    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HoaDon_Trong');
    XLSX.writeFile(workbook, 'Template_HoaDon_Trong.xlsx');
    showStatus('Đã xuất template Hóa Đơn (trống).', false); hideAdvancedModal();
}
function exportEmptySalesReport() {
    const dataForExport = buildFlatInvoiceData([]); 
    const worksheet = XLSX.utils.aoa_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TongHopBanHang_Trong');
    XLSX.writeFile(workbook, 'Template_BaoCao_BanHang_TongHop_Trong.xlsx');
    showStatus('Đã xuất template Báo Cáo Bán Hàng (trống).', false); hideAdvancedModal();
}
function exportEmptyInventory() {
    const inventoryData = [['Tên hàng hoá/dịch vụ', 'ĐVT', 'Tồn đầu ngày', 'Đã bán', 'Tồn cuối ngày', 'Ghi chú']];
    const worksheet = XLSX.utils.aoa_to_sheet(inventoryData);
    worksheet['!cols'] = [{ wch: 60 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TonKho_Trong');
    XLSX.writeFile(workbook, 'Template_BaoCao_TonKho_Trong.xlsx');
    showStatus('Đã xuất template Báo Cáo Tồn Kho (trống).', false); hideAdvancedModal();
}

function handleBackupSession() {
    try {
        const inventoryState = localStorage.getItem('inventoryState');
        const exportedInvoicesLog = localStorage.getItem('exportedInvoicesLog');
        if (!inventoryState && !exportedInvoicesLog) return showStatus('Không có dữ liệu phiên để backup.', true);
        const state = inventoryState ? JSON.parse(inventoryState) : null;
        const logs = exportedInvoicesLog ? JSON.parse(exportedInvoicesLog) : null;
        const backupData = {
            fullSessionData: { 
                productDatabase: state ? state.current : [],
                productDatabaseOriginal: state ? state.original : [],
                dailyTransactions: state ? state.transactions : [],
                devBypassMode: state ? state.devBypass : false,
            },
            exportedInvoicesLog: logs,
            backupMetadata: { timestamp: new Date().toISOString(), version: "1.6" }
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const currentDateStr = document.getElementById('invoice-date').value || new Date().toISOString().slice(0, 10);
        const dateStr = currentDateStr.replace(/-/g, '');
        a.href = url; a.download = `VTNN_ThanhNhan_Backup_${dateStr}_V1_6.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showStatus('Đã xuất file backup phiên thành công.', false); hideAdvancedModal();
    } catch (e) { showStatus(`Lỗi khi tạo backup: ${e.message}`, true); }
}

function handleRestoreSession(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const backupData = JSON.parse(e.target.result);
            const sessionData = backupData.fullSessionData;
            const logData = backupData.exportedInvoicesLog;
            if (sessionData && typeof sessionData.productDatabase !== 'undefined') {
                showConfirmModal('Xác nhận Khôi Phục Phiên?', 'Hành động này sẽ XÓA SẠCH phiên hiện tại. Tiếp tục?', () => {
                    localStorage.setItem('inventoryState', JSON.stringify({
                        current: sessionData.productDatabase,
                        original: sessionData.productDatabaseOriginal || [],
                        transactions: sessionData.dailyTransactions,
                        devBypass: sessionData.devBypassMode || false
                    }));
                    if (logData) localStorage.setItem('exportedInvoicesLog', JSON.stringify(logData));
                    else localStorage.removeItem('exportedInvoicesLog');
                    showStatus('Đã khôi phục. Đang tải lại...', false);
                    setTimeout(() => location.reload(), 1500);
                }, 'btn-danger');
            } else { throw new Error('File backup không hợp lệ.'); }
        } catch (error) { showStatus(`Lỗi file backup: ${error.message}`, true); }
        event.target.value = ''; hideAdvancedModal();
    };
    reader.readAsText(file);
}

function initRetailCustomerCheckbox() {
    const checkbox = document.getElementById('retail-customer-check');
    const nameInput = document.getElementById('customer-name');
    const AUTOFILL_TEXT = "Khách lẻ";

    if (!checkbox || !nameInput) return;

    // 1. Handle Checkbox Change
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            nameInput.value = AUTOFILL_TEXT;
            // Trigger input event so any validation logic knows the field changed
            nameInput.dispatchEvent(new Event('input'));
        } else {
            // Only clear the input if it currently equals the autofill text
            // (Don't delete if the user typed something else)
            if (nameInput.value === AUTOFILL_TEXT) {
                nameInput.value = "";
            }
        }
    });

    // 2. Handle Manual Typing
    // If user manually changes the text, uncheck the box automatically
    nameInput.addEventListener('input', function() {
        if (this.value !== AUTOFILL_TEXT) {
            checkbox.checked = false;
        } else {
            // If they manually typed the exact phrase, check the box
            checkbox.checked = true;
        }
    });
}

// --- HÀM ĐỒNG BỘ THỜI GIAN THỰC (FIX LỖI PIN CMOS & PWA SLEEP) ---
let lastSyncTime = 0; // Biến lưu thời gian lần cuối gọi API
let lastKnownTrueDate = null; // Ghi nhớ ngày đúng để không bị đè bởi giờ máy tính sai

async function syncTrueDate() {
    const dateInput = document.getElementById('invoice-date');
    const localDate = new Date();
    const now = Date.now();
    
    // 1. Nếu chưa có ngày chuẩn nào, tạm dùng giờ máy tính
    if (!lastKnownTrueDate) {
        dateInput.valueAsDate = localDate;
    }

    // 2. Chống spam API (5 phút) HOẶC sửa lỗi CMOS (thời gian lùi về quá khứ)
    // Nếu vừa gọi API < 5 phút VÀ thời gian không bị lùi:
    if (lastKnownTrueDate && now >= lastSyncTime && (now - lastSyncTime < 300000)) {
        // Đảm bảo không bị mất ngày đúng khi clearCart hoặc focus lại
        dateInput.valueAsDate = lastKnownTrueDate;
        return; 
    }
    
    // Hàm fetch có Timeout và TẮT CACHE (rất quan trọng cho PWA)
    const fetchWithTimeout = async (url, ms) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ms);
        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                cache: 'no-store', // Bắt buộc bỏ qua bộ nhớ đệm của PWA
                headers: { 'Cache-Control': 'no-cache' }
            });
            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    };

    let trueDate = null;
    let isOffline = false;

    try {
        lastSyncTime = now; // Cập nhật mốc thời gian gọi
        // CÁCH 1: Dùng worldtimeapi kèm query string chống cache (?cb=...)
        const cb = new Date().getTime();
        const res1 = await fetchWithTimeout(`https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh?cb=${cb}`, 3500);
        if (!res1.ok) throw new Error('API 1 lỗi');
        const data1 = await res1.json();
        trueDate = new Date(data1.datetime);
    } catch (err1) {
        console.warn("WorldTimeAPI thất bại, thử server dự phòng...", err1);
        try {
            // CÁCH 2: Dùng TimeAPI làm dự phòng nếu API 1 bị sập/chặn
            const cb = new Date().getTime();
            const res2 = await fetchWithTimeout(`https://timeapi.io/api/Time/current/zone?timeZone=Asia/Ho_Chi_Minh&cb=${cb}`, 3500);
            if (!res2.ok) throw new Error('API 2 lỗi');
            const data2 = await res2.json();
            trueDate = new Date(data2.dateTime);
        } catch (err2) {
            console.warn("Không lấy được giờ từ Internet. Chuyển sang giờ máy tính.", err2);
            isOffline = true;
            trueDate = localDate;
        }
    }

    // 3. Cập nhật lại giao diện bằng giờ chuẩn xác từ Internet
        if (trueDate && !isNaN(trueDate.getTime())) {
            lastKnownTrueDate = trueDate; // Ghi nhớ lại ngày chuẩn
            dateInput.valueAsDate = trueDate;

        // 4. KIỂM TRA LỖI CMOS (Năm < năm hiện tại)
        if (trueDate.getFullYear() < 2025) {
            showStatus('CẢNH BÁO: Pin CMOS hỏng & Mất mạng. Ngày hóa đơn đang sai!', true);
            alert("MÁY TÍNH ĐANG SAI NGÀY (DO HẾT PIN CMOS)!\n\nVui lòng kiểm tra lại 'Ngày Hóa Đơn' trước khi xuất.");
        }
    }
}
