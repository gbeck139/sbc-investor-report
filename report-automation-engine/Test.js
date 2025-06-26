function test(){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  const name = "Pencil";
  const company = getSingleCompany(sheet, name);
  fillCompany(company, sheet)
  synthPrompt = getSynthesizeFinalCompanyPrompt(company.name, company.website, 72, 71, 73);
  data = callGeminiAPI("gemini-2.5-pro", synthPrompt, false);
  result = callGeminiAPI("gemini-2.0-flash", getFormatFinalCompanyPrompt(data));
  parsed = JSON.parse(result);
  parseAndWriteGeminiSearchOutput(spreadsheet.getSheetByName("Final Sheet"), parsed, Math.floor((71-2)/3)+2);
  Logger.log(result);
}

function testSynth(){
  Logger.log(formatDataForSynthesis(72, 71, 73));
}