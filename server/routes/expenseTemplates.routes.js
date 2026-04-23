const express = require('express');
const router = express.Router();
const {
    listTemplates, createTemplate, updateTemplate, deleteTemplate
} = require('../controllers/expenseTemplates.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

router.get('/', listTemplates);
router.post('/', authorize('admin', 'superadmin'), createTemplate);
router.put('/:id', authorize('admin', 'superadmin'), updateTemplate);
router.delete('/:id', authorize('admin', 'superadmin'), deleteTemplate);

module.exports = router;
