function geminiSearch(companies){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  for(const name of companies){
    Logger.log(`Starting Gemini Search for ${name}`);
    const company = getSingleCompany(sheet, name);
    fillCompany(company, sheet);
    Logger.log(`Finished Gemini Search for ${name}`);
  }
}
