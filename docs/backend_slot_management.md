# Slot Management Module Specification
## Project: Parking Building Management System (PBMS)
**Version:** 1.0.0  
**Stack Integration:** Node.js, Express.js, Supabase client

---

## 1. Database Model & Status Enums

The slot management system models physical parking locations using the `slots` schema.

### 1.1 Status Enum Types (`slot_status`)
*   **`AVAILABLE`**: Vacant spot, ready to receive a check-in.
*   **`OCCUPIED`**: Car currently resides in the spot (updated during check-in).
*   **`MAINTENANCE`**: Broken sensors, electrical charging malfunction, or blocked space. Cannot receive a check-in.

### 1.2 Slot Category Types (`slot_type`)
*   **`REGULAR`**: Standard space for motorbikes or sedans.
*   **`VIP`**: Reserved for subscription holders or priority clients.
*   **`ELECTRIC`**: Equipped with an EV charging terminal.
*   **`LARGE`**: Wider dimensions for trucks or larger utility vehicles.

### 1.3 Database Table Ref: `slots`
Columns and foreign key references mapping back to zones:
```sql
CREATE TABLE public.slots (
  id serial PRIMARY KEY,
  zone_id integer NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  slot_code varchar(20) NOT NULL,
  type slot_type NOT NULL DEFAULT 'REGULAR',
  status slot_status NOT NULL DEFAULT 'AVAILABLE',
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent naming overlaps inside the same section
  CONSTRAINT uq_zone_slot_code UNIQUE(zone_id, slot_code)
);
```

---

## 2. API Endpoint Matrix & Permissions

| HTTP Method | Route Pathway | Required Role | Functionality Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/slots` | `STAFF`, `MANAGER`, `ADMIN` | List slots. Supports paging and layout filtering. |
| `GET` | `/slots/:id` | `STAFF`, `MANAGER`, `ADMIN` | View details of a specific slot. |
| `POST` | `/slots` | `MANAGER`, `ADMIN` | Create a new slot. |
| `PUT` | `/slots/:id` | `MANAGER`, `ADMIN` | Modify slot labels or type details. |
| `PATCH` | `/slots/:id/status`| `STAFF`, `MANAGER`, `ADMIN` | Change status (e.g. flag maintenance). |
| `DELETE` | `/slots/:id` | `ADMIN` | Remove slots from system inventory. |

---

## 3. Layout Filtering Pipeline

To render grid maps on the dashboard, the list endpoint supports multi-layer joins:

```sql
SELECT s.*, z.name as zone_name, f.floor_number, f.floor_name, b.name as building_name
FROM slots s
JOIN zones z ON s.zone_id = z.id
JOIN floors f ON z.floor_id = f.id
JOIN buildings b ON f.building_id = b.id
WHERE ...
```
Using the Supabase JS SDK, this join structure is mapped cleanly inside our repository:
```javascript
const query = supabase
  .from('slots')
  .select('*, zones!inner(name, floors!inner(floor_number, floor_name, buildings!inner(id, name)))');
```
This enables filtering parameters such as `building_id`, `floor_id`, or `zone_id` dynamically.
