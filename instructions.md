# 🏍️ Motorbike Service Station POS System - Project Instructions

Me file eke thiyenne ube service station ekata awashya full online POS system eka hadaganna ona "Business Requirements" saha "Technical Steps" tika.

---

## 1. Business Requirements (Mokadda wenne ona?)

* **Dashboard:** Adha dawase thiyena total sales, iwara wenna langa spare parts (Low Stock), saha service karanna thiyena bikes gana overview ekak penna ona.
* **Inventory Management (Items):** Spare parts wala nam, price, thiyena pramanaya (quantity) add karanna saha edit karanna puluwan wenna ona.
* **Billing System:** Customer kenekge details (Nama, Bike No) ekka gaththa badu saha karapu service (Body wash, Repair) walata invoice ekak hadanna puluwan wenna ona.
* **Customer Database:** Customer ge history eka (kalin service kare kawadda wage dewal) save wenna ona.
* **Item Receiving:** Aluthen stock eddi ewa system ekata add karaganna puluwan wenna ona.
* **Automated Reports:** Hama dawasema reeta (ho button ekakin) Sales Report eka saha Stock Report eka EmailJS haraha ube email ekata auto wenna ona.

---

## 2. Technical Stack (Mawage dewalda use karanne?)

* **Frontend:** HTML5, **Tailwind CSS** (Design ekata), JavaScript (Logic ekata).
* **Local Database:** **Dexie.js** (Browser eka athule data thiyaganna - speed eka wedi wenna).
* **Cloud Backend/Backup:** **Firebase (Realtime Database)** - Browser eka change kalath data load wenna meka thamai use wenne.
* **Reporting:** **EmailJS** - Email yawanna use karana service eka.

---

## 3. Database Structure (Data save wenna ona vidiya)

Firebase saha Dexie wala me table tika thiyenna ona:
1.  **Items:** `id, itemName, category, price, quantity, lowStockLimit`
2.  **Sales:** `id, customerName, bikeNumber, date, items(list), totalAmount, technicianName`
3.  **Customers:** `id, name, phone, bikeNumber, lastServiceDate`

---

## 4. Implementation Steps (Peliwela)

### Step 1: UI Dashboard Design (Tailwind CSS)
Tailwind CDN eka use karala simple side bar ekak saha main content area ekak hadanna. 
* Menu items: Dashboard, Billing, Inventory, Reports, Settings.

### Step 2: Firebase Connection
Uba deepu configuration eka `firebase.js` kiyala file ekaka hadala, Firebase initialize karanna. Data `set()` saha `onValue()` functions use karala Firebase ekka sync karanna.

### Step 3: Dexie.js Setup (Local Storage)
Dexie use karanne browser eka offline giyath ho data load wenna thiyena vegaya wedi karannai. 
* Browser eke Dexie data store karanna.
* Aluthen item ekak add karaddi eka **Dexie ekata saha Firebase ekata dekakatama** save karanna.

### Step 4: Billing & Logic
* Billing page eke item ekak select karaddi stock eken eka adu wenna code eka liyanna.
* Invoice eka generate unama eka Firebase `sales` kiyana path ekata save karanna.

### Step 5: Data Sync (Multi-browser support)
Uba wena browser ekakin log weddi:
1.  Firebase eke thiyena data tika ganna (`once` method).
2.  Ewa Dexie (Local DB) ekata bulk add karanna.
3.  Ethakota browser dekema data ekama widiyata penawi.

### Step 6: EmailJS Integration
* EmailJS account ekak hadala Service ID, Template ID saha Public Key ganna.
* JS function ekak liyanna Sales Report eka table ekak widiyata string ekakata harawala `emailjs.send()` haraha ube mail ekata yawanna.

---

## 5. Security & Backups

* Firebase **Rules** update karanna ube email eken vitharak data read/write karanna puluwan widiyata.
* Hama transaction ekakatama passe `last_sync_time` eka check karala local database eka update karanna.

---

## 6. Checklist (Iwara unada balanna)

- [ ] Dashboard eke ada income eka penawada?
- [ ] Item ekak wikunaddi stock eka auto adu wenawada?
- [ ] Browser eka refresh karama data thiyenawada?
- [ ] Wena device ekakin log weddi data load wenawada?
- [ ] Sales report eka email ekata enawada?