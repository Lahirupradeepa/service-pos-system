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
        btnPrintBill: document.getElementById('btn-print-bill'),

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
    };

    setupEventListeners();
    loadEmailJsSettings();
    loadShopSettings();
    await renderAllLocal();

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
        });
    });

    UIElements.btnAddItemModal.addEventListener('click', () => openModal(null));
    UIElements.btnCancelItem.addEventListener('click', closeModal);
    UIElements.btnSaveItem.addEventListener('click', saveInventoryItem);
    UIElements.btnAddToBill.addEventListener('click', addToBill);
    UIElements.btnCheckout.addEventListener('click', completeSale);
    UIElements.btnPrintBill.addEventListener('click', printBill);
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
                ${item.itemName}
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
                <button class="text-blue-600 hover:bg-blue-50 p-2 rounded btn-edit-item" data-id="${item.id}" title="Edit">
                    <i class="fas fa-edit pointer-events-none"></i>
                </button>
                <button class="text-red-500 hover:bg-red-50 p-2 rounded btn-delete-item" data-id="${item.id}" title="Delete">
                    <i class="fas fa-trash pointer-events-none"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

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
        currentBillItems = [];
        renderBillItems();
        UIElements.billCustomerName.value = '';
        UIElements.billBikeNumber.value = '';
        UIElements.billPhone.value = '';
        UIElements.billTechnician.value = '';

    } catch (e) {
        showToast('Error completing sale', 'error');
        console.error(e);
    }
}

// -----------------------------------------------------------------------
// PRINT BILL
// -----------------------------------------------------------------------
function printBill() {
    if (currentBillItems.length === 0) {
        showToast('Add items to the bill before printing!', 'error');
        return;
    }

    const shop = JSON.parse(localStorage.getItem('shopSettings') || '{}');
    const shopName = shop.name || 'Moto POS';
    const shopAddress = shop.address || '';
    const shopPhone = shop.phone || '';
    const shopNote = shop.note || 'Thank you for your business!';
    const shopLogo = shop.logo || '';

    const customerName = UIElements.billCustomerName.value.trim() || 'Walk-in';
    const bikeNumber = UIElements.billBikeNumber.value.trim() || 'N/A';
    const phone = UIElements.billPhone.value.trim() || 'N/A';
    const technician = UIElements.billTechnician.value.trim() || 'N/A';
    const total = currentBillItems.reduce((sum, i) => sum + i.total, 0);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' });
    const billNo = `BILL-${Date.now().toString().slice(-6)}`;

    const logoHtml = shopLogo
        ? `<img src="${shopLogo}" style="max-height:70px;max-width:160px;object-fit:contain;display:block;margin:0 auto 4px;" />`
        : '';

    const itemRows = currentBillItems.map(i => `
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
        UIElements.customersList.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-400"><i class="fas fa-users text-3xl mb-2 block"></i>No customers yet</td></tr>`;
        return;
    }
    UIElements.customersList.innerHTML = customers
        .sort((a, b) => (b.lastServiceDate || '').localeCompare(a.lastServiceDate || ''))
        .map(c => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2 font-medium">${c.name}</td>
            <td class="p-2">${c.phone}</td>
            <td class="p-2"><span class="bg-gray-100 px-2 py-0.5 rounded text-sm">${c.bikeNumber || 'N/A'}</span></td>
            <td class="p-2 text-sm text-gray-500">${c.lastServiceDate || '-'}</td>
        </tr>`).join('');
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
