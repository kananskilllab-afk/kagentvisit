const User = require('../models/User');

// @desc    Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create user
exports.createUser = async (req, res) => {
    try {
        const { email, employeeId } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({
            $or: [{ email }, { employeeId }]
        });

        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists with this email or employee ID' });
        }

        const user = await User.create({
            ...req.body,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                employeeId: user.employeeId
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update user
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const updatableFields = ['name', 'email', 'employeeId', 'role', 'isActive', 'passwordHash', 'region', 'department'];
        
        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        await user.save();

        const updatedUser = user.toObject();
        delete updatedUser.passwordHash;

        res.json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent deleting self
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete yourself' });
        }

        await user.deleteOne();
        res.json({ success: true, message: 'User removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk Import Users
exports.bulkImportUsers = async (req, res) => {
    // Skeleton for bulk import
    // In a real app, use a CSV parser like 'csv-parser' or 'papaparse'
    try {
        const { users } = req.body; // Expecting array of user objects
        if (!Array.isArray(users)) {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }

        const results = await User.insertMany(users.map(u => ({
            ...u,
            createdBy: req.user._id
        })), { ordered: false });

        res.json({ success: true, count: results.length, message: 'Users imported successfully' });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Some users could not be imported',
            error: error.message
        });
    }
};
