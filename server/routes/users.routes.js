const express = require('express');
const router = express.Router();
const {
    getUsers,
    getAssignableUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkImportUsers
} = require('../controllers/users.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

router.route('/')
    .get(authorize('admin', 'accounts', 'superadmin'), getUsers)
    .post(authorize('superadmin'), createUser);

router.get('/assignable', authorize('admin', 'superadmin'), getAssignableUsers);
router.post('/bulk-import', authorize('superadmin'), bulkImportUsers);

router.route('/:id')
    .put(authorize('superadmin'), updateUser)
    .delete(authorize('superadmin'), deleteUser);

module.exports = router;
