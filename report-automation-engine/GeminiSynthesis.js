function synthesizeData(companies){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  let finalSheet = spreadsheet.getSheetByName(FINAL_SHEET);

  for(const company of companies)
      data = geminiSynthesis(sheet, finalSheet, company);
  
}

function deckCreation(companies) {
  let spreadsheet= SpreadsheetApp.getActiveSpreadsheet();
  let finalSheet = spreadsheet.getSheetByName(FINAL_SHEET);
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  const presentation = createNewDeckFromTemplate(TEMPLATE_ID, 'matt test');

  for(const comp of companies){
    const company = getSingleCompany(sheet, comp);
    let finalRow = Math.floor((company.sheetRow-HUBSPOT_ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW;

    const finalData = readRowData(finalSheet, finalRow);
    finalData['countryFlag'] = getCountryFlag(finalData.logoISO);
    finalData['companyLogo'] = getCompanyLogo(finalData.website);
    finalData.reportLink = presentation.getUrl();
    writeToCell(finalSheet,UNIFIED_MAPPINGS['Report Link'].column, finalRow, finalData.reportLink);

    const slide = copySlideToPresentation(TEMPLATE_ID, 0, presentation);
    generateCompanySlideDeck(slide, finalData);

    console.log(finalData.reportLink);
  }
}


function geminiSynthesis(sheet, finalSheet, name){
  Logger.log(`Starting synthesis for ${name}`);
  const company = getSingleCompany(sheet, name);

  let finalRow = Math.floor((company.sheetRow-HUBSPOT_ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW;

  fillCompany(company, sheet);
  data = callGeminiAPI("gemini-2.5-pro", getSynthesizeFinalCompanyPrompt(company), false);
  result = callGeminiAPI("gemini-2.0-flash", getFormatFinalCompanyPrompt(data));
  parsed = JSON.parse(result);

  parseAndWriteGeminiOutput(finalSheet, parsed, finalRow, company);
  
  // Copy all important existing data from company to final sheet
  const fieldsToPreserve = [
    'Name', 'Website', 'Sector', 'Founding Location'
  ];
  
  for (const fieldName of fieldsToPreserve) {
    const mapping = UNIFIED_MAPPINGS[fieldName];
    if (mapping && mapping.jsonKey && company[mapping.jsonKey]) 
      writeToCell(finalSheet, mapping.column, finalRow, company[mapping.jsonKey]);
    
  }
  
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

  return finalJson;
}