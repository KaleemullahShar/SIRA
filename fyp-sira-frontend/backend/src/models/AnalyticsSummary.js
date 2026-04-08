const mongoose = require('mongoose');

const analyticsSummarySchema = new mongoose.Schema({
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CDRFile',
        required: true,
        index: true
    },
    phoneNumber: {
        type: String,
        required: true,
        index: true
    },
    totalCalls: {
        type: Number,
        default: 0
    },
    incomingCalls: {
        type: Number,
        default: 0
    },
    outgoingCalls: {
        type: Number,
        default: 0
    },
    smsCount: {
        type: Number,
        default: 0
    },
    totalDuration: {
        type: Number, // in seconds
        default: 0
    },
    avgDuration: {
        type: Number,
        default: 0
    },
    topContacts: [{
        number: String,
        count: Number,
        totalDuration: Number
    }],
    callFrequencyByHour: {
        type: Map,
        of: Number, // Hour 0-23 as keys
        default: {}
    },
    callFrequencyByDay: {
        type: Map,
        of: Number, // Day 0-6 as keys (Sun-Sat)
        default: {}
    },
    peakCallingHour: {
        type: Number, // 0-23
        default: 0
    },
    suspiciousActivityFlags: [{
        type: {
            type: String,
            enum: ['high_frequency', 'unusual_hours', 'burner_pattern', 'rapid_contact_change']
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high']
        },
        description: String
    }],
    networkStrength: {
        type: Number, // 1-10 scale
        default: 1
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index
analyticsSummarySchema.index({ fileId: 1, phoneNumber: 1 }, { unique: true });

module.exports = mongoose.model('AnalyticsSummary', analyticsSummarySchema);
