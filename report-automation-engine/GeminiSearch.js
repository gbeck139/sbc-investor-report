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

  // Determine the numerical index for the website column within the read range (e.g., D is 3 if A is 0)
  const websiteColumnIndexInReadRange = websiteColumnLetter.charCodeAt(0) - nameColumnLetter.charCodeAt(0);

  // Determine the last row with content in the name column
  const lastRow = sheet.getLastRow();
  
  // Read a range that covers all potential company rows from the name column to the website column
  const rangeToRead = sheet.getRange(`${nameColumnLetter}${2}:${websiteColumnLetter}${lastRow}`);
  const values = rangeToRead.getValues(); // Get all values in the specified A:D range
  for (let i = 0; i < values.length; i++) {
    const currentRowInSheet = GEMINI_ROW + i; // The actual row number in the sheet (e.g., 3, 4, 5, 6...)
    
    // Check if it's a "company header row" based on ROW_SPACING
    // For your setup (ROW=3, ROW_SPACING=3), this is true for rows 3, 6, 9, etc.
    if ((currentRowInSheet - GEMINI_ROW) % ROW_SPACING === 0) {
      const name = values[i][0] ? String(values[i][0]).trim() : ''; // Data from the first column in the read range (A)
      const website = values[i][websiteColumnIndexInReadRange] ? String(values[i][websiteColumnIndexInReadRange]).trim() : ''; // Data from the website column in the read range (D)
      Logger.log(`${values[i]}`);
      // Only add to list if company name exists
      if (name !== '') {
        companies.push({
          name: name,
          website: website,
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
  const currentRow = company.sheetRow;

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

function parseAndWriteGeminiSearchOutput(sheet, parsedData, row) {

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

function writeToCell(sheet, columnName, row, value) {
  const columnLetter = COLUMN_MAPPINGS[columnName];
  if (!columnLetter) {
    Logger.log(`WARNING: Column mapping not found for "${columnName}"`);
    return;
  }

  let finalCellContent = "Not found"; // Default value
  
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && value.hasOwnProperty('description')) {
    let description = value.description || "Not found";
    let sources = value.sources;
    
    finalCellContent = description;

    if (Array.isArray(sources) && sources.length > 0) {
      finalCellContent += `\n\nSources:\n${sources.join("\n")}`;
    }
  }
  // Case 2: The value is an ARRAY of objects, like keyDifferentiators or risks
  else if (Array.isArray(value)) {
    if (value.length > 0) {
      // Use .map() to format each object in the array into its own string block
      const itemStrings = value.map(item => {
        // Check if the item in the array is a valid object with a description
        if (typeof item === 'object' && item !== null && item.description) {          
          let text = item.description;

          if (item.sources && Array.isArray(item.sources) && item.sources.length > 0) {
            text += `\nSources:\n${item.sources.join("\n")}`;
          }
          return text;
        }
        return item.toString(); // Fallback for simple arrays, though not expected with this schema
      });
      // Join each formatted block with a double newline for readability
      finalCellContent = itemStrings.join('\n\n'); 
    }
  } else {
    // If it's not our special object, just use the value as is.
    // If the value is null or undefined, set it to "Not found".
    finalCellContent = value !== null && value !== undefined ? value : "Not found";
  }

  const cell = sheet.getRange(columnLetter + row);
  cell.setValue(finalCellContent);
  
  // // Automatically set the cell to wrap text, which is great for multi-line content.
  // cell.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
}





