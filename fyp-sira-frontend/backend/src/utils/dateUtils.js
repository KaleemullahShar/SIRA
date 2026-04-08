/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

/**
 * Get date range for queries
 * @param {string} range - 'today', 'week', 'month', 'year'
 * @returns {Object} - {start: Date, end: Date}
 */
const getDateRange = (range) => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    switch (range) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            break;
        case 'week':
            start.setDate(now.getDate() - 7);
            break;
        case 'month':
            start.setDate(now.getDate() - 30);
            break;
        case 'year':
            start.setFullYear(now.getFullYear() - 1);
            break;
        default:
            start.setDate(now.getDate() - 30);
    }

    return { start, end };
};

/**
 * Get hour from timestamp
 */
const getHour = (timestamp) => {
    return new Date(timestamp).getHours();
};

/**
 * Get day of week from timestamp (0-6, Sun-Sat)
 */
const getDayOfWeek = (timestamp) => {
    return new Date(timestamp).getDay();
};

module.exports = {
    formatDate,
    getDateRange,
    getHour,
    getDayOfWeek
};
