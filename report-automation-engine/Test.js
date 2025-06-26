function test(){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  const name = "Pencil";
  const company = getSingleCompany(sheet, name);
  Logger.log(company.sheetRow)
  
  // fillCompany(company, sheet)

  synthPrompt = getSynthesizeFinalCompanyPrompt(company.name, company.website, company.sheetRow-1, company.sheetRow, company.sheetRow+1);
  data = callGeminiAPI("gemini-2.5-pro", synthPrompt, false);
  result = callGeminiAPI("gemini-2.0-flash", getFormatFinalCompanyPrompt(data));
  parsed = JSON.parse(result);
  parseAndWriteGeminiFinalOutput(spreadsheet.getSheetByName("Final Sheet"), parsed, Math.floor((company.sheetRow-ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW, company);
  Logger.log(result);
}

function testSynth(){
  Logger.log(formatDataForSynthesis(72, 71, 73));
}