const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const XLSX = require('xlsx');
const { normalizePhoneNumber, isValidPhoneNumber } = require('../utils/phoneNormalizer');
const logger = require('../utils/logger');

/**
 * Parse CDR file (CSV or Excel) and extract CDR records
 * @param {string} filePath - Path to file
 * @returns {Promise<Object>} - {records: [], errors: [], summary: {}}
 */
const parseCDRFile = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.csv') {
        return parseCSVFile(filePath);
    } else if (['.xlsx', '.xls', '.xlsm'].includes(ext)) {
        return parseExcelFile(filePath);
    } else {
        return Promise.reject(new Error('Unsupported file format'));
    }
};

/**
 * Parse Excel file
 */
const parseExcelFile = (filePath) => {
    return new Promise((resolve, reject) => {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0]; // Use first sheet
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON with header row
            const rows = XLSX.utils.sheet_to_json(worksheet, { 
                raw: false,
                defval: ''
            });

            const records = [];
            const errors = [];

            rows.forEach((row, index) => {
                const rowNumber = index + 2; // +2 because Excel is 1-indexed and header is row 1
                try {
                    const record = parseRow(row, rowNumber);
                    if (record) {
                        records.push(record);
                    }
                } catch (error) {
                    errors.push({
                        row: rowNumber,
                        error: error.message,
                        data: row
                    });
                }
            });

            logger.info(`Parsed Excel: ${records.length} valid records, ${errors.length} errors`);
            resolve({
                records,
                errors,
                summary: {
                    totalRows: rows.length,
                    validRecords: records.length,
                    errorCount: errors.length
                }
            });
        } catch (error) {
            logger.error(`Excel parsing error: ${error.message}`);
            reject(error);
        }
    });
};

/**
 * Parse CSV file
 */
const parseCSVFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const records = [];
        const errors = [];
        let rowNumber = 0;

        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                rowNumber++;

                try {
                    const record = parseRow(row, rowNumber);
                    if (record) {
                        records.push(record);
                    }
                } catch (error) {
                    errors.push({
                        row: rowNumber,
                        error: error.message,
                        data: row
                    });
                }
            })
            .on('end', () => {
                logger.info(`Parsed CSV: ${records.length} valid records, ${errors.length} errors`);
                resolve({
                    records,
                    errors,
                    summary: {
                        totalRows: rowNumber,
                        validRecords: records.length,
                        errorCount: errors.length
                    }
                });
            })
            .on('error', (error) => {
                logger.error(`CSV parsing error: ${error.message}`);
                reject(error);
            });
    });
};

/**
 * Parse a single row into CDR record
 * Expected columns (as per provided format):
 * - Sr # / Sr# / Serial Number
 * - Call Type / CallType
 * - A-Party / AParty / Calling Number
 * - B-Party / BParty / Called Number
 * - Date & Time / DateTime / Date/Time
 * - Duration / Durati on
 * - Cell ID / CellID
 * - IMEI
 * - IMSI
 * - Site / Location
 */
const parseRow = (row, rowNumber) => {
    // Helper function to get column value (flexible column name matching)
    const getColumn = (row, possibleNames) => {
        for (let name of possibleNames) {
            const keys = Object.keys(row);
            const match = keys.find(k => {
                const normalized = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                const target = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return normalized === target || normalized.includes(target) || target.includes(normalized);
            });
            if (match && row[match]) {
                const value = row[match].toString().trim();
                if (value) return value;
            }
        }
        return null;
    };

    // Extract fields based on your specific format
    const callType = getColumn(row, ['calltype', 'call_type', 'type', 'direction']);
    const callingNumber = getColumn(row, ['aparty', 'a-party', 'aParty', 'calling_number', 'caller', 'from', 'calling', 'source']);
    const calledNumber = getColumn(row, ['bparty', 'b-party', 'bParty', 'called_number', 'callee', 'to', 'called', 'destination']);
    const dateTime = getColumn(row, ['datetime', 'date_time', 'date&time', 'timestamp', 'date', 'time', 'call_time']);
    const duration = getColumn(row, ['duration', 'durati', 'call_duration', 'length']);
    const cellId = getColumn(row, ['cellid', 'cell_id', 'tower_id', 'celltower']);
    const imei = getColumn(row, ['imei']);
    const imsi = getColumn(row, ['imsi']);
    const site = getColumn(row, ['site', 'location', 'area', 'city']);

    // Validate required fields
    if (!callingNumber || !calledNumber) {
        throw new Error('Missing required fields: A-Party or B-Party');
    }

    // Skip header rows or empty rows
    if (callingNumber.toLowerCase().includes('party') || callingNumber.toLowerCase().includes('number')) {
        return null; // Skip header
    }

    // Normalize phone numbers
    const normalizedCalling = normalizePhoneNumber(callingNumber);
    const normalizedCalled = normalizePhoneNumber(calledNumber);

    if (!isValidPhoneNumber(normalizedCalling) || !isValidPhoneNumber(normalizedCalled)) {
        throw new Error(`Invalid phone number format: ${callingNumber} or ${calledNumber}`);
    }

    // Parse call type (Incoming/Outgoing/SMS)
    let parsedCallType = 'outgoing'; // default
    if (callType) {
        const type = callType.toLowerCase().trim();
        
        // Check for SMS/Messages first (BEFORE checking for in/out keywords)
        if (type.includes('sms') || type.includes('message')) {
            // Determine if incoming or outgoing SMS
            if (type.includes('incoming') || (type.includes('in') && !type.includes('outgoing'))) {
                parsedCallType = 'sms-incoming';
            } else if (type.includes('outgoing') || type.includes('out')) {
                parsedCallType = 'sms-outgoing';
            } else {
                parsedCallType = 'sms'; // default SMS if direction not specified
            }
        }
        // Only check for regular calls if NOT an SMS
        else if (type.includes('incoming') || type === 'in' || type.includes('si')) {
            parsedCallType = 'incoming';
        } else if (type.includes('outgoing') || type === 'out') {
            parsedCallType = 'outgoing';
        } else if (type.includes('data') || type.includes('internet')) {
            parsedCallType = 'data';
        }
    }

    // Parse duration
    let parsedDuration = 0;
    if (duration) {
        const durationStr = duration.toString().replace(/[^0-9]/g, '');
        parsedDuration = parseInt(durationStr) || 0;
    }

    // Parse timestamp - handle format: "4/1/2023  11:11:47"
    let parsedTimestamp = new Date();
    if (dateTime) {
        // Try parsing the date
        const cleanedDate = dateTime.trim();
        parsedTimestamp = new Date(cleanedDate);
        
        // If invalid, try manual parsing for format "M/D/YYYY HH:MM:SS"
        if (isNaN(parsedTimestamp.getTime())) {
            const parts = cleanedDate.split(/[\s]+/);
            if (parts.length >= 2) {
                const datePart = parts[0];
                const timePart = parts[1];
                const [month, day, year] = datePart.split('/');
                const [hour, minute, second] = timePart.split(':');
                parsedTimestamp = new Date(year, month - 1, day, hour, minute, second || 0);
            }
        }
        
        if (isNaN(parsedTimestamp.getTime())) {
            parsedTimestamp = new Date(); // Fallback to current date
        }
    }

    // Combine location information
    let locationInfo = site || '';
    if (cellId) {
        locationInfo = locationInfo ? `${locationInfo} (Cell: ${cellId})` : `Cell: ${cellId}`;
    }

    return {
        callingNumber: normalizedCalling,
        calledNumber: normalizedCalled,
        callType: parsedCallType,
        duration: parsedDuration,
        timestamp: parsedTimestamp,
        cellId: cellId || imei || '',
        location: locationInfo
    };
};

module.exports = {
    parseCDRFile
};
