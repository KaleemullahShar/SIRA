const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    resourceType: {
        type: String,
        enum: ['CDR', 'Criminal', 'User', 'System', 'Auth'],
        required: true
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
adminLogSchema.index({ user: 1, timestamp: -1 });
adminLogSchema.index({ resourceType: 1, timestamp: -1 });
adminLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
