/**
 * Automation to synthesize data from multiple sources into a single, coherent view.
 * This script uses the Gemini API to analyze and reconcile data from HubSpot, Google Drive, and web searches.
 * The synthesized data is then used to generate investor reports.
 * 
 * Grant Beck
 * SBC Australia
 * 20/06/2025
 */

/**
 * Synthesizes data for a list of companies and stores it in the Final Sheet.
 * @param {string[]} companies - An array of company names to process.
 */
function synthesizeData(companies){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  let finalSheet = spreadsheet.getSheetByName(FINAL_SHEET);

  for(const company of companies)
      data = geminiSynthesis(sheet, finalSheet, company);
  
}

/**
 * Creates a new Google Slides presentation from a template and populates it
 * with data for the specified companies.
 * @param {string[]} companies - An array of company names to include in the deck.
 */
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

/**
 * Performs the core data synthesis for a single company using the Gemini API.
 * It reads data from the Master Sheet, sends it to Gemini for synthesis,
 * and writes the final, reconciled data to the Final Sheet.
 * @param {Sheet} sheet - The Master Google Sheet.
 * @param {Sheet} finalSheet - The Final Google Sheet.
 * @param {string} name - The name of the company to process.
 * @returns {Object} The final, synthesized data for the company.
 */
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

/**
 * Gathers and formats all data for a single company from the Master Sheet
 * into a structured object suitable for the Gemini synthesis prompt.
 * @param {number} firstRow - The starting row number for the company's data.
 * @returns {Object} A structured object containing all the company's data from different sources.
 */
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