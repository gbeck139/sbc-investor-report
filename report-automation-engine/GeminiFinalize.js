function formatDataForSynthesis(internalRow, hubspotRow, geminiRow) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('MASTER_SHEET'); // Make sure this name is correct

  const hubspotData = readRowData(sheet, hubspotRow);
  const internalData = readRowData(sheet, internalRow);
  const geminiData = readRowData(sheet, geminiRow);

  // --- Cleanliness: No more hardcoding. Pull top-level info from the object. ---
  // We no longer need separate .getValue() calls.
  // We use the 'jsonKey' from the mappings (e.g., 'name', not 'Name').
  const finalJson = {
    name: hubspotData.name || internalData.name || '', // Use data from hubspotData, fallback to internalData
    website: hubspotData.website || internalData.website || '',
    sector: hubspotData.sector || internalData.sector || '',
    
    // The nested data is clean and consistently structured
    sources: {
        hubspot: hubspotData,
        internal: internalData,
        gemini: geminiData
    }
  };

  // Log the result for debugging and return it
  Logger.log("Final JSON for Synthesizer:\n" + JSON.stringify(finalJson, null, 2));
  return finalJson;
}


function readRowData(sheet, rowNumber) {
  if (!rowNumber) return {}; // Return empty object if row number is invalid

  // --- Efficiency: Read the entire row's data in one API call ---
  const range = sheet.getRange("A" + rowNumber + ":" + finalColumnLetters + rowNumber);
  const rowValues = range.getValues()[0]; // getValues() returns a 2D array, get the first row

  const jsonObject = {};
  for (const fieldName in UNIFIED_MAPPINGS) {
    const mappingInfo = UNIFIED_MAPPINGS[fieldName];
    const column = mappingInfo.column; // e.g., 'A', 'B', 'C'
    const jsonKey = mappingInfo.jsonKey; // e.g., 'name', 'source', 'sector'

    if (column && jsonKey) {
      // Convert column letter ('A') to array index (0)
      const columnIndex = column.charCodeAt(0) - 'A'.charCodeAt(0);
      
      // Assign the value from the spreadsheet to our clean jsonKey
      jsonObject[jsonKey] = rowValues[columnIndex];
    }
  }
  return jsonObject;
}


function parseAndWriteGeminiOutput(sheet, parsedData, row) {
  const dataRange = sheet.getRange(`A${row}:${finalColumnLetters}${row}`); // Adjust range if needed

  const numColumns = dataRange.getNumColumns();
  const outputRow = new Array(numColumns).fill(''); // Fills the array with blank strings


  // Iterate through the master mapping to decide what to do.
  for (const fieldName in UNIFIED_MAPPINGS) {
    const mappingInfo = UNIFIED_MAPPINGS[fieldName];
    const jsonKey = mappingInfo.jsonKey;
    const column = mappingInfo.column;

    if (jsonKey in parsedData && column) {
      const rawValue = parsedData[jsonKey];
      
      const formattedValue = formatCellValue(rawValue);
      
      const columnIndex = column.charCodeAt(0) - 'A'.charCodeAt(0);

      // Place the fully formatted string into our output array.
      outputRow[columnIndex] = formattedValue;
    }
  }

  // Write the entire updated row back to the sheet in ONE single API call.
  dataRange.setValues([outputRow]);
  
  // You might want to set wrap strategy for the whole row at once.
  dataRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  Logger.log(`Successfully wrote and formatted bulk data to row ${row}.`);
}