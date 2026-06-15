# Reporting & Dashboard Analytics Module Specification
## Project: Parking Building Management System (PBMS)
**Version:** 1.0.0  
**Stack Integration:** Node.js, Express.js, Supabase PostgreSQL, Chart Aggregates

---

## 1. Analytics Architecture & Aggregation

To power dashboard visualization panels (charts, counts, rates), the Reporting module handles high-performance data fetches and summarizes them.

### 1.1 Metrics Overview & UI Mapping
*   **Key Performance Indicators (KPIs)**: Total Revenue, Occupancy Rate, Checked-In Count, Active Incident Flags.
*   **Chart 1: Daily Revenue (Line/Area Chart)**: Tracks payment cash-flows day-over-day.
*   **Chart 2: Occupancy by Building/Floor (Stacked Bar Chart)**: Compares spaces filled vs. available across different levels.
*   **Chart 3: Peak Utilization Hours (Column Chart)**: Identifies busy arrival times (00:00 - 23:00) to optimize staff shifts.
*   **Chart 4: Exception Share (Donut Chart)**: Tracks the ratio of incidents (e.g. Lost Tickets vs. Plate Mismatches).

---

## 2. API Endpoint Matrix & Permissions

| HTTP Method | Route Pathway | Required Role | Functionality Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/reports/summary` | `MANAGER`, `ADMIN` | Returns live KPI counters for top-level stats cards. |
| `GET` | `/reports/revenue` | `MANAGER`, `ADMIN` | Returns daily financial totals grouped by payment method. |
| `GET` | `/reports/occupancy` | `MANAGER`, `ADMIN` | Returns layout maps (available, occupied, maintenance counts). |
| `GET` | `/reports/peak-hours` | `MANAGER`, `ADMIN` | Aggregates check-in arrival frequencies by hour of day. |
| `GET` | `/reports/exceptions` | `MANAGER`, `ADMIN` | Groups incident types for audit reviews. |

---

## 3. Recommended Frontend Chart Implementations

When integrating these API endpoints with the React dashboard layout (Shadcn style), we suggest the following component mapping:

### 3.1 Live KPI Cards
```json
{
  "total_revenue": 1450.50,
  "occupancy_percentage": 68.5,
  "active_sessions": 82,
  "pending_exceptions": 4
}
```

### 3.2 Daily Revenue Curve (Line Chart)
Use Recharts `<LineChart>` with data source from `/reports/revenue`:
```json
[
  { "date": "2026-06-12", "amount": 350.00 },
  { "date": "2026-06-13", "amount": 420.00 }
]
```

### 3.3 Slot Occupancy Grid (Pie or Stacked Bar Chart)
Use Recharts `<BarChart layout="vertical">` with data source from `/reports/occupancy`:
```json
[
  { "building": "Building A", "available": 120, "occupied": 80, "maintenance": 5 }
]
```
