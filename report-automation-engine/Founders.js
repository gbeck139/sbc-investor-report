
/**
 * A utility script for retrieving founder information from the 'Founders' sheet.
 * 
 * Grant Beck
 * SBC Australia
 * 08/07/2025
 */


/**
 * Retrieves the founder's name for a given company from the 'Founders' sheet.
 * @param {string} companyName - The name of the company to search for.
 * @returns {string|null} The name of the founder, or null if the company is not found.
 */
function getFounder(companyName){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Founders');
  const nameColumnLetter = 'A';

  const cell = getCompanyRow(sheet, nameColumnLetter, companyName);

  if (cell) {
    const rowNumber = cell.getRow();
    Logger.log(`Found founder "${companyName}" at row ${rowNumber}.`);
    const range = sheet.getRange("A" + rowNumber + ":" + "B" + rowNumber);
    const rowValues = range.getValues()[0];
    return rowValues[1];
  } else {
    Logger.log(`Company "${companyName}" not found in the sheet.`);
    return null; // Company not found
  }
}