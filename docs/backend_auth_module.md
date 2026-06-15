# Authentication & Authorization Module Specification
## Project: Parking Building Management System (PBMS)
**Version:** 1.0.0  
**Stack Integration:** Node.js, Express.js, Supabase GoTrue Auth (JWT), Row-Level Security (RLS)

---

## 1. Architectural Choice: Supabase Auth vs. Custom JWT

We utilize **Supabase Auth (GoTrue Service)** rather than developing a custom password-hashing server.

### Why Supabase Auth?
1.  **Security Standards:** Out-of-the-box protection against brute-force attacks, secure token sign-offs, built-in password policy enforcement, and automatic salting/hashing (using `bcrypt`).
2.  **Row-Level Security (RLS) Synchronization:** PostgreSQL security layers check the authenticated JWT directly. By using Supabase Auth tokens, database calls from both the Express backend and direct database client streams run safely under the same security policy.
3.  **Role Syncing:** System users are stored in Supabase's internal schema (`auth.users`). We sync metadata (role, status) to our public `profiles` table using PostgreSQL database triggers.

---

## 2. Public Database Table Structure for Auth

Custom metadata attributes are stored in a public `profiles` table. This table extends the internal `auth.users` configuration:

```sql
-- Create role enum type
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- Profiles table schema
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL UNIQUE,
  full_name varchar(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'STAFF',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing profiles
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_active ON public.profiles(is_active) WHERE is_active = true;
```

---

## 3. JWT Token Generation and Verification Strategy

1.  **Token Generation:** Handled automatically by Supabase Auth on the server side during successful authentication. The generated token is a standardized HS256 JWT containing claims (such as `sub` for user ID, `email`, and token expiry parameters).
2.  **Token Verification:** Express middlewares verify incoming Bearer tokens using `supabase.auth.getUser(token)`. This makes an API call from the Express server to the Supabase auth engine to verify signature integrity and retrieve active user properties.

---

## 4. Auth Module Files Structure

The files generated for this module are organized under `/backend/src`:

```text
backend/src/
├── config/
│   └── supabase.js        # Global client configurations
├── controllers/
│   └── auth.controller.js # Maps request inputs to services
├── services/
│   └── auth.service.js    # Communicates with Supabase Auth services
├── routes/
│   ├── index.js           # Mounts sub-routers
│   └── auth.routes.js     # Route mappings for auth module
└── middlewares/
    └── auth.middleware.js # JWT verify token interceptor
```

---

## 5. Password Handling & Logout Strategy

*   **Password Storage:** Passwords never land in public data columns. Supabase stores hashes securely in `auth.users` inside the isolated `auth` schema.
*   **Logout Mechanics:** Express executes `supabase.auth.admin.signOut(token)` to notify Supabase to invalidate the current active session. On the frontend, client applications discard the stored token from memory and redirect to the `/login` route.

---

## 6. Route Protection Examples

### 6.1 Authentication Gate:
Any router that requires a valid session mounts the `authMiddleware.protect` interceptor first:
```javascript
router.use(authMiddleware.protect);
```

### 6.2 Authorization Clearance (RBAC):
To restrict specific actions to Managers or Admins, mount the role validator:
```javascript
// Access restricted to Managers and Admins
router.patch('/slots/:id/status', roleMiddleware.restrictTo('MANAGER', 'ADMIN'), slotController.updateStatus);

// Access restricted solely to Admins
router.get('/users', roleMiddleware.restrictTo('ADMIN'), userController.getUsers);
```
