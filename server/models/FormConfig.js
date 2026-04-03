const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
    id:    { type: String, required: true },
    group: { type: String, required: true },
    label: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'textarea', 'richtext', 'number', 'date', 'datetime', 'dropdown', 'multi-select', 'toggle', 'star-rating', 'file', 'photo-upload', 'autocomplete-agent'],
        required: true
    },
    required:    { type: Boolean, default: false },
    options:     [{ type: String }],
    placeholder: { type: String },
    conditionalOn: {
        fieldId: String,
        value:   mongoose.Schema.Types.Mixed
    }
}, { _id: false });

const formConfigSchema = new mongoose.Schema({
    version: {
        type: String,
        required: true,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    formType: {
        type: String,
        enum: ['generic', 'home_visit'],
        default: 'generic'
    },
    description: { type: String },
    fields: [fieldSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

formConfigSchema.index({ formType: 1, isActive: 1 });

module.exports = mongoose.model('FormConfig', formConfigSchema);
