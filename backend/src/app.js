require('dotenv').config();
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

// Start server listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 PBMS Server is running in ${process.env.NODE_ENV || 'production'} mode on port ${PORT}`);
});

module.exports = app;
