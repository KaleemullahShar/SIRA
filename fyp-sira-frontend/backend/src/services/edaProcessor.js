const CDRRecord = require('../models/CDRRecord');
const AnalyticsSummary = require('../models/AnalyticsSummary');
const CriminalRecord = require('../models/CriminalRecord');
const { getHour, getDayOfWeek } = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Perform EDA on CDR records and generate analytics summary
 * @param {string} fileId - CDR File ID
 */
const processEDA = async (fileId) => {
    try {
        logger.info(`Starting ED processing for file: ${fileId}`);

        // Get all records for this file
        const records = await CDRRecord.find({ fileId });

        if (records.length === 0) {
            logger.warn(`No records found for file: ${fileId}`);
            return;
        }

        // Get unique phone numbers
        const phoneNumbers = new Set();
        records.forEach(r => {
            phoneNumbers.add(r.callingNumber);
            phoneNumbers.add(r.calledNumber);
        });

        logger.info(`Processing ${phoneNumbers.size} unique numbers`);

        // Process each phone number
        for (const phoneNumber of phoneNumbers) {
            await generateAnalyticsForNumber(fileId, phoneNumber, records);
        }

        // Link with criminal database
        await linkWithCriminalDB(fileId);

        logger.info(`EDA processing completed for file: ${fileId}`);
    } catch (error) {
        logger.error(`EDA processing error: ${error.message}`);
        throw error;
    }
};

/**
 * Generate analytics for a specific phone number
 */
const generateAnalyticsForNumber = async (fileId, phoneNumber, allRecords) => {
    // Filter records for this number
    const numberRecords = allRecords.filter(
        r => r.callingNumber === phoneNumber || r.calledNumber === phoneNumber
    );

    // Basic stats
    let totalCalls = 0;
    let incomingCalls = 0;
    let outgoingCalls = 0;
    let smsCount = 0;
    let totalDuration = 0;

    // Contact frequency map
    const contactMap = {};

    // Time-based analysis
    const hourlyFreq = new Array(24).fill(0);
    const dailyFreq = new Array(7).fill(0);

    numberRecords.forEach(record => {
        const isCaller = record.callingNumber === phoneNumber;

        // Count by type
        if (record.callType === 'sms') {
            smsCount++;
        } else {
            totalCalls++;
            totalDuration += record.duration || 0;

            if (isCaller) {
                outgoingCalls++;
            } else {
                incomingCalls++;
            }
        }

        // Track contacts
        const contact = isCaller ? record.calledNumber : record.callingNumber;
        if (!contactMap[contact]) {
            contactMap[contact] = { count: 0, totalDuration: 0 };
        }
        contactMap[contact].count++;
        contactMap[contact].totalDuration += record.duration || 0;

        // Time analysis
        const hour = getHour(record.timestamp);
        const day = getDayOfWeek(record.timestamp);
        hourlyFreq[hour]++;
        dailyFreq[day]++;
    });

    // Calculate top contacts
    const topContacts = Object.entries(contactMap)
        .map(([number, stats]) => ({
            number,
            count: stats.count,
            totalDuration: stats.totalDuration
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Find peak hour
    const peakHour = hourlyFreq.indexOf(Math.max(...hourlyFreq));

    // Calculate average duration
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    // Detect suspicious activities
    const suspiciousFlags = detectSuspiciousActivity(
        phoneNumber,
        numberRecords,
        hourlyFreq,
        topContacts
    );

    // Calculate network strength (1-10)
    const networkStrength = Math.min(10, Math.ceil(Object.keys(contactMap).length / 5));

    // Create or update analytics summary
    const callFreqByHour = {};
    hourlyFreq.forEach((count, hour) => {
        callFreqByHour[hour] = count;
    });

    const callFreqByDay = {};
    dailyFreq.forEach((count, day) => {
        callFreqByDay[day] = count;
    });

    await AnalyticsSummary.findOneAndUpdate(
        { fileId, phoneNumber },
        {
            fileId,
            phoneNumber,
            totalCalls,
            incomingCalls,
            outgoingCalls,
            smsCount,
            totalDuration,
            avgDuration: Math.round(avgDuration),
            topContacts,
            callFrequencyByHour: callFreqByHour,
            callFrequencyByDay: callFreqByDay,
            peakCallingHour: peakHour,
            suspiciousActivityFlags: suspiciousFlags,
            networkStrength,
            generatedAt: new Date()
        },
        { upsert: true, new: true }
    );
};

/**
 * Detect suspicious activity patterns
 */
const detectSuspiciousActivity = (phoneNumber, records, hourlyFreq, topContacts) => {
    const flags = [];

    // High frequency calling
    const maxContactFreq = topContacts.length > 0 ? topContacts[0].count : 0;
    if (maxContactFreq > 50) {
        flags.push({
            type: 'high_frequency',
            severity: 'high',
            description: `Excessive calls to single number: ${maxContactFreq} calls`
        });
    }

    // Unusual hours (2 AM - 6 AM)
    const lateNightCalls = hourlyFreq.slice(2, 6).reduce((a, b) => a + b, 0);
    if (lateNightCalls > 10) {
        flags.push({
            type: 'unusual_hours',
            severity: 'medium',
            description: `${lateNightCalls} calls between 2 AM - 6 AM`
        });
    }

    // Burner phone pattern (many unique contacts, short usage)
    if (topContacts.length > 20 && records.length < 100) {
        flags.push({
            type: 'burner_pattern',
            severity: 'high',
            description: 'High contact diversity with low total calls'
        });
    }

    return flags;
};

/**
 * Link CDR numbers with criminal database
 */
const linkWithCriminalDB = async (fileId) => {
    const records = await CDRRecord.find({ fileId });
    const phoneNumbers = [...new Set(records.map(r => r.callingNumber).concat(records.map(r => r.calledNumber)))];

    // Check if any numbers match criminal records
    const criminalRecords = await CriminalRecord.find({
        $or: [
            { phone: { $in: phoneNumbers } },
            { associatedNumbers: { $in: phoneNumbers } }
        ]
    });

    if (criminalRecords.length > 0) {
        logger.info(`Found ${criminalRecords.length} matches in criminal database`);

        // Flag matching records
        for (const criminal of criminalRecords) {
            const matchingNumbers = [criminal.phone, ...criminal.associatedNumbers];

            await CDRRecord.updateMany(
                {
                    fileId,
                    $or: [
                        { callingNumber: { $in: matchingNumbers } },
                        { calledNumber: { $in: matchingNumbers } }
                    ]
                },
                {
                    isFlagged: true,
                    flagReason: `Linked to criminal record: ${criminal.name} (${criminal.crimeType})`,
                    linkedCriminalRecord: criminal._id
                }
            );
        }
    }
};

module.exports = {
    processEDA
};
