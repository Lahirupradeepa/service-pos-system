// Initialize Local Database
const localDB = new Dexie('MotoPOS');
localDB.version(1).stores({
    items: 'id, itemName, category, price, quantity, lowStockLimit',
    sales: 'id, customerName, phone, bikeNumber, date, items, totalAmount, technicianName',
    customers: 'id, name, phone, bikeNumber, lastServiceDate'
});

// UI Elements & State
let currentBillItems = [];
let isEditingItem = false;
let UIElements = {};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // Select Elements securely after DOM is loaded
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
        itemCategory: document.getElementById('item-category'),
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
        billItemQty: document.getElementById('bill-item-qty'),
        btnAddToBill: document.getElementById('btn-add-to-bill'),
        billItemsList: document.getElementById('bill-items-list'),
        billTotalAmount: document.getElementById('bill-total-amount'),
        btnCheckout: document.getElementById('btn-checkout'),

        // Dashboard Stats
        todaySalesVal: document.getElementById('today-sales-val'),
        lowStockVal: document.getElementById('low-stock-val'),
        todayServicesVal: document.getElementById('today-services-val'),

        // Customers & Reports
        customersList: document.getElementById('customers-list'),
        salesList: document.getElementById('sales-list'),
        btnSendReport: document.getElementById('btn-send-report')
    };

    setupEventListeners();
    await renderAllLocal(); // Render what we have local immediately, so UI doesn't freeze

    if (window.db) {
        UIElements.syncStatus.classList.remove('hidden'); // Show syncing...
        initSync();
    } else {
        showToast("Started in Offline Mode (Check Firebase config)", "info");
    }
});

// --- NAVIGATION ---
function setupEventListeners() {
    UIElements.tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();

            // Reset classes
            UIElements.tabs.forEach(t => t.classList.remove('active-nav', 'bg-gray-800', 'text-white'));
            UIElements.tabs.forEach(t => t.classList.add('text-gray-300'));

            e.currentTarget.classList.remove('text-gray-300');
            e.currentTarget.classList.add('active-nav', 'bg-gray-800', 'text-white');

            const target = e.currentTarget.getAttribute('data-target');
            UIElements.tabContents.forEach(tc => tc.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            UIElements.pageTitle.textContent = e.currentTarget.textContent.trim();

            if (target === 'billing') updateBillingOptions();
        });
    });

    UIElements.btnAddItemModal.addEventListener('click', () => openModal(null));
    UIElements.btnCancelItem.addEventListener('click', closeModal);
    UIElements.btnSaveItem.addEventListener('click', saveInventoryItem);
    UIElements.btnAddToBill.addEventListener('click', addToBill);
    UIElements.btnCheckout.addEventListener('click', completeSale);
    UIElements.btnSendReport.addEventListener('click', sendReportViaEmail);
}

// --- UTILITIES ---
function showToast(message, type = 'success') {
    UIElements.toastMsg.textContent = message;
    UIElements.toast.classList.remove('translate-y-20', 'opacity-0', 'bg-green-600', 'bg-red-600', 'bg-blue-600');

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
}

// --- SYNC & FIREBASE LOGIC ---
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
        UIElements.syncStatus.classList.add('hidden'); // Hide status once first packet loaded
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
    });
}

// --- INVENTORY MANAGEMENT ---
function openModal(item = null) {
    if (item) {
        isEditingItem = true;
        UIElements.itemId.value = item.id;
        UIElements.itemName.value = item.itemName;
        UIElements.itemCategory.value = item.category;
        UIElements.itemPrice.value = item.price;
        UIElements.itemQty.value = item.quantity;
        UIElements.itemLow.value = item.lowStockLimit;
    } else {
        isEditingItem = false;
        UIElements.itemId.value = '';
        UIElements.itemName.value = '';
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
        itemName: UIElements.itemName.value,
        category: UIElements.itemCategory.value,
        price: parseFloat(UIElements.itemPrice.value),
        quantity: parseInt(UIElements.itemQty.value),
        lowStockLimit: parseInt(UIElements.itemLow.value)
    };

    if (!itemData.itemName || isNaN(itemData.price) || isNaN(itemData.quantity)) {
        showToast('Please fill all required fields correctly!', 'error');
        return;
    }

    try {
        if (window.db) {
            await window.db.ref(`items/${id}`).set(itemData);
            // Firebase limits push notification back to us anyway to save local.
        } else {
            await localDB.items.put(itemData);
            await renderAllLocal();
        }
        closeModal();
        showToast(isEditingItem ? 'Item updated successfully!' : 'Item added successfully!');
    } catch (e) {
        showToast('Failed to save item', 'error');
        console.error(e);
    }
}

async function renderInventory() {
    const items = await localDB.items.toArray();
    UIElements.inventoryList.innerHTML = items.map(item => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2">${item.itemName} ${item.quantity <= item.lowStockLimit && item.category !== 'Service' ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded ml-2 font-bold">Low</span>' : ''}</td>
            <td class="p-2">${item.category}</td>
            <td class="p-2">Rs. ${item.price.toFixed(2)}</td>
            <td class="p-2 font-bold ${item.quantity <= item.lowStockLimit && item.category !== 'Service' ? 'text-red-600' : 'text-green-600'}">${item.category === 'Service' ? '-' : item.quantity}</td>
            <td class="p-2 flex space-x-2">
                <button class="text-blue-600 hover:text-blue-800 p-2 btn-edit-item" data-id="${item.id}" title="Edit"><i class="fas fa-edit pointer-events-none"></i></button>
                <button class="text-red-600 hover:text-red-800 p-2 btn-delete-item" data-id="${item.id}" title="Delete"><i class="fas fa-trash pointer-events-none"></i></button>
            </td>
        </tr>
    `).join('');

    // Reattach dynamically created buttons
    document.querySelectorAll('.btn-edit-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const item = await localDB.items.get(id);
            if (item) openModal(item);
        });
    });

    document.querySelectorAll('.btn-delete-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm("Are you sure you want to delete this item?")) {
                const id = e.currentTarget.getAttribute('data-id');
                if (window.db) {
                    await window.db.ref(`items/${id}`).remove();
                } else {
                    await localDB.items.delete(id);
                    await renderAllLocal();
                }
                showToast('Item deleted', 'info');
            }
        });
    });
}

// --- BILLING LOGIC ---
async function updateBillingOptions() {
    const items = await localDB.items.toArray();
    UIElements.billItemSelect.innerHTML = '<option value="">Select Item/Service</option>' + items.map(i => {
        const disabled = (i.quantity <= 0 && i.category !== 'Service') ? 'disabled' : '';
        return `<option value="${i.id}" ${disabled}>${i.itemName} (Stock: ${i.category === 'Service' ? '∞' : i.quantity}) - Rs. ${i.price.toFixed(2)}</option>`;
    }).join('');
}

async function addToBill() {
    const itemId = UIElements.billItemSelect.value;
    const qty = parseInt(UIElements.billItemQty.value);

    if (!itemId || isNaN(qty) || qty <= 0) {
        showToast('Please select a valid item and quantity', 'error');
        return;
    }

    const item = await localDB.items.get(itemId);
    if (item.category !== 'Service' && item.quantity < qty) {
        showToast(`Not enough stock! Only ${item.quantity} left.`, 'error');
        return;
    }

    const existingIndex = currentBillItems.findIndex(i => i.id === itemId);
    if (existingIndex >= 0) {
        currentBillItems[existingIndex].qty += qty;
        currentBillItems[existingIndex].total = currentBillItems[existingIndex].qty * item.price;
    } else {
        currentBillItems.push({
            id: item.id,
            itemName: item.itemName,
            price: item.price,
            qty: qty,
            total: item.price * qty,
            category: item.category
        });
    }

    renderBillItems();
    UIElements.billItemSelect.value = '';
    UIElements.billItemQty.value = '1';
}

function renderBillItems() {
    UIElements.billItemsList.innerHTML = currentBillItems.map((item, index) => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2">${item.itemName}</td>
            <td class="p-2">Rs. ${item.price.toFixed(2)}</td>
            <td class="p-2">${item.qty}</td>
            <td class="p-2 font-bold">Rs. ${item.total.toFixed(2)}</td>
            <td class="p-2 text-center"><button class="text-red-500 hover:text-red-700 p-2 btn-remove-bill-item" data-index="${index}"><i class="fas fa-times pointer-events-none"></i></button></td>
        </tr>
    `).join('');

    const total = currentBillItems.reduce((sum, item) => sum + item.total, 0);
    UIElements.billTotalAmount.textContent = total.toFixed(2);

    document.querySelectorAll('.btn-remove-bill-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.currentTarget.getAttribute('data-index');
            currentBillItems.splice(index, 1);
            renderBillItems();
        });
    });
}

// Checkout & Submit Sale
async function completeSale() {
    const customerName = UIElements.billCustomerName.value.trim();
    const phone = UIElements.billPhone.value.trim() || 'N/A';
    const bikeNumber = UIElements.billBikeNumber.value.trim();
    const technician = UIElements.billTechnician.value.trim() || 'Unspecified';

    if (currentBillItems.length === 0) {
        showToast('Add items to the bill first.', 'error');
        return;
    }

    // Save Customer if provided
    if (phone !== 'N/A' || bikeNumber !== '') {
        const custId = phone !== 'N/A' ? phone : bikeNumber;
        const custData = {
            id: custId,
            name: customerName || 'Walk-in Customer',
            phone: phone,
            bikeNumber: bikeNumber,
            lastServiceDate: getTodayString()
        };
        if (window.db) {
            await window.db.ref(`customers/${custId}`).set(custData);
        } else {
            await localDB.customers.put(custData);
        }
    }

    const saleTotal = currentBillItems.reduce((sum, i) => sum + i.total, 0);
    const saleId = Date.now().toString();
    const saleData = {
        id: saleId,
        customerName: customerName || 'Walk-in',
        phone,
        bikeNumber,
        date: getTodayString(),
        items: currentBillItems,
        totalAmount: saleTotal,
        technicianName: technician,
        timestamp: Date.now()
    };

    try {
        if (window.db) {
            // Write to Firebase
            await window.db.ref(`sales/${saleId}`).set(saleData);

            // Deduct Stock on Firebase
            for (const billItem of currentBillItems) {
                if (billItem.category !== 'Service') {
                    const itemRef = window.db.ref(`items/${billItem.id}`);
                    const snapshot = await itemRef.once('value');
                    if (snapshot.exists()) {
                        const dbItem = snapshot.val();
                        const newQty = Math.max(0, dbItem.quantity - billItem.qty);
                        await itemRef.update({ quantity: newQty });
                    }
                }
            }
        } else {
            // Write to Dexie Offline
            await localDB.sales.put(saleData);
            for (const billItem of currentBillItems) {
                if (billItem.category !== 'Service') {
                    const dbItem = await localDB.items.get(billItem.id);
                    if (dbItem) {
                        const newQty = Math.max(0, dbItem.quantity - billItem.qty);
                        await localDB.items.update(billItem.id, { quantity: newQty });
                    }
                }
            }
            await renderAllLocal();
        }

        showToast('Sale completed successfully! Invoice saved.');

        // Reset Bill UI
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

// --- DASHBOARD RENDERING ---
async function renderDashboard() {
    const today = getTodayString();

    // Total Sales
    const allSales = await localDB.sales.toArray();
    const todaySales = allSales.filter(s => s.date === today);
    const totalAmount = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    UIElements.todaySalesVal.textContent = totalAmount.toFixed(2);

    // Services
    let svcCount = 0;
    todaySales.forEach(s => {
        const services = s.items ? s.items.filter(i => i.category === 'Service') : [];
        svcCount += services.length;
    });
    UIElements.todayServicesVal.textContent = svcCount;

    // Low Stock
    const allItems = await localDB.items.toArray();
    const lowStockCount = allItems.filter(i => i.quantity <= i.lowStockLimit && i.category !== 'Service').length;
    UIElements.lowStockVal.textContent = lowStockCount;
}

// --- CUSTOMERS & REPORTS RENDERING ---
async function renderCustomers() {
    const customers = await localDB.customers.toArray();
    UIElements.customersList.innerHTML = customers.map(c => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2 font-medium">${c.name}</td>
            <td class="p-2">${c.phone}</td>
            <td class="p-2"><span class="bg-gray-200 px-2 py-1 rounded text-sm">${c.bikeNumber || 'N/A'}</span></td>
            <td class="p-2">${c.lastServiceDate}</td>
        </tr>
    `).join('');
}

async function renderReports() {
    // Show last 50 sales max
    const allSales = await localDB.sales.reverse().limit(50).toArray();
    UIElements.salesList.innerHTML = allSales.map(s => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2 text-sm text-gray-500">${s.date}</td>
            <td class="p-2">${s.customerName}</td>
            <td class="p-2 font-medium">${s.bikeNumber || '-'}</td>
            <td class="p-2 font-bold text-green-700">Rs. ${s.totalAmount.toFixed(2)}</td>
        </tr>
    `).join('');
}

// --- EMAILJS INTEGRATION ---
function sendReportViaEmail() {
    showToast('Preparing Report Email...', 'info');

    localDB.sales.filter(s => s.date === getTodayString()).toArray().then(todaySales => {
        const total = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
        localDB.items.toArray().then(items => {
            const lowStockItems = items.filter(i => i.quantity <= i.lowStockLimit && i.category !== 'Service');

            const messageStr = `
Daily Report - ${getTodayString()}
-----------------------------------
Total Sales Revenue: Rs. ${total.toFixed(2)}
Total Invoices: ${todaySales.length}

Low Stock Alert (${lowStockItems.length} items):
${lowStockItems.map(i => `- ${i.itemName} (Stock: ${i.quantity})`).join('\n')}
            `;

            const templateParams = {
                to_email: "admin@motopos.com", // You should change this
                subject: `Moto POS Daily Report [${getTodayString()}]`,
                message: messageStr,
            };

            // Needs user ID injected. Assuming it runs inline if imported
            if (typeof emailjs === 'undefined') {
                showToast("EmailJS is not loaded!", "error");
                return;
            }

            // Fallback default message if they haven't configured
            try {
                // emailjs.init("YOUR_PUBLIC_KEY"); // User needs to configure
                // emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", templateParams)
                emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", templateParams)
                    .then(function (response) {
                        showToast('Report sent successfully!');
                    }, function (error) {
                        console.log('EmailJS Error:', error);
                        showToast('Error sending email. Check API keys.', 'error');
                    });
            } catch (err) {
                showToast('Make sure to configure EmailJS in app.js', 'error');
            }
        });
    });
}
