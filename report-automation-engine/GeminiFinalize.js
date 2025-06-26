/**
 * Main function to prepare data for the final "Synthesizer" model.
 * It reads data from three specified rows and assembles it into a final JSON object.
 */
function formatDataForSynthesis(internalRow, hubspotRow, geminiRow) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  let sheetFinal = spreadsheet.getSheetByName(FINAL_SHEET);

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

function parseAndWriteGeminiFinalOutput(sheet, parsedData, row, company) {
  if (company.name) {
    writeToCell(sheet, 'Name', row, company.name);
  }

  if (company.website) {
    writeToCell(sheet, 'Website', row, company.website);
  }

  if (company.sector) {
    writeToCell(sheet, 'Sector', row, company.sector);
  }
  // --- Qualitative Data ---
  if (parsedData.companySummary) {
    writeToCell(sheet, 'Company Summary', row, parsedData.companySummary);
  }
  if (parsedData.businessModel) {
    // Assuming businessModel is a simple object like {description: "..."}
    writeToCell(sheet, 'Business Model', row, parsedData.businessModel);
  }
  if (parsedData.keyDifferentiators) {
    // Pass the entire array of objects directly to writeToCell
    writeToCell(sheet, 'Key Differentiators', row, parsedData.keyDifferentiators);
  }
  if (parsedData.recentHighlightsAndNews) {
    writeToCell(sheet, 'Recent Highlights and News', row, parsedData.recentHighlightsAndNews);
  }
  if (parsedData.strategicFocus) {
    writeToCell(sheet, 'Strategic Focus', row, parsedData.strategicFocus);
  }
  if (parsedData.risks) {
    writeToCell(sheet, 'Risks', row, parsedData.risks);
  }
  if (parsedData.founderCommentary) {
      writeToCell(sheet, 'Founder Commentary', row, parsedData.founderCommentary);
  }
   if (parsedData.fundCommentary) {
      writeToCell(sheet, 'Fund Commentary', row, parsedData.fundCommentary);
  }

  // --- Quantitative Data (Metrics) ---
   if (parsedData.currentValuation) {
      writeToCell(sheet, 'Current Valuation', row, parsedData.currentValuation);
  }
   if (parsedData.arr) {
      writeToCell(sheet, 'ARR (Annual Recurring Revenue)', row, parsedData.arr);
  }
   if (parsedData.grossProfit) {
      writeToCell(sheet, 'Gross Profit', row, parsedData.grossProfit);
  }
   if (parsedData.cashRunway) {
      writeToCell(sheet, 'Runway', row, parsedData.cashRunway);
  }
   if (parsedData.employeeCount) {
      writeToCell(sheet, 'Employee Count', row, parsedData.employeeCount);
  }
    if (parsedData.customerCount) {
      writeToCell(sheet, 'Customer Count', row, parsedData.customerCount);
  }
   if (parsedData.retention) {
      writeToCell(sheet, 'Retention (Customer or Revenue)', row, parsedData.retention);
  }
  
  if (parsedData.totalCapitalRaised) {
    writeToCell(sheet, 'Total Capital Raised', row, parsedData.totalCapitalRaised);
  }
  if (parsedData.initialInvestment) {
    writeToCell(sheet, 'Initial Investment', row, parsedData.initialInvestment);
  }

  //////////////////////////////

  if (parsedData.leadInvestor) {
    writeToCell(sheet, 'Lead Investor', row, parsedData.leadInvestor);
  }

  if (parsedData.lastRoundAmount) {
    writeToCell(sheet, 'Last Round: Amount', row, parsedData.lastRoundAmount);
  }

  if (parsedData.lastRoundDate) {
    writeToCell(sheet, 'Last Round: Date', row, parsedData.lastRoundDate);
  }

  if (parsedData.lastRoundType) {
    writeToCell(sheet, 'Last Round: Type', row, parsedData.lastRoundType);
  }
  
  if (parsedData.isCurrentlyRaising) {
    writeToCell(sheet, 'Currently Raising?', row, parsedData.isCurrentlyRaising);
  }
  if (parsedData.preMoneyValuation) {
    writeToCell(sheet, 'Current Raise: Pre Money', row, parsedData.preMoneyValuation);
  }
  if (parsedData.postMoneyValuation) {
    writeToCell(sheet, 'Current Raise: Post Money', row, parsedData.postMoneyValuation);
  }
  if (parsedData.targetAmount) {
    writeToCell(sheet, 'Current Raise: Target', row, parsedData.targetAmount);
  }
  if (parsedData.committedAmount) {
    writeToCell(sheet, 'Current Raise: Committed', row, parsedData.committedAmount);
  }
  if (parsedData.committedPercent) {
    writeToCell(sheet, 'Current Raise: Committed Percent', row, parsedData.committedPercent);
  }
  if (parsedData.terms) {
    writeToCell(sheet, 'Current Raise: Terms', row, parsedData.terms);
  }
}