# PBMS System Architecture & Code Review Report
**Project:** Parking Building Management System (PBMS)  
**Role:** Senior Code Reviewer & Software Architect  
**Review Date:** June 15, 2026

---

## 1. Code Organization & Architecture
The system conforms to a modern decouple-first pattern:
*   **Backend:** Uses the Controller-Service-Repository structural pattern. Database interactions are isolated in Repository modules, business logic (fee calculations, state mappings) resides in Services, and HTTP endpoints routing are managed by Controllers.
*   **Frontend:** Built as a single-page application using React, Vite, and Tailwind CSS (v4). Standard layout files (`DashboardShell`) wrap nested page components, with centralized authentication managed by React Context.

---

## 2. Naming Consistency & Core Enums
To avoid database mapping failures during demo presentations, ensure all parts of the application utilize identical strings for role clearances and transaction states:

| Entity Scope | Allowed Backend Types (Database Enums) | Frontend Representation & Badge styles |
| :--- | :--- | :--- |
| **System Roles** | `'ADMIN'`, `'MANAGER'`, `'STAFF'` | `user?.role` tag (Orange badge) |
| **Slot Status** | `'AVAILABLE'`, `'OCCUPIED'`, `'MAINTENANCE'` | Slot Grid colors (Green, Orange, Red) |
| **Slot Type** | `'REGULAR'`, `'VIP'`, `'ELECTRIC'`, `'LARGE'` | Slot Category headers (Gray font) |
| **Session Status** | `'ACTIVE'`, `'COMPLETED'`, `'DISPUTED'` | Ledger Tag (Red, Green, Yellow) |
| **Payment Status** | `'PENDING'`, `'PAID'`, `'WAIVED'` | Transaction receipt details |

---

## 3. Standardized API Response Format
All controllers should return a consistent envelope structure to prevent UI decoding crashes. Ensure all controller functions utilize:

### Success Response:
```json
{
  "success": true,
  "message": "Action completed successfully",
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Descriptive error rationale statement",
  "error": "Detailed validation arrays or stack-trace (omitted in production)"
}
```

---

## 4. Role-Based Access Control (RBAC) Audit
The client-side `RouteGuard` implements a **"Deny-by-Default"** security posture:
1.  **Cold-Start Lock:** If no active user profile is found in context or localStorage, the router blocks rendering and redirects immediately to `/login`.
2.  **Route Isolation:** Pages like Roles, System Settings, and User Rosters are restricted:
    *   `/users`, `/roles`, `/settings` -> Restricted to `['ADMIN']`.
    *   `/dashboard`, `/exceptions`, `/pricing`, `/buildings`, `/vehicles`, `/reports` -> Restricted to `['ADMIN', 'MANAGER']`.
    *   `/sessions`, `/slots` -> Exposed to all roles (`['ADMIN', 'MANAGER', 'STAFF']`).

---

## 5. Risk Assessment & Mitigations

### Risk 1: Temporal Pricing Policy Snapshots
*   **Problem:** If a Manager updates a pricing policy, active checked-in vehicles might be charged the *new* rate during checkout instead of the rate active during check-in.
*   **Mitigation:** The database design must snapshot the active policy ID (or rate) onto the `parking_sessions` record at the moment of entry. The fee service should use this snapshotted rate.

### Risk 2: Lost Ticket Exceptions Verification
*   **Problem:** Staff could bypass gate checkout calculations by logging false "Lost Ticket" events to waive fees.
*   **Mitigation:** Ensure exception logs are immutable. A manager must audit and confirm the justification before releasing the waiver.

### Risk 3: Network Dropouts & Offline Operation
*   **Problem:** If the connection to Supabase drops, barriers cannot raise and vehicles are locked inside.
*   **Mitigation:** Staff console caching. Maintain check-ins locally in indexDB, and queue sync tasks once backend connection is restored.
