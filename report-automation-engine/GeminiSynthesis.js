

function formatDataForSynthesis(firstRow) {
  internalRow = firstRow
  hubspotRow = firstRow+1
  geminiRow = hubspotRow+2;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(MASTER_SHEET); // Make sure this name is correct

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