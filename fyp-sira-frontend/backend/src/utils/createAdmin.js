const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/config');

/**
 * Script to create or activate admin user
 * Run with: node src/utils/createAdmin.js
 */

const createOrActivateAdmin = async () => {
    try {
        // Connect to database
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB');

        const adminUsername = 'admin';
        const adminPassword = 'admin123'; // Change this to your desired password
        
        // Check if admin already exists
        let admin = await User.findOne({ username: adminUsername });

        if (admin) {
            console.log('Admin user found. Checking status...');
            
            if (!admin.isActive) {
                // Activate the admin account
                admin.isActive = true;
                await admin.save();
                console.log('✅ Admin account has been ACTIVATED');
            } else {
                console.log('✅ Admin account is already active');
            }

            console.log('\nAdmin Details:');
            console.log('Username:', admin.username);
            console.log('Role:', admin.role);
            console.log('Active:', admin.isActive);
            console.log('Full Name:', admin.fullName);
        } else {
            // Create new admin user
            console.log('Creating new admin user...');
            
            admin = await User.create({
                username: adminUsername,
                password: adminPassword,
                fullName: 'System Administrator',
                role: 'admin',
                email: 'admin@sira.com',
                badgeNumber: 'ADMIN001',
                unit: 'Administration',
                isActive: true
            });

            console.log('✅ Admin user created successfully!');
            console.log('\nAdmin Credentials:');
            console.log('Username:', adminUsername);
            console.log('Password:', adminPassword);
            console.log('⚠️  IMPORTANT: Change the password after first login!');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

// Run the script
createOrActivateAdmin();
