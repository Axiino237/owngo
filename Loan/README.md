# Bajaj Auto Loan Application & Underwriting Platform

A full-stack, enterprise-grade auto-rickshaw customer financing application and real-time underwriting administration dashboard.

Built with **React.js**, **NestJS**, **PostgreSQL**, and **Docker**.

---

## 🌟 Key Features

### 1. Screen 1: Interactive QR Screen (`/` or `?screen=qr`)
- Dynamic QR code generation redirecting directly to the customer loan application form.
- Automatically resolves to host network address for easy scanning from mobile devices on the same Wi-Fi.
- Includes **"Open Customer Form Directly"** and **"Copy Link"** convenience controls.

### 2. Screen 2: 5-Step Customer Loan Wizard (`/apply` or `?screen=form`)
- Implements all 12 sections from the **Bajaj Auto Loan Customer Application Field Specification**:
  - **Step 1: Personal & KYC Details**: Full name, DOB, gender, parents' names, 10-digit mobile, email, PAN format regex `^[A-Z]{5}[0-9]{4}[A-Z]$`, 12-digit Aadhaar.
  - **Step 2: Address & Residence Details**: Door/flat, street, locality, city, district, state, PIN code. **Conditional logic**: unchecking *"Permanent Same as Current"* opens permanent address inputs.
  - **Step 3: Occupation, Income & Banking**: Salaried vs Driver vs Business conditional fields, monthly gross/net income, existing loans radio with conditional EMI input, bank IFSC and masked account number verification.
  - **Step 4: Vehicle & Loan Requirements**: Dynamic Bajaj 3-Wheeler models catalog (RE Compact, Maxima Z, Maxima C, Qute), auto-calculated on-road pricing (Ex-showroom + Insurance + RTO), tenure options, and optional co-applicant / references toggles.
  - **Step 5: Consent, Declarations & Summary Review**: Comprehensive summary cards of all entered data with 1-click jump-to-step edit links, mandatory regulatory checkboxes, and instant submission.
- **UI Recommendations Implemented**:
  1. Visual Progress Indicator (`Step X of 5`).
  2. Sticky Back and Continue buttons.
  3. Continuous background draft persistence into `localStorage`.
  4. Incomplete application resumption alert (*"Resume Draft"* vs *"Start Fresh"*).
  5. Conditional field visibility.
  6. Per-step input validation before proceeding.
  7. Full summary review prior to final submission.
  8. Fully mobile-responsive layout.
  9. **Quick Prefill Button** for 1-click testing with realistic Bajaj customer data.

### 3. Screen 3: Real-Time Multi-Admin Dashboard (`/admin` or `?screen=admin`)
- **4 Pre-configured Admin Accounts**:
  | Admin Name | Email | Preset Password | Role |
  | :--- | :--- | :--- | :--- |
  | **Rajesh Sharma** | `admin1@bajaj.com` | `admin123` | Senior Underwriter |
  | **Priya Patel** | `admin2@bajaj.com` | `admin123` | Credit Risk Manager |
  | **Amit Kumar** | `admin3@bajaj.com` | `admin123` | Loan Assessment Officer |
  | **Neha Singh** | `admin4@bajaj.com` | `admin123` | Compliance Lead |
- **3 Workflow Tabs**:
  - **New**: Fresh applications submitted by customers. Clicking any item automatically transitions it to **Work in Progress** and acquires the exclusive review lock.
  - **Work in Progress**: Applications under active credit review.
  - **Completed**: Finalized applications with decided eligibility.
- **Real-Time Concurrency Locking**:
  - When an admin opens an application in *Work in Progress*, an exclusive lock is granted.
  - Instant WebSocket broadcast updates all other admins' screens in real-time.
  - Other admins see a prominent badge: `🔒 another admin is using (Admin Name)` and the row edit control is locked in read-only mode.
  - The reviewing admin has access to the single decision field: **"Eligibility"** (`Yes` / `No` dropdown).
  - Saving the eligibility decision automatically moves the application to **Completed** and clears the lock.
  - Quick-switch admin dropdown in the top header allows instant testing of concurrent admins across browser tabs.

---

## 🚀 Quick Start with Docker Compose

Run the entire stack with a single command:

```bash
docker compose up --build
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **PostgreSQL Database**: `localhost:5432`

---

## 💻 Local Development Setup (Without Docker)

### Prerequisites
- Node.js (v18+)
- PostgreSQL running locally on port 5432 (default db: `bajaj_loan_db`)

### 1. Backend Setup
```bash
cd backend
npm install
npm run start:dev
```
*The database tables (`admins` and `applications`) will automatically sync and seed the 4 admin accounts and sample applications on startup.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing Concurrency Between Admins

1. Open [http://localhost:5173?screen=admin](http://localhost:5173?screen=admin) in **Browser Window A**.
   - Sign in as **Admin 1: Rajesh Sharma** (`admin1@bajaj.com` / `admin123`).
2. Open [http://localhost:5173?screen=admin](http://localhost:5173?screen=admin) in an **Incognito / Second Browser Window B**.
   - Sign in as **Admin 2: Priya Patel** (`admin2@bajaj.com` / `admin123`).
3. In Window A, click any application in the **New** tab to review it.
4. Notice that in Window B, the application in the **Work in Progress** tab immediately displays:
   > `🔒 another admin is using (Rajesh Sharma)`
5. Window B cannot edit the application. If Window B clicks "View Only", a banner warns that Rajesh Sharma is reviewing.
6. In Window A, select **Eligibility: "Yes"** and click **"Save & Move to Completed"**.
7. Both windows will instantly update in real-time without refreshing: the application moves to the **Completed** tab with the approved decision!
