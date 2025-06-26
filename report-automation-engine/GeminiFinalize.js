/**
 * Main function to prepare data for the final "Synthesizer" model.
 * It reads data from three specified rows and assembles it into a final JSON object.
 */
function formatDataForSynthesis(hubspotRow, internalRow, geminiRow) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);

  // Read the data from each of the three source rows using our updated helper function
  const hubspotData = readRowData(sheet, hubspotRow);
  const internalData = readRowData(sheet, internalRow);
  const geminiData = readRowData(sheet, geminiRow);

  // Get top-level info from one of the sources (e.g., the HubSpot row)
  const name = sheet.getRange(COLUMN_MAPPINGS['Name'] + hubspotRow).getValue();
  const website = sheet.getRange(COLUMN_MAPPINGS['Website'] + hubspotRow).getValue();
  const sector = sheet.getRange(COLUMN_MAPPINGS['Sector'] + hubspotRow).getValue();

  // Assemble the final JSON object in the structure you specified
  const finalJson = {
    name: name,
    website: website,
    sector: sector,
    hubspot: hubspotData,
    internal: internalData,
    gemini: geminiData
  };

  // Log the result for debugging and return it
  Logger.log("Final JSON for Synthesizer:\n" + JSON.stringify(finalJson, null, 2));
  return finalJson;
}


/**
 * A helper function that reads all relevant columns for a single row
 * and returns a structured data object that matches your final JSON schema.
 * @param {Sheet} sheet The sheet object to read from.
 * @param {number} row The row number to read.
 * @return {object} An object containing the data for that row.
 */
function readRowData(sheet, row) {
  const data = {};
  
  // This new mapping object is now the single source of truth.
  // It maps the Spreadsheet Column Name directly to the desired JSON key.
  const columnToJsonKeyMap = {
    'Company Summary': 'companySummary',
    'Business Model': 'businessModel',
    'Key Differentiators': 'keyDifferentiators',
    'Recent Highlights and News': 'recentHighlightsAndNews',
    'Strategic Focus': 'strategicFocus',
    'Risks': 'risks',
    'Founder Commentary': 'founderCommentary',
    'Fund Commentary': 'fundCommentary',
    'Current Valuation': 'currentValuation',
    'ARR (Annual Recurring Revenue)': 'arr',
    'Gross Profit': 'grossProfit',
    'Runway': 'cashRunway',
    'Employee Count': 'employeeCount',
    'Customer Count': 'customerCount',
    'Retention (Customer or Revenue)': 'retention',
    'Total Capital Raised': 'totalCapitalRaised',
    'Initial Investment': 'initialInvestment',
    'Lead Investor': 'leadInvestor',
    'Last Round: Date': 'lastRoundDate',
    'Last Round: Type': 'lastRoundType',
    'Last Round: Amount': 'lastRoundAmount',
    'Currently Raising?': 'isCurrentlyRaising',
    'Current Raise: Target': 'targetAmount',
    'Current Raise: Committed': 'committedAmount',
    'Current Raise: Committed Percent': 'committedPercent',
    'Current Raise: Pre Money': 'preMoneyValuation',
    'Current Raise: Post Money': 'postMoneyValuation',
    'Current Raise: Terms': 'terms'
  };

  // We iterate through our new map to build the data object
  for (const columnName in columnToJsonKeyMap) {
    const jsonKey = columnToJsonKeyMap[columnName];
    
    // Check if the main COLUMN_MAPPINGS has this column defined
    if (COLUMN_MAPPINGS[columnName]) {
      const columnLetter = COLUMN_MAPPINGS[columnName];
      const cellValue = sheet.getRange(columnLetter + row).getValue();
      Logger.log(columnLetter+row);
      Logger.log(cellValue);
      // Only add the key to our object if the cell actually contains data
      if (cellValue !== "") {
        // Here, we assume the cell content is already a string that might need parsing
        // This part can be enhanced if you know some cells are JSON strings
        data[jsonKey] = cellValue;
      }
    }
  }

  return data;
}