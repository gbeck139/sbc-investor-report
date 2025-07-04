function synthesizeAndCreateDeck(companies){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  let finalSheet = spreadsheet.getSheetByName(FINAL_SHEET);
  templateId = '1HphW-gruSiMlAeKmbH52RHkgXOp3GwIUZuE8ZqlQ0Uo';

  presentation = createNewDeckFromTemplate(templateId, 'Test');

  for(const name of companies){
      data = geminiSynthesis(sheet, finalSheet, name)
      const slide = copySlideToPresentation(templateId, 0, presentation);
      generateCompanySlideDeck(slide, data);
  }
  writeToCell(finalSheet, UNIFIED_MAPPINGS['Report Link'].column, getFinalRow(company.sheetRow), presentation.getUrl());
}





function geminiSynthesis(sheet, finalSheet, name){
  Logger.log(`Starting synthesis for ${name}`);
  const company = getSingleCompany(sheet, name);

  let finalRow = getFinalRow(company.sheetRow);

  fillCompany(company, sheet);
  data = callGeminiAPI("gemini-2.5-pro", getSynthesizeFinalCompanyPrompt(company), false);
  result = callGeminiAPI("gemini-2.0-flash", getFormatFinalCompanyPrompt(data));
  parsed = JSON.parse(result);

  parseAndWriteGeminiOutput(finalSheet, parsed, finalRow, company);
  writeToCell(finalSheet, UNIFIED_MAPPINGS['Name'].column, finalRow, company.name);
  writeToCell(finalSheet, UNIFIED_MAPPINGS['Website'].column, finalRow, company.website);
  writeToCell(finalSheet, UNIFIED_MAPPINGS['Sector'].column, finalRow, company.sector);
  finalData = readRowData(sheetFinal, finalRow);
  return finalData
}

function getFinalRow(masterRow){
  return Math.floor((masterRow-HUBSPOT_ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW
}


















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