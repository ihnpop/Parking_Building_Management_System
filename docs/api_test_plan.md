# PBMS API Test Plan & Testing Scenarios
This document outlines standard testing scenarios, expected responses, and Postman collection query flows for verification of the Parking Building Management System (PBMS) backend APIs.

---

## 1. Authentication Scenarios

### Scenario 1.1: Operator Sign In (Role Clearance)
*   **Request Method:** `POST`
*   **Endpoint:** `/api/v1/auth/login`
*   **Payload Format:**
    ```json
    {
      "email": "staff@pbms.io",
      "password": "securepassword123"
    }
    ```
*   **Expected Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Authentication successful",
      "data": {
        "user": {
          "id": "e44d852a-cf91-496a-a292-cc2341d3b368",
          "email": "staff@pbms.io",
          "full_name": "Gate Operator",
          "role": "STAFF"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```

---

## 2. Gate Operations & Check-In Scenarios

### Scenario 2.1: Vehicle Check-In Entry
*   **Request Method:** `POST`
*   **Endpoint:** `/api/v1/sessions`
*   **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
*   **Payload Format:**
    ```json
    {
      "license_plate": "30F-987.65",
      "vehicle_type": "SEDAN",
      "slot_code": "A-201"
    }
    ```
*   **Expected Actions:**
    1. Database creates a new `parking_session` record marked `ACTIVE`.
    2. Target slot status updates automatically from `AVAILABLE` to `OCCUPIED`.
*   **Expected Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Vehicle check-in entry recorded successfully",
      "data": {
        "session_id": "78bcfb5c-43f1-4db5-9ea3-f5429ca081d6",
        "ticket_code": "TKT-1718467139",
        "license_plate": "30F-987.65",
        "check_in_time": "2026-06-15T15:58:00Z",
        "slot_assigned": "A-201"
      }
    }
    ```

---

## 3. Vehicle Exit & Billing Scenarios

### Scenario 3.1: Exit Fee Calculation (Verify Grace Period & Tariff Rates)
*   **Request Method:** `GET`
*   **Endpoint:** `/api/v1/sessions/search?ticket_code=TKT-1718467139`
*   **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
*   **Expected Calculation Rationale:**
    *   Vehicle Type: `SEDAN` (Tariff policy: $5.00 first hour, $3.00/hr afterwards, 15 min grace window).
    *   Check-in: `2026-06-15T10:15:00Z`
    *   Checkout Time: `2026-06-15T14:15:00Z` (Elapsed time: 4 Hours).
    *   Calculation: First hour ($5.00) + 3 subsequent hours * $3.00 ($9.00) = $14.00.
*   **Expected Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "session_id": "78bcfb5c-43f1-4db5-9ea3-f5429ca081d6",
        "ticket_code": "TKT-1718467139",
        "license_plate": "30F-987.65",
        "elapsed_hours": 4,
        "amount_due": 14.00
      }
    }
    ```

### Scenario 3.2: Complete Checkout Payment & Release Spot
*   **Request Method:** `POST`
*   **Endpoint:** `/api/v1/sessions/78bcfb5c-43f1-4db5-9ea3-f5429ca081d6/close`
*   **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
*   **Payload Format:**
    ```json
    {
      "payment_method": "BANK_TRANSFER",
      "amount_paid": 14.00
    }
    ```
*   **Expected Actions:**
    1. Creates a completed payment record linked to the session.
    2. Session status updates from `ACTIVE` to `COMPLETED`.
    3. Spot `A-201` status resets to `AVAILABLE`.
*   **Expected Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Check-out closure complete. Payment confirmed. Slot released."
    }
    ```

---

## 4. Operational Incident Exceptions

### Scenario 4.1: Report Lost Ticket (Fee Waiver Waiver request)
*   **Request Method:** `POST`
*   **Endpoint:** `/api/v1/exceptions`
*   **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
*   **Payload Format:**
    ```json
    {
      "session_id": "78bcfb5c-43f1-4db5-9ea3-f5429ca081d6",
      "exception_type": "LOST_TICKET",
      "justification": "Driver lost ticket. Verified identity card and matching license plate."
    }
    ```
*   **Expected Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Incident log reported for Manager audit review.",
      "exception_id": 14
    }
    ```
