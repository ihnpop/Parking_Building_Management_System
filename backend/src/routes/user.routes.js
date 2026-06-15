const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const queryParser = require('../utils/query-parser');

const router = express.Router();

// Lock down entire User module routes solely to authenticated Admins
router.use(authMiddleware.protect);
router.use(roleMiddleware.restrictTo('ADMIN'));

router.route('/')
  .get(queryParser, userController.getUsers)
  .post(userController.createUser);

router.route('/:id')
  .get(userController.getUserById)
  .put(userController.updateUser);

router.patch('/:id/status', userController.updateUserStatus);

module.exports = router;
