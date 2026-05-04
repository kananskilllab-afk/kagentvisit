const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agents.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Protect all routes
router.use(protect);

// Bulk operations (Must be above wildcards)
router.post('/import', authorize('admin', 'superadmin'), upload.single('file'), agentsController.importAgents);
router.delete('/delete-all', authorize('superadmin'), agentsController.deleteAllAgents);

// Backfill: auto-create Agent records from visit history company names
router.post('/backfill-from-visits', authorize('superadmin'), agentsController.backfillAgentsFromVisits);

// General CRUD
router.get('/', agentsController.getAgents);
router.get('/:id/history', agentsController.getAgentHistory);
router.get('/:id/visits', agentsController.getAgentVisits);
router.get('/:id', agentsController.getAgentById);
router.post('/', authorize('admin', 'superadmin'), agentsController.createAgent);
router.put('/:id', authorize('admin', 'superadmin'), agentsController.updateAgent);
router.delete('/:id', authorize('superadmin'), agentsController.deleteAgent);

module.exports = router;
