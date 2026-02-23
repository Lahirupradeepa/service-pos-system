// 1. Initialize Dexie Database
const db = new Dexie("MotoPOSDB");

db.version(1).stores({
    parts: '++id, name, buyPrice, sellPrice, stockQuantity',
    services: '++id, serviceName, cost',
    technicians: '++id, name, phone',
    sales: '++id, customerName, bikeNumber, totalAmount, totalProfit, date',
    saleItems: '++id, saleId, itemName, type, price, qty, profit' // type: 'part' or 'service'
});

db.version(2).stores({
    parts: '++id, name, partNumber, category, buyPrice, sellPrice, stockQuantity'
});

db.version(3).stores({
    customers: '++id, name, phone, bikeNumber'
});

// App State
let currentCart = [];
let todayDate = new Date().toISOString().split('T')[0];

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", async () => {

    // Set Current Date
    document.getElementById("current-date").textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // View Navigation
    const navBtns = document.querySelectorAll(".nav-btn");
    const views = document.querySelectorAll(".view-section");
    const pageTitle = document.getElementById("page-title");

    navBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute("data-target");

            // Hide all views
            views.forEach(v => {
                v.classList.add("hidden");
                v.classList.remove("block");
            });
            // Show target
            document.getElementById(targetId).classList.remove("hidden");
            document.getElementById(targetId).classList.add("block");

            // Update Title text from innerText of the clicked link
            pageTitle.innerText = btn.innerText;

            // Load data based on view
            if (targetId === "view-dashboard") loadDashboard();
            if (targetId === "view-inventory") loadInventory();
            if (targetId === "view-services") loadServices();
            if (targetId === "view-techs") loadTechs();
            if (targetId === "view-pos") loadPOS();
            if (targetId === "view-reports") loadReports();
            if (targetId === "view-autoemail") loadAutoEmailConfig();
            if (targetId === "view-customers") loadCustomers();
        });
    });

    // POS Search Input event
    document.getElementById("pos-search-parts").addEventListener("input", filterPOSParts);
    document.getElementById("inv-search").addEventListener("input", filterInventory);
    document.getElementById("cust-search").addEventListener("input", filterCustomers);

    // Initial Load
    await loadDashboard();

    // Event Listeners for CRUD Buttons
    document.getElementById("btn-export-inv").addEventListener("click", exportInventoryCsv);
    document.getElementById("btn-add-part").addEventListener("click", addPart);
    document.getElementById("btn-add-service").addEventListener("click", addService);
    document.getElementById("btn-add-tech").addEventListener("click", addTech);
    document.getElementById("btn-add-customer").addEventListener("click", addCustomer);
    document.getElementById("pos-clear-btn").addEventListener("click", clearCart);
    document.getElementById("pos-checkout-btn").addEventListener("click", handleCheckout);
    document.getElementById("btn-generate-report").addEventListener("click", generateReport);
    document.getElementById("btn-export-csv").addEventListener("click", exportReportCsv);

    // EmailJS Buttons
    document.getElementById("btn-save-email-settings").addEventListener("click", saveEmailSettings);
    document.getElementById("btn-test-email").addEventListener("click", () => triggerEmailReport(true));
    document.getElementById("auto-email-toggle").addEventListener("change", saveEmailSettings);

    // Init auto emailer loop check
    initAutoEmailer();
});

// --- HELPER FUNCTION: Currency ---
const formatCurrency = (amt) => parseFloat(amt).toFixed(2);

// ==========================================
// DASHBOARD LOGIC
// ==========================================
async function loadDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const allSales = await db.sales.toArray();
    const allSaleItems = await db.saleItems.toArray();

    let todaySalesTotal = 0;
    let todayProfitTotal = 0;
    let monthSalesTotal = 0;
    let recentSalesHTML = "";

    // Sort descending by id
    allSales.sort((a, b) => b.id - a.id);

    allSales.forEach(s => {
        const saleDate = new Date(s.date);

        if (saleDate >= startOfMonth) {
            monthSalesTotal += parseFloat(s.totalAmount);
        }

        if (saleDate >= today) {
            todaySalesTotal += parseFloat(s.totalAmount);
            todayProfitTotal += parseFloat(s.totalProfit || 0);
        }
    });

    // Populate top numbers
    document.getElementById("dash-today-sales").innerText = `Rs ${formatCurrency(todaySalesTotal)}`;
    document.getElementById("dash-today-profit").innerText = `Rs ${formatCurrency(todayProfitTotal)}`;
    document.getElementById("dash-month-sales").innerText = `Rs ${formatCurrency(monthSalesTotal)}`;

    // Populate recent sales table (last 5)
    allSales.slice(0, 5).forEach(s => {
        recentSalesHTML += `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-6 py-3">${s.customerName || 'Walk-in'} ${s.bikeNumber ? `(${s.bikeNumber})` : ''}</td>
                <td class="px-6 py-3 font-bold text-gray-700">Rs ${formatCurrency(s.totalAmount)}</td>
            </tr>
        `;
    });
    document.getElementById("dash-recent-sales-list").innerHTML = recentSalesHTML || `<tr><td colspan="2" class="text-center py-4 text-gray-400">No recent sales</td></tr>`;

    // Low Stock
    const partsArray = await db.parts.toArray();
    const lowStockParts = partsArray.filter(p => p.stockQuantity < 5);

    document.getElementById("dash-low-stock-count").innerText = lowStockParts.length;
    let lowStockHTML = "";
    lowStockParts.forEach(p => {
        lowStockHTML += `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-6 py-3 truncate max-w-[150px]" title="${p.name}">${p.name}</td>
                <td class="px-6 py-3 font-bold text-red-600">${p.stockQuantity}</td>
            </tr>
        `;
    });
    document.getElementById("dash-low-stock-list").innerHTML = lowStockHTML || `<tr><td colspan="2" class="text-center py-4 text-gray-400">Inventory looks good</td></tr>`;

    // Top Selling Items
    const topSalesMap = {};
    allSaleItems.forEach(item => {
        let nameToUse = item.itemName;
        // if item is service with assigned tech, strip tech name for grouping
        if (item.type === 'service' && nameToUse.includes(' (')) {
            nameToUse = nameToUse.substring(0, nameToUse.indexOf(' ('));
        }
        if (!topSalesMap[nameToUse]) topSalesMap[nameToUse] = 0;
        topSalesMap[nameToUse] += item.qty;
    });

    const topSalesArr = Object.keys(topSalesMap).map(key => {
        return { name: key, qty: topSalesMap[key] };
    }).sort((a, b) => b.qty - a.qty).slice(0, 10); // get top 10

    let topHTML = "";
    topSalesArr.forEach(t => {
        topHTML += `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-6 py-3 truncate max-w-[150px]" title="${t.name}">${t.name}</td>
                <td class="px-6 py-3 text-right font-bold text-blue-700">${t.qty}</td>
            </tr>
        `;
    });
    document.getElementById("dash-top-selling-list").innerHTML = topHTML || `<tr><td colspan="2" class="text-center py-4 text-gray-400">No sales yet</td></tr>`;
}

// ==========================================
// INVENTORY LOGIC
// ==========================================
async function loadInventory(filterText = "") {
    let parts = await db.parts.toArray();
    if (filterText) {
        parts = parts.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()));
    }

    let html = "";
    parts.forEach(p => {
        html += `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-6 py-4 text-gray-700">#${p.id}</td>
                <td class="px-6 py-4 text-gray-700 font-medium">${p.partNumber || '-'}</td>
                <td class="px-6 py-4 font-semibold text-gray-800">${p.name}</td>
                <td class="px-6 py-4 text-gray-600">${p.category || '-'}</td>
                <td class="px-6 py-4">Rs ${formatCurrency(p.buyPrice)}</td>
                <td class="px-6 py-4">Rs ${formatCurrency(p.sellPrice)}</td>
                <td class="px-6 py-4 ${p.stockQuantity < 5 ? 'text-red-600 font-bold' : ''}">${p.stockQuantity}</td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                    <button onclick="duplicatePart(${p.id})" class="text-green-600 hover:text-green-800 mr-3" title="Add Price Variant"><i class="fa-solid fa-code-branch"></i> Variant</button>
                    <button onclick="editPart(${p.id})" class="text-blue-600 hover:text-blue-800 mr-3" title="Edit"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                    <button onclick="deletePart(${p.id})" class="text-red-600 hover:text-red-800" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    document.getElementById("inventory-list").innerHTML = html;
}

function filterInventory(e) {
    loadInventory(e.target.value);
}

async function addPart() {
    const { value: formValues } = await Swal.fire({
        title: 'Add New Spare Part',
        html:
            '<input id="swal-partno" class="swal2-input" placeholder="Part Number">' +
            '<input id="swal-name" class="swal2-input" placeholder="Part Name">' +
            '<input id="swal-category" class="swal2-input" placeholder="Category">' +
            '<input id="swal-buy" type="number" class="swal2-input" placeholder="Buy Price (Rs)">' +
            '<input id="swal-sell" type="number" class="swal2-input" placeholder="Sell Price (Rs)">' +
            '<input id="swal-qty" type="number" class="swal2-input" placeholder="Stock Quantity">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            return {
                partNumber: document.getElementById('swal-partno').value,
                category: document.getElementById('swal-category').value,
                name: document.getElementById('swal-name').value,
                buyPrice: parseFloat(document.getElementById('swal-buy').value),
                sellPrice: parseFloat(document.getElementById('swal-sell').value),
                stockQuantity: parseInt(document.getElementById('swal-qty').value)
            }
        }
    });

    if (formValues && formValues.name && !isNaN(formValues.buyPrice) && !isNaN(formValues.sellPrice) && !isNaN(formValues.stockQuantity)) {
        await db.parts.add(formValues);
        Swal.fire('Added!', 'Part has been saved.', 'success');
        loadInventory();
        loadDashboard(); // update low stock
    } else if (formValues) {
        Swal.fire('Error', 'Please fill all fields correctly', 'error');
    }
}

window.editPart = async function (id) {
    const part = await db.parts.get(id);
    if (!part) return;

    const { value: formValues } = await Swal.fire({
        title: 'Edit Spare Part',
        html:
            `<input id="swal-partno" class="swal2-input" placeholder="Part Number" value="${part.partNumber || ''}">` +
            `<input id="swal-name" class="swal2-input" placeholder="Part Name" value="${part.name}">` +
            `<input id="swal-category" class="swal2-input" placeholder="Category" value="${part.category || ''}">` +
            `<input id="swal-buy" type="number" class="swal2-input" placeholder="Buy Price (Rs)" value="${part.buyPrice}">` +
            `<input id="swal-sell" type="number" class="swal2-input" placeholder="Sell Price (Rs)" value="${part.sellPrice}">` +
            `<input id="swal-qty" type="number" class="swal2-input" placeholder="Stock Quantity" value="${part.stockQuantity}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            return {
                partNumber: document.getElementById('swal-partno').value,
                category: document.getElementById('swal-category').value,
                name: document.getElementById('swal-name').value,
                buyPrice: parseFloat(document.getElementById('swal-buy').value),
                sellPrice: parseFloat(document.getElementById('swal-sell').value),
                stockQuantity: parseInt(document.getElementById('swal-qty').value)
            }
        }
    });

    if (formValues && formValues.name) {
        await db.parts.update(id, formValues);
        Swal.fire('Updated!', 'Part has been updated.', 'success');
        loadInventory();
        loadDashboard();
    }
}

window.deletePart = async function (id) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        await db.parts.delete(id);
        Swal.fire('Deleted!', 'Part has been removed.', 'success');
        loadInventory();
        loadDashboard();
    }
}

window.duplicatePart = async function (id) {
    const part = await db.parts.get(id);
    if (!part) return;

    const { value: formValues } = await Swal.fire({
        title: 'Add Price Variant',
        html:
            `<input id="swal-partno" class="swal2-input" placeholder="Part Number" value="${part.partNumber || ''}">` +
            `<input id="swal-name" class="swal2-input" placeholder="Part Name" value="${part.name}">` +
            `<input id="swal-category" class="swal2-input" placeholder="Category" value="${part.category || ''}">` +
            `<input id="swal-buy" type="number" class="swal2-input" placeholder="New Buy Price (Rs)">` +
            `<input id="swal-sell" type="number" class="swal2-input" placeholder="New Sell Price (Rs)">` +
            `<input id="swal-qty" type="number" class="swal2-input" placeholder="Stock Quantity">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        confirmButtonText: 'Save Variant',
        preConfirm: () => {
            return {
                partNumber: document.getElementById('swal-partno').value,
                category: document.getElementById('swal-category').value,
                name: document.getElementById('swal-name').value,
                buyPrice: parseFloat(document.getElementById('swal-buy').value),
                sellPrice: parseFloat(document.getElementById('swal-sell').value),
                stockQuantity: parseInt(document.getElementById('swal-qty').value)
            }
        }
    });

    if (formValues && formValues.name && !isNaN(formValues.buyPrice) && !isNaN(formValues.sellPrice) && !isNaN(formValues.stockQuantity)) {
        await db.parts.add(formValues);
        Swal.fire('Added!', 'Price variant has been saved as a new batch.', 'success');
        loadInventory();
        loadDashboard();
    } else if (formValues) {
        Swal.fire('Error', 'Please fill all fields correctly', 'error');
    }
}

// ==========================================
// SERVICES LOGIC
// ==========================================
async function loadServices() {
    let services = await db.services.toArray();
    let html = "";
    services.forEach(s => {
        html += `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-6 py-4 text-gray-700">#${s.id}</td>
                <td class="px-6 py-4 font-semibold text-gray-800">${s.serviceName}</td>
                <td class="px-6 py-4">Rs ${formatCurrency(s.cost)}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="editService(${s.id})" class="text-blue-600 hover:text-blue-800 mr-3"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteService(${s.id})" class="text-red-600 hover:text-red-800"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    document.getElementById("services-list").innerHTML = html;
}

async function addService() {
    const { value: formValues } = await Swal.fire({
        title: 'Add New Service',
        html:
            '<input id="swal-s-name" class="swal2-input" placeholder="Service Name (e.g. Wash)">' +
            '<input id="swal-s-cost" type="number" class="swal2-input" placeholder="Standard Cost (Rs)">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            return {
                serviceName: document.getElementById('swal-s-name').value,
                cost: parseFloat(document.getElementById('swal-s-cost').value)
            }
        }
    });

    if (formValues && formValues.serviceName && !isNaN(formValues.cost)) {
        await db.services.add(formValues);
        Swal.fire('Added!', 'Service has been saved.', 'success');
        loadServices();
    }
}

window.editService = async function (id) {
    const serv = await db.services.get(id);
    if (!serv) return;

    const { value: formValues } = await Swal.fire({
        title: 'Edit Service',
        html:
            `<input id="swal-s-name" class="swal2-input" placeholder="Service Name" value="${serv.serviceName}">` +
            `<input id="swal-s-cost" type="number" class="swal2-input" placeholder="Standard Cost (Rs)" value="${serv.cost}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            return {
                serviceName: document.getElementById('swal-s-name').value,
                cost: parseFloat(document.getElementById('swal-s-cost').value)
            }
        }
    });

    if (formValues && formValues.serviceName) {
        await db.services.update(id, formValues);
        Swal.fire('Updated!', 'Service has been updated.', 'success');
        loadServices();
    }
}

window.deleteService = async function (id) {
    const result = await Swal.fire({
        title: 'Delete this service?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626'
    });
    if (result.isConfirmed) {
        await db.services.delete(id);
        loadServices();
    }
}

// ==========================================
// TECHNICIANS LOGIC
// ==========================================
async function loadTechs() {
    let techs = await db.technicians.toArray();
    let html = "";
    techs.forEach(t => {
        html += `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-6 py-4 text-gray-700">#${t.id}</td>
                <td class="px-6 py-4 font-semibold text-gray-800">${t.name}</td>
                <td class="px-6 py-4">${t.phone || 'N/A'}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="editTech(${t.id})" class="text-blue-600 hover:text-blue-800 mr-3"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteTech(${t.id})" class="text-red-600 hover:text-red-800"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    document.getElementById("techs-list").innerHTML = html;
}

async function addTech() {
    const { value: formValues } = await Swal.fire({
        title: 'Add Technician',
        html:
            '<input id="swal-t-name" class="swal2-input" placeholder="Name">' +
            '<input id="swal-t-phone" class="swal2-input" placeholder="Phone Number">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            return {
                name: document.getElementById('swal-t-name').value,
                phone: document.getElementById('swal-t-phone').value
            }
        }
    });

    if (formValues && formValues.name) {
        await db.technicians.add(formValues);
        Swal.fire('Added!', 'Technician has been saved.', 'success');
        loadTechs();
    }
}

window.editTech = async function (id) {
    const tech = await db.technicians.get(id);
    if (!tech) return;

    const { value: formValues } = await Swal.fire({
        title: 'Edit Technician',
        html:
            `<input id="swal-t-name" class="swal2-input" placeholder="Name" value="${tech.name}">` +
            `<input id="swal-t-phone" class="swal2-input" placeholder="Phone Number" value="${tech.phone || ''}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            return {
                name: document.getElementById('swal-t-name').value,
                phone: document.getElementById('swal-t-phone').value
            }
        }
    });

    if (formValues && formValues.name) {
        await db.technicians.update(id, formValues);
        Swal.fire('Updated!', 'Technician has been updated.', 'success');
        loadTechs();
    }
}

window.deleteTech = async function (id) {
    const result = await Swal.fire({
        title: 'Delete this technician?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626'
    });
    if (result.isConfirmed) {
        await db.technicians.delete(id);
        loadTechs();
    }
}

// ==========================================
// POS LOGIC (Point of Sale)
// ==========================================
async function loadPOS() {
    // Load Tech select
    const techs = await db.technicians.toArray();
    let techHtml = '<option value="">-- Select Technician --</option>';
    techs.forEach(t => {
        techHtml += `<option value="${t.name}">${t.name}</option>`;
    });
    document.getElementById("pos-select-tech").innerHTML = techHtml;

    await filterPOSParts();
    await loadPOSServices();
    renderCart();
}

async function filterPOSParts(e) {
    const filterText = e ? e.target.value.toLowerCase() : "";
    let parts = await db.parts.toArray();

    // Auto-hide Out of stock items from POS search unless exactly matched? No just show low stock in red.
    // Actually if 0 stock, can't add to cart.

    if (filterText) {
        parts = parts.filter(p => p.name.toLowerCase().includes(filterText) || (p.category && p.category.toLowerCase().includes(filterText)));
    } else {
        parts = parts.slice(0, 10); // Show max 10 initially
    }

    let html = "";
    parts.forEach(p => {
        const outOfStock = p.stockQuantity <= 0;
        html += `
            <li class="flex justify-between items-center p-3 bg-white border rounded hover:bg-gray-50 transition-colors">
                <div>
                    <h4 class="font-bold text-gray-800 text-sm">${p.name} ${p.category ? `<span class="bg-blue-100 text-blue-800 text-[10px] font-medium me-2 px-2 py-0.5 rounded ml-1">${p.category}</span>` : ''}</h4>
                    <p class="text-xs text-gray-500">Stock: <span class="${outOfStock ? 'text-red-500 font-bold' : ''}">${p.stockQuantity}</span> | Rs ${formatCurrency(p.sellPrice)}</p>
                </div>
                <button onclick="addToCart(${p.id}, 'part')" class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-600 hover:text-white transition-colors text-sm" ${outOfStock ? 'disabled opacity-50 cursor-not-allowed' : ''}>
                    <i class="fa-solid fa-plus"></i> Add
                </button>
            </li>
        `;
    });
    document.getElementById("pos-parts-list").innerHTML = html || '<li class="text-center text-gray-400 py-4 text-sm">No parts found</li>';
}

async function loadPOSServices() {
    const services = await db.services.toArray();
    let html = "";
    services.forEach(s => {
        html += `
            <li class="flex justify-between items-center p-3 bg-white border rounded hover:bg-gray-50 transition-colors">
                <div>
                    <h4 class="font-bold text-gray-800 text-sm">${s.serviceName}</h4>
                    <p class="text-xs text-gray-500">Rs ${formatCurrency(s.cost)}</p>
                </div>
                <button onclick="addToCart(${s.id}, 'service')" class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-600 hover:text-white transition-colors text-sm">
                    <i class="fa-solid fa-plus"></i> Add
                </button>
            </li>
        `;
    });
    document.getElementById("pos-services-list").innerHTML = html;
}

window.addToCart = async function (id, type) {
    let itemToAdd = null;

    if (type === 'part') {
        const item = await db.parts.get(id);
        if (!item || item.stockQuantity <= 0) return;

        // check if already in cart
        const existing = currentCart.find(c => c.type === 'part' && c.id === id);
        if (existing) {
            if (existing.qty >= item.stockQuantity) {
                Swal.fire({ toast: true, position: 'top-end', text: 'Max stock reached!', icon: 'warning', timer: 2000, showConfirmButton: false });
                return;
            }
            existing.qty += 1;
            renderCart();
            return;
        }

        itemToAdd = {
            id: item.id,
            itemName: item.name,
            type: 'part',
            price: item.sellPrice,
            buyPrice: item.buyPrice,
            qty: 1,
            maxQty: item.stockQuantity
        };
    } else if (type === 'service') {
        const item = await db.services.get(id);
        if (!item) return;

        // Optionally get assigned tech
        const techName = document.getElementById("pos-select-tech").value;
        const nameDisplay = techName ? `${item.serviceName} (${techName})` : item.serviceName;

        const { value: customPrice } = await Swal.fire({
            title: `Price for ${item.serviceName}`,
            input: 'number',
            inputValue: item.cost,
            showCancelButton: true,
            confirmButtonText: 'Add to Cart',
            confirmButtonColor: '#2563eb',
            inputValidator: (value) => {
                if (!value || isNaN(value) || value < 0) {
                    return 'Please enter a valid price';
                }
            }
        });

        if (!customPrice) return; // user cancelled

        itemToAdd = {
            id: item.id, // we don't strictly need id for service since it doesn't reduce stock
            itemName: nameDisplay,
            type: 'service',
            price: parseFloat(customPrice),
            buyPrice: 0, // 100% profit usually, or consider labour cost
            qty: 1,
            maxQty: 999
        };
    }

    if (itemToAdd) {
        currentCart.push(itemToAdd);
        renderCart();
    }
}

window.updateQty = function (index, newQty) {
    const item = currentCart[index];
    newQty = parseInt(newQty);
    if (newQty > item.maxQty && item.type === 'part') {
        newQty = item.maxQty;
        Swal.fire({ toast: true, position: 'top-end', text: 'Max stock limit', icon: 'warning', timer: 2000, showConfirmButton: false });
    }
    if (newQty <= 0) {
        removeFromCart(index);
        return;
    }
    item.qty = newQty;
    renderCart();
}

window.removeFromCart = function (index) {
    currentCart.splice(index, 1);
    renderCart();
}

function clearCart() {
    currentCart = [];
    document.getElementById("pos-customer-name").value = "";
    document.getElementById("pos-bike-number").value = "";
    document.getElementById("pos-select-tech").value = "";
    renderCart();
}

function renderCart() {
    const list = document.getElementById("pos-cart-list");
    if (currentCart.length === 0) {
        list.innerHTML = '<li class="text-center text-gray-400 py-10" id="cart-empty-msg">Cart is empty</li>';
        document.getElementById("pos-subtotal").innerText = "Rs 0.00";
        document.getElementById("pos-total").innerText = "Rs 0.00";
        return;
    }

    let html = "";
    let total = 0;

    currentCart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        html += `
            <li class="py-3 px-4 flex justify-between items-center border-b border-gray-100 hover:bg-gray-100 transition-colors">
                <div class="flex-grow">
                    <h5 class="font-bold text-gray-800 text-sm overflow-hidden text-ellipsis whitespace-nowrap w-40" title="${item.itemName}">${item.itemName}</h5>
                    <p class="text-xs text-blue-600 font-semibold">Rs ${formatCurrency(item.price)}</p>
                </div>
                <div class="flex items-center gap-2">
                    <input type="number" value="${item.qty}" min="1" max="${item.maxQty}" onchange="updateQty(${index}, this.value)" class="w-14 text-center text-sm border rounded py-1 bg-white">
                    <span class="font-bold text-gray-800 w-20 text-right text-sm">Rs ${formatCurrency(itemTotal)}</span>
                    <button onclick="removeFromCart(${index})" class="text-red-400 hover:text-red-600 w-6 text-center"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </li>
        `;
    });

    list.innerHTML = html;
    document.getElementById("pos-subtotal").innerText = `Rs ${formatCurrency(total)}`;
    document.getElementById("pos-total").innerText = `Rs ${formatCurrency(total)}`;
}

async function handleCheckout() {
    if (currentCart.length === 0) {
        Swal.fire("Error", "Cart is empty!", "error");
        return;
    }

    // Collect data
    const customerName = document.getElementById("pos-customer-name").value || "Walk-in";
    const bikeNumber = document.getElementById("pos-bike-number").value.toUpperCase() || "-";
    let totalAmount = 0;
    let totalProfit = 0;

    const saleItemsArr = [];

    // Calculate totals and process arrays
    for (let i = 0; i < currentCart.length; i++) {
        const item = currentCart[i];
        const itemTotal = item.price * item.qty;
        const itemProfit = item.type === 'part' ? (item.price - item.buyPrice) * item.qty : itemTotal; // services are 100% profit (for shop logic)

        totalAmount += itemTotal;
        totalProfit += itemProfit;

        saleItemsArr.push({
            itemName: item.itemName,
            type: item.type,
            price: item.price,
            qty: item.qty,
            profit: itemProfit
        });
    }

    // Confirm Checkout
    const result = await Swal.fire({
        title: 'Complete Checkout?',
        text: `Total Amount: Rs ${formatCurrency(totalAmount)}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        confirmButtonText: 'Yes, Place Order'
    });

    if (!result.isConfirmed) return;

    // Auto Save/Update Customer Info
    if (bikeNumber !== "-" && bikeNumber !== "") {
        const existingCust = await db.customers.where("bikeNumber").equals(bikeNumber).first();
        if (!existingCust) {
            await db.customers.add({ name: customerName, phone: "", bikeNumber: bikeNumber });
        } else if (customerName !== "Walk-in" && (!existingCust.name || existingCust.name === "Walk-in")) {
            await db.customers.update(existingCust.id, { name: customerName });
        }
    }

    try {
        // 1. Save Sale
        const saleId = await db.sales.add({
            customerName,
            bikeNumber,
            totalAmount,
            totalProfit,
            date: new Date().toISOString()
        });

        // 2. Save Sale Items & Reduce Stock
        for (let item of currentCart) {
            await db.saleItems.add({
                saleId,
                itemName: item.itemName,
                type: item.type,
                price: item.price,
                qty: item.qty,
                profit: item.type === 'part' ? (item.price - item.buyPrice) * item.qty : item.price * item.qty
            });

            if (item.type === 'part') {
                const partInDb = await db.parts.get(item.id);
                if (partInDb) {
                    await db.parts.update(item.id, {
                        stockQuantity: partInDb.stockQuantity - item.qty
                    });
                }
            }
        }

        // 3. Print Receipt
        generateReceipt(saleId, customerName, bikeNumber, totalAmount, currentCart);

        // 4. Reset & Notify
        clearCart();
        filterPOSParts(); // refresh stock view
        loadDashboard(); // silently refresh dashboard

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Checkout Completed',
            showConfirmButton: false,
            timer: 2000
        });

    } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to checkout. See console.", "error");
    }
}

function generateReceipt(saleId, cus, bike, total, items) {
    document.getElementById("rct-inv").innerText = saleId;
    document.getElementById("rct-date").innerText = new Date().toLocaleString();
    document.getElementById("rct-cust").innerText = cus;
    document.getElementById("rct-bike").innerText = bike;

    let itemsHtml = "";
    items.forEach(c => {
        itemsHtml += `
            <tr>
                <td class="py-1 pr-2">${c.itemName}</td>
                <td class="text-right py-1 px-2">${c.qty}</td>
                <td class="text-right py-1 px-2">${c.price}</td>
                <td class="text-right py-1 pl-2">${c.price * c.qty}</td>
            </tr>
        `;
    });
    document.getElementById("rct-items").innerHTML = itemsHtml;
    document.getElementById("rct-total").innerText = formatCurrency(total);

    // Call browser print
    setTimeout(() => {
        window.print();
    }, 200);
}

// ==========================================
// REPORTS LOGIC
// ==========================================
async function loadReports() {
    // Default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    document.getElementById("rep-date-from").value = firstDay.toISOString().split('T')[0];
    document.getElementById("rep-date-to").value = today.toISOString().split('T')[0];

    generateReport();
}

async function generateReport() {
    const fromStr = document.getElementById("rep-date-from").value;
    const toStr = document.getElementById("rep-date-to").value;

    if (!fromStr || !toStr) {
        Swal.fire("Error", "Select both dates", "warning");
        return;
    }

    const fromDate = new Date(fromStr);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(toStr);
    toDate.setHours(23, 59, 59, 999); // end of day

    const allSales = await db.sales.toArray();

    const filteredSales = allSales.filter(s => {
        const d = new Date(s.date);
        return d >= fromDate && d <= toDate;
    });

    let totalRev = 0;
    let totalProf = 0;
    let html = "";

    // Sort descending by date
    filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredSales.forEach(s => {
        totalRev += parseFloat(s.totalAmount);
        totalProf += parseFloat(s.totalProfit || 0);

        html += `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-6 py-4">${new Date(s.date).toLocaleString()}</td>
                <td class="px-6 py-4 text-indigo-600 font-semibold">INV-#${s.id}</td>
                <td class="px-6 py-4">${s.customerName || '-'} ${s.bikeNumber ? `<br><span class="text-xs text-gray-500 bg-gray-200 px-1 rounded">${s.bikeNumber}</span>` : ''}</td>
                <td class="px-6 py-4 font-bold text-gray-700">Rs ${formatCurrency(s.totalAmount)}</td>
                <td class="px-6 py-4 text-green-600">Rs ${formatCurrency(s.totalProfit)}</td>
            </tr>
        `;
    });

    document.getElementById("rep-total-revenue").innerText = `Rs ${formatCurrency(totalRev)}`;
    document.getElementById("rep-total-profit").innerText = `Rs ${formatCurrency(totalProf)}`;
    document.getElementById("reports-list").innerHTML = html || `<tr><td colspan="5" class="text-center py-6 text-gray-400">No sales found in this period</td></tr>`;
}

function exportReportCsv() {
    const tableRows = document.querySelectorAll("#reports-list tr");
    if (tableRows.length === 0 || tableRows[0].cells.length === 1) {
        Swal.fire("Notice", "No data to export", "info");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date & Time,Invoice #,Customer / Bike,Total Amount (Rs),Profit (Rs)\n";

    tableRows.forEach(row => {
        let rowData = [];
        row.querySelectorAll("td").forEach(cell => {
            // simple text extraction, stripping out commas to avoid csv-breakage
            let text = cell.innerText.replace(/,/g, '');
            // format newlines generated by customer/bike br tags
            text = text.replace(/\n|Rs /g, ' ').trim();
            rowData.push(text);
        });
        csvContent += rowData.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // use dates in filename
    const fDate = document.getElementById("rep-date-from").value;
    const tDate = document.getElementById("rep-date-to").value;
    link.setAttribute("download", `sales_report_${fDate}_to_${tDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportInventoryCsv() {
    db.parts.toArray().then(parts => {
        if (parts.length === 0) {
            Swal.fire("Notice", "No inventory data to export", "info");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Part ID,Part Number,Part Name,Category,Buy Price (Rs),Sell Price (Rs),Stock Quantity\n";

        parts.forEach(p => {
            let rowData = [
                p.id,
                `"${p.partNumber || ''}"`,
                `"${p.name || ''}"`,
                `"${p.category || ''}"`,
                p.buyPrice,
                p.sellPrice,
                p.stockQuantity
            ];
            csvContent += rowData.join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// ==========================================
// AUTO EMAILER LOGIC
// ==========================================
function loadAutoEmailConfig() {
    document.getElementById('auto-email-target').value = localStorage.getItem('emailTarget') || '';
    document.getElementById('auto-email-pub').value = localStorage.getItem('emailPub') || '';
    document.getElementById('auto-email-service').value = localStorage.getItem('emailService') || '';
    document.getElementById('auto-email-template').value = localStorage.getItem('emailTemplate') || '';
    document.getElementById('auto-email-toggle').checked = localStorage.getItem('emailEnabled') === 'true';
}

function saveEmailSettings() {
    localStorage.setItem('emailTarget', document.getElementById('auto-email-target').value);
    localStorage.setItem('emailPub', document.getElementById('auto-email-pub').value);
    localStorage.setItem('emailService', document.getElementById('auto-email-service').value);
    localStorage.setItem('emailTemplate', document.getElementById('auto-email-template').value);
    localStorage.setItem('emailEnabled', document.getElementById('auto-email-toggle').checked);
    emailjs.init(document.getElementById('auto-email-pub').value);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Settings Saved', showConfirmButton: false, timer: 1500 });
}

function initAutoEmailer() {
    const pubKey = localStorage.getItem('emailPub');
    if (pubKey) emailjs.init(pubKey);

    // Check every hour (3600000ms)
    setInterval(() => {
        if (localStorage.getItem('emailEnabled') === 'true') {
            triggerEmailReport(false);
        }
    }, 3600000); // 1 hour
}

function addEmailLog(statusMsg, isError = false) {
    const logList = document.getElementById('auto-email-log');
    if (logList.innerHTML.includes('No logs yet')) logList.innerHTML = '';

    const d = new Date().toLocaleString();
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50 border-b";
    tr.innerHTML = `
        <td class="px-6 py-3">${d}</td>
        <td class="px-6 py-3 font-bold ${isError ? 'text-red-600' : 'text-green-600'}">${statusMsg}</td>
    `;
    logList.prepend(tr);
}

async function triggerEmailReport(isTest = false) {
    const target = localStorage.getItem('emailTarget');
    const service = localStorage.getItem('emailService');
    const template = localStorage.getItem('emailTemplate');

    if (!target || !service || !template) {
        if (isTest) Swal.fire("Error", "Please fill all EmailJS configuration fields first.", "error");
        addEmailLog("Failed: Missing Config", true);
        return;
    }

    if (isTest) {
        document.getElementById('btn-test-email').innerText = "Sending...";
        document.getElementById('btn-test-email').disabled = true;
    }

    try {
        // Collect Data
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // 1. Sales Data
        const allSales = await db.sales.toArray();
        let todaySales = 0;
        let todayProfit = 0;
        allSales.forEach(s => {
            const sd = new Date(s.date);
            if (sd >= startOfDay) {
                todaySales += parseFloat(s.totalAmount);
                todayProfit += parseFloat(s.totalProfit || 0);
            }
        });

        // 2. Inventory Data
        const parts = await db.parts.toArray();
        const lowStock = parts.filter(p => p.stockQuantity < 5);
        let lowStockTxt = lowStock.map(p => `- ${p.name} (QTY: ${p.stockQuantity})`).join('\n') || "All stock is good.";

        // Format Message
        let msg = `POS AUTOMATED REPORT\n\n`;
        msg += `--- TODAY'S SUMMARY ---\n`;
        msg += `Total Sales: Rs ${todaySales.toFixed(2)}\n`;
        msg += `Total Profit: Rs ${todayProfit.toFixed(2)}\n\n`;
        msg += `--- LOW STOCK WARNINGS ---\n`;
        msg += `${lowStockTxt}\n`;

        const templateParams = {
            target_email: target,
            subject: `Hourly POS Report - ${new Date().toLocaleString()}`,
            message: msg
        };

        const res = await emailjs.send(service, template, templateParams);

        if (res.status === 200) {
            if (isTest) Swal.fire("Success", "Test email sent successfully!", "success");
            addEmailLog("Report Sent Successfully", false);
        } else {
            throw new Error("HTTP " + res.status);
        }

    } catch (err) {
        console.error(err);
        if (isTest) Swal.fire("Failed", "Could not send email. Check console or credentials.", "error");
        addEmailLog("Failed to Send", true);
    } finally {
        if (isTest) {
            document.getElementById('btn-test-email').innerText = "Test Email Now";
            document.getElementById('btn-test-email').disabled = false;
        }
    }
}

// ==========================================
// CUSTOMERS LOGIC
// ==========================================

async function loadCustomers(filterText = "") {
    let customers = await db.customers.toArray();
    if (filterText) {
        filterText = filterText.toLowerCase();
        customers = customers.filter(c =>
            (c.name && c.name.toLowerCase().includes(filterText)) ||
            (c.bikeNumber && c.bikeNumber.toLowerCase().includes(filterText)) ||
            (c.phone && c.phone.toLowerCase().includes(filterText))
        );
    }

    let html = "";
    customers.forEach(c => {
        html += `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-6 py-4 text-gray-700">#${c.id}</td>
                <td class="px-6 py-4 font-semibold text-gray-800">${c.name || 'Walk-in'}</td>
                <td class="px-6 py-4 text-gray-600">${c.phone || '-'}</td>
                <td class="px-6 py-4">
                    <span class="bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">${c.bikeNumber}</span>
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                    <button onclick="viewCustomerHistory('${c.bikeNumber}')" class="text-indigo-600 hover:text-indigo-800 mr-3" title="View History"><i class="fa-solid fa-clock-rotate-left"></i> History</button>
                    <button onclick="editCustomer(${c.id})" class="text-blue-600 hover:text-blue-800 mr-3" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteCustomer(${c.id})" class="text-red-600 hover:text-red-800" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    document.getElementById("customers-list").innerHTML = html || '<tr><td colspan="5" class="text-center py-4 text-gray-400">No customers found</td></tr>';
}

function filterCustomers(e) {
    loadCustomers(e.target.value);
}

async function addCustomer() {
    const { value: formValues } = await Swal.fire({
        title: 'Add New Customer',
        html:
            '<input id="swal-custname" class="swal2-input" placeholder="Customer Name">' +
            '<input id="swal-custphone" class="swal2-input" placeholder="Phone Number">' +
            '<input id="swal-custbike" class="swal2-input" placeholder="Bike Number (UPPERCASE)" style="text-transform:uppercase">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            return {
                name: document.getElementById('swal-custname').value,
                phone: document.getElementById('swal-custphone').value,
                bikeNumber: document.getElementById('swal-custbike').value.toUpperCase()
            }
        }
    });

    if (formValues && formValues.bikeNumber) {
        const existing = await db.customers.where("bikeNumber").equals(formValues.bikeNumber).first();
        if (existing) {
            Swal.fire('Notice', 'A customer with this Bike Number already exists.', 'info');
            return;
        }
        await db.customers.add(formValues);
        Swal.fire('Added!', 'Customer has been saved.', 'success');
        loadCustomers();
    } else if (formValues) {
        Swal.fire('Error', 'Bike Number is required!', 'error');
    }
}

window.editCustomer = async function (id) {
    const c = await db.customers.get(id);
    if (!c) return;

    const { value: formValues } = await Swal.fire({
        title: 'Edit Customer',
        html:
            `<input id="swal-custname" class="swal2-input" placeholder="Customer Name" value="${c.name}">` +
            `<input id="swal-custphone" class="swal2-input" placeholder="Phone Number" value="${c.phone}">` +
            `<input id="swal-custbike" class="swal2-input" placeholder="Bike Number" value="${c.bikeNumber}" style="text-transform:uppercase">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
            return {
                name: document.getElementById('swal-custname').value,
                phone: document.getElementById('swal-custphone').value,
                bikeNumber: document.getElementById('swal-custbike').value.toUpperCase()
            }
        }
    });

    if (formValues && formValues.bikeNumber) {
        await db.customers.update(id, formValues);
        Swal.fire('Updated!', 'Customer has been updated.', 'success');
        loadCustomers();
    }
}

window.deleteCustomer = async function (id) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "Delete this customer?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Yes, delete!'
    });
    if (result.isConfirmed) {
        await db.customers.delete(id);
        Swal.fire('Deleted', '', 'success');
        loadCustomers();
    }
}

window.viewCustomerHistory = async function (bikeNumber) {
    const allSales = await db.sales.toArray();
    const history = allSales.filter(s => s.bikeNumber === bikeNumber);

    // Sort descending by date
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (history.length === 0) {
        Swal.fire('No History', `No generated bills found yet for bike number: ${bikeNumber}`, 'info');
        return;
    }

    let tbodyHTML = "";
    history.forEach(s => {
        tbodyHTML += `
            <tr class="border-b hover:bg-gray-100">
                <td class="py-3 px-4 text-xs">${new Date(s.date).toLocaleString()}</td>
                <td class="py-3 px-4 text-xs font-bold text-indigo-600">INV-#${s.id}</td>
                <td class="py-3 px-4 text-xs font-bold text-gray-800">Rs ${formatCurrency(s.totalAmount)}</td>
                <td class="py-3 px-4 text-xs"><button onclick="Swal.close();" class="text-blue-500 hover:underline">Close</button></td>
            </tr>
        `;
    });

    Swal.fire({
        title: `Service History: ${bikeNumber}`,
        html: `
            <div class="overflow-y-auto max-h-64 text-left">
                <table class="w-full text-sm mt-2">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="py-2 px-4 rounded-tl">Date & Time</th>
                            <th class="py-2 px-4">Invoice #</th>
                            <th class="py-2 px-4">Amount</th>
                            <th class="py-2 px-4 rounded-tr">View</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tbodyHTML}
                    </tbody>
                </table>
            </div>
        `,
        width: '600px',
        showConfirmButton: false,
        showCloseButton: true
    });
}
