const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');

const connectDatabase = async () => {
    try {
        await mongoose.connect(config.mongoUri);

        logger.info(`MongoDB Connected: ${mongoose.connection.host}`);

        // Log database name
        logger.info(`Database: ${mongoose.connection.name}`);
    } catch (error) {
        logger.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err}`);
});

module.exports = connectDatabase;
