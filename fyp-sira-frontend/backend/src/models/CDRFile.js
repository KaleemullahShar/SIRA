const mongoose = require('mongoose');

const cdrFileSchema = new mongoose.Schema({
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'analyzed', 'error'],
        default: 'pending'
    },
    totalRecords: {
        type: Number,
        default: 0
    },
    validRecords: {
        type: Number,
        default: 0
    },
    errorCount: {
        type: Number,
        default: 0
    },
    processingStarted: {
        type: Date
    },
    processingCompleted: {
        type: Date
    },
    errorMessage: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes
cdrFileSchema.index({ uploadedBy: 1 });
cdrFileSchema.index({ status: 1 });
cdrFileSchema.index({ uploadDate: -1 });
cdrFileSchema.index({ uploadedBy: 1, uploadDate: -1 });

module.exports = mongoose.model('CDRFile', cdrFileSchema);
