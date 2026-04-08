const mongoose = require('mongoose');

const cdrRecordSchema = new mongoose.Schema({
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CDRFile',
        required: true
    },
    callingNumber: {
        type: String,
        required: true,
        index: true
    },
    calledNumber: {
        type: String,
        required: true,
        index: true
    },
    callType: {
        type: String,
        enum: ['incoming', 'outgoing', 'sms', 'sms-incoming', 'sms-outgoing', 'data'],
        required: true,
        lowercase: true
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    cellId: {
        type: String
    },
    location: {
        type: String
    },
    isFlagged: {
        type: Boolean,
        default: false,
        index: true
    },
    flagReason: {
        type: String
    },
    linkedCriminalRecord: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CriminalRecord'
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
cdrRecordSchema.index({ fileId: 1, callingNumber: 1 });
cdrRecordSchema.index({ fileId: 1, timestamp: -1 });
cdrRecordSchema.index({ fileId: 1, callType: 1 });
cdrRecordSchema.index({ callingNumber: 1, timestamp: -1 });
cdrRecordSchema.index({ calledNumber: 1, timestamp: -1 });

module.exports = mongoose.model('CDRRecord', cdrRecordSchema);
