const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const Upload = require('../models/Upload');
const AuditLog = require('../models/AuditLog');

const configuredCloudinary = () => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) return null;
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    return cloudinary;
};

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
        const cld = configuredCloudinary();
        if (cld) {

            // Upload from memory buffer
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cld.uploader.upload_stream(
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
                    publicId: result.public_id,
                    provider: 'cloudinary',
                    mimeType: req.file.mimetype,
                    sizeBytes: req.file.size,
                    originalName: req.file.originalname
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
        const filename = `${crypto.randomUUID()}${ext}`;
        const filePath = path.join(uploadsDir, filename);

        await fs.promises.writeFile(filePath, req.file.buffer);

        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

        res.json({
            success: true,
            data: {
                url: fileUrl,
                filename: filename,
                publicId: null,
                provider: 'local',
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
                originalName: req.file.originalname
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

// ─── Upload REGISTRATION (persist metadata after binary upload) ──────────
// POST /api/uploads/register
exports.registerUpload = async (req, res) => {
    try {
        const {
            url, publicId, provider = 'cloudinary',
            context, refModel, refId,
            mimeType, sizeBytes, originalName, bookingDate, metadata
        } = req.body;

        if (!url || !context) {
            return res.status(400).json({ success: false, message: 'url and context are required' });
        }

        const doc = await Upload.create({
            url, publicId, provider,
            context, refModel: refModel || null, refId: refId || null,
            mimeType, sizeBytes, originalName, bookingDate,
            metadata,
            owner: req.user._id
        });

        AuditLog.create({
            userId: req.user._id, action: 'REGISTER_UPLOAD',
            targetId: doc._id, targetModel: 'Upload',
            details: { context, refModel, refId }
        }).catch(() => {});

        res.status(201).json({ success: true, data: doc });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// GET /api/uploads?refModel=&refId=&context=
exports.listUploads = async (req, res) => {
    try {
        const q = {};
        if (req.query.refModel) q.refModel = req.query.refModel;
        if (req.query.refId) q.refId = req.query.refId;
        if (req.query.context) q.context = req.query.context;
        // Scope
        const role = req.user.role;
        if (role === 'user' || role === 'home_visit') {
            q.owner = req.user._id;
        }
        const uploads = await Upload.find(q).sort({ createdAt: -1 }).lean();

        // Audit view for privileged access to others' uploads
        if (['admin', 'accounts', 'superadmin', 'hod'].includes(role) && uploads.length) {
            AuditLog.create({
                userId: req.user._id, action: 'VIEW_UPLOADS',
                targetModel: 'Upload',
                details: { query: req.query, count: uploads.length }
            }).catch(() => {});
        }

        res.json({ success: true, data: uploads });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/uploads/:id — rebind to a different ref (e.g., admin fixing wrong schedule)
exports.updateUpload = async (req, res) => {
    try {
        const u = await Upload.findById(req.params.id);
        if (!u) return res.status(404).json({ success: false, message: 'Upload not found' });

        const privileged = ['admin', 'accounts', 'superadmin'].includes(req.user.role);
        const owner = String(u.owner) === String(req.user._id);
        if (!privileged && !owner) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        ['context', 'refModel', 'refId', 'bookingDate', 'metadata'].forEach(f => {
            if (req.body[f] !== undefined) u[f] = req.body[f];
        });
        await u.save();
        res.json({ success: true, data: u });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// DELETE /api/uploads/:id — removes Cloudinary binary too
exports.deleteUpload = async (req, res) => {
    try {
        const u = await Upload.findById(req.params.id);
        if (!u) return res.status(404).json({ success: false, message: 'Upload not found' });

        const privileged = ['admin', 'accounts', 'superadmin'].includes(req.user.role);
        const owner = String(u.owner) === String(req.user._id);
        if (!privileged && !owner) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (u.provider === 'cloudinary' && u.publicId) {
            const cld = configuredCloudinary();
            if (cld) {
                try { await cld.uploader.destroy(u.publicId); } catch (_) {}
            }
        }
        await u.deleteOne();
        AuditLog.create({
            userId: req.user._id, action: 'DELETE_UPLOAD',
            targetId: u._id, targetModel: 'Upload'
        }).catch(() => {});
        res.json({ success: true, message: 'Upload deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
