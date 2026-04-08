const mongoose = require('mongoose');

const criminalRecordSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    cnic: {
        type: String,
        required: [true, 'CNIC is required'],
        unique: true,
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        index: true
    },
    crimeType: {
        type: String,
        required: [true, 'Crime type is required'],
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    status: {
        type: String,
        enum: ['active', 'closed'],
        default: 'active',
        lowercase: true
    },
    description: {
        type: String,
        trim: true
    },
    aliases: [{
        type: String,
        trim: true
    }],
    associatedNumbers: [{
        type: String,
        trim: true
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes (cnic already indexed via unique: true, phone has index: true)
criminalRecordSchema.index({ associatedNumbers: 1 });
criminalRecordSchema.index({ status: 1 });
criminalRecordSchema.index({ crimeType: 1 });

// Text index for search
criminalRecordSchema.index({
    name: 'text',
    cnic: 'text',
    phone: 'text',
    crimeType: 'text'
});

module.exports = mongoose.model('CriminalRecord', criminalRecordSchema);
