const express = require('express');
const router = express.Router();
const {
    registerUpload, listUploads, updateUpload, deleteUpload
} = require('../controllers/upload.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/register', registerUpload);
router.get('/', listUploads);
router.patch('/:id', updateUpload);
router.delete('/:id', deleteUpload);

module.exports = router;
