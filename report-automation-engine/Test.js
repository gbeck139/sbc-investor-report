function test1(){
  geminiSearch(["ontrack"]);
}

function test2(){
  synthesizeAndCreateDeck(['NeedEnergy']);
}

function testerDeckCreation(name = 'Fohat') {
  const templateId = '1ZpZxSyw9GQseP7tSLp5lLcLbSvkAkB45IzIY4g0sF5Q';  
  let spreadsheet= SpreadsheetApp.getActiveSpreadsheet();
  let finalSheet = spreadsheet.getSheetByName(FINAL_SHEET);
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);

  const presentation = createNewDeckFromTemplate(templateId, 'matt test');
  const company = getSingleCompany(sheet, name);
  let finalRow = Math.floor((company.sheetRow-HUBSPOT_ROW)/ROW_SPACING)+COMPANY_UPDATE_ROW;

  const finalData = readRowData(finalSheet, finalRow);
  finalData['countryFlag'] = getCountryFlag(finalData.foundingLocation);
  finalData['companyLogo'] = getCompanyLogo(finalData.website);
  finalData.reportLink = presentation.getUrl();

  const slide = copySlideToPresentation(templateId, 0, presentation);
  generateCompanySlideDeck(slide, finalData);

  Logger.log(finalData.reportLink);
}