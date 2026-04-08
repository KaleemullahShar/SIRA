/**
 * Normalize phone number to standard format
 * Removes spaces, dashes, parentheses and country codes
 * @param {string} phone - Phone number to normalize
 * @returns {string} - Normalized phone number
 */
const normalizePhoneNumber = (phone) => {
    if (!phone) return '';

    // Remove all non-digit characters
    let normalized = phone.toString().replace(/\D/g, '');

    // Remove country code (92 for Pakistan) if present
    if (normalized.startsWith('92') && normalized.length > 10) {
        normalized = '0' + normalized.substring(2);
    }

    // Remove leading zeros if more than one
    normalized = normalized.replace(/^0+/, '0');

    return normalized;
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
const isValidPhoneNumber = (phone) => {
    if (!phone) return false;
    const normalized = normalizePhoneNumber(phone);
    // Should be 10-15 digits
    return normalized.length >= 10 && normalized.length <= 15;
};

module.exports = {
    normalizePhoneNumber,
    isValidPhoneNumber
};
