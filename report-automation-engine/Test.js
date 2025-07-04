function test1(){
  geminiSearch(["OnTrack"]);
}

function test(){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  let sheetFinal = spreadsheet.getSheetByName(FINAL_SHEET);
  const name = "Pencil";
  const company = getSingleCompany(sheet, name);
  
  // fillCompany(company, sheet);

  // synthPrompt = getSynthesizeFinalCompanyPrompt(company);
  // data = callGeminiAPI("gemini-2.5-pro-preview-03-25", synthPrompt, false);
  // result = callGeminiAPI("gemini-2.0-flash", getFormatFinalCompanyPrompt(data));
  // parsed = JSON.parse(result);
  // Logger.log(parsed);


  // parseAndWriteGeminiOutput(spreadsheet.getSheetByName("Final Sheet"), parsed, Math.floor((company.sheetRow-ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW, company);
  // writeToCell(sheetFinal, UNIFIED_MAPPINGS['Name'].column, Math.floor((company.sheetRow-ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW, company.name);
  // writeToCell(sheetFinal, UNIFIED_MAPPINGS['Website'].column, Math.floor((company.sheetRow-ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW, company.website);
  // writeToCell(sheetFinal, UNIFIED_MAPPINGS['Sector'].column, Math.floor((company.sheetRow-ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW, company.sector);
  // Logger.log(result);

  finalData = readRowData(sheetFinal, Math.floor((company.sheetRow-ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW)


  // const presentation = copyVerticalTemplate();
  // const presentation = getTestDeck();

  const slide = copySlideToPresentation('1HphW-gruSiMlAeKmbH52RHkgXOp3GwIUZuE8ZqlQ0Uo', 0, '18bDOGtxxf21olSUD0JzJ1jULGNrO-oa0iiCAQ8L_Dgw')

  generateCompanySlideDeck(slide, finalData);

  // const reportUrl = generateCompanyOnePager(parsed);
  // const reportUrl = generateCompanySlideDeck(normalizedParsed);
  
  // Optional: Write the URL of the new report back to your sheet for easy access

  // writeToCell(sheetFinal, UNIFIED_MAPPINGS['Report Link'].column, Math.floor((company.sheetRow-ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW, reportUrl);
  
}