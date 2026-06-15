# Use Case Specifications and Operational Workflows
## Project: Parking Building Management System (PBMS)
**Version:** 1.0.0  
**Target Audience:** UI/UX Designers, Frontend/Backend Developers, QA Engineers

---

## 1. Use Case List by Role

### 1.1 Admin (System Administrator)
*   **UC-ADM-01: Login** – Authenticate and access the system.
*   **UC-ADM-02: Manage Users** – Create, update, suspend, and view logs of Managers and Staff.
*   **UC-ADM-03: Manage Building Structure** – Configure buildings, floors, and basic floor layouts.
*   **UC-ADM-04: Configure System Settings** – Edit global values (e.g., currency, defaults).

### 1.2 Manager
*   **UC-MGR-01: Login** – Authenticate and access the manager console.
*   **UC-MGR-02: Manage Slots** – Classify slots (VIP, Regular, Large, Electric) and view floor maps.
*   **UC-MGR-03: Configure Pricing Rules** – Add or modify hourly tariffs, multipliers, and grace periods.
*   **UC-MGR-04: View Operations Dashboard** – View real-time occupancy metrics and revenue summaries.
*   **UC-MGR-05: View Financial & Occupancy Reports** – Generate, filter, and export historical session tables.
*   **UC-MGR-06: Resolve Exceptions** – Review and audit manual gate overrides or ticket bypasses.

### 1.3 Staff (Gate Operator)
*   **UC-STF-01: Login** – Authenticate and access the gate terminal.
*   **UC-STF-02: Create Parking Session (Check-In)** – Record incoming license plate, select vehicle type, and issue ticket.
*   **UC-STF-03: Close Parking Session (Check-Out)** – Scan/input ticket, verify vehicle, calculate cost, process payment, and open exit gate.
*   **UC-STF-04: Handle Exception** – Flag mismatches, report lost tickets, and log manual override justifications.
*   **UC-STF-05: Inspect Slot Map** – View live floor plans to assist arriving drivers.

---

## 2. Detailed Use Case Descriptions

### UC-01: Login
*   **Actors:** Admin, Manager, Staff
*   **Description:** Allows users to securely log into the PBMS console using their credentials.
*   **Preconditions:** The user profile exists in the database and is marked as Active.
*   **Trigger:** The user navigates to the PBMS root URL.
*   **Main Flow:**
    1.  System displays the Login Screen with inputs for Email and Password.
    2.  User enters credentials and clicks "Log In".
    3.  System validates the credentials against Supabase Auth.
    4.  System retrieves the user's role (`ADMIN`, `MANAGER`, `STAFF`) from the database.
    5.  System directs the user to the default page for their role:
        *   *Admin* -> `/user-management`
        *   *Manager* -> `/dashboard`
        *   *Staff* -> `/gate-control`
*   **Alternative Flows:**
    *   *Alt 1 (Invalid Credentials):* At step 3, if validation fails, the system highlights the inputs in red, displays "Invalid email or password", and retains entered email.
    *   *Alt 2 (Suspended Account):* At step 4, if `profiles.is_active` is `false`, the system displays "Account suspended. Please contact administrator" and terminates login.
*   **Postconditions:** User is authenticated and a secure session cookie/token is initialized.

---

### UC-02: Manage Users
*   **Actors:** Admin
*   **Description:** Administrative controls to create, update, and toggle active status for staff accounts.
*   **Preconditions:** Admin is logged in.
*   **Trigger:** Admin clicks "User Management" in the sidebar.
*   **Main Flow:**
    1.  System displays a table of all user profiles (Name, Email, Role, Status, Created Date).
    2.  Admin clicks "Add User" button.
    3.  System displays a modal form containing inputs: Full Name, Email, Password, and Role Dropdown.
    4.  Admin fills in the form and clicks "Save Profile".
    5.  System sends registration to Supabase Auth, writes profile to the database, closes the modal, and refreshes the user list.
*   **Alternative Flows:**
    *   *Alt 1 (Edit User):* Admin clicks the "Edit" icon next to a user row. System pre-populates the modal form. Admin saves modifications.
    *   *Alt 2 (Deactivate User):* Admin toggles the "Active Status" switch on a user row. System warns of session termination, and updates `profiles.is_active` to `false`.
*   **Postconditions:** Profile is updated, and access rights are modified or revoked immediately.

---

### UC-03: Manage Building Structure
*   **Actors:** Admin
*   **Description:** Define physical layout characteristics of the parking complex.
*   **Preconditions:** Admin is logged in.
*   **Trigger:** Admin clicks "Building Settings" in the navigation sidebar.
*   **Main Flow:**
    1.  System shows current Buildings list.
    2.  Admin selects a building to view its Floor List.
    3.  Admin clicks "Add Floor".
    4.  System displays floor configuration prompt (Floor number, target slots count).
    5.  Admin inputs values and clicks "Confirm".
    6.  System writes floor to database, initializing default slots (all set to `AVAILABLE` and `REGULAR`).
*   **Alternative Flows:**
    *   *Alt 1 (Delete Empty Floor):* Admin clicks "Delete" on a floor with no active session history. System performs delete operation.
    *   *Alt 2 (Delete Occupied Floor Blocked):* Admin tries to delete a floor containing slots with status `OCCUPIED` or related active sessions. System displays "Error: Cannot delete floor containing occupied spaces" and aborts.
*   **Postconditions:** Real-time layouts update.

---

### UC-04: Manage Slots
*   **Actors:** Manager
*   **Description:** Categorize and toggle operational status for individual parking stalls.
*   **Preconditions:** Manager is logged in.
*   **Trigger:** Manager clicks "Slot Map" or "Slot Settings" in the sidebar.
*   **Main Flow:**
    1.  System displays floor selector tabs and a responsive grid of slots.
    2.  Manager clicks on a specific Slot Box (e.g., Slot `A-104`).
    3.  System displays a Dialog Modal showing the slot's current properties.
    4.  Manager alters properties: changes slot type (`REGULAR`, `VIP`, `ELECTRIC`, `LARGE`) or status (`AVAILABLE`, `MAINTENANCE`).
    5.  Manager clicks "Save Changes".
    6.  System updates the database and pushes changes to all active screens using realtime listeners.
*   **Alternative Flows:**
    *   *Alt 1 (Occupied Space Lockdown):* At step 4, if a slot's status is `OCCUPIED`, status change to `MAINTENANCE` or `AVAILABLE` is disabled. System shows "Space is currently occupied".
*   **Postconditions:** Slot properties are updated, reflecting immediately on gate allocation engines.

---

### UC-05: Create Parking Session (Check-In)
*   **Actors:** Staff (Gate Operator)
*   **Description:** Registers an arriving vehicle, allocates a slot, and prints a physical barcode ticket.
*   **Preconditions:** Staff is logged in and assigned to an entry terminal.
*   **Trigger:** A vehicle pulls up to the entrance gate.
*   **Main Flow:**
    1.  System shows the "Entry Gate Console" on the Staff screen.
    2.  Staff inputs the license plate (manual typed input) and selects the vehicle category (e.g., SUV).
    3.  Staff clicks "Check In" (or presses Enter).
    4.  System queries database for the closest `AVAILABLE` slot matching the vehicle category.
    5.  System locks the slot (status -> `OCCUPIED`).
    6.  System creates a `parking_sessions` row with check-in timestamp and generates a ticket code.
    7.  System displays the ticket confirmation and opens the gate (simulated).
*   **Alternative Flows:**
    *   *Alt 1 (Garage Full):* At step 4, if no slots are available, the system shows warning banner "NO SLOTS AVAILABLE" and disables checkout submission.
*   **Postconditions:** Ticket is generated, slot is updated to `OCCUPIED`, and the session status is set to `ACTIVE`.

---

### UC-06: Close Parking Session (Check-Out)
*   **Actors:** Staff (Gate Operator)
*   **Description:** Look up active sessions, trigger fee calculation, verify plate, and open exit gate.
*   **Preconditions:** Staff is logged in at exit terminal.
*   **Trigger:** Driver approaches exit gate.
*   **Main Flow:**
    1.  Staff enters ticket code or inputs license plate on the "Exit Gate Console".
    2.  System retrieves the active session details (Entry time, duration, plate details).
    3.  System executes **UC-07: Calculate Fee** and displays the summary.
    4.  Staff verifies the exit license plate against the entry license plate shown on screen.
    5.  System prompts payment method dialog (**UC-08: Record Payment**).
    6.  Upon payment success, system updates session status to `COMPLETED`, updates slot to `AVAILABLE`, and opens exit gate.
*   **Alternative Flows:**
    *   *Alt 1 (Mismatched Plate):* If plates do not match, Staff invokes **UC-09: Handle Exception**.
*   **Postconditions:** Session is closed, slot is freed, gate releases.

---

### UC-07: Calculate Fee (System Sub-Flow)
*   **Actors:** System
*   **Description:** Computes the total parking fee based on session duration and active tariff models.
*   **Preconditions:** Active parking session details loaded.
*   **Trigger:** System accesses checkout parameters.
*   **Main Flow:**
    1.  System computes elapsed time (`now` - `check_in_time`).
    2.  System checks grace period configuration. If duration is less than grace period, fee = 0.
    3.  System determines matching `pricing_schemes` record for the vehicle category.
    4.  System calculates: `base_price` (first hour) + (`additional_hours` * `hourly_rate`).
    5.  System applies caps if daily limit (`day_cap`) is exceeded.
    6.  System displays the breakdown (Duration, Base Rate, Surcharges, Total) in the UI.
*   **Postconditions:** Billing totals are cached for transaction finalization.

---

### UC-08: Record Payment
*   **Actors:** Staff (Gate Operator)
*   **Description:** Select method and confirm payment receipt.
*   **Preconditions:** Fee calculated.
*   **Trigger:** Staff initiates payment dialog.
*   **Main Flow:**
    1.  System displays payment options (`CASH`, `BANK_TRANSFER`).
    2.  Staff selects Cash or generates dynamic QR code for bank transfer.
    3.  Staff clicks "Confirm Payment Received".
    4.  System sets `payment_status` to `PAID` and logs the method.
*   **Alternative Flows:**
    *   *Alt 1 (Fee Waived):* Manager overrides payment. System sets fee to $0, sets status to `WAIVED`, and logs authorization profile ID.
*   **Postconditions:** Transaction marked as paid in the database.

---

### UC-09: Handle Exception
*   **Actors:** Staff, Manager
*   **Description:** Resolve disputes, lost tickets, or license plate mismatch anomalies.
*   **Preconditions:** Checkout process is open.
*   **Trigger:** Staff clicks "Raise Exception" in exit console.
*   **Main Flow:**
    1.  System displays "Exception Log Modal".
    2.  Staff selects exception type (`LOST_TICKET`, `PLATE_MISMATCH`, `MANUAL_OVERRIDE`).
    3.  Staff writes a mandatory justification text.
    4.  If bypass requires manager approval, Staff clicks "Request Override".
    5.  Manager reviews from dashboard, enters credentials/clicks approve.
    6.  System creates a log in `exception_logs` and continues exit workflow.
*   **Postconditions:** Exception is logged to audit database, and checkout is allowed to proceed.

---

### UC-10: View Reports
*   **Actors:** Manager
*   **Description:** Load history charts and download audit logs.
*   **Preconditions:** Manager is logged in.
*   **Trigger:** Manager navigates to "Reports & Analytics".
*   **Main Flow:**
    1.  System displays dashboard charts (Earnings by Vehicle, Peak Hour utilization trends).
    2.  Manager sets filtering options: Date range, Floor, Staff member.
    3.  System updates table listing transactions matching filters.
    4.  Manager clicks "Export to CSV".
    5.  System compiles grid table into CSV and initiates local file download.
*   **Postconditions:** Report filters applied, file successfully exported.

---

## 3. Operational Workflows (Text-Based Flowcharts)

### 3.1 Admin Operational Workflow
```
[Admin Logged In]
      │
      ├─── Navigates to User Directory ─── [Add/Suspend Staff/Managers]
      │
      └─── Navigates to Building Settings
                 │
                 ├─── Create Buildings/Floors
                 └─── Initialize Slots Structure
```

### 3.2 Manager Operational Workflow
```
[Manager Logged In]
      │
      ├─── Dashboard Overview ──── [Inspect Live Occupancy / Financial KPIs]
      │
      ├─── Slot Map Grid ───────── [Inspect Specific Stalls / Set Maintenance State]
      │
      ├─── Pricing Matrix ──────── [Define Base Tariffs / Hourly Rates / Grace Periods]
      │
      ├─── Reports Interface ───── [Filter Session Records / Export to CSV]
      │
      └─── Exception Auditor ───── [View Manual Overrides / Log Details]
```

### 3.3 Staff Operational Workflow
```
[Staff Logged In]
      │
      ├─── Gate Terminal View (Dual Entry/Exit Panels)
      │
      ├─── Entry Gate Event (Arrival)
      │         │
      │         └─── Enter License Plate ──► Auto-Assign Slot ──► Print Ticket
      │
      └─── Exit Gate Event (Departure)
                │
                └─── Scan/Enter Ticket Code
                          │
                          ├─── Plate Matches? ─── [Calculate Fee] ──► Record Payment ──► Open Gate
                          │
                          └─── Plate Mismatch / Lost Ticket
                                    │
                                    └─── Raise Exception Modal ──► Input Reason ──► Open Gate (Audit Logged)
```

---

## 4. System Navigation Structure

The PBMS sidebar layout changes dynamically depending on the user role.

```
┌──────────────────────────────────────────────────────────┐
│ Global App Shell (Navigation Sidebar)                    │
├──────────────────────────────────────────────────────────┤
│ ROLE: ADMIN                                              │
│  ├── [User Management]    --> /user-management           │
│  └── [Building Settings]  --> /building-settings         │
├──────────────────────────────────────────────────────────┤
│ ROLE: MANAGER                                            │
│  ├── [Overview Dashboard] --> /dashboard                 │
│  ├── [Slot Inspector]     --> /slot-management           │
│  ├── [Pricing Rules]      --> /pricing-rules             │
│  ├── [Reports & Analytics]--> /reports                   │
│  └── [Exception Auditing] --> /exception-logs            │
├──────────────────────────────────────────────────────────┤
│ ROLE: STAFF                                              │
│  ├── [Gate Control]       --> /gate-control              │
│  └── [Live Slot Map]      --> /slot-management (View)    │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Front-End Page Hierarchy

Consistent with modern React applications styled after Shadcn structures, pages are organized hierarchically:

```
src/
├── components/
│   ├── ui/                    # Base Shadcn UI primitives (cards, tables, dialogs, buttons)
│   ├── sidebar.jsx            # Shared Navigation sidebar (collapsible, role-filtering)
│   ├── stat-card.jsx          # Dashboard KPI display container
│   └── slot-box.jsx           # Individual slot cell component for visual layouts
├── layouts/
│   └── dashboard-shell.jsx    # General dashboard wrapper containing header & sidebar
├── pages/
│   ├── login.jsx              # Unprotected route, centering form container
│   ├── dashboard.jsx          # KPI lists, occupancy charts, alerts list
│   ├── gate-control.jsx       # Side-by-side Check-In and Check-Out grids
│   ├── slot-management.jsx    # Visual floor grids, status modifiers
│   ├── pricing-rules.jsx      # Pricing rules tables, fee modifier forms
│   ├── reports.jsx            # Filters, revenue charts, CSV table
│   ├── user-management.jsx    # Admin view, lists accounts, edit profile modal
│   └── exception-logs.jsx     # Audit logs grid, details drawer
└── App.jsx                    # Routing configuration, role guards definition
```

---

## 6. Role-Based Access Matrix

The access matrix specifies endpoints and API action constraints enforced on the client and PostgreSQL policies:

| Target Page / Action | Admin | Manager | Staff | Rule Enforcement Level |
| :--- | :---: | :---: | :---: | :--- |
| **`/login`** | Access | Access | Access | Open Route |
| **`/user-management`** | Full | Denied | Denied | Client Routing + Profile Table RLS |
| **`/building-settings`** | Full | Denied | Denied | Client Routing + Building Table RLS |
| **`/dashboard`** | Denied | Access | Denied | Client Routing |
| **`/gate-control`** | Denied | Access | Access | Client Routing |
| **`/slot-management`** | Denied | Full (Write) | View Only | Client Routing + Slot Table RLS |
| **`/pricing-rules`** | Denied | Full (Write) | Denied | Client Routing + Pricing Table RLS |
| **`/reports`** | Denied | Full (Write) | Denied | Client Routing + Session Analytics RLS |
| **`/exception-logs`** | Denied | Full (Audit) | Write Only | Client Routing + Exception Log Table RLS |
| **Manual Gate Override** | Denied | Approve | Trigger / Log | Server-side trigger verification |
| **Modify Base DB Schema** | DB Owner | Denied | Denied | PostgreSQL Connection Permissions |

---

## 7. Developer & UI/UX Handoff Guidelines

### 7.1 UX Design Recommendations
*   **Colors & Slate Scheme:** Use light gray backgrounds (`#f8fafc`) with slate elements (`#0f172a`, `#e2e8f0`) to replicate Shadcn styles.
*   **Form Usability:** Position checkout scanners or plate input searches at the top right of the screen for quick operational focus. Use autofocus elements on inputs.
*   **Responsive Modals:** Keep popup forms short (max 2 columns). Avoid nested modals.

### 7.2 Developer Implementation Guidelines
*   **Supabase Client Authentication:** Store sessions in local secure storage, but confirm role credentials on initial loading screens to avoid security bypass.
*   **Database Safety (Locks):** Wrap the check-in slot allocation and session creations in single SQL Transactions to prevent double-booking slot races.
*   **Error Logging:** Return clean, user-friendly errors in standard notifications. Log technical database errors directly to audit tables.
