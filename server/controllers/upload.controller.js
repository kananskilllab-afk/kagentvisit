const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Upload photo to local storage (Fallback for zero-config)
 * @route   POST /api/upload
 */
exports.uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // 1. Create uploads folder if it doesn't exist
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // 2. Generate unique filename
        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = `${uuidv4()}${ext}`;
        const filePath = path.join(uploadsDir, filename);

        // 3. Save file using fs.writeFile (since we use memoryStorage in routes)
        await fs.promises.writeFile(filePath, req.file.buffer);

        // 4. Return the local URL
        // We use req.protocol and req.get('host') to build the full URL
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

        res.json({
            success: true,
            data: {
                url: fileUrl,
                filename: filename
            }
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during photo upload',
            error: error.message
        });
    }
};
