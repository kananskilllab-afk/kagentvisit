const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        match: [/^[A-Z0-9-]+$/, 'Employee ID can only contain letters, numbers, and hyphens']
    },
    name: {
        type: String,
        required: true,
        trim: true,
        match: [/^[a-zA-Z0-9\s.-]+$/, 'Name can only contain letters, numbers, spaces, dots, and hyphens']
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin', 'home_visit', 'accounts', 'hod', 'regional_bdm'],
        default: 'user'
    },
    department: {
        type: String,
        enum: ['B2B', 'B2C'],
        default: 'B2B'
    },
    region: { type: String, trim: true },
    formAccess: [{
        type: String,
        enum: ['b2b_visit', 'b2c_visit', 'post_field_day', 'daily_report', 'post_demo_feedback']
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: { type: Date },
    // Employees assigned to this admin (only relevant for admin role)
    assignedEmployees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Google Calendar OAuth tokens
    googleCalendar: {
        connected:    { type: Boolean, default: false },
        accessToken:  { type: String },
        refreshToken: { type: String },
        expiryDate:   { type: Number },
        email:        { type: String }
    }
}, {
    timestamps: true
});

// email and employeeId already indexed via unique: true above
userSchema.index({ role: 1, isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('passwordHash')) return;
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
