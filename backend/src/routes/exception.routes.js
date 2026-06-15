const express = require('express');
const exceptionController = require('../controllers/exception.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const queryParser = require('../utils/query-parser');

const router = express.Router();

// General authentication gate
router.use(authMiddleware.protect);

// Staff and Manager can submit an incident override at gate level
router.post('/', roleMiddleware.restrictTo('ADMIN', 'MANAGER', 'STAFF'), exceptionController.logException);

// Dashboard Auditing & Resolution paths restricted to Managers and Admins
router.use(roleMiddleware.restrictTo('ADMIN', 'MANAGER'));

router.route('/')
  .get(queryParser, exceptionController.getExceptions);

router.route('/:id')
  .get(exceptionController.getExceptionById);

router.patch('/:id/resolve', exceptionController.resolveException);

module.exports = router;
