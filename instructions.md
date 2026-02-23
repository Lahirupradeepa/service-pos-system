# Project: Motorbike Service Station & Spare Parts POS System

## 1. Business Requirements (Mona wageda wenna ona?)

Me system eken pradanama business awashyatha 4k cover wenna ona:

### A. Inventory & Spare Parts Management
* Pitin ganna spare parts system ekata add karaganna puluwan wenna ona (Name, Buy Price, Sell Price, Quantity).
* Badu wikunana kota auto-stock adu wenna ona.
* Stock iwara wenna laga ewa (Low Stock) alert wenna ona.

### B. Service & Repair Management
* Wash, Engine Oil Change, Repair wage service types define karanna puluwan wenna ona.
* Wade karana Technician ge nama select karanna puluwan wenna ona.
* Service charge eka invoice ekata add wenna ona.

### C. Billing & Invoicing
* Customer ge nama saha bike number eka record wenna ona.
* Parts wala ganai, service charge ekai ekathu wela final bill eka hadenna ona.
* Bill eka print karanna ho PDF ekak widihata ganna puluwan wenna ona.

### D. Reporting & Dashboard
* Dawase labaya (Profit) saha total sales bala ganna dashboard ekak.
* Wadiyenma wikunapu parts saha wadiyenma karapu service monawada kiyala bala ganna puluwan wenna ona.

---

## 2. Technical Requirements (Hadanne kohomada?)

### A. Tech Stack
* **Frontend:** HTML5, Tailwind CSS (Design eka lesiyen lassanata ganna).
* **Logic:** Vanilla JavaScript (ES6+).
* **Database:** Dexie.js (IndexedDB wrap karapu library ekak - Browser eke data save karanna).

### B. System Architecture
1.  **Offline-First:** Internet nathuwath system eka wada karanna ona.
2.  **Responsive Design:** Desktop eken wagema Tab ekakin unath use karanna puluwan wenna ona.
3.  **Modular Code:** HTML files wenama saha JS logic wenama thibunama lesiyi.

---

## 3. Database Schema (Dexie.js setup eka)

Data table tika me widihata thiyenna ona:

* **parts:** `++id, name, buyPrice, sellPrice, stockQuantity`
* **services:** `++id, serviceName, cost`
* **technicians:** `++id, name, phone`
* **sales:** `++id, customerName, bikeNumber, totalAmount, date`
* **saleItems:** `++id, saleId, itemName, type (part/service), price, qty`

---

## 4. Functional Modules (Hadiya yuthu kotas)

### Phase 1: Dashboard
* Total Sales (Today/Monthly).
* Total Profit.
* Low Stock Items table ekak.

### Phase 2: Inventory Management
* Form ekak spare parts add karanna.
* Table ekak thiyana stock eka edit/delete karanna.

### Phase 3: POS Interface (Main Screen)
* **Search Bar:** Part ekak search karala bill ekata add karanna.
* **Service Selector:** Service eka saha technician select karanna.
* **Cart View:** Add karapu items wala list eka saha sub-total eka.
* **Checkout:** "Print Bill" button eka ebama data save wela receipt eka generator wenna ona.

### Phase 4: Reports
* Range ekak athulatha (eg: Jan 1 to Jan 31) sales report eka filter karanna.

---

## 5. Development Instructions (Piliganna ona piyawara)

1.  **Project Setup:** Folder ekak hadala `index.html`, `style.css`, `app.js` file hadaganna. Tailwind CSS CDN eka link karaganna.
2.  **Database Initialize:** `app.js` eke Dexie instance ekak create karala tables define karanna.
3.  **UI Building:** Tailwind use karala sidebar ekak saha main content area ekak hadanna.
4.  **CRUD Logic:** Parts add karana saha save karana functions liyanna.
5.  **Billing Logic:** Array ekakata items add karala, eka Dexie `sales` table ekata save karana function eka hadanna.
6.  **Print Template:** `@media print` CSS use karala bill eka lassanata print wenna hadanna.