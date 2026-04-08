# CDR File Format Requirements

## Required Columns

The system expects CDR files with the following columns (column names are case-insensitive and flexible):

### Mandatory Columns:

1. **Sr # / Serial Number**
   - Sequential row number
   - Example: 1, 2, 3, ...

2. **Call Type**
   - Values: `Incoming`, `Outgoing`, `SMS`, `Data`
   - Incoming calls: "Incoming", "Incoming Si", "In"
   - Outgoing calls: "Outgoing", "Out"

3. **A-Party** (Calling Number)
   - The phone number that initiated the call
   - Can be in any format: 923201371499, +92-320-1371499, etc.
   - Alternative names: Calling Number, Caller, From, Source

4. **B-Party** (Called Number)
   - The phone number that was called
   - Can be in any format
   - Alternative names: Called Number, Callee, To, Destination

5. **Date & Time**
   - Format: M/D/YYYY HH:MM:SS
   - Example: 4/1/2023 11:11:47
   - Alternative names: DateTime, Timestamp, Date/Time

6. **Duration**
   - Call duration in seconds
   - Example: 0 (missed call), 79 (79 seconds)
   - Alternative names: Call Duration, Length

### Optional Columns:

7. **Cell ID**
   - Cell tower identifier
   - Example: 1BC04CD, 6B82B9D

8. **IMEI**
   - Device identifier
   - Example: 359223740374970

9. **IMSI**
   - SIM card identifier
   - Example: 410010166638425

10. **Site / Location**
    - Cell tower location/name
    - Example: UALA5689__P_AkramColony, Deh Nahki, Akram Colony

## Supported File Formats

- ✅ CSV (.csv)
- ✅ Excel 2007+ (.xlsx)
- ✅ Excel 97-2003 (.xls)
- ✅ Excel with Macros (.xlsm)

## Sample Data

```csv
Sr #,Call Type,A-Party,B-Party,Date & Time,Duration,Cell ID,IMEI,IMSI,Site
1,Incoming,923201371499,4A415A5A,4/1/2023 11:11:47,0,1BC04CD,359223740374970,410010166638425,UALA5689__P_AkramColony
2,Outgoing,923201371499,03483860995,4/2/2023 14:41:38,5,1BC04CD,359223740374970,410010166638425,UALA5689__P_AkramColony
```

## File Upload Process

1. **Select File**: Choose a CSV or Excel file from your computer
2. **Validation**: System validates file format and required columns
3. **Processing**: Records are parsed and normalized
4. **Analysis**: Data is analyzed for patterns and anomalies
5. **Storage**: Valid records are stored in the database

## Column Name Flexibility

The parser supports multiple column name variations:

- **A-Party**: A-Party, AParty, A Party, Calling Number, Caller, From
- **B-Party**: B-Party, BParty, B Party, Called Number, Callee, To
- **Call Type**: Call Type, CallType, Type, Direction
- **Date & Time**: Date & Time, DateTime, Date/Time, Timestamp, Date, Time

## Error Handling

Files with errors will show:
- Total rows processed
- Valid records imported
- Error count with details
- Specific row numbers with issues

## Notes

- Phone numbers are automatically normalized
- Invalid phone numbers are skipped
- Header rows are automatically detected and ignored
- Empty rows are skipped
- Duplicate records are allowed (no de-duplication)
