# REST API Contract Specification
## Project: Parking Building Management System (PBMS)
**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Content-Type:** `application/json`

---

## 1. Authentication & Security Policy

### 1.1 Authentication Protocol
*   All protected endpoints require an `Authorization` header containing a valid JSON Web Token (JWT) provided by Supabase Auth:
    ```http
    Authorization: Bearer <your_jwt_token>
    ```

### 1.2 Access Scope Matrix (RBAC)
*   **`ADMIN`**: User management, global configuration, building structure overrides.
*   **`MANAGER`**: Pricing schemes adjustments, exception overrides, reports, slot classification, operational dashboards.
*   **`STAFF`**: Gate entry/exit checkout transactions, manual check-in inputs, slot status inspection.

---

## 2. Standard Request/Response Standards

### 2.1 Standard Error Format
When an API error occurs (4xx or 5xx status codes), the system returns a standard JSON response envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload contains invalid values.",
    "details": [
      {
        "field": "license_plate",
        "issue": "License plate must be between 3 and 12 alphanumeric characters."
      }
    ]
  }
}
```

#### Common Error Codes:
*   `UNAUTHORIZED`: Missing or malformed authentication header.
*   `FORBIDDEN`: User role lacks permission to invoke endpoint.
*   `NOT_FOUND`: Target resource does not exist.
*   `RESOURCE_CONFLICT`: Double-booking slots or duplicate unique indexes (e.g. email).
*   `VALIDATION_FAILED`: Body parameters failed schema checks.
*   `INTERNAL_ERROR`: Internal PostgreSQL or service crash.

### 2.2 Pagination, Filtering, & Sorting
For list endpoints (`GET`), standard query parameters apply:
*   `page`: Target page number (default: `1`).
*   `limit`: Records per page (default: `20`, max: `100`).
*   `sort_by`: Target column name.
*   `sort_order`: Sorting direction (`asc` or `desc`).
*   **Filtering**: Appended as exact parameter mappings (e.g. `?status=ACTIVE&vehicle_type=CAR_4SEAT`).

---

## 3. API Endpoints by Module

### 3.1 Module: Authentication (`/auth`)

#### 3.1.1 `POST /auth/login`
*   **Purpose:** Authenticate credentials.
*   **Auth Role Required:** Open (Public)
*   **Request Body:**
```json
{
  "email": "staff@parking.com",
  "password": "SecurePassword123"
}
```
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "762f9db1-356a-493e-ba4b-97216a75f10b",
      "email": "staff@parking.com",
      "full_name": "John Doe",
      "role": "STAFF",
      "is_active": true
    }
  }
}
```

#### 3.1.2 `GET /auth/me`
*   **Purpose:** Retrieve the profile details of the current authenticated user.
*   **Auth Role Required:** `ADMIN`, `MANAGER`, `STAFF`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "762f9db1-356a-493e-ba4b-97216a75f10b",
    "email": "staff@parking.com",
    "full_name": "John Doe",
    "role": "STAFF"
  }
}
```

---

### 3.2 Module: User Management (`/users` - Admin Only)

#### 3.2.1 `GET /users`
*   **Purpose:** Fetch list of users. Supports `role` and `status` filter queries.
*   **Auth Role Required:** `ADMIN`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "e67e3df1-b99b-46bf-85f8-8ef82b99520b",
      "full_name": "Jane Manager",
      "email": "manager@parking.com",
      "role": "MANAGER",
      "is_active": true,
      "created_at": "2026-06-15T07:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

#### 3.2.2 `POST /users`
*   **Purpose:** Register a new Manager or Staff user profile.
*   **Auth Role Required:** `ADMIN`
*   **Request Body:**
```json
{
  "email": "newstaff@parking.com",
  "password": "Password123!",
  "full_name": "Robert Smith",
  "role": "STAFF"
}
```
*   **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "fa2b39f1-ceb9-4c8d-8a5e-9c09afa53db4",
    "email": "newstaff@parking.com",
    "full_name": "Robert Smith",
    "role": "STAFF",
    "is_active": true
  }
}
```

#### 3.2.3 `PATCH /users/:id/status`
*   **Purpose:** Suspend or activate a user account.
*   **Auth Role Required:** `ADMIN`
*   **Request Body:**
```json
{
  "is_active": false
}
```
*   **Response (200 OK):**
```json
{
  "success": true,
  "message": "User account status updated successfully."
}
```

---

### 3.3 Module: Infrastructure Layout (`/buildings`, `/floors`, `/zones`)

#### 3.3.1 `GET /buildings`
*   **Purpose:** List all buildings.
*   **Auth Role Required:** `ADMIN`, `MANAGER`, `STAFF`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Main Garage",
      "address": "123 Capstone Avenue"
    }
  ]
}
```

#### 3.3.2 `GET /buildings/:id/floors`
*   **Purpose:** Fetch floors belonging to a specific building.
*   **Auth Role Required:** `ADMIN`, `MANAGER`, `STAFF`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "building_id": 1,
      "floor_number": 1,
      "floor_name": "Ground Floor"
    }
  ]
}
```

#### 3.3.3 `GET /floors/:id/zones`
*   **Purpose:** Fetch sub-zones on a specific floor.
*   **Auth Role Required:** `ADMIN`, `MANAGER`, `STAFF`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "floor_id": 1,
      "name": "Zone A-Regular"
    }
  ]
}
```

---

### 3.4 Module: Vehicle Types (`/vehicle-types`)

#### 3.4.1 `GET /vehicle-types`
*   **Purpose:** Fetch the list of vehicle categories.
*   **Auth Role Required:** `ADMIN`, `MANAGER`, `STAFF`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "MOTORBIKE",
      "display_name": "Motorbike"
    },
    {
      "id": 2,
      "code": "CAR_4SEAT",
      "display_name": "Sedan / Hatchback (4-5 Seats)"
    }
  ]
}
```

---

### 3.5 Module: Parking Slots (`/slots`)

#### 3.5.1 `GET /slots`
*   **Purpose:** List slots. Supports filters: `zone_id`, `status` (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`), `type` (`REGULAR`, `VIP`, `ELECTRIC`, `LARGE`).
*   **Auth Role Required:** `ADMIN`, `MANAGER`, `STAFF`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "zone_id": 1,
      "slot_code": "A-201",
      "type": "REGULAR",
      "status": "AVAILABLE"
    }
  ]
}
```

#### 3.5.2 `PATCH /slots/:id/status`
*   **Purpose:** Allow managers to mark slots as under maintenance or available.
*   **Auth Role Required:** `MANAGER`
*   **Request Body:**
```json
{
  "status": "MAINTENANCE"
}
```
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slot_code": "A-201",
    "status": "MAINTENANCE"
  }
}
```

---

### 3.6 Module: Pricing Policies (`/pricing-policies`)

#### 3.6.1 `GET /pricing-policies`
*   **Purpose:** Fetch pricing rules matrix.
*   **Auth Role Required:** `MANAGER`, `ADMIN`, `STAFF`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "vehicle_type_id": 1,
      "base_price": "2.00",
      "hourly_rate": "1.00",
      "day_cap": "10.00",
      "grace_period_minutes": 10,
      "is_active": true
    }
  ]
}
```

#### 3.6.2 `PUT /pricing-policies/:id`
*   **Purpose:** Update tariff configurations.
*   **Auth Role Required:** `MANAGER`
*   **Request Body:**
```json
{
  "base_price": 3.00,
  "hourly_rate": 1.50,
  "day_cap": 15.00,
  "grace_period_minutes": 10
}
```
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "base_price": "3.00",
    "hourly_rate": "1.50",
    "day_cap": "15.00"
  }
}
```

---

### 3.7 Module: Parking Sessions (`/parking-sessions`)

#### 3.7.1 `POST /parking-sessions/check-in`
*   **Purpose:** Create new check-in session and lock slot.
*   **Auth Role Required:** `STAFF`, `MANAGER`
*   **Request Body:**
```json
{
  "license_plate": "29A-99999",
  "vehicle_type_id": 2
}
```
*   **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "session_id": "871e8bf1-ceb9-4c8d-8a5e-9c09afa53db4",
    "ticket_code": "TKT-A201-99",
    "assigned_slot": {
      "id": 1,
      "slot_code": "A-201",
      "type": "REGULAR"
    },
    "check_in_time": "2026-06-15T07:29:16Z"
  }
}
```

#### 3.7.2 `POST /parking-sessions/check-out`
*   **Purpose:** Initiate check-out: search ticket/plate and calculate fee. Does NOT close the session yet.
*   **Auth Role Required:** `STAFF`, `MANAGER`
*   **Request Body:**
```json
{
  "ticket_code": "TKT-A201-99"
}
```
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "session_id": "871e8bf1-ceb9-4c8d-8a5e-9c09afa53db4",
    "license_plate": "29A-99999",
    "check_in_time": "2026-06-15T06:29:16Z",
    "check_out_time": "2026-06-15T07:29:16Z",
    "elapsed_minutes": 60,
    "calculated_amount": 5.00,
    "pricing_applied": {
      "base_price": "5.00",
      "hourly_rate": "3.00",
      "grace_period_minutes": 15
    }
  }
}
```

#### 3.7.3 `POST /parking-sessions/:id/complete`
*   **Purpose:** Confirm payment receipt, change session status to `COMPLETED`, and free the slot.
*   **Auth Role Required:** `STAFF`, `MANAGER`
*   **Request Body:**
```json
{
  "payment_method": "CASH",
  "amount_paid": 5.00
}
```
*   **Response (200 OK):**
```json
{
  "success": true,
  "message": "Parking session completed. Exit gate released."
}
```

---

### 3.8 Module: Payments (`/payments`)

#### 3.8.1 `GET /payments`
*   **Purpose:** Fetch list of cash transactions. Supports filter: `method` (`CASH`, `BANK_TRANSFER`), `created_at` (date range).
*   **Auth Role Required:** `MANAGER`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cf123bf1-ceb9-4c8d-8a5e-9c09afa53db4",
      "session_id": "871e8bf1-ceb9-4c8d-8a5e-9c09afa53db4",
      "amount": "5.00",
      "status": "PAID",
      "method": "CASH",
      "created_at": "2026-06-15T07:30:00Z"
    }
  ]
}
```

---

### 3.9 Module: Exceptions & Manual Override (`/exceptions`)

#### 3.9.1 `POST /exceptions`
*   **Purpose:** Log a manual bypass event (e.g. plate mismatch, lost ticket).
*   **Auth Role Required:** `STAFF`, `MANAGER`
*   **Request Body:**
```json
{
  "session_id": "871e8bf1-ceb9-4c8d-8a5e-9c09afa53db4",
  "exception_type": "PLATE_MISMATCH",
  "justification": "License plate scanner error. Visually confirmed plate."
}
```
*   **Response (201 Created):**
```json
{
  "success": true,
  "message": "Exception log recorded."
}
```

---

### 3.10 Module: Reports & Dashboard (`/dashboard`, `/reports`)

#### 3.10.1 `GET /dashboard/summary`
*   **Purpose:** Get real-time overview dashboard statistics (KPI cards).
*   **Auth Role Required:** `MANAGER`, `STAFF`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "occupancy_rate": 68.5,
    "active_vehicles": 137,
    "available_slots": 63,
    "today_revenue": 1420.50,
    "active_exceptions": 2
  }
}
```

#### 3.10.2 `GET /reports/revenue`
*   **Purpose:** Get daily/hourly revenue data points for charting.
*   **Auth Role Required:** `MANAGER`
*   **Query Parameters:** `date_from=2026-06-08&date_to=2026-06-15`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_revenue": 12450.00,
    "by_vehicle_type": [
      { "code": "MOTORBIKE", "revenue": 1450.00 },
      { "code": "CAR_4SEAT", "revenue": 8200.00 }
    ],
    "chart_points": [
      { "date": "2026-06-14", "amount": 1820.00 },
      { "date": "2026-06-15", "amount": 1420.50 }
    ]
  }
}
```

#### 3.10.3 `GET /reports/occupancy`
*   **Purpose:** Fetch peak hour utilization curves.
*   **Auth Role Required:** `MANAGER`
*   **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "peak_hour": 14,
    "utilization_profile": [
      { "hour": 8, "rate": 35.2 },
      { "hour": 12, "rate": 82.1 },
      { "hour": 14, "rate": 91.5 }
    ]
  }
}
```

---

## 4. Field Validation Matrix

Below is a reference guide for payload field validations to implement on backend express models:

| Field Name | Target Module | Validation Requirements |
| :--- | :--- | :--- |
| `email` | `auth`, `users` | - Required.<br>- Must match RFC 5322 email regex pattern. |
| `password` | `auth`, `users` | - Required (except profile updates).<br>- Minimum 8 characters.<br>- Must contain 1 capital letter, 1 number, and 1 special character. |
| `license_plate` | `parking-sessions` | - Required.<br>- Alphanumeric check (caps normalized automatically).<br>- Size bounds: 3 to 15 characters. |
| `vehicle_type_id` | `parking-sessions` | - Required.<br>- Integer validation.<br>- Must exist in `vehicle_types` table. |
| `payment_method` | `payments` | - Required for completion.<br>- Must match Enum values: `CASH`, `BANK_TRANSFER`. |
| `exception_type` | `exceptions` | - Required.<br>- Must match Enum values: `LOST_TICKET`, `PLATE_MISMATCH`, `MANUAL_OVERRIDE`. |
| `justification` | `exceptions` | - Required.<br>- Minimum length: 15 characters. |

---

## 5. Notes for Frontend Integration

### 5.1 Token Storage & Expiry
*   Frontend must save the `token` (JWT) in a secure state/storage mechanism.
*   Attach token to Axios/Fetch headers in an HTTP interceptor wrapper automatically.
*   If any response returns status `401 Unauthorized`, clear local session memory and redirect to the `/login` route.

### 5.2 Optimistic UI Status Binding
*   When a Staff triggers `POST /parking-sessions/check-in`, display a loader spinner on the Gate Form. Do not let the operator submit a second request until the current slot confirmation has rendered.
*   Upon receipt of status `201 Created`, perform an immediate local update to the Slot Map state rather than fetching the entire slot grid table from the server to minimize UI lag.
