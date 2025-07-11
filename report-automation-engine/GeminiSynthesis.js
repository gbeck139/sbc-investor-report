function synthesizeAndCreateDeck(companies){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  let finalSheet = spreadsheet.getSheetByName(FINAL_SHEET);
  const templateId = '1ZpZxSyw9GQseP7tSLp5lLcLbSvkAkB45IzIY4g0sF5Q';

  const presentation = createNewDeckFromTemplate(templateId, 'Test');

  for(const name of companies){
      data = geminiSynthesis(sheet, finalSheet, name, presentation)
      const slide = copySlideToPresentation(templateId, 0, presentation);
      generateCompanySlideDeck(slide, data);
  }
}





function geminiSynthesis(sheet, finalSheet, name, presentation){
  Logger.log(`Starting synthesis for ${name}`);
  const company = getSingleCompany(sheet, name);

  let finalRow = Math.floor((company.sheetRow-HUBSPOT_ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW;

  fillCompany(company, sheet);
  data = callGeminiAPI("gemini-2.5-pro", getSynthesizeFinalCompanyPrompt(company), false);
  result = callGeminiAPI("gemini-2.0-flash", getFormatFinalCompanyPrompt(data));
  parsed = JSON.parse(result);

  parseAndWriteGeminiOutput(finalSheet, parsed, finalRow, company);
  writeToCell(finalSheet, UNIFIED_MAPPINGS['Name'].column, finalRow, company.name);
  writeToCell(finalSheet, UNIFIED_MAPPINGS['Website'].column, finalRow, company.website);
  writeToCell(finalSheet, UNIFIED_MAPPINGS['Sector'].column, finalRow, company.sector);
  writeToCell(finalSheet, UNIFIED_MAPPINGS['Report Link'].column, finalRow, presentation.getUrl());
  finalData = readRowData(finalSheet, finalRow);
  return finalData
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