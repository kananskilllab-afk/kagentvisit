const express = require('express');
const router = express.Router();
const {
    listPolicies, getPolicy, getActive,
    createPolicy, updatePolicy, activatePolicy, deletePolicy, policyUsage
} = require('../controllers/policies.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

router.get('/', listPolicies);
router.get('/active', getActive);
router.get('/:id', getPolicy);
router.get('/:id/usage', policyUsage);

// Mutations — superadmin only
router.post('/', authorize('superadmin'), createPolicy);
router.put('/:id', authorize('superadmin'), updatePolicy);
router.post('/:id/activate', authorize('superadmin'), activatePolicy);
router.delete('/:id', authorize('superadmin'), deletePolicy);

module.exports = router;
