const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    rank: { type: String },
    name: { 
        type: String, 
        required: true, 
        unique: true,
        index: true,
        match: [/^[a-zA-Z0-9\s.&',-]+$/, 'Agent name can only contain letters, numbers, spaces, and punctuation: . & \' , -']
    },
    categoryType: { type: String },
    agentType: { type: String },
    emailId: { type: String },
    mobile: { type: String },
    city: { type: String, index: true },
    state: { type: String, index: true },
    pinCode: { type: String, index: true },
    zone: { type: String },
    team: { type: String },
    rmName: { type: String },
    isActive: { type: Boolean, default: true },
    onboardingDate: { type: Date },
    bdmName: { type: String, index: true },
    region: { type: String },
    autoRegionMapping: { type: String },
    
    // Track counts and stats
    visitCount: { type: Number, default: 0 },
    lastVisitDate: { type: Date },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Compound indexes for searching
agentSchema.index({ name: 'text', bdmName: 'text', city: 'text', pinCode: 'text' });
agentSchema.index({ isActive: 1, bdmName: 1 });

module.exports = mongoose.model('Agent', agentSchema);
