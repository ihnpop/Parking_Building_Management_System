# React Frontend Architecture Specification
## Project: Parking Building Management System (PBMS)
**Version:** 1.0.0  
**Stack Integration:** React, React Router, Tailwind CSS, Lucide Icons

---

## 1. Directory Tree & Layout Blueprint

The frontend client structure is structured according to domain modularity and reusable UI components.

```
src/
├── assets/             # Images, static logos, typography styles
├── components/         # Reusable presentation / layout primitives
│   ├── ui/             # Shadcn-inspired tokens (Button, Badge, Table, Modal)
│   ├── Sidebar.jsx     # Navigation sidebar (collapsible, role-filtered)
│   └── Navbar.jsx      # Top header with profile controls
├── context/            # Auth, Theme, Global State Providers
│   └── AuthContext.jsx # Session handling (Supabase GoTrue integration)
├── hooks/              # Custom hook wrappers (useAuth, etc.)
├── layouts/            # Page templates
│   ├── AuthLayout.jsx  # Wrapper for login forms
│   └── DashboardShell.jsx # Layout containing Sidebar + Topbar + Content Area
├── pages/              # Routed pages
│   ├── Login.jsx       # Access gateway screen
│   ├── Dashboard.jsx   # Manager metrics overview
│   ├── Sessions.jsx    # Gate operator logs check-in/out console
│   ├── Slots.jsx       # Grid map slots occupancy
│   ├── Users.jsx       # Profile editor and roster list
│   └── Reports.jsx     # Financial logs
├── routes/             # Path definitions and router configurations
│   ├── RouteGuard.jsx  # RBAC route restriction controls
│   └── index.jsx       # Unified route mapping
└── services/           # HTTP API wrappers
    └── api.js          # Unified axios client wrapper
```

---

## 2. Dynamic Component Architecture

### 2.1 Collapsible Sidebar navigation (Role-Filtered)
The Sidebar changes links dynamically depending on the current user's role profile:
```javascript
const MENU_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
  { path: '/sessions', label: 'Gate Operations', icon: MonitorPlay, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/slots', label: 'Slot Maps', icon: Grid, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/users', label: 'Users Roster', icon: Users, roles: ['ADMIN'] },
  { path: '/pricing', label: 'Tariff Rules', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] }
];
```

### 2.2 Top Navbar Shell
Exposes live diagnostics (database connections), logged operator name, role status badge, and log-out controls.

---

## 3. Role-Based Route Guards

To block access to admin components (e.g. User Management), we wrap pathways inside a `RouteGuard` provider:

```javascript
// Example Router Config
<Route 
  path="/users" 
  element={
    <RouteGuard allowedRoles={['ADMIN']}>
      <UsersPage />
    </RouteGuard>
  } 
/>
```
If an unauthorized operator attempts to manually enter `/users` into their browser address bar, the system redirects them to `/dashboard` and raises a toast notification.
