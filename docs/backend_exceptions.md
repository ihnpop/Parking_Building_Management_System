# Exception Handling Module Specification
## Project: Parking Building Management System (PBMS)
**Version:** 1.0.0  
**Stack Integration:** Node.js, Express.js, Supabase PostgreSQL, Operational Integrity

---

## 1. Exception Type Catalog & Status Model

Exception handling monitors human errors, equipment discrepancies, and policy bypasses.

### 1.1 Exception Types (`exception_type` Enum)
*   **`LOST_TICKET`**: Driver lost the thermal check-in barcode ticket. Billed at standard penalty rates or manual release.
*   **`PLATE_MISMATCH`**: Scanner read plate v1 at entry but v2 at exit. Requires manual operator visual verification.
*   **`OVERSTAY`**: Vehicle sat at exit gate beyond the unpaid grace period window after checkout.
*   **`WRONG_ZONE`**: Vehicle parked in a VIP slot with a Regular ticket category.
*   **`UNPAID_SESSION`**: Gate opened without receiving positive payment confirmation.
*   **`DAMAGED_TICKET`**: Barcode ticket is unreadable.
*   **`MANUAL_OVERRIDE`**: Manager manually forces the barrier gate arm open.

### 1.2 Status Life-cycle
Every logged exception is assigned a review status to ensure operator accountability:
*   **`PENDING`**: Logged by staff, awaiting manager audit approval.
*   **`RESOLVED`**: Reviewed by manager, resolution notes filed, closed.

---

## 2. API Endpoint Matrix & Permissions

| HTTP Method | Route Pathway | Required Role | Functionality Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/exceptions` | `STAFF`, `MANAGER` | Logs a new operational incident during gate operations. |
| `GET` | `/exceptions` | `MANAGER`, `ADMIN` | Search and audit active incidents (*Manager Dashboard*). |
| `GET` | `/exceptions/:id` | `MANAGER`, `ADMIN` | Retreive detailed log report. |
| `PATCH` | `/exceptions/:id/resolve`| `MANAGER`, `ADMIN` | Mark incident as reviewed with resolution notes. |

---

## 3. Operational Workflows

### 3.1 Staff Incident Logging Workflow (At Exit Gate)
1. Staff encounters gate block (e.g. driver lost barcode ticket).
2. Staff invokes `POST /exceptions` providing the active `session_id`, `exception_type`, and a written `justification` (e.g. "Driver confirmed name and ID, paid lost ticket fee").
3. System inserts the log as `PENDING` status.
4. Barrier opens. Session is closed.

### 3.2 Manager Resolution Audit Workflow (At Management Desk)
1. Manager logs into PBMS Web Dashboard.
2. Navigates to **Exceptions Log** panel (`GET /exceptions?status=PENDING`).
3. Manager inspects details and enters resolution remarks (e.g., "Verified gate footage. Operator followed standard lost ticket check-out protocol").
4. Manager triggers `PATCH /exceptions/:id/resolve` with remarks.
5. System marks status as `RESOLVED`.
