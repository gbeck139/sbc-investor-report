
function test(){
  Logger.log(getFounder("Plastiks"))
}

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











  // if (!rowNumber) return {}; // Return empty object if row number is invalid

  // // --- Efficiency: Read the entire row's data in one API call ---
  // const range = sheet.getRange("A" + rowNumber + ":" + finalColumnLetters + rowNumber);
  // const rowValues = range.getValues()[0]; // getValues() returns a 2D array, get the first row

  // const jsonObject = {};
  // for (const fieldName in UNIFIED_MAPPINGS) {
  //   const mappingInfo = UNIFIED_MAPPINGS[fieldName];
  //   const column = mappingInfo.column; // e.g., 'A', 'B', 'C'
  //   const jsonKey = mappingInfo.jsonKey; // e.g., 'name', 'source', 'sector'

  //   if (column && jsonKey) {
  //     // Convert column letter ('A') to array index (0)
  //     const columnIndex = columnLetterToIndex(column);
      
  //     // Assign the value from the spreadsheet to our clean jsonKey
  //     jsonObject[jsonKey] = rowValues[columnIndex];
  //   }
  // }
  // return jsonObject;

}