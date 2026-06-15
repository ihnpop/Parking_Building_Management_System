const express = require('express');
const sessionController = require('../controllers/session.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const queryParser = require('../utils/query-parser');

const router = express.Router();

// General authentication gate
router.use(authMiddleware.protect);

router.route('/')
  .get(queryParser, sessionController.getSessions);

router.post('/check-in', roleMiddleware.restrictTo('ADMIN', 'MANAGER', 'STAFF'), sessionController.checkIn);
router.post('/check-out', roleMiddleware.restrictTo('ADMIN', 'MANAGER', 'STAFF'), sessionController.checkOut);

router.route('/:id')
  .get(sessionController.getSessionById);

router.post('/:id/complete', roleMiddleware.restrictTo('ADMIN', 'MANAGER', 'STAFF'), sessionController.completeSession);
router.post('/:id/exception', roleMiddleware.restrictTo('ADMIN', 'MANAGER', 'STAFF'), sessionController.recordException);

module.exports = router;
