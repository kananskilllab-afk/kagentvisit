const express = require('express');
const router = express.Router();
const { uploadPhoto } = require('../controllers/upload.controller');
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');

// Standard multer storage for local processing
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   POST /api/upload
// @desc    Upload a photo (handles local/cloud storage in controller)
// @access  Private
router.post('/', protect, upload.single('photo'), uploadPhoto);

module.exports = router;
