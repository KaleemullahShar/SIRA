const mongoose = require('mongoose');
const AnalyticsSummary = require('../models/AnalyticsSummary');
const config = require('../config/config');

const checkSuspiciousNumbers = async () => {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB\n');

        const suspicious = await AnalyticsSummary.find({
            'suspiciousActivityFlags.0': { $exists: true }
        }).limit(10);

        console.log('=== HIGH-RISK NUMBERS CALCULATION ===\n');
        console.log(`Total flagged numbers: ${suspicious.length}\n`);
        console.log('DETECTION CRITERIA:');
        console.log('1. HIGH FREQUENCY: >50 calls to a single number');
        console.log('2. UNUSUAL HOURS: >10 calls between 2 AM - 6 AM');
        console.log('3. BURNER PATTERN: >20 unique contacts but <100 total calls\n');
        console.log('='.repeat(60));
        console.log('\n');

        suspicious.forEach((s, i) => {
            console.log(`${i+1}. Phone Number: ${s.phoneNumber}`);
            console.log(`   Total Calls: ${s.totalCalls}`);
            console.log(`   Top Contacts: ${s.topContacts.length}`);
            console.log(`   Flags Detected: ${s.suspiciousActivityFlags.length}`);
            
            s.suspiciousActivityFlags.forEach(flag => {
                console.log(`     → [${flag.severity.toUpperCase()}] ${flag.type.toUpperCase()}`);
                console.log(`       ${flag.description}`);
            });
            console.log('');
        });

        console.log('='.repeat(60));
        console.log(`\nShowing ${suspicious.length} examples of flagged numbers`);
        console.log('These are based on REAL CDR analysis patterns\n');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

checkSuspiciousNumbers();
