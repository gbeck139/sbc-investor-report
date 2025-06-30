function getSingleCompany_Refactored(sheet, targetCompanyName) {
  // --- Step 1: Get the 'Name' column from our single source of truth ---
  const nameColumnLetter = UNIFIED_MAPPINGS['Name'].column;
  if (!nameColumnLetter) {
    Logger.log('Error: "Name" column not defined in UNIFIED_MAPPINGS.');
    return null;
  }
  const nameColumnRange = sheet.getRange(`${nameColumnLetter}:${nameColumnLetter}`);

  // --- Step 2: Use TextFinder for a highly optimized search ---
  const textFinder = nameColumnRange.createTextFinder(targetCompanyName);
  textFinder.matchCase(false); // Make the search case-insensitive
  textFinder.matchEntireCell(true); // Ensures "Innovate" doesn't match "Innovate Inc."
  
  const foundCell = textFinder.findNext();

  // --- Step 3: Process the result ---
  if (foundCell) {
    const companyRow = foundCell.getRow();
    Logger.log(`Found company "${targetCompanyName}" at row ${companyRow}.`);
    
    // PERFECT REUSE: Now that we have the row, use our existing helper
    // to read all the data for that single company.
    const companyData = readRowData(sheet, companyRow);
    return companyData; // Returns the full, structured company object
  } else {
    Logger.log(`Company "${targetCompanyName}" not found in the sheet.`);
    return null; // Company not found
  }
}

function getAllCompanies(sheet) {
  Logger.log(`Getting all companies with refactored function.`);
  
  // --- Step 1: Define required data and get columns from UNIFIED_MAPPINGS ---
  const requiredFields = {
    name: UNIFIED_MAPPINGS['Name'].column,         // e.g., 'A'
    website: UNIFIED_MAPPINGS['Website'].column,   // e.g., 'D'
    sector: UNIFIED_MAPPINGS['Sector'].column      // e.g., 'C'
  };

  // --- Step 2: Dynamically determine the full range to read ---
  // This ensures we read all necessary columns in one go, regardless of their order.
  const columnChars = Object.values(requiredFields); // ['A', 'D', 'C']
  const startColChar = String.fromCharCode(Math.min(...columnChars.map(c => c.charCodeAt(0)))); // 'A'
  const endColChar = String.fromCharCode(Math.max(...columnChars.map(c => c.charCodeAt(0))));   // 'D'
  
  const lastRow = sheet.getLastRow();
  const rangeToRead = sheet.getRange(`${startColChar}${COMPANY_UPDATE_ROW}:${endColChar}${lastRow}`);
  const values = rangeToRead.getValues();
  Logger.log(`Dynamically determined range to read: ${startColChar}:${endColChar}`);

  // --- Step 3: Create a map from jsonKey to its index within our read data ---
  // This replaces the brittle, manual index calculations.
  const indexMap = {
    name: requiredFields.name.charCodeAt(0) - startColChar.charCodeAt(0),       // e.g., 'A'-'A' = 0
    website: requiredFields.website.charCodeAt(0) - startColChar.charCodeAt(0), // e.g., 'D'-'A' = 3
    sector: requiredFields.sector.charCodeAt(0) - startColChar.charCodeAt(0)   // e.g., 'C'-'A' = 2
  };
  
  const companies = [];
  for (let i = 0; i < values.length; i++) {
    const currentRowInSheet = i + COMPANY_UPDATE_ROW;

    // --- Step 4: Keep the core business logic, but use the robust indexMap ---
    // This logic is unchanged because it's correct.
    if (currentRowInSheet % ROW_SPACING === 0) {
      const rowData = values[i];
      
      // Pull data using our reliable index map. No more hardcoded `[0]`.
      const name = rowData[indexMap.name] ? String(rowData[indexMap.name]).trim() : '';
      const website = rowData[indexMap.website] ? String(rowData[indexMap.website]).trim() : '';
      const sector = rowData[indexMap.sector] ? String(rowData[indexMap.sector]).trim() : '';
      
      if (name !== '') {
        companies.push({ name, website, sector, sheetRow: currentRowInSheet });
      }
    }
  }

  Logger.log(`Found ${companies.length} companies to process from the sheet.`);
  return companies;
}

function fillAllCompanies() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const workingSheet = spreadsheet.getSheetByName(MASTER_SHEET);

  if (!workingSheet) {
    ui.alert('Error', `Sheet named '${MASTER_SHEET}' not found. Please ensure it exists.`, ui.ButtonSet.OK);
    return;
  }

  try {
    // Get companies from the Sheet itself
    const allCompanies = getAllCompanies(workingSheet);

    if (allCompanies.length === 0) {
      ui.alert('No Companies Found', 'No companies with names in Column A were found in the sheet.', ui.ButtonSet.OK);
      return;
    }

    for (let i = 0; i < allCompanies.length; i++){
      try {
        fillCompany(allCompanies[i], workingSheet);
      } catch (innerError) {
        Logger.log(`Error processing ${companyName} (index ${i}): ${innerError.message}. Skipping to next company.`);
        const errorColumn = COLUMN_MAPPINGS['Company Website'];
        if (errorColumn) {
            workingSheet.getRange(errorColumn + currentRow).setValue(`ERROR: ${innerError.message.substring(0, Math.min(innerError.message.length, 50))}...`);
        }
      }
    }

    ui.alert('Success', `Completed Gemini public data search for all ${allCompanies.length} companies.`, ui.ButtonSet.OK);

  } catch (e) {
    Logger.log('Critical Error in performGeminiSearchAndPopulateSheet: ' + e.toString());
    ui.alert('Error', 'A critical error occurred. Check logs for details: ' + e.toString(), ui.ButtonSet.OK);
  }
}

function fillCompany(company, sheet) {
  const companyName = company.name;
  const companyWebsite = company.website;
  const currentRow = company.sheetRow+(GEMINI_ROW-ROW);

  Logger.log(`Processing company ${companyName} (${companyWebsite}) at row ${currentRow}`);

  // TODO create API call method for formatter (no grounding, different mdo)
  const extractedText1 = callGeminiAPI("gemini-2.5-pro", getSearchCompanyInfoPrompt(companyName, companyWebsite), true);
  const geminiJSON1 = callGeminiAPI("gemini-2.0-flash", getFormatCompanyInfoPrompt(extractedText1), false);
  const extractedText2 = callGeminiAPI("gemini-2.5-pro", getSearchCompanyMetricsPrompt(companyName, companyWebsite), true);
  const geminiJSON2 = callGeminiAPI("gemini-2.0-flash", getFormatCompanyMetricsPrompt(extractedText2), false);
  const extractedText3 = callGeminiAPI("gemini-2.5-pro", getSearchCompanyFundingPrompt(companyName, companyWebsite), true);
  const geminiJSON3 = callGeminiAPI("gemini-2.0-flash", getFormatCompanyFundingPrompt(extractedText3), false);
  Logger.log('Finished retrieving gemini');

  if (geminiJSON1) {
    Logger.log("Raw Gemini Output (string): " + geminiJSON1 + geminiJSON2 + geminiJSON3); // Log the raw string to debug
    try {
      const parsedData1 = JSON.parse(geminiJSON1); // Attempt to parse the JSON string
      const parsedData2 = JSON.parse(geminiJSON2);
      const parsedData3 = JSON.parse(geminiJSON3);
      Logger.log("Parsed Gemini Output (object): " + geminiJSON1+geminiJSON2+geminiJSON3); // Log parsed object for debugging
      parseAndWriteGeminiSearchOutput(sheet, parsedData1, currentRow); // Pass the parsed object
      parseAndWriteGeminiSearchOutput(sheet, parsedData2, currentRow);
      parseAndWriteGeminiSearchOutput(sheet, parsedData3, currentRow);
    } catch (e) {
      Logger.log(`ERROR: Could not parse Gemini output for ${companyName}. Error: ${e.message}`);
      // Mark cell in sheet as "JSON Parse Error"
      const errorColumn = COLUMN_MAPPINGS['Company Summary']; // Use Company Summary for errors
      if (errorColumn) {
        sheet.getRange(errorColumn + currentRow).setValue('JSON_PARSE_ERROR');
      }
    }
  } else {
    Logger.log(`No valid Gemini output for ${companyName}. Skipping row ${currentRow}.`);
    // Mark cell in sheet as "Gemini Error"
    const errorColumn = COLUMN_MAPPINGS['Company Summary']; // Use Company Summary for errors
    if (errorColumn) {
      sheet.getRange(errorColumn + currentRow).setValue('GEMINI_SEARCH_ERROR');
    }
  }

  Utilities.sleep(1000); // Be mindful of API rate limits
}

/**
 * Formats a value from the parsed data into the final string for a spreadsheet cell.
 * Handles objects with sources, arrays of objects, and simple values.
 *
 * @param {*} value - The value from the parsed JSON data.
 * @returns {string} The formatted string ready to be written to a cell.
 */
function formatCellValue(value) {
  const NOT_FOUND = "Not found"; // Use a constant for the default value.

  // Case 1: The value is null or undefined from the start.
  if (value === null || value === undefined) {
    return NOT_FOUND;
  }

  // Case 2: The value is a single object with 'description' and optional 'sources'.
  if (typeof value === 'object' && !Array.isArray(value) && value.hasOwnProperty('description')) {
    let description = value.description || NOT_FOUND;
    let sources = value.sources;
    
    let finalCellContent = description;

    if (Array.isArray(sources) && sources.length > 0) {
      finalCellContent += `\n\nSources:\n${sources.join("\n")}`;
    }
    return finalCellContent;
  }
  
  // Case 3: The value is an ARRAY of objects (like for 'Key Differentiators' or 'Risks').
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return NOT_FOUND; // Return "Not found" for empty arrays.
    }
    // Use .map() to format each object in the array into its own string block.
    const itemStrings = value.map(item => {
      // Recursively call this same function to format each item in the array.
      // This elegantly handles arrays of objects, or even simple arrays of strings.
      return formatCellValue(item); 
    });
    // Join each formatted block with a double newline for readability.
    return itemStrings.join('\n\n');
  } 
  
  // Case 4: It's a simple value (string, number, boolean).
  return value;
}

function writeToCell(sheet, column, row, value) {
  // Basic handling for array/object data - convert to a readable string
  if (typeof value === 'object' && value !== null) {
    value = JSON.stringify(value, null, 2);
  }
  sheet.getRange(column + row).setValue(value);
}





