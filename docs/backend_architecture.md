# Backend Architecture Specification
## Project: Parking Building Management System (PBMS)
**Version:** 1.0.0  
**Stack:** Node.js, Express.js, Supabase PostgreSQL, JWT, RBAC

---

## 1. Recommended Folder Structure

Below is the clean Controller-Service-Repository pattern layout designed for separation of concerns, scalability, and ease of testing:

```text
backend/
├── .env.example
├── package.json
├── README.md
└── src/
    ├── app.js                 # Entry application server bootstrap
    ├── config/
    │   └── supabase.js        # Supabase client instantiation
    ├── constants/
    │   └── roles.js           # Shared user roles definitions
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── session.controller.js
    │   └── slot.controller.js
    ├── middlewares/
    │   ├── auth.middleware.js # JWT verification
    │   ├── error.middleware.js# Global error handling logic
    │   └── role.middleware.js # RBAC restriction checks
    ├── repositories/
    │   ├── session.repository.js # Direct Supabase queries
    │   └── slot.repository.js
    ├── routes/
    │   ├── index.js           # Route aggregator index
    │   ├── auth.routes.js
    │   ├── session.routes.js
    │   └── slot.routes.js
    ├── services/
    │   ├── pricing.service.js # Dynamic business logic (fee calculation)
    │   ├── session.service.js # Check-in / Check-out orchestrator
    │   └── slot.service.js
    └── utils/
        └── app-error.js       # Custom error wrapper class
```

---

## 2. Directory Explanations

*   **`src/config/`**: System configurations. Houses environment validations and external API clients initialization (like Supabase connection instances).
*   **`src/routes/`**: Route definition folders. Maps specific endpoint pathways to their designated request handler controllers.
*   **`src/controllers/`**: Maps request details (query parameters, JSON bodies, route variables) to business services, handles validation results, and structures JSON response envelopes.
*   **`src/services/`**: The core business logic layer. Implements fee pricing calculations, validates occupancy space limits, and manages workflow logic.
*   **`src/repositories/`**: The database access layer. Isolates queries to the Supabase Client database table methods. Services use repositories to retrieve or mutate records.
*   **`src/middlewares/`**: Request interceptors. Checks tokens, filters role access, handles headers, logs requests, and catches unhandled code exceptions.
*   **`src/utils/`**: Utilities and helper classes. Houses custom runtime error structures or mathematical time calculators.

---

## 3. Main Dependencies

Add these packages to your `package.json` to bootstrap the application:

### Core Dependencies:
*   **`express`**: Fast, unopinionated minimalist web framework for routing.
*   **`@supabase/supabase-js`**: Official client library for database CRUD operations and auth management.
*   **`dotenv`**: Loads environment variables from a `.env` file.
*   **`cors`**: Middleware to enable Cross-Origin Resource Sharing.
*   **`helmet`**: Secure Express apps by setting various HTTP headers.
*   **`morgan`**: HTTP request logger middleware for node.js.
*   **`express-validator`**: A set of express.js middlewares for validating and sanitizing user inputs.

### Dev Dependencies:
*   **`nodemon`**: Automatically restarts the node application when file changes in the directory are detected.

---

## 4. Environment Variables Configuration

Create a `.env` file in the root of the `backend/` directory:

```env
# Application Host Configuration
PORT=5000
NODE_ENV=development

# Supabase Credentials (from Supabase Dashboard > Project Settings > API)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!IMPORTANT]
> `SUPABASE_ANON_KEY` is safe for client applications, but operations like registering user profiles or system-wide audit queries require using `SUPABASE_SERVICE_ROLE_KEY` to bypass Row-Level Security (RLS) constraints. Do NOT expose the service role key to frontend bundles.

---

## 5. Middleware Architecture Flow

The execution cycle of an incoming API request runs through a sequential pipeline:

```
                  ┌──────────────────────┐
                  │   Incoming Request   │
                  └──────────┬───────────┘
                             │
                      [helmet & cors]   (Security Headers)
                             │
                        [morgan]        (Logger)
                             │
                 [authMiddleware.protect] (JWT Token Validated)
                             │
               [roleMiddleware.restrictTo](RBAC Authorization Check)
                             │
                        [Controller]    (Input Validation Check)
                             │
                         [Service]      (Business Calculations)
                             │
                       [Repository]     (Supabase DB Access)
                             │
                     [Response Out]     (Success Return)
                             │
        (If Error Triggered) │
                             ▼
                  [errorMiddleware]     (Global Handler / Logging)
```

---

## 6. Error Handling Architecture

To write robust code free of unstructured try-catch blocks, the system uses:
1.  **`AppError` (Custom Error Class)**: Extends native `Error` to append operational status codes (e.g. 400, 401, 403, 404).
2.  **Controller Wrapper (`catchAsync`)**: Wraps controller functions to catch promise rejections and route them to Express's `next(error)` function.
3.  **Global Error Handling Middleware**: Catch-all function registered at the bottom of the Express routing stack to structure error responses and log database crashes.

---

## 7. Skeleton Implementation Code

Below are the base files required to instantiate your Express backend structure.

### 7.1 Custom Error Utility (`src/utils/app-error.js`)
```javascript
/**
 * Custom operational error class to structure API exception responses
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Identifies known runtime API failures

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
```

### 7.2 Global Error Handler Middleware (`src/middlewares/error.middleware.js`)
```javascript
const AppError = require('../utils/app-error');

/**
 * Global Express catch-all error handling middleware
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log unexpected engineering bugs
  if (err.statusCode === 500) {
    console.error('🔥 CRITICAL ERROR:', err);
  }

  // Development response returns detailed stack trace
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  }

  // Production response hides engineering stack trace details
  return res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.isOperational ? err.message : 'Something went wrong on the server.'
  });
};
```

### 7.3 Authentication Middleware (`src/middlewares/auth.middleware.js`)
```javascript
const { createClient } = require('@supabase/supabase-js');
const AppError = require('../utils/app-error');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Protect routes by verifying JWT Bearer tokens from request headers
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // 1) Verify presence of authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please provide an auth token.', 401));
    }

    // 2) Validate token signature against Supabase Auth engine
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(new AppError('Session invalid or expired. Access denied.', 401));
    }

    // 3) Retrieve roles mapping from profiles database table
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', user.id)
      .single();

    if (dbError || !profile) {
      return next(new AppError('User profile details not found in system record database.', 404));
    }

    if (!profile.is_active) {
      return next(new AppError('Your account has been suspended by an administrator.', 403));
    }

    // 4) Map user information directly to current request scope
    req.user = profile;
    next();
  } catch (err) {
    next(err);
  }
};
```

### 7.4 Role-Based Authorization Middleware (`src/middlewares/role.middleware.js`)
```javascript
const AppError = require('../utils/app-error');

/**
 * Restrict endpoint access to designated roles
 * @param {...string} allowedRoles - List of authorized roles (e.g. 'ADMIN', 'MANAGER')
 */
exports.restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // Confirm auth credentials populated by protect middleware
    if (!req.user || !req.user.role) {
      return next(new AppError('User details missing from request authentication context.', 401));
    }

    // Compare user role against authorized values list
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Access Denied: You do not possess clearance for this operation.', 403));
    }

    next();
  };
};
```

### 7.5 Route Aggregator (`src/routes/index.js`)
```javascript
const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

// Public Base Diagnostics Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Register Module Sub-routers (Placeholder example)
// router.use('/auth', require('./auth.routes'));
// router.use('/slots', authMiddleware.protect, require('./slot.routes'));
// router.use('/sessions', authMiddleware.protect, require('./session.routes'));

module.exports = router;
```

### 7.6 Application Entry Point (`src/app.js`)
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const AppError = require('./utils/app-error');
const globalErrorHandler = require('./middlewares/error.middleware');
const apiRouter = require('./routes');

const app = express();

// 1) GLOBAL SECURITY & LOGGING MIDDLEWARES
app.use(helmet()); // Secure HTTP headers
app.use(cors()); // Allow cross-origin AJAX queries
app.use(express.json()); // Parse incoming JSON request bodies

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Log requests console diagnostics
}

// 2) MOUNT ROUTER
app.use('/api/v1', apiRouter);

// 3) UNHANDLED ROUTES FALLBACK
app.all('*', (req, res, next) => {
  next(new AppError(`Endpoint ${req.originalUrl} not found on this server.`, 404));
});

// 4) MOUNT GLOBAL ERROR MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
```
