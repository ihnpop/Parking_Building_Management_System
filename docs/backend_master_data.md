# Master Data Modules Specification
## Project: Parking Building Management System (PBMS)
**Version:** 1.0.0  
**Stack:** Node.js, Express.js, Supabase Client + Admin SDK (bypassing RLS for admin actions)

---

## 1. Module Aggregation & Endpoint Mappings

To keep code clean and avoid folder bloat, physical structure assets (Buildings, Floors, Zones) are aggregated under the **Infrastructure Module**, while user registration and permission scopes are grouped under the **User Module**.

### 1.1 User & Role Management Module
*   `GET /users` – Search, filter, and page system users (*Admin Only*).
*   `POST /users` – Create new user credentials in Supabase Auth & public profiles database (*Admin Only*).
*   `PUT /users/:id` – Modify profile information (e.g. name, role) (*Admin Only*).
*   `PATCH /users/:id/status` – Suspend or restore staff profile status (*Admin Only*).
*   `GET /roles` – Static list of system enums (*Manager, Staff read*).

### 1.2 Infrastructure Layout Module
*   `GET /buildings` – Retrieve active buildings (*All roles*).
*   `POST /buildings` – Create building registry (*Admin, Manager*).
*   `PUT /buildings/:id` – Edit address/name details (*Admin, Manager*).
*   `GET /buildings/:buildingId/floors` – List floors inside building (*All roles*).
*   `POST /buildings/:buildingId/floors` – Add floor level layout (*Admin, Manager*).
*   `GET /floors/:floorId/zones` – List sub-zones on floor (*All roles*).
*   `POST /floors/:floorId/zones` – Create partition zone (*Admin, Manager*).

### 1.3 Vehicle Categories Module
*   `GET /vehicle-types` – List allowed categories (*All roles*).
*   `POST /vehicle-types` – Add new vehicle classification (*Admin Only*).
*   `PUT /vehicle-types/:id` – Modify vehicle descriptors (*Admin Only*).

---

## 2. Shared Request Query Parser (Pagination, Filtering, Sorting)

To implement clean tables in the frontend dashboard, list endpoints utilize a helper parser.

```javascript
/**
 * Express middleware helper to parse pagination, filter constraints, and sorting columns
 */
exports.parseQueryParams = (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;

  const sortBy = req.query.sort_by || 'created_at';
  const sortOrder = req.query.sort_order === 'asc' ? 'asc' : 'desc';

  // Extract other keys to map as direct table filters
  const filters = { ...req.query };
  delete filters.page;
  delete filters.limit;
  delete filters.sort_by;
  delete filters.sort_order;

  req.pagination = { page, limit, offset, sortBy, sortOrder, filters };
  next();
};
```

---

## 3. Module File Mappings in Backend

```text
backend/src/
├── controllers/
│   ├── building.controller.js
│   ├── user.controller.js
│   └── vehicle.controller.js
├── repositories/
│   ├── building.repository.js
│   ├── user.repository.js
│   └── vehicle.repository.js
├── routes/
│   ├── building.routes.js
│   ├── user.routes.js
│   └── vehicle.routes.js
├── services/
│   ├── building.service.js
│   ├── user.service.js
│   └── vehicle.service.js
└── utils/
    └── query-parser.js       # Express query parser middleware
```
