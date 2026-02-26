// =====================================================================
// MOTO POS - app.js  |  Firebase Realtime DB + Dexie Local Cache
// =====================================================================

// Initialize Local Database (Dexie)
const localDB = new Dexie('MotoPOS');
localDB.version(2).stores({
    items: 'id, itemName, partNumber, category, costPrice, price, quantity, lowStockLimit',
    sales: 'id, customerName, phone, bikeNumber, date, items, totalAmount, technicianName',
    customers: 'id, name, phone, bikeNumber, lastServiceDate',
    technicians: 'id, name'
});
localDB.version(3).stores({
    items: 'id, itemName, partNumber, category, costPrice, price, quantity, lowStockLimit',
    sales: 'id, customerName, phone, bikeNumber, date, items, totalAmount, technicianName',
    customers: 'id, name, phone, bikeNumber, lastServiceDate',
    technicians: 'id, name',
    receivings: 'id, date, supplier, partName, partNumber, itemId, qty, unitCost, totalCost, invoiceNo, notes, timestamp'
});

// UI State
let currentBillItems = [];
let isEditingItem = false;
let UIElements = {};

// -----------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    UIElements = {
        tabs: document.querySelectorAll('.nav-link'),
        tabContents: document.querySelectorAll('.tab-content'),
        pageTitle: document.getElementById('page-title'),

        toast: document.getElementById('toast'),
        toastMsg: document.getElementById('toast-msg'),
        syncStatus: document.getElementById('sync-status'),

        // Inventory Modal
        modalAddItem: document.getElementById('modal-add-item'),
        btnAddItemModal: document.getElementById('btn-add-item-modal'),
        btnCancelItem: document.getElementById('btn-cancel-item'),
        btnSaveItem: document.getElementById('btn-save-item'),

        itemId: document.getElementById('item-id'),
        itemName: document.getElementById('item-name'),
        itemPartNumber: document.getElementById('item-part-number'),
        itemCategory: document.getElementById('item-category'),
        itemCost: document.getElementById('item-cost'),
        itemPrice: document.getElementById('item-price'),
        itemQty: document.getElementById('item-qty'),
        itemLow: document.getElementById('item-low'),
        inventoryList: document.getElementById('inventory-list'),

        // Billing
        billCustomerName: document.getElementById('bill-customer-name'),
        billBikeNumber: document.getElementById('bill-bike-number'),
        billPhone: document.getElementById('bill-phone'),
        billTechnician: document.getElementById('bill-technician'),
        billItemSelect: document.getElementById('bill-item-select'),
        partNumberSearch: document.getElementById('part-number-search'),
        partSearchResults: document.getElementById('part-search-results'),
        billItemQty: document.getElementById('bill-item-qty'),
        btnAddToBill: document.getElementById('btn-add-to-bill'),
        billItemsList: document.getElementById('bill-items-list'),
        billTotalAmount: document.getElementById('bill-total-amount'),
        btnCheckout: document.getElementById('btn-checkout'),
        bikeAutofillIndicator: document.getElementById('bike-autofill-indicator'),

        // Bill View Modal
        modalViewBill: document.getElementById('modal-view-bill'),
        btnCloseBillModal: document.getElementById('btn-close-bill-modal'),
        billModalContent: document.getElementById('bill-modal-content'),
        billModalCustomerInfo: document.getElementById('bill-modal-customer-info'),

        // Dashboard Stats
        todaySalesVal: document.getElementById('today-sales-val'),
        lowStockVal: document.getElementById('low-stock-val'),
        todayServicesVal: document.getElementById('today-services-val'),
        recentSalesList: document.getElementById('recent-sales-list'),
        lowStockAlerts: document.getElementById('low-stock-alerts'),

        // Customers & Reports
        customersList: document.getElementById('customers-list'),
        salesList: document.getElementById('sales-list'),
        btnSendReport: document.getElementById('btn-send-report'),

        // Technicians
        technicianNameInput: document.getElementById('technician-name-input'),
        btnAddTechnician: document.getElementById('btn-add-technician'),
        techniciansList: document.getElementById('technicians-list'),

        // EmailJS Settings
        ejsServiceId: document.getElementById('ejs-service-id'),
        ejsTemplateId: document.getElementById('ejs-template-id'),
        ejsPublicKey: document.getElementById('ejs-public-key'),
        ejsToEmail: document.getElementById('ejs-to-email'),
        btnSaveEjs: document.getElementById('btn-save-ejs'),
        btnTestEjs: document.getElementById('btn-test-ejs'),
        ejsStatus: document.getElementById('ejs-status'),

        // Shop Settings
        shopName: document.getElementById('shop-name'),
        shopAddress: document.getElementById('shop-address'),
        shopPhone: document.getElementById('shop-phone'),
        shopNote: document.getElementById('shop-note'),
        shopLogoInput: document.getElementById('shop-logo-input'),
        shopLogoPreview: document.getElementById('shop-logo-preview'),
        btnRemoveLogo: document.getElementById('btn-remove-logo'),
        btnSaveShopSettings: document.getElementById('btn-save-shop-settings'),
        shopSettingsStatus: document.getElementById('shop-settings-status'),
        billHeaderPreview: document.getElementById('bill-header-preview'),
        sidebarShopName: document.getElementById('sidebar-shop-name'),

        // Parts Receiving
        btnAddReceiving: document.getElementById('btn-add-receiving'),
        modalAddReceiving: document.getElementById('modal-add-receiving'),
        btnCancelReceiving: document.getElementById('btn-cancel-receiving'),
        btnSaveReceiving: document.getElementById('btn-save-receiving'),
        receivingId: document.getElementById('receiving-id'),
        receivingDate: document.getElementById('receiving-date'),
        receivingSupplier: document.getElementById('receiving-supplier'),
        receivingItemLink: document.getElementById('receiving-item-link'),
        receivingPartName: document.getElementById('receiving-part-name'),
        receivingPartNumber: document.getElementById('receiving-part-number'),
        receivingQty: document.getElementById('receiving-qty'),
        receivingUnitCost: document.getElementById('receiving-unit-cost'),
        receivingTotalCost: document.getElementById('receiving-total-cost'),
        receivingInvoice: document.getElementById('receiving-invoice'),
        receivingUpdateStock: document.getElementById('receiving-update-stock'),
        receivingNotes: document.getElementById('receiving-notes'),
        receivingsList: document.getElementById('receivings-list'),
        receivingSearch: document.getElementById('receiving-search'),
        receivingFilterMonth: document.getElementById('receiving-filter-month'),
        btnReceivingFilter: document.getElementById('btn-receiving-filter'),
        btnReceivingClear: document.getElementById('btn-receiving-clear'),
        receivingTotalCount: document.getElementById('receiving-total-count'),
        receivingMonthCost: document.getElementById('receiving-month-cost'),
        receivingSupplierCount: document.getElementById('receiving-supplier-count'),

        // Item History Modal
        modalItemHistory: document.getElementById('modal-item-history'),
        btnCloseItemHistory: document.getElementById('btn-close-item-history'),
        itemHistoryTitle: document.getElementById('item-history-title'),
        itemHistoryInfo: document.getElementById('item-history-info'),
        itemHistoryContent: document.getElementById('item-history-content'),
        ihTabSales: document.getElementById('ih-tab-sales'),
        ihTabReceiving: document.getElementById('ih-tab-receiving'),
    };

    setupEventListeners();
    loadEmailJsSettings();
    loadShopSettings();
    await renderAllLocal();

    // Set today's date as default for receiving form
    if (UIElements.receivingDate) {
        UIElements.receivingDate.value = getTodayString();
    }
    // Set current month as default filter
    if (UIElements.receivingFilterMonth) {
        const now = new Date();
        UIElements.receivingFilterMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    if (window.db) {
        UIElements.syncStatus.classList.remove('hidden');
        initSync();
    } else {
        showToast("Offline Mode - Firebase not connected", "info");
    }
});

// -----------------------------------------------------------------------
// NAVIGATION
// -----------------------------------------------------------------------
function setupEventListeners() {
    UIElements.tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            UIElements.tabs.forEach(t => {
                t.classList.remove('active-nav', 'bg-gray-800', 'text-white');
                t.classList.add('text-gray-300');
            });
            e.currentTarget.classList.remove('text-gray-300');
            e.currentTarget.classList.add('active-nav', 'bg-gray-800', 'text-white');

            const target = e.currentTarget.getAttribute('data-target');
            UIElements.tabContents.forEach(tc => tc.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            UIElements.pageTitle.textContent = e.currentTarget.textContent.trim();

            if (target === 'billing') updateBillingOptions();
            if (target === 'technicians') renderTechnicians();
            if (target === 'parts-receiving') renderReceivings();
        });
    });

    UIElements.btnAddItemModal.addEventListener('click', () => openModal(null));
    UIElements.btnCancelItem.addEventListener('click', closeModal);
    UIElements.btnSaveItem.addEventListener('click', saveInventoryItem);
    UIElements.btnAddToBill.addEventListener('click', addToBill);
    UIElements.btnCheckout.addEventListener('click', completeSaleAndPrint);
    UIElements.btnSendReport.addEventListener('click', sendReportViaEmail);
    UIElements.btnSaveEjs.addEventListener('click', saveEmailJsSettings);
    UIElements.btnTestEjs.addEventListener('click', testEmailJs);

    // Technicians
    UIElements.btnAddTechnician.addEventListener('click', addTechnician);
    UIElements.technicianNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTechnician();
    });

    // Shop Settings
    UIElements.btnSaveShopSettings.addEventListener('click', saveShopSettings);
    UIElements.shopLogoInput.addEventListener('change', handleLogoUpload);
    UIElements.btnRemoveLogo.addEventListener('click', removeLogo);

    // Part Number Search
    UIElements.partNumberSearch.addEventListener('input', handlePartSearch);
    document.addEventListener('click', (e) => {
        if (!document.getElementById('part-search-wrap').contains(e.target)) {
            UIElements.partSearchResults.classList.add('hidden');
        }
    });

    // Bike Number Auto-fill
    UIElements.billBikeNumber.addEventListener('input', handleBikeNumberInput);

    // Bill View Modal close
    UIElements.btnCloseBillModal.addEventListener('click', () => {
        UIElements.modalViewBill.classList.add('hidden');
    });
    UIElements.modalViewBill.addEventListener('click', (e) => {
        if (e.target === UIElements.modalViewBill) UIElements.modalViewBill.classList.add('hidden');
    });

    // Backup / Export buttons
    document.getElementById('btn-export-sales').addEventListener('click', () => exportSheet('sales'));
    document.getElementById('btn-export-customers').addEventListener('click', () => exportSheet('customers'));
    document.getElementById('btn-export-inventory').addEventListener('click', () => exportSheet('inventory'));
    document.getElementById('btn-export-bills').addEventListener('click', () => exportSheet('bills'));
    document.getElementById('btn-export-technicians').addEventListener('click', () => exportSheet('technicians'));
    document.getElementById('btn-export-all').addEventListener('click', () => exportSheet('all'));

    // Parts Receiving
    UIElements.btnAddReceiving.addEventListener('click', () => openReceivingModal());
    UIElements.btnCancelReceiving.addEventListener('click', closeReceivingModal);
    UIElements.btnSaveReceiving.addEventListener('click', saveReceiving);
    UIElements.modalAddReceiving.addEventListener('click', (e) => {
        if (e.target === UIElements.modalAddReceiving) closeReceivingModal();
    });
    // Auto-calc total cost
    UIElements.receivingQty.addEventListener('input', calcReceivingTotal);
    UIElements.receivingUnitCost.addEventListener('input', calcReceivingTotal);
    // Auto-fill from inventory item
    UIElements.receivingItemLink.addEventListener('change', async (e) => {
        const id = e.target.value;
        if (!id) return;
        const item = await localDB.items.get(id);
        if (item) {
            UIElements.receivingPartName.value = item.itemName;
            UIElements.receivingPartNumber.value = item.partNumber || '';
            if (item.costPrice > 0) UIElements.receivingUnitCost.value = item.costPrice;
            calcReceivingTotal();
        }
    });
    // Filter
    UIElements.btnReceivingFilter.addEventListener('click', renderReceivings);
    UIElements.btnReceivingClear.addEventListener('click', () => {
        UIElements.receivingSearch.value = '';
        UIElements.receivingFilterMonth.value = '';
        renderReceivings();
    });
    UIElements.receivingSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') renderReceivings(); });

    // Item History Modal close
    UIElements.btnCloseItemHistory.addEventListener('click', () => {
        UIElements.modalItemHistory.classList.add('hidden');
    });
    UIElements.modalItemHistory.addEventListener('click', (e) => {
        if (e.target === UIElements.modalItemHistory) UIElements.modalItemHistory.classList.add('hidden');
    });
    // Item History Tabs
    UIElements.ihTabSales.addEventListener('click', () => switchItemHistoryTab('sales'));
    UIElements.ihTabReceiving.addEventListener('click', () => switchItemHistoryTab('receiving'));
}

// -----------------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------------
function showToast(message, type = 'success') {
    UIElements.toastMsg.textContent = message;
    UIElements.toast.classList.remove('translate-y-20', 'opacity-0', 'bg-green-600', 'bg-red-600', 'bg-blue-600', 'bg-gray-800');
    if (type === 'error') UIElements.toast.classList.add('bg-red-600');
    else if (type === 'info') UIElements.toast.classList.add('bg-blue-600');
    else UIElements.toast.classList.add('bg-green-600');
    setTimeout(() => {
        UIElements.toast.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}

function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function renderAllLocal() {
    await renderInventory();
    await renderDashboard();
    await updateBillingOptions();
    await renderReports();
    await renderCustomers();
    await renderTechnicians();
    await updateTechnicianDropdown();
    await renderReceivings();
}

// -----------------------------------------------------------------------
// FIREBASE SYNC
// -----------------------------------------------------------------------
function initSync() {
    // 1. Items Sync
    window.db.ref('items').on('value', async (snapshot) => {
        const data = snapshot.val();
        await localDB.items.clear();
        if (data) {
            const arr = Object.values(data);
            await localDB.items.bulkPut(arr);
        }
        await renderInventory();
        await renderDashboard();
        await updateBillingOptions();
        UIElements.syncStatus.classList.add('hidden');
    }, (error) => {
        console.error("Firebase Items Sync Error:", error);
        UIElements.syncStatus.classList.add('hidden');
        showToast("Database Error: Check Firebase Rules", "error");
    });

    // 2. Sales Sync
    window.db.ref('sales').on('value', async (snapshot) => {
        const data = snapshot.val();
        await localDB.sales.clear();
        if (data) {
            const arr = Object.values(data);
            await localDB.sales.bulkPut(arr);
        }
        await renderReports();
        await renderDashboard();
    }, (error) => {
        console.error("Firebase Sales Sync Error:", error);
    });

    // 3. Customers Sync
    window.db.ref('customers').on('value', async (snapshot) => {
        const data = snapshot.val();
        await localDB.customers.clear();
        if (data) {
            const arr = Object.values(data);
            await localDB.customers.bulkPut(arr);
        }
        await renderCustomers();
    }, (error) => {
        console.error("Firebase Customers Sync Error:", error);
    });

    // 4. Technicians Sync
    window.db.ref('technicians').on('value', async (snapshot) => {
        const data = snapshot.val();
        await localDB.technicians.clear();
        if (data) {
            const arr = Object.values(data);
            await localDB.technicians.bulkPut(arr);
        }
        await renderTechnicians();
        await updateTechnicianDropdown();
    }, (error) => {
        console.error("Firebase Technicians Sync Error:", error);
    });

    // 5. Receivings Sync
    window.db.ref('receivings').on('value', async (snapshot) => {
        const data = snapshot.val();
        await localDB.receivings.clear();
        if (data) {
            const arr = Object.values(data);
            await localDB.receivings.bulkPut(arr);
        }
        await renderReceivings();
    }, (error) => {
        console.error("Firebase Receivings Sync Error:", error);
    });
}

// -----------------------------------------------------------------------
// INVENTORY MANAGEMENT
// -----------------------------------------------------------------------
function openModal(item = null) {
    if (item) {
        isEditingItem = true;
        UIElements.itemId.value = item.id;
        UIElements.itemName.value = item.itemName;
        UIElements.itemPartNumber.value = item.partNumber || '';
        UIElements.itemCategory.value = item.category;
        UIElements.itemCost.value = item.costPrice || '';
        UIElements.itemPrice.value = item.price;
        UIElements.itemQty.value = item.quantity;
        UIElements.itemLow.value = item.lowStockLimit;
    } else {
        isEditingItem = false;
        UIElements.itemId.value = '';
        UIElements.itemName.value = '';
        UIElements.itemPartNumber.value = '';
        UIElements.itemCost.value = '';
        UIElements.itemPrice.value = '';
        UIElements.itemQty.value = '';
        UIElements.itemLow.value = '';
        UIElements.itemCategory.value = 'Spare Part';
    }
    UIElements.modalAddItem.classList.remove('hidden');
}

function closeModal() {
    UIElements.modalAddItem.classList.add('hidden');
}

async function saveInventoryItem() {
    const id = isEditingItem ? UIElements.itemId.value : Date.now().toString();
    const itemData = {
        id,
        itemName: UIElements.itemName.value.trim(),
        partNumber: UIElements.itemPartNumber.value.trim(),
        category: UIElements.itemCategory.value,
        costPrice: parseFloat(UIElements.itemCost.value) || 0,
        price: parseFloat(UIElements.itemPrice.value),
        quantity: parseInt(UIElements.itemQty.value),
        lowStockLimit: parseInt(UIElements.itemLow.value) || 0
    };

    if (!itemData.itemName || isNaN(itemData.price) || isNaN(itemData.quantity)) {
        showToast('Please fill all required fields!', 'error');
        return;
    }

    try {
        if (window.db) {
            await window.db.ref(`items/${id}`).set(itemData);
        } else {
            await localDB.items.put(itemData);
            await renderAllLocal();
        }
        closeModal();
        showToast(isEditingItem ? 'Item updated!' : 'Item added!');
    } catch (e) {
        showToast('Failed to save item', 'error');
        console.error(e);
    }
}

async function renderInventory() {
    const items = await localDB.items.toArray();

    if (items.length === 0) {
        UIElements.inventoryList.innerHTML = `
            <tr><td colspan="7" class="p-6 text-center text-gray-400">
                <i class="fas fa-box-open text-3xl mb-2 block"></i>No items yet. Add your first item!
            </td></tr>`;
        return;
    }

    UIElements.inventoryList.innerHTML = items.map(item => {
        const isLow = item.category !== 'Service' && item.quantity <= item.lowStockLimit;
        const margin = item.costPrice > 0 ? ((item.price - item.costPrice) / item.costPrice * 100).toFixed(1) : null;
        return `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2 text-xs text-gray-500 font-mono">${item.partNumber || '<span class="text-gray-300">—</span>'}</td>
            <td class="p-2">
                <button class="font-medium text-left hover:text-blue-600 hover:underline btn-item-history cursor-pointer" data-id="${item.id}" title="View item history">
                    ${item.itemName}
                </button>
                ${isLow ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded ml-2 font-bold">LOW</span>' : ''}
            </td>
            <td class="p-2"><span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">${item.category}</span></td>
            <td class="p-2 text-gray-500 text-sm">${item.costPrice > 0 ? 'Rs. ' + item.costPrice.toFixed(2) : '<span class="text-gray-300">—</span>'}
                ${margin ? `<span class="text-xs text-green-600 ml-1">(${margin}% margin)</span>` : ''}
            </td>
            <td class="p-2 font-medium">Rs. ${item.price.toFixed(2)}</td>
            <td class="p-2 font-bold ${isLow ? 'text-red-600' : 'text-green-700'}">
                ${item.category === 'Service' ? '<i class="fas fa-infinity text-gray-400"></i>' : item.quantity}
            </td>
            <td class="p-2 flex space-x-1">
                <button class="text-indigo-600 hover:bg-indigo-50 p-2 rounded btn-item-history" data-id="${item.id}" title="View History">
                    <i class="fas fa-history pointer-events-none"></i>
                </button>
                <button class="text-blue-600 hover:bg-blue-50 p-2 rounded btn-edit-item" data-id="${item.id}" title="Edit">
                    <i class="fas fa-edit pointer-events-none"></i>
                </button>
                <button class="text-red-500 hover:bg-red-50 p-2 rounded btn-delete-item" data-id="${item.id}" title="Delete">
                    <i class="fas fa-trash pointer-events-none"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    document.querySelectorAll('.btn-item-history').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const item = await localDB.items.get(id);
            if (item) openItemHistoryModal(item);
        });
    });

    document.querySelectorAll('.btn-edit-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const item = await localDB.items.get(id);
            if (item) openModal(item);
        });
    });

    document.querySelectorAll('.btn-delete-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Delete this item?')) return;
            const id = e.currentTarget.getAttribute('data-id');
            if (window.db) {
                await window.db.ref(`items/${id}`).remove();
            } else {
                await localDB.items.delete(id);
                await renderAllLocal();
            }
            showToast('Item deleted', 'info');
        });
    });
}

// -----------------------------------------------------------------------
// DASHBOARD
// -----------------------------------------------------------------------
async function renderDashboard() {
    const today = getTodayString();
    const allSales = await localDB.sales.toArray();
    const allItems = await localDB.items.toArray();

    const todaySales = allSales.filter(s => s.date === today);
    const totalRevenue = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    let svcCount = 0;
    todaySales.forEach(s => {
        const services = Array.isArray(s.items) ? s.items.filter(i => i.category === 'Service') : [];
        svcCount += services.length;
    });

    const lowStockItems = allItems.filter(i => i.category !== 'Service' && i.quantity <= i.lowStockLimit);

    UIElements.todaySalesVal.textContent = totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2 });
    UIElements.todayServicesVal.textContent = svcCount;
    UIElements.lowStockVal.textContent = lowStockItems.length;

    const recentSales = [...allSales]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 5);

    if (UIElements.recentSalesList) {
        if (recentSales.length === 0) {
            UIElements.recentSalesList.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-400">No sales yet today</td></tr>`;
        } else {
            UIElements.recentSalesList.innerHTML = recentSales.map(s => `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-2 text-sm text-gray-500">${s.date}</td>
                    <td class="p-2 font-medium">${s.customerName || '-'}</td>
                    <td class="p-2"><span class="bg-gray-100 px-2 py-0.5 rounded text-sm">${s.bikeNumber || '-'}</span></td>
                    <td class="p-2 font-bold text-green-700">Rs. ${(s.totalAmount || 0).toFixed(2)}</td>
                </tr>`).join('');
        }
    }

    if (UIElements.lowStockAlerts) {
        if (lowStockItems.length === 0) {
            UIElements.lowStockAlerts.innerHTML = `<p class="text-green-600 text-sm"><i class="fas fa-check-circle mr-1"></i>All items are well stocked!</p>`;
        } else {
            UIElements.lowStockAlerts.innerHTML = lowStockItems.map(i => `
                <div class="flex items-center justify-between py-2 border-b last:border-0">
                    <span class="text-sm font-medium text-gray-700">${i.itemName}</span>
                    <span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">
                        Stock: ${i.quantity} / Min: ${i.lowStockLimit}
                    </span>
                </div>`).join('');
        }
    }
}

// -----------------------------------------------------------------------
// BILLING – Part Number Search
// -----------------------------------------------------------------------
async function handlePartSearch() {
    const query = UIElements.partNumberSearch.value.trim().toLowerCase();
    if (!query) {
        UIElements.partSearchResults.classList.add('hidden');
        return;
    }

    const items = await localDB.items.toArray();
    const matches = items.filter(i =>
        (i.partNumber && i.partNumber.toLowerCase().includes(query)) ||
        i.itemName.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
        UIElements.partSearchResults.innerHTML = `<div class="text-gray-400">No items found</div>`;
    } else {
        UIElements.partSearchResults.innerHTML = matches.map(i => `
            <div data-id="${i.id}" class="part-result-item">
                <span class="font-mono text-blue-600 text-xs mr-2">${i.partNumber || ''}</span>
                <span class="font-medium">${i.itemName}</span>
                <span class="text-gray-400 ml-2 text-xs">— Rs. ${i.price.toFixed(2)} (Stock: ${i.category === 'Service' ? '∞' : i.quantity})</span>
            </div>`).join('');

        UIElements.partSearchResults.querySelectorAll('.part-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-id');
                UIElements.billItemSelect.value = id;
                UIElements.partNumberSearch.value = el.querySelector('.font-medium').textContent;
                UIElements.partSearchResults.classList.add('hidden');
            });
        });
    }
    UIElements.partSearchResults.classList.remove('hidden');
}

async function updateBillingOptions() {
    const items = await localDB.items.toArray();
    UIElements.billItemSelect.innerHTML =
        '<option value="">-- Select Item / Service --</option>' +
        items.map(i => {
            const outOfStock = i.category !== 'Service' && i.quantity <= 0;
            return `<option value="${i.id}" ${outOfStock ? 'disabled' : ''}>
                ${i.itemName}${i.partNumber ? ' [' + i.partNumber + ']' : ''} (${i.category === 'Service' ? '∞' : 'Stock: ' + i.quantity}) — Rs. ${i.price.toFixed(2)}
            </option>`;
        }).join('');

    await updateTechnicianDropdown();
}

async function addToBill() {
    const itemId = UIElements.billItemSelect.value;
    const qty = parseInt(UIElements.billItemQty.value);

    if (!itemId || isNaN(qty) || qty <= 0) {
        showToast('Select a valid item and quantity', 'error'); return;
    }

    const item = await localDB.items.get(itemId);
    if (!item) { showToast('Item not found', 'error'); return; }
    if (item.category !== 'Service' && item.quantity < qty) {
        showToast(`Only ${item.quantity} in stock!`, 'error'); return;
    }

    const existing = currentBillItems.findIndex(i => i.id === itemId);
    if (existing >= 0) {
        currentBillItems[existing].qty += qty;
        currentBillItems[existing].total = currentBillItems[existing].qty * item.price;
    } else {
        currentBillItems.push({
            id: item.id,
            itemName: item.itemName,
            partNumber: item.partNumber || '',
            price: item.price,
            qty,
            total: item.price * qty,
            category: item.category
        });
    }

    renderBillItems();
    UIElements.billItemSelect.value = '';
    UIElements.billItemQty.value = '1';
    UIElements.partNumberSearch.value = '';
}

function renderBillItems() {
    if (currentBillItems.length === 0) {
        UIElements.billItemsList.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400 text-sm">No items added yet</td></tr>`;
    } else {
        UIElements.billItemsList.innerHTML = currentBillItems.map((item, index) => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-2">${item.itemName}</td>
                <td class="p-2 font-mono text-xs text-gray-500">${item.partNumber || '—'}</td>
                <td class="p-2">Rs. ${item.price.toFixed(2)}</td>
                <td class="p-2">${item.qty}</td>
                <td class="p-2 font-bold">Rs. ${item.total.toFixed(2)}</td>
                <td class="p-2 text-center">
                    <button class="text-red-500 hover:text-red-700 p-1 btn-remove-bill-item" data-index="${index}">
                        <i class="fas fa-times pointer-events-none"></i>
                    </button>
                </td>
            </tr>`).join('');
    }

    const total = currentBillItems.reduce((sum, i) => sum + i.total, 0);
    UIElements.billTotalAmount.textContent = total.toFixed(2);

    document.querySelectorAll('.btn-remove-bill-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentBillItems.splice(parseInt(e.currentTarget.getAttribute('data-index')), 1);
            renderBillItems();
        });
    });
}

// -----------------------------------------------------------------------
// BILLING – Bike Number Auto-fill
// -----------------------------------------------------------------------
async function handleBikeNumberInput() {
    const bikeNum = UIElements.billBikeNumber.value.trim().toUpperCase();
    const indicator = UIElements.bikeAutofillIndicator;

    if (bikeNum.length < 3) {
        indicator.classList.add('hidden');
        return;
    }

    // Search in customers table
    const allCustomers = await localDB.customers.toArray();
    const match = allCustomers.find(c =>
        c.bikeNumber && c.bikeNumber.toUpperCase() === bikeNum
    );

    if (match) {
        // Only fill if fields are currently empty
        if (!UIElements.billCustomerName.value.trim()) {
            UIElements.billCustomerName.value = match.name || '';
        }
        if (!UIElements.billPhone.value.trim()) {
            UIElements.billPhone.value = match.phone !== 'N/A' ? match.phone : '';
        }
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

async function completeSaleAndPrint() {
    // First save the sale
    const saved = await completeSale();
    // If sale was saved successfully, print
    if (saved) {
        printBill(saved);
    }
}

async function completeSale() {
    const customerName = UIElements.billCustomerName.value.trim();
    const phone = UIElements.billPhone.value.trim() || 'N/A';
    const bikeNumber = UIElements.billBikeNumber.value.trim();
    const technician = UIElements.billTechnician.value.trim() || 'Unspecified';

    if (currentBillItems.length === 0) {
        showToast('Add items to the bill first!', 'error'); return;
    }

    if (phone !== 'N/A' || bikeNumber) {
        const custId = phone !== 'N/A' ? phone : bikeNumber;
        const custData = { id: custId, name: customerName || 'Walk-in', phone, bikeNumber, lastServiceDate: getTodayString() };
        if (window.db) {
            await window.db.ref(`customers/${custId}`).set(custData);
        } else {
            await localDB.customers.put(custData);
        }
    }

    const saleTotal = currentBillItems.reduce((sum, i) => sum + i.total, 0);
    const saleId = Date.now().toString();
    const saleData = {
        id: saleId, customerName: customerName || 'Walk-in', phone, bikeNumber,
        date: getTodayString(), items: currentBillItems, totalAmount: saleTotal,
        technicianName: technician, timestamp: Date.now()
    };

    try {
        if (window.db) {
            await window.db.ref(`sales/${saleId}`).set(saleData);
            for (const billItem of currentBillItems) {
                if (billItem.category !== 'Service') {
                    const ref = window.db.ref(`items/${billItem.id}`);
                    const snapshot = await ref.once('value');
                    if (snapshot.exists()) {
                        const newQty = Math.max(0, snapshot.val().quantity - billItem.qty);
                        await ref.update({ quantity: newQty });
                    }
                }
            }
        } else {
            await localDB.sales.put(saleData);
            for (const billItem of currentBillItems) {
                if (billItem.category !== 'Service') {
                    const dbItem = await localDB.items.get(billItem.id);
                    if (dbItem) await localDB.items.update(billItem.id, { quantity: Math.max(0, dbItem.quantity - billItem.qty) });
                }
            }
            await renderAllLocal();
        }

        showToast('✅ Sale completed & saved!');

        // Capture bill data BEFORE clearing for print
        const savedSaleData = { ...saleData };

        currentBillItems = [];
        renderBillItems();
        UIElements.billCustomerName.value = '';
        UIElements.billBikeNumber.value = '';
        UIElements.billPhone.value = '';
        UIElements.billTechnician.value = '';
        if (UIElements.bikeAutofillIndicator) UIElements.bikeAutofillIndicator.classList.add('hidden');

        return savedSaleData;  // return for print

    } catch (e) {
        showToast('Error completing sale', 'error');
        console.error(e);
        return null;
    }
}

// -----------------------------------------------------------------------
// PRINT BILL
// -----------------------------------------------------------------------
function printBill(saleDataOverride = null) {
    // Use override data (from completeSaleAndPrint) OR current form + bill items
    const useOverride = saleDataOverride && saleDataOverride.items && saleDataOverride.items.length > 0;

    const itemsToPrint = useOverride ? saleDataOverride.items : currentBillItems;

    if (!useOverride && currentBillItems.length === 0) {
        showToast('Add items to the bill before printing!', 'error');
        return;
    }

    const shop = JSON.parse(localStorage.getItem('shopSettings') || '{}');
    const shopName = shop.name || 'Moto POS';
    const shopAddress = shop.address || '';
    const shopPhone = shop.phone || '';
    const shopNote = shop.note || 'Thank you for your business!';
    const shopLogo = shop.logo || '';

    const customerName = useOverride ? (saleDataOverride.customerName || 'Walk-in') : (UIElements.billCustomerName.value.trim() || 'Walk-in');
    const bikeNumber = useOverride ? (saleDataOverride.bikeNumber || 'N/A') : (UIElements.billBikeNumber.value.trim() || 'N/A');
    const phone = useOverride ? (saleDataOverride.phone || 'N/A') : (UIElements.billPhone.value.trim() || 'N/A');
    const technician = useOverride ? (saleDataOverride.technicianName || 'N/A') : (UIElements.billTechnician.value.trim() || 'N/A');
    const total = itemsToPrint.reduce((sum, i) => sum + i.total, 0);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
    const billNo = `BILL-${Date.now().toString().slice(-6)}`;

    const logoHtml = shopLogo
        ? `<img src="${shopLogo}" style="max-height:70px;max-width:160px;object-fit:contain;display:block;margin:0 auto 4px;" />`
        : '';

    const itemRows = itemsToPrint.map(i => `
        <tr>
            <td style="padding:3px 4px;border-bottom:1px dashed #ccc;">${i.itemName}${i.partNumber ? '<br><span style="font-size:10px;color:#666">' + i.partNumber + '</span>' : ''}</td>
            <td style="padding:3px 4px;text-align:center;border-bottom:1px dashed #ccc;">${i.qty}</td>
            <td style="padding:3px 4px;text-align:right;border-bottom:1px dashed #ccc;">Rs.${i.price.toFixed(2)}</td>
            <td style="padding:3px 4px;text-align:right;border-bottom:1px dashed #ccc;font-weight:bold;">Rs.${i.total.toFixed(2)}</td>
        </tr>`).join('');

    const printContent = `
        <div style="font-family:'Courier New',monospace;font-size:12px;width:100%;max-width:300px;margin:0 auto;padding:10px;">
            ${logoHtml}
            <h2 style="text-align:center;font-size:16px;margin:4px 0;font-family:sans-serif;">${shopName}</h2>
            ${shopAddress ? `<p style="text-align:center;margin:2px 0;font-size:11px;">${shopAddress}</p>` : ''}
            ${shopPhone ? `<p style="text-align:center;margin:2px 0;font-size:11px;">Tel: ${shopPhone}</p>` : ''}
            <hr style="border:none;border-top:2px dashed #000;margin:8px 0;">
            <table style="width:100%;font-size:11px;">
                <tr><td>Bill No:</td><td style="text-align:right;">${billNo}</td></tr>
                <tr><td>Date:</td><td style="text-align:right;">${dateStr} ${timeStr}</td></tr>
                <tr><td>Customer:</td><td style="text-align:right;">${customerName}</td></tr>
                <tr><td>Bike No:</td><td style="text-align:right;">${bikeNumber}</td></tr>
                <tr><td>Phone:</td><td style="text-align:right;">${phone}</td></tr>
                <tr><td>Technician:</td><td style="text-align:right;">${technician}</td></tr>
            </table>
            <hr style="border:none;border-top:2px dashed #000;margin:8px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead>
                    <tr style="background:#f5f5f5;">
                        <th style="padding:3px 4px;text-align:left;border-bottom:2px solid #000;">Item</th>
                        <th style="padding:3px 4px;text-align:center;border-bottom:2px solid #000;">Qty</th>
                        <th style="padding:3px 4px;text-align:right;border-bottom:2px solid #000;">Rate</th>
                        <th style="padding:3px 4px;text-align:right;border-bottom:2px solid #000;">Total</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>
            <hr style="border:none;border-top:2px solid #000;margin:8px 0;">
            <table style="width:100%;font-size:13px;">
                <tr>
                    <td style="font-weight:bold;font-size:14px;">TOTAL</td>
                    <td style="text-align:right;font-weight:bold;font-size:15px;">Rs. ${total.toFixed(2)}</td>
                </tr>
            </table>
            <hr style="border:none;border-top:2px dashed #000;margin:8px 0;">
            <p style="text-align:center;font-size:11px;margin:4px 0;">${shopNote}</p>
            <p style="text-align:center;font-size:10px;color:#888;margin-top:8px;">Powered by Moto POS</p>
        </div>`;

    document.getElementById('print-area').innerHTML = printContent;
    document.getElementById('print-area').style.display = 'block';
    window.print();
    document.getElementById('print-area').style.display = 'none';
}

// -----------------------------------------------------------------------
// TECHNICIANS
// -----------------------------------------------------------------------
async function addTechnician() {
    const name = UIElements.technicianNameInput.value.trim();
    if (!name) { showToast('Enter a technician name!', 'error'); return; }

    const id = Date.now().toString();
    const data = { id, name };

    try {
        if (window.db) {
            await window.db.ref(`technicians/${id}`).set(data);
        } else {
            await localDB.technicians.put(data);
            await renderTechnicians();
            await updateTechnicianDropdown();
        }
        UIElements.technicianNameInput.value = '';
        showToast(`Technician "${name}" added!`);
    } catch (e) {
        showToast('Failed to add technician', 'error');
        console.error(e);
    }
}

async function renderTechnicians() {
    const techs = await localDB.technicians.toArray();
    if (!UIElements.techniciansList) return;

    if (techs.length === 0) {
        UIElements.techniciansList.innerHTML = `<p class="text-gray-400 text-sm text-center py-4"><i class="fas fa-user-slash text-2xl block mb-2"></i>No technicians yet. Add one above.</p>`;
        return;
    }

    UIElements.techniciansList.innerHTML = techs.map(t => `
        <div class="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    ${t.name.charAt(0).toUpperCase()}
                </div>
                <span class="font-medium text-gray-800">${t.name}</span>
            </div>
            <button class="text-red-500 hover:bg-red-50 p-2 rounded btn-delete-tech" data-id="${t.id}" title="Delete">
                <i class="fas fa-trash text-sm pointer-events-none"></i>
            </button>
        </div>`).join('');

    document.querySelectorAll('.btn-delete-tech').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Delete this technician?')) return;
            const id = e.currentTarget.getAttribute('data-id');
            if (window.db) {
                await window.db.ref(`technicians/${id}`).remove();
            } else {
                await localDB.technicians.delete(id);
                await renderTechnicians();
                await updateTechnicianDropdown();
            }
            showToast('Technician deleted', 'info');
        });
    });
}

async function updateTechnicianDropdown() {
    if (!UIElements.billTechnician) return;
    const techs = await localDB.technicians.toArray();
    const current = UIElements.billTechnician.value;
    UIElements.billTechnician.innerHTML =
        '<option value="">-- Select Technician --</option>' +
        techs.map(t => `<option value="${t.name}" ${current === t.name ? 'selected' : ''}>${t.name}</option>`).join('');
}

// -----------------------------------------------------------------------
// CUSTOMERS & REPORTS
// -----------------------------------------------------------------------
async function renderCustomers() {
    const customers = await localDB.customers.toArray();
    if (customers.length === 0) {
        UIElements.customersList.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-400"><i class="fas fa-users text-3xl mb-2 block"></i>No customers yet</td></tr>`;
        return;
    }
    UIElements.customersList.innerHTML = customers
        .sort((a, b) => (b.lastServiceDate || '').localeCompare(a.lastServiceDate || ''))
        .map(c => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2 font-medium">${c.name}</td>
            <td class="p-2">${c.phone}</td>
            <td class="p-2">
                <button class="bg-gray-100 hover:bg-blue-100 hover:text-blue-700 px-2 py-0.5 rounded text-sm font-mono transition btn-view-bills" data-bike="${c.bikeNumber || ''}" data-name="${c.name}" data-phone="${c.phone}">
                    ${c.bikeNumber || 'N/A'}
                </button>
            </td>
            <td class="p-2 text-sm text-gray-500">${c.lastServiceDate || '-'}</td>
            <td class="p-2">
                <button class="text-blue-600 hover:underline text-xs btn-view-bills" data-bike="${c.bikeNumber || ''}" data-name="${c.name}" data-phone="${c.phone}">
                    <i class="fas fa-receipt mr-1"></i>View
                </button>
            </td>
        </tr>`).join('');

    document.querySelectorAll('.btn-view-bills').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bikeNum = e.currentTarget.getAttribute('data-bike');
            const custName = e.currentTarget.getAttribute('data-name');
            const custPhone = e.currentTarget.getAttribute('data-phone');
            viewBillsByBike(bikeNum, custName, custPhone);
        });
    });
}

async function viewBillsByBike(bikeNumber, customerName, phone) {
    if (!bikeNumber) {
        showToast('No bike number recorded for this customer', 'info');
        return;
    }

    // Show modal
    UIElements.modalViewBill.classList.remove('hidden');
    UIElements.billModalContent.innerHTML = `<p class="text-gray-400 text-center py-6"><i class="fas fa-spinner fa-spin mr-2"></i>Loading bills...</p>`;
    UIElements.billModalCustomerInfo.innerHTML = `
        <i class="fas fa-user mr-1"></i> <strong>${customerName}</strong> &nbsp;|
        <i class="fas fa-phone ml-2 mr-1"></i> ${phone} &nbsp;|
        <i class="fas fa-motorcycle ml-2 mr-1"></i> <span class="font-mono">${bikeNumber}</span>
    `;

    const allSales = await localDB.sales.toArray();
    const bikeSales = allSales
        .filter(s => s.bikeNumber && s.bikeNumber.toUpperCase() === bikeNumber.toUpperCase())
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (bikeSales.length === 0) {
        UIElements.billModalContent.innerHTML = `<p class="text-gray-400 text-center py-6"><i class="fas fa-info-circle mr-2"></i>No bills found for this bike number.</p>`;
        return;
    }

    UIElements.billModalContent.innerHTML = bikeSales.map((sale, idx) => {
        const itemRows = (sale.items || []).map(i =>
            `<tr class="border-b last:border-0">
                <td class="py-1.5 pr-4">${i.itemName}${i.partNumber ? '<br><span class="text-xs text-gray-400 font-mono">' + i.partNumber + '</span>' : ''}</td>
                <td class="py-1.5 text-center">${i.qty}</td>
                <td class="py-1.5 text-right">Rs. ${i.price.toFixed(2)}</td>
                <td class="py-1.5 text-right font-bold">Rs. ${i.total.toFixed(2)}</td>
            </tr>`
        ).join('');
        return `
        <div class="border rounded-xl overflow-hidden">
            <div class="bg-gray-50 px-4 py-2 flex justify-between items-center">
                <span class="font-semibold text-sm text-gray-700"><i class="fas fa-calendar-alt mr-1 text-blue-400"></i>${sale.date}</span>
                <span class="font-bold text-green-700">Rs. ${(sale.totalAmount || 0).toFixed(2)}</span>
            </div>
            <div class="px-4 py-2 text-xs text-gray-500 flex gap-4">
                <span><i class="fas fa-user-cog mr-1"></i>${sale.technicianName || 'N/A'}</span>
                <span><i class="fas fa-hashtag mr-1"></i>Bill #${sale.id ? sale.id.slice(-6) : idx + 1}</span>
            </div>
            <div class="px-4 pb-3">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-xs text-gray-400 uppercase border-b">
                            <th class="pb-1 text-left">Item</th>
                            <th class="pb-1 text-center">Qty</th>
                            <th class="pb-1 text-right">Rate</th>
                            <th class="pb-1 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                </table>
            </div>
        </div>`;
    }).join('');
}

async function renderReports() {
    const allSales = await localDB.sales.reverse().limit(50).toArray();
    if (allSales.length === 0) {
        UIElements.salesList.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-400">No sales records yet</td></tr>`;
        return;
    }
    UIElements.salesList.innerHTML = allSales.map(s => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2 text-sm text-gray-500">${s.date}</td>
            <td class="p-2">${s.customerName}</td>
            <td class="p-2 font-medium">${s.bikeNumber || '-'}</td>
            <td class="p-2 font-bold text-green-700">Rs. ${(s.totalAmount || 0).toFixed(2)}</td>
        </tr>`).join('');
}

// -----------------------------------------------------------------------
// PARTS RECEIVING
// -----------------------------------------------------------------------
let _itemHistoryCurrentItemId = null;
let _itemHistoryCurrentTab = 'sales';

async function openReceivingModal(receiving = null) {
    // Populate item dropdown
    await updateReceivingItemDropdown();

    if (receiving) {
        UIElements.receivingId.value = receiving.id;
        UIElements.receivingDate.value = receiving.date || getTodayString();
        UIElements.receivingSupplier.value = receiving.supplier || '';
        UIElements.receivingItemLink.value = receiving.itemId || '';
        UIElements.receivingPartName.value = receiving.partName || '';
        UIElements.receivingPartNumber.value = receiving.partNumber || '';
        UIElements.receivingQty.value = receiving.qty || '';
        UIElements.receivingUnitCost.value = receiving.unitCost || '';
        UIElements.receivingTotalCost.value = receiving.totalCost || '';
        UIElements.receivingInvoice.value = receiving.invoiceNo || '';
        UIElements.receivingUpdateStock.checked = false; // don't re-add stock on edit
        UIElements.receivingNotes.value = receiving.notes || '';
    } else {
        UIElements.receivingId.value = '';
        UIElements.receivingDate.value = getTodayString();
        UIElements.receivingSupplier.value = '';
        UIElements.receivingItemLink.value = '';
        UIElements.receivingPartName.value = '';
        UIElements.receivingPartNumber.value = '';
        UIElements.receivingQty.value = '';
        UIElements.receivingUnitCost.value = '';
        UIElements.receivingTotalCost.value = '';
        UIElements.receivingInvoice.value = '';
        UIElements.receivingUpdateStock.checked = true;
        UIElements.receivingNotes.value = '';
    }
    UIElements.modalAddReceiving.classList.remove('hidden');
}

function closeReceivingModal() {
    UIElements.modalAddReceiving.classList.add('hidden');
}

function calcReceivingTotal() {
    const qty = parseFloat(UIElements.receivingQty.value) || 0;
    const unitCost = parseFloat(UIElements.receivingUnitCost.value) || 0;
    UIElements.receivingTotalCost.value = (qty * unitCost).toFixed(2);
}

async function updateReceivingItemDropdown() {
    const items = await localDB.items.toArray();
    UIElements.receivingItemLink.innerHTML =
        '<option value="">-- Select Item (auto-fills part name & number) --</option>' +
        items.map(i => `<option value="${i.id}">${i.itemName}${i.partNumber ? ' [' + i.partNumber + ']' : ''}</option>`).join('');
}

async function saveReceiving() {
    const id = UIElements.receivingId.value || Date.now().toString();
    const isEdit = !!UIElements.receivingId.value;

    const partName = UIElements.receivingPartName.value.trim();
    const supplier = UIElements.receivingSupplier.value.trim();
    const qty = parseInt(UIElements.receivingQty.value);
    const unitCost = parseFloat(UIElements.receivingUnitCost.value);

    if (!partName || !supplier || isNaN(qty) || qty <= 0 || isNaN(unitCost)) {
        showToast('Please fill all required fields (Date, Supplier, Part Name, Qty, Unit Cost)!', 'error');
        return;
    }

    const totalCost = qty * unitCost;
    const linkedItemId = UIElements.receivingItemLink.value || null;

    const data = {
        id,
        date: UIElements.receivingDate.value || getTodayString(),
        supplier,
        partName,
        partNumber: UIElements.receivingPartNumber.value.trim(),
        itemId: linkedItemId,
        qty,
        unitCost,
        totalCost,
        invoiceNo: UIElements.receivingInvoice.value.trim(),
        notes: UIElements.receivingNotes.value.trim(),
        timestamp: isEdit ? (data && data.timestamp ? data.timestamp : Date.now()) : Date.now()
    };
    // Fix timestamp for new records
    if (!isEdit) data.timestamp = Date.now();

    const shouldUpdateStock = UIElements.receivingUpdateStock.checked && linkedItemId && !isEdit;

    try {
        if (window.db) {
            await window.db.ref(`receivings/${id}`).set(data);
            if (shouldUpdateStock) {
                const ref = window.db.ref(`items/${linkedItemId}`);
                const snap = await ref.once('value');
                if (snap.exists()) {
                    await ref.update({ quantity: (snap.val().quantity || 0) + qty });
                }
            }
        } else {
            await localDB.receivings.put(data);
            if (shouldUpdateStock) {
                const dbItem = await localDB.items.get(linkedItemId);
                if (dbItem) {
                    await localDB.items.update(linkedItemId, { quantity: (dbItem.quantity || 0) + qty });
                    await renderInventory();
                    await renderDashboard();
                    await updateBillingOptions();
                }
            }
            await renderReceivings();
        }
        closeReceivingModal();
        showToast(isEdit ? '✅ Receiving updated!' : `✅ Parts received! ${shouldUpdateStock ? 'Stock updated.' : ''}`);
    } catch (e) {
        showToast('Failed to save receiving!', 'error');
        console.error(e);
    }
}

async function renderReceivings() {
    if (!UIElements.receivingsList) return;

    let receivings = await localDB.receivings.toArray();
    receivings.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Apply filters
    const search = (UIElements.receivingSearch?.value || '').trim().toLowerCase();
    const monthFilter = UIElements.receivingFilterMonth?.value || '';

    if (search) {
        receivings = receivings.filter(r =>
            (r.supplier || '').toLowerCase().includes(search) ||
            (r.partName || '').toLowerCase().includes(search) ||
            (r.partNumber || '').toLowerCase().includes(search) ||
            (r.invoiceNo || '').toLowerCase().includes(search)
        );
    }
    if (monthFilter) {
        receivings = receivings.filter(r => (r.date || '').startsWith(monthFilter));
    }

    // Update stats
    const allRec = await localDB.receivings.toArray();
    const nowMonth = new Date();
    const currentMonthStr = `${nowMonth.getFullYear()}-${String(nowMonth.getMonth() + 1).padStart(2, '0')}`;
    const monthCost = allRec.filter(r => (r.date || '').startsWith(currentMonthStr))
        .reduce((s, r) => s + (r.totalCost || 0), 0);
    const uniqueSuppliers = new Set(allRec.map(r => r.supplier)).size;

    if (UIElements.receivingTotalCount) UIElements.receivingTotalCount.textContent = allRec.length;
    if (UIElements.receivingMonthCost) UIElements.receivingMonthCost.textContent = monthCost.toFixed(2);
    if (UIElements.receivingSupplierCount) UIElements.receivingSupplierCount.textContent = uniqueSuppliers;

    if (receivings.length === 0) {
        UIElements.receivingsList.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-gray-400"><i class="fas fa-truck text-3xl mb-2 block"></i>${search || monthFilter ? 'No records match your filter.' : 'No parts received yet. Click "Add Received Parts" to start.'}</td></tr>`;
        return;
    }

    UIElements.receivingsList.innerHTML = receivings.map(r => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3 text-sm text-gray-600">${r.date || '-'}</td>
            <td class="p-3 font-medium text-gray-800">
                <span class="inline-flex items-center gap-1">
                    <i class="fas fa-truck text-emerald-500 text-xs"></i>
                    ${r.supplier || '-'}
                </span>
            </td>
            <td class="p-3">${r.partName || '-'}</td>
            <td class="p-3 font-mono text-xs text-gray-500">${r.partNumber || '<span class="text-gray-300">—</span>'}</td>
            <td class="p-3 font-bold text-center">${r.qty || 0}</td>
            <td class="p-3">Rs. ${(r.unitCost || 0).toFixed(2)}</td>
            <td class="p-3 font-bold text-emerald-700">Rs. ${(r.totalCost || 0).toFixed(2)}</td>
            <td class="p-3 text-xs text-gray-500 font-mono">${r.invoiceNo || '<span class="text-gray-300">—</span>'}</td>
            <td class="p-3 flex gap-1">
                <button class="text-blue-500 hover:bg-blue-50 p-1.5 rounded btn-edit-receiving" data-id="${r.id}" title="Edit">
                    <i class="fas fa-edit text-xs pointer-events-none"></i>
                </button>
                <button class="text-red-500 hover:bg-red-50 p-1.5 rounded btn-delete-receiving" data-id="${r.id}" title="Delete">
                    <i class="fas fa-trash text-xs pointer-events-none"></i>
                </button>
            </td>
        </tr>`).join('');

    document.querySelectorAll('.btn-edit-receiving').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const rec = await localDB.receivings.get(id);
            if (rec) openReceivingModal(rec);
        });
    });

    document.querySelectorAll('.btn-delete-receiving').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Delete this receiving record?')) return;
            const id = e.currentTarget.getAttribute('data-id');
            if (window.db) {
                await window.db.ref(`receivings/${id}`).remove();
            } else {
                await localDB.receivings.delete(id);
                await renderReceivings();
            }
            showToast('Receiving record deleted', 'info');
        });
    });
}

// -----------------------------------------------------------------------
// ITEM HISTORY MODAL
// -----------------------------------------------------------------------
async function openItemHistoryModal(item) {
    _itemHistoryCurrentItemId = item.id;
    _itemHistoryCurrentTab = 'sales';

    UIElements.itemHistoryTitle.textContent = item.itemName;
    UIElements.itemHistoryInfo.innerHTML = `
        <div class="flex flex-wrap gap-4 items-center">
            <span><i class="fas fa-box mr-1"></i><strong>${item.itemName}</strong></span>
            ${item.partNumber ? `<span class="font-mono text-xs bg-blue-100 px-2 py-0.5 rounded">${item.partNumber}</span>` : ''}
            <span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">${item.category}</span>
            <span>Price: <strong>Rs. ${item.price.toFixed(2)}</strong></span>
            ${item.costPrice > 0 ? `<span>Cost: <strong>Rs. ${item.costPrice.toFixed(2)}</strong></span>` : ''}
            <span>Stock: <strong class="${item.quantity <= item.lowStockLimit ? 'text-red-600' : 'text-green-700'}">${item.category === 'Service' ? '∞' : item.quantity}</strong></span>
        </div>`;

    UIElements.modalItemHistory.classList.remove('hidden');
    switchItemHistoryTab('sales');
}

function switchItemHistoryTab(tab) {
    _itemHistoryCurrentTab = tab;
    // Update tab button styles
    if (tab === 'sales') {
        UIElements.ihTabSales.className = 'py-2 px-4 text-sm font-medium border-b-2 border-blue-500 text-blue-600 mr-2';
        UIElements.ihTabReceiving.className = 'py-2 px-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    } else {
        UIElements.ihTabSales.className = 'py-2 px-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 mr-2';
        UIElements.ihTabReceiving.className = 'py-2 px-4 text-sm font-medium border-b-2 border-emerald-500 text-emerald-600';
    }
    renderItemHistoryContent();
}

async function renderItemHistoryContent() {
    const itemId = _itemHistoryCurrentItemId;
    if (!itemId) return;

    UIElements.itemHistoryContent.innerHTML = `<p class="text-gray-400 text-center py-6"><i class="fas fa-spinner fa-spin mr-2"></i>Loading...</p>`;

    if (_itemHistoryCurrentTab === 'sales') {
        // Find all sales containing this item
        const allSales = await localDB.sales.toArray();
        const itemSales = [];
        allSales.forEach(sale => {
            if (!Array.isArray(sale.items)) return;
            const found = sale.items.find(i => i.id === itemId);
            if (found) itemSales.push({ sale, lineItem: found });
        });
        itemSales.sort((a, b) => (b.sale.timestamp || 0) - (a.sale.timestamp || 0));

        if (itemSales.length === 0) {
            UIElements.itemHistoryContent.innerHTML = `<div class="text-center py-8 text-gray-400"><i class="fas fa-box-open text-3xl mb-3 block"></i><p>This item has not been sold yet.</p></div>`;
            return;
        }

        // Summary
        const totalQtySold = itemSales.reduce((s, x) => s + x.lineItem.qty, 0);
        const totalRevenue = itemSales.reduce((s, x) => s + x.lineItem.total, 0);

        UIElements.itemHistoryContent.innerHTML = `
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-blue-50 rounded-xl p-3 text-center">
                    <p class="text-xs text-blue-600 font-semibold uppercase">Total sold</p>
                    <p class="text-xl font-bold text-blue-800">${totalQtySold} units</p>
                </div>
                <div class="bg-green-50 rounded-xl p-3 text-center">
                    <p class="text-xs text-green-600 font-semibold uppercase">Total Revenue</p>
                    <p class="text-xl font-bold text-green-800">Rs. ${totalRevenue.toFixed(2)}</p>
                </div>
                <div class="bg-purple-50 rounded-xl p-3 text-center">
                    <p class="text-xs text-purple-600 font-semibold uppercase">Transactions</p>
                    <p class="text-xl font-bold text-purple-800">${itemSales.length}</p>
                </div>
            </div>
            <div class="space-y-2">
                ${itemSales.map(({ sale, lineItem }) => `
                <div class="border rounded-xl p-4 hover:bg-gray-50">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-semibold text-sm text-gray-800">
                                <i class="fas fa-calendar-alt mr-1 text-blue-400"></i>${sale.date}
                                <span class="ml-3 text-gray-400 text-xs font-normal">Bill #${sale.id ? sale.id.slice(-6) : '—'}</span>
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                                <i class="fas fa-user mr-1"></i>${sale.customerName || 'Walk-in'}
                                ${sale.bikeNumber ? `<span class="ml-2"><i class="fas fa-motorcycle mr-1"></i><span class="font-mono">${sale.bikeNumber}</span></span>` : ''}
                                ${sale.technicianName && sale.technicianName !== 'Unspecified' ? `<span class="ml-2"><i class="fas fa-user-cog mr-1"></i>${sale.technicianName}</span>` : ''}
                            </p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-gray-800">Qty: ${lineItem.qty}</p>
                            <p class="text-green-700 font-bold text-sm">Rs. ${lineItem.total.toFixed(2)}</p>
                            <p class="text-xs text-gray-400">@ Rs. ${lineItem.price.toFixed(2)}</p>
                        </div>
                    </div>
                </div>`).join('')}
            </div>`;

    } else {
        // Receiving history for this item
        const allRec = await localDB.receivings.toArray();
        const itemRec = allRec
            .filter(r => r.itemId === itemId)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (itemRec.length === 0) {
            UIElements.itemHistoryContent.innerHTML = `<div class="text-center py-8 text-gray-400"><i class="fas fa-truck text-3xl mb-3 block"></i><p>No receiving records linked to this item.</p><p class="text-xs mt-2">When adding a receiving, link it to this item using the inventory dropdown.</p></div>`;
            return;
        }

        const totalQtyReceived = itemRec.reduce((s, r) => s + (r.qty || 0), 0);
        const totalCostSpent = itemRec.reduce((s, r) => s + (r.totalCost || 0), 0);

        UIElements.itemHistoryContent.innerHTML = `
            <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-emerald-50 rounded-xl p-3 text-center">
                    <p class="text-xs text-emerald-600 font-semibold uppercase">Total Received</p>
                    <p class="text-xl font-bold text-emerald-800">${totalQtyReceived} units</p>
                </div>
                <div class="bg-orange-50 rounded-xl p-3 text-center">
                    <p class="text-xs text-orange-600 font-semibold uppercase">Total Cost</p>
                    <p class="text-xl font-bold text-orange-800">Rs. ${totalCostSpent.toFixed(2)}</p>
                </div>
                <div class="bg-teal-50 rounded-xl p-3 text-center">
                    <p class="text-xs text-teal-600 font-semibold uppercase">Suppliers Used</p>
                    <p class="text-xl font-bold text-teal-800">${new Set(itemRec.map(r => r.supplier)).size}</p>
                </div>
            </div>
            <div class="space-y-2">
                ${itemRec.map(r => `
                <div class="border rounded-xl p-4 hover:bg-gray-50">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-semibold text-sm text-gray-800">
                                <i class="fas fa-calendar-alt mr-1 text-emerald-400"></i>${r.date || '-'}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                                <i class="fas fa-truck mr-1 text-emerald-500"></i><strong>${r.supplier}</strong>
                                ${r.invoiceNo ? `<span class="ml-2 font-mono bg-gray-100 px-1 rounded">${r.invoiceNo}</span>` : ''}
                            </p>
                            ${r.notes ? `<p class="text-xs text-gray-400 mt-1 italic">${r.notes}</p>` : ''}
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-gray-800">Qty: ${r.qty}</p>
                            <p class="text-emerald-700 font-bold text-sm">Rs. ${(r.totalCost || 0).toFixed(2)}</p>
                            <p class="text-xs text-gray-400">@ Rs. ${(r.unitCost || 0).toFixed(2)} each</p>
                        </div>
                    </div>
                </div>`).join('')}
            </div>`;
    }
}

// -----------------------------------------------------------------------
// SHOP SETTINGS
// -----------------------------------------------------------------------
function loadShopSettings() {
    const shop = JSON.parse(localStorage.getItem('shopSettings') || '{}');
    if (UIElements.shopName) UIElements.shopName.value = shop.name || '';
    if (UIElements.shopAddress) UIElements.shopAddress.value = shop.address || '';
    if (UIElements.shopPhone) UIElements.shopPhone.value = shop.phone || '';
    if (UIElements.shopNote) UIElements.shopNote.value = shop.note || '';

    if (shop.logo) {
        UIElements.shopLogoPreview.src = shop.logo;
        UIElements.shopLogoPreview.classList.remove('hidden');
        UIElements.btnRemoveLogo.classList.remove('hidden');
    }

    // Update sidebar shop name
    if (UIElements.sidebarShopName && shop.name) {
        UIElements.sidebarShopName.innerHTML = `<i class="fas fa-motorcycle mr-2"></i>${shop.name}`;
    }

    updateBillHeaderPreview();
}

function saveShopSettings() {
    const shop = JSON.parse(localStorage.getItem('shopSettings') || '{}');
    shop.name = UIElements.shopName.value.trim();
    shop.address = UIElements.shopAddress.value.trim();
    shop.phone = UIElements.shopPhone.value.trim();
    shop.note = UIElements.shopNote.value.trim();
    localStorage.setItem('shopSettings', JSON.stringify(shop));

    // Update sidebar
    if (UIElements.sidebarShopName && shop.name) {
        UIElements.sidebarShopName.innerHTML = `<i class="fas fa-motorcycle mr-2"></i>${shop.name}`;
    }

    updateBillHeaderPreview();
    UIElements.shopSettingsStatus.textContent = '✅ Settings saved!';
    UIElements.shopSettingsStatus.className = 'mt-3 text-sm font-medium text-green-600';
    showToast('Shop settings saved!');
    setTimeout(() => { UIElements.shopSettingsStatus.textContent = ''; }, 3000);
}

function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
        showToast('Logo file too large (max 500KB)', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        const logo = ev.target.result;
        const shop = JSON.parse(localStorage.getItem('shopSettings') || '{}');
        shop.logo = logo;
        localStorage.setItem('shopSettings', JSON.stringify(shop));
        UIElements.shopLogoPreview.src = logo;
        UIElements.shopLogoPreview.classList.remove('hidden');
        UIElements.btnRemoveLogo.classList.remove('hidden');
        showToast('Logo uploaded!');
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    const shop = JSON.parse(localStorage.getItem('shopSettings') || '{}');
    delete shop.logo;
    localStorage.setItem('shopSettings', JSON.stringify(shop));
    UIElements.shopLogoPreview.src = '';
    UIElements.shopLogoPreview.classList.add('hidden');
    UIElements.btnRemoveLogo.classList.add('hidden');
    UIElements.shopLogoInput.value = '';
    showToast('Logo removed', 'info');
}

function updateBillHeaderPreview() {
    const shop = JSON.parse(localStorage.getItem('shopSettings') || '{}');
    const lines = [];
    lines.push(shop.name || 'Moto POS');
    if (shop.address) lines.push(shop.address);
    if (shop.phone) lines.push('Tel: ' + shop.phone);
    lines.push('================================');
    lines.push('Date: ' + getTodayString() + '  Time: --:--');
    lines.push('Customer: [Name]   Bike: [No.]');
    lines.push('Technician: [Name]');
    lines.push('================================');
    lines.push('Item             Qty  Rate  Total');
    lines.push('--------------------------------');
    lines.push('[Item Name]       1   xxx   xxx');
    lines.push('================================');
    lines.push('TOTAL:              Rs. xxx.xx');
    lines.push('--------------------------------');
    lines.push(shop.note || 'Thank you for your business!');
    if (UIElements.billHeaderPreview) {
        UIElements.billHeaderPreview.textContent = lines.join('\n');
    }
}

// -----------------------------------------------------------------------
// EMAILJS SETTINGS
// -----------------------------------------------------------------------
function loadEmailJsSettings() {
    const cfg = JSON.parse(localStorage.getItem('ejsConfig') || '{}');
    if (UIElements.ejsServiceId) UIElements.ejsServiceId.value = cfg.serviceId || '';
    if (UIElements.ejsTemplateId) UIElements.ejsTemplateId.value = cfg.templateId || '';
    if (UIElements.ejsPublicKey) UIElements.ejsPublicKey.value = cfg.publicKey || '';
    if (UIElements.ejsToEmail) UIElements.ejsToEmail.value = cfg.toEmail || '';
}

function getEmailJsConfig() {
    return JSON.parse(localStorage.getItem('ejsConfig') || '{}');
}

function saveEmailJsSettings() {
    const cfg = {
        serviceId: UIElements.ejsServiceId.value.trim(),
        templateId: UIElements.ejsTemplateId.value.trim(),
        publicKey: UIElements.ejsPublicKey.value.trim(),
        toEmail: UIElements.ejsToEmail.value.trim()
    };
    if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey || !cfg.toEmail) {
        showToast('Please fill all EmailJS fields!', 'error');
        setEjsStatus('All fields are required.', 'error');
        return;
    }
    localStorage.setItem('ejsConfig', JSON.stringify(cfg));
    setEjsStatus('✅ Settings saved successfully!', 'success');
    showToast('EmailJS settings saved!');
}

function setEjsStatus(msg, type = 'success') {
    if (!UIElements.ejsStatus) return;
    UIElements.ejsStatus.textContent = msg;
    UIElements.ejsStatus.className = `mt-3 text-sm font-medium ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
}

async function testEmailJs() {
    const cfg = getEmailJsConfig();
    if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey || !cfg.toEmail) {
        showToast('Save your EmailJS settings first!', 'error');
        setEjsStatus('Please save your settings before testing.', 'error');
        return;
    }
    setEjsStatus('⏳ Sending test email...', 'success');
    try {
        emailjs.init(cfg.publicKey);
        await emailjs.send(cfg.serviceId, cfg.templateId, {
            to_email: cfg.toEmail,
            subject: '✅ Moto POS – EmailJS Test',
            message: `This is a test email from Moto POS.\n\nIf you received this, your EmailJS configuration is working correctly!\n\nDate: ${getTodayString()}`
        });
        setEjsStatus('✅ Test email sent! Check your inbox.', 'success');
        showToast('Test email sent successfully!');
    } catch (err) {
        console.error('EmailJS test error:', err);
        setEjsStatus(`❌ Error: ${err.text || err.message || 'Unknown error'}`, 'error');
        showToast('Test email failed. Check console.', 'error');
    }
}

async function sendReportViaEmail() {
    const cfg = getEmailJsConfig();
    if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey || !cfg.toEmail) {
        showToast('Configure EmailJS in Settings tab first!', 'error'); return;
    }

    showToast('Preparing report...', 'info');
    const today = getTodayString();
    const todaySales = (await localDB.sales.toArray()).filter(s => s.date === today);
    const allItems = await localDB.items.toArray();
    const total = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const lowStock = allItems.filter(i => i.category !== 'Service' && i.quantity <= i.lowStockLimit);

    const message = `
MOTO POS – Daily Report (${today})
=====================================
Total Revenue   : Rs. ${total.toFixed(2)}
Total Invoices  : ${todaySales.length}
Services Done   : ${todaySales.reduce((n, s) => n + (Array.isArray(s.items) ? s.items.filter(i => i.category === 'Service').length : 0), 0)}

LOW STOCK ALERTS (${lowStock.length})
${lowStock.length === 0 ? 'All items well stocked.' : lowStock.map(i => `• ${i.itemName}  –  Stock: ${i.quantity}  (Min: ${i.lowStockLimit})`).join('\n')}

TOP SALES TODAY
${todaySales.slice(-5).map(s => `• ${s.customerName} – Bike: ${s.bikeNumber || 'N/A'} – Rs. ${(s.totalAmount || 0).toFixed(2)}`).join('\n') || 'No sales today.'}
    `.trim();

    try {
        emailjs.init(cfg.publicKey);
        await emailjs.send(cfg.serviceId, cfg.templateId, {
            to_email: cfg.toEmail,
            subject: `Moto POS Daily Report [${today}]`,
            message
        });
        showToast('📧 Report sent successfully!');
    } catch (err) {
        console.error('EmailJS Error:', err);
        showToast(`Email failed: ${err.text || err.message}`, 'error');
    }
}

// -----------------------------------------------------------------------
// BACKUP / EXCEL EXPORT  (SheetJS)
// -----------------------------------------------------------------------

function showBackupStatus(msg) {
    const el = document.getElementById('backup-status');
    const msgEl = document.getElementById('backup-status-msg');
    if (!el || !msgEl) return;
    msgEl.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
}

async function buildSheetData(type) {
    if (type === 'sales') {
        const rows = await localDB.sales.toArray();
        const headers = ['Date', 'Customer Name', 'Phone', 'Bike Number', 'Technician', 'Items Summary', 'Total Amount (Rs.)'];
        const data = rows
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .map(s => [
                s.date || '',
                s.customerName || '',
                s.phone || '',
                s.bikeNumber || '',
                s.technicianName || '',
                Array.isArray(s.items) ? s.items.map(i => `${i.itemName} x${i.qty}`).join(', ') : '',
                parseFloat((s.totalAmount || 0).toFixed(2))
            ]);
        return { headers, data, name: 'Sales' };
    }

    if (type === 'customers') {
        const rows = await localDB.customers.toArray();
        const headers = ['Name', 'Phone', 'Bike Number', 'Last Service Date'];
        const data = rows
            .sort((a, b) => (b.lastServiceDate || '').localeCompare(a.lastServiceDate || ''))
            .map(c => [c.name || '', c.phone || '', c.bikeNumber || '', c.lastServiceDate || '']);
        return { headers, data, name: 'Customers' };
    }

    if (type === 'inventory') {
        const rows = await localDB.items.toArray();
        const headers = ['Part Number', 'Item Name', 'Category', 'Cost Price (Rs.)', 'Selling Price (Rs.)', 'Stock Qty', 'Low Stock Limit'];
        const data = rows.map(i => [
            i.partNumber || '',
            i.itemName || '',
            i.category || '',
            parseFloat((i.costPrice || 0).toFixed(2)),
            parseFloat((i.price || 0).toFixed(2)),
            i.category === 'Service' ? 'Unlimited' : (i.quantity || 0),
            i.lowStockLimit || 0
        ]);
        return { headers, data, name: 'Inventory' };
    }

    if (type === 'bills') {
        const sales = await localDB.sales.toArray();
        const headers = [
            'Bill ID', 'Date', 'Customer Name', 'Phone', 'Bike Number', 'Technician',
            'Item Name', 'Part Number', 'Qty', 'Unit Price (Rs.)', 'Line Total (Rs.)', 'Bill Total (Rs.)'
        ];
        const data = [];
        sales
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .forEach(s => {
                const billId = s.id ? 'BILL-' + s.id.slice(-6) : '';
                (s.items || []).forEach(item => {
                    data.push([
                        billId,
                        s.date || '',
                        s.customerName || '',
                        s.phone || '',
                        s.bikeNumber || '',
                        s.technicianName || '',
                        item.itemName || '',
                        item.partNumber || '',
                        item.qty || 0,
                        parseFloat((item.price || 0).toFixed(2)),
                        parseFloat((item.total || 0).toFixed(2)),
                        parseFloat((s.totalAmount || 0).toFixed(2))
                    ]);
                });
            });
        return { headers, data, name: 'Bills' };
    }

    if (type === 'technicians') {
        const rows = await localDB.technicians.toArray();
        const headers = ['ID', 'Name'];
        const data = rows.map(t => [t.id || '', t.name || '']);
        return { headers, data, name: 'Technicians' };
    }

    return null;
}

function makeWorksheet({ headers, data }) {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Auto column widths
    ws['!cols'] = headers.map((h, i) => {
        const maxLen = Math.max(
            h.length,
            ...data.map(row => String(row[i] || '').length)
        );
        return { wch: Math.min(maxLen + 4, 55) };
    });

    return ws;
}

async function exportSheet(type) {
    const today = getTodayString();

    const btnMap = {
        sales: 'btn-export-sales',
        customers: 'btn-export-customers',
        inventory: 'btn-export-inventory',
        bills: 'btn-export-bills',
        technicians: 'btn-export-technicians',
        all: 'btn-export-all'
    };

    const labelMap = {
        sales: '<i class="fas fa-download"></i> Export Sales.xlsx',
        customers: '<i class="fas fa-download"></i> Export Customers.xlsx',
        inventory: '<i class="fas fa-download"></i> Export Inventory.xlsx',
        bills: '<i class="fas fa-download"></i> Export Bills.xlsx',
        technicians: '<i class="fas fa-download"></i> Export Technicians.xlsx',
        all: '<i class="fas fa-file-excel text-green-600"></i> Export Full Backup.xlsx'
    };

    const btnId = btnMap[type];
    const btn = document.getElementById(btnId);

    // Show loading state
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    }

    try {
        if (!window.XLSX) {
            showToast('Excel library not loaded yet. Please wait a moment and try again.', 'error');
            return;
        }

        if (type === 'all') {
            const wb = XLSX.utils.book_new();
            for (const t of ['sales', 'customers', 'inventory', 'bills', 'technicians']) {
                const sheetData = await buildSheetData(t);
                if (sheetData) {
                    XLSX.utils.book_append_sheet(wb, makeWorksheet(sheetData), sheetData.name);
                }
            }
            XLSX.writeFile(wb, `MotoPOS_FullBackup_${today}.xlsx`);
            showBackupStatus(`✅ Full backup exported: MotoPOS_FullBackup_${today}.xlsx (5 sheets)`);
            showToast('📊 Full backup exported!');

        } else {
            const sheetData = await buildSheetData(type);
            if (!sheetData) { showToast('Unknown export type', 'error'); return; }

            if (sheetData.data.length === 0) {
                showToast(`No ${sheetData.name} records found to export`, 'info');
                showBackupStatus(`ℹ️ No ${sheetData.name} data to export yet.`);
                return;
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, makeWorksheet(sheetData), sheetData.name);
            XLSX.writeFile(wb, `MotoPOS_${sheetData.name}_${today}.xlsx`);
            showBackupStatus(`✅ Exported: MotoPOS_${sheetData.name}_${today}.xlsx — ${sheetData.data.length} rows`);
            showToast(`📥 ${sheetData.name} exported successfully!`);
        }

    } catch (err) {
        console.error('Export error:', err);
        showToast('Export failed. Check browser console for details.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = labelMap[type] || 'Export';
        }
    }
}
