function getSingleCompany(sheet, targetCompanyName) {
  // Get all companies using your existing, efficient function
  const allCompanies = getAllCompanies(sheet); 

  // Normalize the target name for case-insensitive comparison
  const normalizedTargetName = targetCompanyName.trim().toLowerCase();

  // Loop through the list to find the matching company
  for (const company of allCompanies) {
    if (company.name.toLowerCase() === normalizedTargetName) {
      Logger.log(`Found company "${company.name}" at row ${company.sheetRow}.`);
      return company; // Return the found company object
    }
  }

  Logger.log(`Company "${targetCompanyName}" not found in the sheet.`);
  return null; // Company not found
}

function getAllCompanies(sheet) {
  Logger.log(`Getting all companies`);
  const companies = [];
  const nameColumnLetter = COLUMN_MAPPINGS['Name'];
  const websiteColumnLetter = COLUMN_MAPPINGS['Website'];
  const sectorColumnLetter = COLUMN_MAPPINGS['Sector'];

  // Determine the numerical index for the website column within the read range (e.g., D is 3 if A is 0)
  const websiteColumnIndexInReadRange = websiteColumnLetter.charCodeAt(0) - nameColumnLetter.charCodeAt(0);
  const sectorColumnIndexInReadRange = sectorColumnLetter.charCodeAt(0) - nameColumnLetter.charCodeAt(0);

  // Determine the last row with content in the name column
  const lastRow = sheet.getLastRow();
  
  // Read a range that covers all potential company rows from the name column to the website column
  const rangeToRead = sheet.getRange(`${nameColumnLetter}${COMPANY_UPDATE_ROW}:${websiteColumnLetter}${lastRow}`);
  const values = rangeToRead.getValues(); // Get all values in the specified A:D range
  for (let i = 0; i < values.length; i++) {
    const currentRowInSheet = i+COMPANY_UPDATE_ROW; // The actual row number in the sheet (e.g., 3, 4, 5, 6...)
    
    // Check if it's a "company header row" based on ROW_SPACING
    // For your setup (ROW=3, ROW_SPACING=3), this is true for rows 3, 6, 9, etc.
    if (currentRowInSheet % ROW_SPACING === 0) {
      const name = values[i][0] ? String(values[i][0]).trim() : ''; // Data from the first column in the read range (A)
      const website = values[i][websiteColumnIndexInReadRange] ? String(values[i][websiteColumnIndexInReadRange]).trim() : ''; // Data from the website column in the read range (D)
      const sector = values[i][sectorColumnIndexInReadRange] ? String(values[i][sectorColumnIndexInReadRange]).trim() : '';
      Logger.log(`${values[i]}`);
      // Only add to list if company name exists
      if (name !== '') {
        companies.push({
          name: name,
          website: website,
          sector: sector,
          sheetRow: currentRowInSheet
        });
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





