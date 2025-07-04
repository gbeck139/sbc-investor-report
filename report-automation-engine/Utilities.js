function getSingleCompany(sheet, targetCompanyName) {
  // --- Step 1: Get the 'Name' column from our single source of truth ---
  const nameColumnLetter = UNIFIED_MAPPINGS['Name'].column;
  if (!nameColumnLetter) {
    Logger.log('Error: "Name" column not defined in UNIFIED_MAPPINGS.');
    return null;
  }
  const nameColumnRange = sheet.getRange(`${nameColumnLetter}:${nameColumnLetter}`);

  // --- Step 2: Use TextFinder for a highly optimized search ---
  const textFinder = nameColumnRange.createTextFinder(targetCompanyName.trim());
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
    companyData.sheetRow = companyRow;
    return companyData; // Returns the full, structured company object
  } else {
    Logger.log(`Company "${targetCompanyName}" not found in the sheet.`);
    return null; // Company not found
  }
}

// IN DEV
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

function fillCompany(company, sheet) {
  const companyName = company.name;
  const companyWebsite = company.website;
  const currentRow = company.sheetRow+(GEMINI_ROW-HUBSPOT_ROW);
  Logger.log(currentRow);

  // TODO create API call method for formatter (no grounding, different mdo)
  Logger.log("Collecting general company data...");
  const extractedText1 = callGeminiAPI("gemini-2.5-pro", getSearchCompanyInfoPrompt(companyName, companyWebsite), true);
  const geminiJSON1 = callGeminiAPI("gemini-2.0-flash", getFormatCompanyInfoPrompt(extractedText1), false);

  Logger.log("Collecting company key metrics...");
  const extractedText2 = callGeminiAPI("gemini-2.5-pro", getSearchCompanyMetricsPrompt(companyName, companyWebsite), true);
  const geminiJSON2 = callGeminiAPI("gemini-2.0-flash", getFormatCompanyMetricsPrompt(extractedText2), false);

  Logger.log("Collecting company funding info...");
  const extractedText3 = callGeminiAPI("gemini-2.5-pro", getSearchCompanyFundingPrompt(companyName, companyWebsite), true);
  const geminiJSON3 = callGeminiAPI("gemini-2.0-flash", getFormatCompanyFundingPrompt(extractedText3), false);

  Logger.log('Finished search');

  if (geminiJSON1) {
    try {
      Logger.log("Parsing data...");
      const parsedData1 = JSON.parse(geminiJSON1); // Attempt to parse the JSON string
      const parsedData2 = JSON.parse(geminiJSON2);
      const parsedData3 = JSON.parse(geminiJSON3);
      Logger.log("Storing results...");
      parseAndWriteGeminiOutput(sheet, parsedData1, currentRow); // Pass the parsed object
      parseAndWriteGeminiOutput(sheet, parsedData2, currentRow);
      parseAndWriteGeminiOutput(sheet, parsedData3, currentRow);
    } catch (e) {
      Logger.log(`ERROR: Could not parse Gemini output for ${companyName}. Error: ${e.message}`);
      // Mark cell in sheet as "JSON Parse Error"
      const errorColumn = UNIFIED_MAPPINGS['Company Summary']; // Use Company Summary for errors
      if (errorColumn) {
        sheet.getRange(errorColumn + currentRow).setValue('JSON_PARSE_ERROR');
      }
    }
  } else {
    Logger.log(`No valid Gemini output for ${companyName}. Skipping row ${currentRow}.`);
    // Mark cell in sheet as "Gemini Error"
    const errorColumn = UNIFIED_MAPPINGS['Company Summary']; // Use Company Summary for errors
    if (errorColumn) {
      sheet.getRange(errorColumn + currentRow).setValue('GEMINI_SEARCH_ERROR');
    }
  }

  Utilities.sleep(1000); // Be mindful of API rate limits
}

// IN DEV
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

function readRowData(sheet, rowNumber) {
  if (!rowNumber) return {}; // Return empty object if row number is invalid

  // --- Efficiency: Read the entire row's data in one API call ---
  const range = sheet.getRange("A" + rowNumber + ":" + finalColumnLetters + rowNumber);
  const rowValues = range.getValues()[0]; // getValues() returns a 2D array, get the first row

  const jsonObject = {};
  for (const fieldName in UNIFIED_MAPPINGS) {
    const mappingInfo = UNIFIED_MAPPINGS[fieldName];
    const column = mappingInfo.column; // e.g., 'A', 'B', 'C'
    const jsonKey = mappingInfo.jsonKey; // e.g., 'name', 'source', 'sector'

    if (column && jsonKey) {
      // Convert column letter ('A') to array index (0)
      const columnIndex = columnLetterToIndex(column);
      
      // Assign the value from the spreadsheet to our clean jsonKey
      jsonObject[jsonKey] = rowValues[columnIndex];
    }
  }
  return jsonObject;
}

function parseAndWriteGeminiOutput(sheet, parsedData, row, company="", final) {
  const dataRange = sheet.getRange(`A${row}:${finalColumnLetters}${row}`); // Adjust range if needed

  // const numColumns = dataRange.getNumColumns();
  // const outputRow = new Array(numColumns); // Fills the array with blank strings
  const outputRow = dataRange.getValues()[0];


  // Iterate through the master mapping to decide what to do.
  for (const fieldName in UNIFIED_MAPPINGS) {
    const mappingInfo = UNIFIED_MAPPINGS[fieldName];
    const jsonKey = mappingInfo.jsonKey;
    const column = mappingInfo.column;

    if (jsonKey in parsedData && column) {
      const rawValue = parsedData[jsonKey];
      
      const formattedValue = formatCellValue(rawValue);
      
      const columnIndex = columnLetterToIndex(column);

      // Place the fully formatted string into our output array.
      outputRow[columnIndex] = formattedValue;
    }
  }

  // Write the entire updated row back to the sheet in ONE single API call.
  dataRange.setValues([outputRow]);
  
  // You might want to set wrap strategy for the whole row at once.
  dataRange.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  Logger.log(`Successfully wrote and formatted bulk data to row ${row}.`);
}

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

function columnLetterToIndex(columnLetter) {
  let column = 0;
  let length = columnLetter.length;
  for (let i = 0; i < length; i++) {
    column += (columnLetter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column - 1;
}

function normalizeFields(record) {
  // for (const field of CORE_FIELDS) {
  //   if (!record[field] || record[field] === '') {
  //     record[field] = 'Undisclosed';
  //   }
  // }

  // Clean boolean logic for "Currently Raising?"
  const raisingVal = (record.isCurrentlyRaising.description || '').toString().toLowerCase();
  record.isCurrentlyRaising.description = (raisingVal === 'yes') ? true :
                                 (raisingVal === 'no') ? false : 'Undisclosed';

  return record;
}