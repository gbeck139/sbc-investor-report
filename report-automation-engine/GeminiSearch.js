/**
 * This script handles performing initial public data searches using the Gemini API
 * and populating the 'Gemini with Grounding Research (Public)' columns in the Master Sheet.
 * It includes batch processing and progress saving to handle Apps Script execution limits.
 */


/**
 * Main function to perform Gemini searches and populate the sheet incrementally.
 * This should be called *after* your getCompaniesFromHs() has run and populated the sheet
 * with basic HubSpot data.
 */
function performGeminiSearchAndPopulateSheet() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const workingSheet = spreadsheet.getSheetByName(MASTER_SHEET);

  if (!workingSheet) {
    ui.alert('Error', `Sheet named '${MASTER_SHEET}' not found. Please ensure it exists.`, ui.ButtonSet.OK);
    return;
  }

  const startTime = new Date().getTime(); // Record start time

  try {
    // 1. Get companies from the Sheet itself
    const allCompanies = getCompaniesFromSheet(workingSheet);

    if (allCompanies.length === 0) {
      ui.alert('No Companies Found', 'No companies with names in Column A were found in the sheet.', ui.ButtonSet.OK);
      return;
    }

    let startIndex = parseInt(scriptProperties.getProperty('lastProcessedCompanyIndex') || '-1') + 1;
    let companiesProcessedInThisRun = 0;

    Logger.log(`Starting Gemini search. Total companies: ${allCompanies.length}. Resuming from index: ${startIndex}.`);

    for (let i = startIndex; i < allCompanies.length; i++) {
      // Check if near time limit
      const currentTime = new Date().getTime();
      if (currentTime - startTime > MAX_EXECUTION_TIME_MS) { // MAX_EXECUTION_TIME_MS from Constants.gs
        Logger.log(`Execution time limit approaching (${MAX_EXECUTION_TIME_MS / 1000}s). Stopping and saving progress.`);
        ui.alert('Progress Saved', `Processed ${companiesProcessedInThisRun} companies.`, ui.ButtonSet.OK);
        return; // Exit the function to avoid timeout
      }

      // Check batch size limit
      if (companiesProcessedInThisRun >= BATCH_SIZE) { // BATCH_SIZE from Constants.gs
        Logger.log(`Batch size limit (${BATCH_SIZE}) reached. Stopping and saving progress.`);
        ui.alert('Batch Complete', `Processed ${companiesProcessedInThisRun} companies.`, ui.ButtonSet.OK);
        return; // Exit the function to allow next batch to run
      }

      const company = allCompanies[i];
      const companyName = company.name;
      const companyWebsite = company.website;
      const currentRow = company.sheetRow;

      Logger.log(`Processing company ${i + 1}/${allCompanies.length}: ${companyName} (${companyWebsite}) at row ${currentRow}`);

      try {
        const geminiSearchPrompt = buildGeminiSearchPrompt(companyName, companyWebsite);
        const geminiOutput = callGeminiAPI(geminiSearchPrompt);
        
        if (geminiOutput) {
          parseAndWriteGeminiSearchOutput(workingSheet, geminiOutput, currentRow);
          companiesProcessedInThisRun++;
          scriptProperties.setProperty('lastProcessedCompanyIndex', i.toString()); // Save progress after each successful company
        } else {
          Logger.log(`No valid Gemini output for ${companyName}. Skipping row ${currentRow}.`);
          // Mark cell in sheet as "Gemini Error"
          // Assuming 'Company Summary' column (E) is always present for error marking.
          const errorColumn = GEMINI_SEARCH_OUTPUT_MAPPINGS['Company Summary'];
          if (errorColumn) {
              workingSheet.getRange(errorColumn + currentRow).setValue('GEMINI_SEARCH_ERROR');
          }
        }
        
        Utilities.sleep(1000); // 1 second delay between API calls

      } catch (innerError) {
        Logger.log(`Error processing ${companyName} (index ${i}): ${innerError.message}. Skipping to next company.`);
        const errorColumn = GEMINI_SEARCH_OUTPUT_MAPPINGS['Company Summary'];
        if (errorColumn) {
            workingSheet.getRange(errorColumn + currentRow).setValue(`ERROR: ${innerError.message.substring(0, Math.min(innerError.message.length, 50))}...`);
        }
        scriptProperties.setProperty('lastProcessedCompanyIndex', i.toString()); // Save progress even on error for this company
      }
    }

    // If loop completes, all companies processed
    scriptProperties.deleteProperty('lastProcessedCompanyIndex'); // Clear progress property
    ui.alert('Success', `Completed Gemini public data search for all ${allCompanies.length} companies.`, ui.ButtonSet.OK);

  } catch (e) {
    Logger.log('Critical Error in performGeminiSearchAndPopulateSheet: ' + e.toString());
    ui.alert('Error', 'A critical error occurred. Check logs for details: ' + e.toString(), ui.ButtonSet.OK);
  }
}


/**
 * Retrieves company name and website directly from the Google Sheet.
 * This assumes company name is in COLUMN_MAPPINGS['name'] and website in COLUMN_MAPPINGS['website'].
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The active Google Sheet object.
 * @returns {Array<Object>} An array of company objects {name: string, website: string, sheetRow: number}.
 */
function getCompaniesFromSheet(sheet) {
  const companies = [];
  
  const nameColumnLetter = COLUMN_MAPPINGS['Name'];
  const websiteColumnLetter = COLUMN_MAPPINGS['Website'];

  // Determine the numerical index for the website column within the read range (e.g., D is 3 if A is 0)
  const websiteColumnIndexInReadRange = websiteColumnLetter.charCodeAt(0) - nameColumnLetter.charCodeAt(0);

  // Determine the last row with content in the name column
  const lastRow = sheet.getLastRow();
  
  // Read a range that covers all potential company rows from the name column to the website column
  const rangeToRead = sheet.getRange(`${nameColumnLetter}${GEMINI_ROW}:${websiteColumnLetter}${lastRow}`);
  const values = rangeToRead.getValues(); // Get all values in the specified A:D range

  for (let i = 0; i < values.length; i++) {
    const currentRowInSheet = GEMINI_ROW + i; // The actual row number in the sheet (e.g., 3, 4, 5, 6...)
    
    // Check if it's a "company header row" based on ROW_SPACING
    // For your setup (ROW=3, ROW_SPACING=3), this is true for rows 3, 6, 9, etc.
    if ((currentRowInSheet - GEMINI_ROW) % ROW_SPACING === 0) {
      const name = values[i][0] ? String(values[i][0]).trim() : ''; // Data from the first column in the read range (A)
      const website = values[i][websiteColumnIndexInReadRange] ? String(values[i][websiteColumnIndexInReadRange]).trim() : ''; // Data from the website column in the read range (D)
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


/**
 * Constructs the prompt for the initial Gemini search (your original Prompt 1).
 * @param {string} companyName
 * @param {string} companyWebsite
 * @returns {string} The full prompt string.
 */
function buildGeminiSearchPrompt(companyName, companyWebsite) {
  // This is your FIRST prompt, updated with dynamic company info
  return `Conduct in-depth market research on ${companyName} (${companyWebsite}), limiting your search to only the categories specified below. Prioritize information found directly on the company's website, but consult reputable alternative sources such as Crunchbase, Pitchbook, LinkedIn, established news outlets (e.g., Wall Street Journal, Bloomberg, TechCrunch), and academic databases. If a particular data point cannot be definitively ascertained from any reliable source, explicitly state "Unavailable" for that item; do not generate or fabricate information. Present the findings in a a table format with exactly three columns: "Category", "Description", and "Source". Ensure "Description" is concise (2-3 sentences max) and "Source" includes direct citations. List all sources used at the end of the table.

  The table should include the following rows and information:

  | Category | Description | Example Statement & Citation |
  | :--- | :--- | :--- |
  | **Company Summary** | A 2-3 sentence overview of the company's mission, core product or service, and the primary problem it solves for its target market. | "[Startup Name] aims to revolutionize [industry] by providing [product/service] that addresses the challenge of [problem]. Their mission is to [company mission statement]. (Source: [startupwebsite/About Us])" |
  | **Business Model** | Identify the company's primary business model (e.g., B2B SaaS, Marketplace, Direct-to-Consumer, Freemium, Subscription, etc.). | "[Startup Name] operates on a B2B SaaS model, providing [product/service] to enterprise clients. (Source: Crunchbase)" |
  | **Key Differentiators** | Describe how the company uniquely provides value and distinguishes itself from competitors in the market. Focus on aspects such as proprietary technology, speed to market, strategic partnerships, or unique features. | "[Startup Name]'s key differentiator is its proprietary AI-powered [technology] which enables [benefit]. This allows them to [advantage over competitors]. (Source: [startupwebsite/Product Page])" OR "[Startup Name] has established a strategic partnership with [Partner Company], providing them with access to [benefit]. (Source: [News Outlet Name])" |
  | **Recent Highlights and News** | Summarize recent significant milestones, product updates, partnerships, or news coverage related to the company. | "[Startup Name] recently launched its new [product/feature] on [date], which [benefit]. (Source: [startupwebsite/Blog])" OR "[Startup Name] announced a partnership with [Partner Company] to [collaboration details] on [date]. (Source: [News Outlet Name])" |
  | **Strategic Focus** | Identify the company's current strategic priorities, such as fundraising goals, upcoming product launches, key technology milestones, or market expansion plans. | "[Startup Name]'s strategic focus is on securing Series A funding to expand its sales and marketing efforts. (Source: Pitchbook)" OR "[Startup Name] plans to launch its mobile app in Q4 2024. (Source: [startupwebsite/Roadmap])" |
  | **Risks** | Identify potential risks and challenges facing the company, such as slow sales growth, limited cash runway, difficulties in scaling the team, or competitive pressures. | "[Startup Name]'s primary risk is its limited cash runway, which may require them to raise additional funding within the next 6-12 months. (Source: Analysis based on Crunchbase data)" OR "[Startup Name] faces the risk of increased competition from established players in the [industry] market. (Source: Market Analysis Report)" |
  | **Founder Commentary** | Include a direct quote or paraphrased statement from the founder(s) regarding the company's vision, goals, or strategy for success. | "According to [Founder Name], '[Quote about company vision or goals]'. (Source: [News Outlet Name/Interview])" |
  | **Fund Commentary** | Include a direct quote or paraphrased statement from the investment fund regarding the company's vision, goals, or strategy for success. | "According to [Fund Name], '[Quote about company vision or goals]'. (Source: [News Outlet Name/Interview])" |
  | **Current Valuation** | State the company's most recent post-money valuation and the date it was determined. If a range is provided, include the range. | "Example: "The company was valued at $[Amount] as of [Date] following its Series A funding round. (Source: Pitchbook)" |
  | **ARR (Annual Recurring Revenue)** | Provide the company's most recently reported Annual Recurring Revenue. Specify the reporting period (e.g., fiscal year, quarter) and currency if available. | "Example: "The company's ARR for fiscal year [Year] was $[Amount] million AUD. (Source: Crunchbase)" |
  | **Gross Profit** | State the company's gross profit, either as a value or a percentage. Specify the reporting period and currency if available. | "Example: "For Q4 [Year], the company reported a gross profit of $[Amount] AUD, representing a gross margin of [Percentage]%. (Source: [News Outlet Name])" |
  | **Runway** | Provide the estimated number of months the company can operate with its current cash reserves (cash runway), based on the most recently available net burn rate. If the runway is presented as a range, include the range. | "Example: "Based on its current burn rate, the company has an estimated cash runway of [Number] months. (Source: Analysis based on Pitchbook data)" |
  | **Employee Count** | State the current number of employees at the company. Specify if the number is approximate (e.g., based on LinkedIn data). | "Example: "As of [Date], the company has [Number] employees (approximate, based on LinkedIn). (Source: LinkedIn)" |
  | **Customer Count** | State the total number of customers the company currently serves. Specify if the number is a minimum (e.g., "over [Number]"). | "Example: "The company currently serves over [Number] customers. (Source: [Company Website/About Us])" |
  | **Retention (Customer or Revenue)** | Provide the company's customer or revenue retention rate, specifying which it is (e.g., net revenue retention, gross customer retention), the period, and the currency if applicable. | "Example: "The company reported a net revenue retention rate of [Percentage]% for the 2024 fiscal year. (Source: [Company Website/Blog])" |
  | **Total Capital Raised** | State the total funding amount the company has raised to date across all funding rounds. | "The company has raised a total of $[Amount]. (Source: Crunchbase)" |
  | **Initial Investment** | Provide the amount and type of the company's first institutional or pre-seed/seed funding round. | "The company's initial investment was a $[Amount] Pre-Seed round. (Source: Pitchbook)" |
  | **Lead Investor** | Identify the lead investor(s) from the most recent or significant funding round. | "[Investor Name] was the lead investor in the Series A round. (Source: TechCrunch)" |
  | **Last Round: Date** | State the date when the last funding round was officially closed. | "The last funding round closed on [Date]. (Source: Crunchbase)" |
  | **Last Round: Type** | Specify the type of the most recent funding round (e.g., Seed, Series A, Bridge). | "The last funding round was a Series A. (Source: Pitchbook)" |
  | **Last Round: Amount** | Provide the total amount raised in the company's most recent funding round. | "The company raised $[Amount] in its last round. (Source: [News Outlet Name])" |
  | **Currently Raising?** | Determine if the company is actively in the process of raising a new funding round. | "Yes, The company is currently raising a [Round Type] round. (Source: [News Outlet Name])" OR "No, there is no public information indicating an active fundraising round. (Source: Analysis of public data)" |
  | **Current Raise: Pre Money** | State the pre-money valuation for the current fundraising round. | "The pre-money valuation for the current round is set at $[Amount] (Source: Pitchbook)" OR "Not Applicable" |
  | **Current Raise: Post Money** | State the target post-money valuation for the current round. | "The target post-money valuation is $[Amount]. (Source: [News Outlet Name])" OR "Not Applicable" |
  | **Current Raise: Target** | State the total amount the company aims to raise in the current round. | "The target for the current raise is [Amount].(Source: TechCrunch)" OR "NotApplicable" |
  | **Current Raise: Committed** |Provide the amount of capital that has already been committed by investors for the current round. |"[Amount] has been committed to the current round so far. (Source: Founder Interview)" OR "Not Applicable" |
  | **Current Raise: Committed Percent** | Calculate and state the percentage of the target amount that has been committed. | "[Percentage]% of the target round has been committed. (Source: Calculation based on Target and Committed amounts)" OR "Not Applicable" |
  | **Current Raise: Terms (SAFE, etc.)**| Describe the key terms of the current raise (e.g., SAFE, convertible note, priced round, valuation cap, discount). | "The round is being raised on a SAFE with a $[Amount] valuation cap and a [Percentage]% discount. (Source: Pitchbook)" OR "Not Applicable" |

  Sources: (List all sources used, including URLs where applicable)
  `;
}