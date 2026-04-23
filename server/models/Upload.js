const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
    url:      { type: String, required: true },
    publicId: { type: String },    // Cloudinary public_id (for destroy)
    provider: {
        type: String,
        enum: ['cloudinary', 'local'],
        default: 'cloudinary'
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    context: {
        type: String,
        enum: [
            'expense_receipt',
            'booking_ticket',      // pre-booking confirmation (flights/hotels/trains)
            'client_photo',        // photo with client showing business identity
            'visit_photo',
            'other'
        ],
        required: true,
        index: true
    },
    refModel: {
        type: String,
        enum: ['Expense', 'ExpenseClaim', 'Visit', 'VisitPlan', 'VisitSchedule', null],
        default: null
    },
    refId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    mimeType:  { type: String, trim: true },
    sizeBytes: { type: Number },
    originalName: { type: String, trim: true },
    bookingDate: { type: Date },  // For booking_ticket context — when the booking was made
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

uploadSchema.index({ refModel: 1, refId: 1 });
uploadSchema.index({ owner: 1, context: 1, createdAt: -1 });

module.exports = mongoose.model('Upload', uploadSchema);
