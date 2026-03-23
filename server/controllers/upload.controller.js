const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

/**
 * @desc    Upload photo to Cloudinary first, or fallback to local storage
 * @route   POST /api/upload
 */
exports.uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // 1. Try Cloudinary if keys are present
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });

            // Upload from memory buffer
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'avs_uploads' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });

            return res.json({
                success: true,
                data: {
                    url: result.secure_url,
                    filename: result.public_id,
                    provider: 'cloudinary'
                }
            });
        }

        // 2. Fallback to Local Storage (Only for persistent servers or /tmp on Vercel)
        console.warn('CLOUDINARY_CLOUD_NAME not found. Falling back to local storage (Non-persistent on Vercel!).');
        
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = path.extname(req.file.originalname) || '.jpg';
        const filename = `${uuidv4()}${ext}`;
        const filePath = path.join(uploadsDir, filename);

        await fs.promises.writeFile(filePath, req.file.buffer);

        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

        res.json({
            success: true,
            data: {
                url: fileUrl,
                filename: filename,
                provider: 'local'
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
