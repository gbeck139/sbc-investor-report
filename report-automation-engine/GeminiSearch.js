/**
 * Automation to perform web searches using the Gemini API to gather public information about companies.
 * This script is used to collect data for the investor reports.
 * 
 * Grant Beck
 * SBC Australia
 * 12/06/2025
 */

/**
 * Performs a Gemini search for a list of companies, extracting and storing
 * qualitative, metric, and funding data in the Master Sheet.
 * @param {string[]} companies - An array of company names to search for.
 */
function geminiSearch(companies){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(MASTER_SHEET);
  for(const name of companies){
    Logger.log(`Starting Gemini Search for ${name}`);
    const company = getSingleCompany(sheet, name);
    fillCompany(company, sheet);
    Logger.log(`Finished Gemini Search for ${name}`);
  }
}

/**
 * Orchestrates the process of fetching, parsing, and writing data for a single company.
 * It calls the Gemini API three times for different categories of information,
 * then parses and writes the results to the specified sheet.
 * @param {Object} company - The company object containing its name, website, and sheet row.
 * @param {Sheet} sheet - The Google Sheet to write the data to.
 */
function fillCompany(company, sheet) {
  const companyName = company.name;
  const companyWebsite = company.website;
  const currentRow = company.sheetRow+(GEMINI_ROW-HUBSPOT_ROW);

  Logger.log("Collecting general company data...");
  const extractedText1 = callGeminiAPI("gemini-2.5-pro", getSearchCompanyInfoPrompt(companyName, companyWebsite), true);
  const geminiJSON1 = callGeminiAPI("gemini-2.0-flash", getFormatCompanyInfoPrompt(extractedText1), false);

  Logger.log("Collecting company key metrics...");
  const extractedText2 = callGeminiAPI("gemini-2.5-pro", getSearchCompanyMetricsPrompt(companyName, companyWebsite), true);
  const geminiJSON2 = callGeminiAPI("gemini-2.0-flash", getFormatCompanyMetricsPrompt(extractedText2), false);

  Logger.log("Collecting company funding info...");
  const extractedText3 = callGeminiAPI("gemini-2.5-pro", getSearchCompanyFundingPrompt(companyName, companyWebsite), true);
  const geminiJSON3 = callGeminiAPI("gemini-2.0-flash", getFormatCompanyFundingPrompt(extractedText3), false);

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

  Utilities.sleep(1000);
}

// Generic instructions for the Gemini search prompts.
const generalSearchInstructions = `
  -  Use your search capabilities to find information for each category with corresponding key listed below.
  -  For each piece of information you find, write it on a new line.
  -  Start each line with the key name (e.g. [companySummary]) to identify the category.
  -  If after a thorough search you cannot find information for a category, do not output it.
  -  Do not generate or fabricate information. Every statement must be grounded in a verifiable source.`

// Generic instructions for the Gemini formatting prompts.
const formatInstructions = `
  You are a data formatting expert. Your only task is to convert the provided "Extracted Text" into a perfectly valid, single-line, compact JSON object that strictly adheres to the provided "JSON Schema".

  **CRITICAL OUTPUT INSTRUCTIONS:**
  1.  The entire output must be **only** the raw JSON string.
  2. Do not, under any circumstances, wrap the JSON in markdown code fences like \`\`\`json ... \`\`\` or \`\`\` ... \`\`\`.

  For each line in the Extracted Text, find the \`[key]\` and use the corresponding information and source URL to populate the correct field in the JSON.`

/**
 * Generates a prompt for Gemini to search for general company information.
 * @param {string} companyName - The name of the company.
 * @param {string} companyWebsite - The website of the company.
 * @returns {string} The generated prompt.
 */
function getSearchCompanyInfoPrompt(companyName, companyWebsite){
  prompt = `
    You are a market analyst. Your task is to perform in-depth market research on ${companyName} (${companyWebsite}) and extract key qualitative information.

    **Instructions:**
    ${generalSearchInstructions}
    - If you find multiple distinct items for one category (like two different news articles), create a separate line for each.
    - **When extracting direct quotes or paraphrased statements for founderCommentary or fundCommentary, especially from conversational or transcribed sources (like video or audio), subtly edit the text to improve readability. Remove obvious filler words (like 'um', 'uh'), redundant repetitions, or minor grammatical slips that are clearly artifacts of speech or transcription *without changing the speaker's core message or intent*. The goal is a clear, accurate, and presentable representation of the statement. Always include the speaker's name and title (if available) immediately following the cleaned quote.**

    ---
    **Categories to Extract:**\n
  `
  Object.values(UNIFIED_MAPPINGS).forEach(value => {
    if (Object.hasOwn(value, 'searchGroup') && value.searchGroup == 'generalInfo'){
      prompt += `[${value.jsonKey}] ${value.promptInstructions}\n`
    }
  });

  return prompt
}

/**
 * Generates a prompt for Gemini to search for company key metrics.
 * @param {string} companyName - The name of the company.
 * @param {string} companyWebsite - The website of the company.
 * @returns {string} The generated prompt.
 */
function getSearchCompanyMetricsPrompt(companyName, companyWebsite){
  prompt = `
    You are a financial analyst. Your task is to perform in-depth market research on ${companyName} (${companyWebsite}) and extract key performance metrics.

    **Instructions:**
    ${generalSearchInstructions}
    - After the key, state the metric's value and any relevant context (like date, period, or currency).
    - Report all monetary values in their original currency.

    ---
    **Metrics to Extract:**\n
  `

  Object.values(UNIFIED_MAPPINGS).forEach(value => {
    if (Object.hasOwn(value, 'searchGroup') && value.searchGroup == 'keyMetrics'){
      prompt += `[${value.jsonKey}] ${value.promptInstructions}\n`
    }
  });

  return prompt
}

/**
 * Generates a prompt for Gemini to search for company funding information.
 * @param {string} companyName - The name of the company.
 * @param {string} companyWebsite - The website of the company.
 * @returns {string} The generated prompt.
 */
function getSearchCompanyFundingPrompt(companyName, companyWebsite){
  prompt = `
    You are a venture capital analyst. Your task is to perform in-depth market research on ${companyName} (${companyWebsite}) and extract all relevant fundraising information.

    **Instructions:**
    ${generalSearchInstructions}
    - Report all monetary values in their original currency.

    ---
    **Categories to Extract:**

    **Part 1: Historical Fundraising**\n
  `
  Object.values(UNIFIED_MAPPINGS).forEach(value => {
    if (Object.hasOwn(value, 'searchGroup') && value.searchGroup == 'funding'){
      prompt += `[${value.jsonKey}] ${value.promptInstructions}\n`
    }
  });

  prompt += `**Part 2: Current Fundraising Status**\n`
  Object.values(UNIFIED_MAPPINGS).forEach(value => {
      if (Object.hasOwn(value, 'searchGroup') && value.searchGroup == 'currentRaise'){
        prompt += `[${value.jsonKey}] ${value.promptInstructions}\n`
      }
    });
  

  return prompt

}

/**
 * Generates a prompt for Gemini to format extracted company info into JSON.
 * @param {string} extractedText - The raw text extracted from the search.
 * @returns {string} The generated prompt.
 */
function getFormatCompanyInfoPrompt(extractedText){
  prompt = `
    ${formatInstructions}  
    ---
    **JSON Schema:**
    {
  `

  Object.values(UNIFIED_MAPPINGS).forEach(value => {
    if (Object.hasOwn(value, 'searchGroup') && value.searchGroup == 'generalInfo'){
      if(value.isArray){
        prompt += `"${value.jsonKey}": [{"description": "", "sources" : []}],\n`
      }else{
        prompt += `"${value.jsonKey}": {"description": "", "sources" : []},\n`
      }
    }
  });

  prompt += `
    }

    ---
    ${extractedText}
  `

  return prompt
}

/**
 * Generates a prompt for Gemini to format extracted company metrics into JSON.
 * @param {string} extractedText - The raw text extracted from the search.
 * @returns {string} The generated prompt.
 */
function getFormatCompanyMetricsPrompt(extractedText){
  prompt = `
    ${formatInstructions}  
    ---
    **JSON Schema:**
    {
  `

  Object.values(UNIFIED_MAPPINGS).forEach(value => {
    if (Object.hasOwn(value, 'searchGroup') && value.searchGroup == 'keyMetrics'){
      if(value.isArray){
        prompt += `"${value.jsonKey}": [{"description": "", "sources" : []}],\n`
      }else{
        prompt += `"${value.jsonKey}": {"description": "", "sources" : []},\n`
      }
    }
  });

  prompt += `
    }

    ---
    ${extractedText}
  `

  return prompt
    
}

/**
 * Generates a prompt for Gemini to format extracted funding info into JSON.
 * @param {string} extractedText - The raw text extracted from the search.
 * @returns {string} The generated prompt.
 */
function getFormatCompanyFundingPrompt(extractedText){
  prompt = `
    ${formatInstructions}  
    ---
    **JSON Schema:**
    {
  `

  Object.values(UNIFIED_MAPPINGS).forEach(value => {
    if (Object.hasOwn(value, 'searchGroup') && (value.searchGroup == 'funding' || value.searchGroup == 'currentRaise')){
      if(value.isArray){
        prompt += `"${value.jsonKey}": [{"description": "", "sources" : []}],\n`
      }else{
        prompt += `"${value.jsonKey}": {"description": "", "sources" : []},\n`
      }
    }
  });

  prompt += `
    }
    ---
    ${extractedText}
  `

  return prompt
}

/**
 * Generates a prompt for Gemini to synthesize all collected data for a company.
 * @param {Object} company - The company object containing all its collected data.
 * @returns {string} The generated prompt.
 */
function getSynthesizeFinalCompanyPrompt(company) {

  data = formatDataForSynthesis(company.sheetRow);

  prompt = `
    **Persona:** You are a senior venture capital analyst. Your specialty is synthesizing incomplete and potentially conflicting data from multiple sources to build a clear, actionable investment thesis.

    **Primary Objective:** You will analyze a "Briefing Package" for ${company.name} (${company.website}). Your goal is to reconcile all the factual data and then generate an updated subjective analysis.

    ---
    **Part 1: Data Reconciliation Logic**

    To reconcile the data from the 'Gemini Research', 'Internal Updates', and 'HubSpot' sources, apply the following hierarchy of evidence:
    1.  **Prioritize Direct, Specific Statements:** A direct quote (e.g., 'Our ARR is now $1.2M') or a confirmed event (e.g., 'TechCrunch reports the $5M seed round has closed') is the most reliable.
    2.  **Use Logical Progression:** A larger team size or higher ARR is almost always more recent than a smaller number. A completed action is more recent than a planned one.
    3.  **Seek Corroboration:** Give high confidence to data points confirmed by multiple sources.
    4.  **Acknowledge Uncertainty:** If a definitive conclusion cannot be drawn, explicitly state the conflict or the most likely scenario.

    ---
    **Part 2: Your Tasks**

    Based on your reconciled view of the data, perform the following two tasks:

    **Task A - Reconcile All Data Points:**
    For every single field in the briefing package, determine the single, most accurate and up-to-date value.

    **Task B - Generate Updated Subjective Analysis:**
    Review any "Existing Analysis" provided in the briefing package for the following three topics. Compare it against your reconciled facts, then write a new, improved paragraph for each. If no existing analysis is provided, create it from scratch.
      1.  **Recent News and Highlights:** Summarize the company's recent momentum, blending public news with confidential wins.
      2.  **Strategic Focus:** Define the company's current strategic direction, aligned with their fundraising status and product milestones.
      3.  **Risks:** Update internal risks and enhance the analysis by adding relevant external or market risks based on your broad knowledge.
      4. **Founders:** Verify the founders listed are in fact the founders, and provide at least one founder or co-founder.
      5. **Founder Commentary:** Utilize any existing quotes if possible, otherwise provide a direct quote from the founder stating their goals and and values for the company.
      6. **Fund Commentary:** Utilize any exisitng quotes if possible, otherwise generate an analysis for the commentary and utilize information from startupbootcamp, suggesting how they believe the company will provide value.

    ---
    **Part 3: Output Instructions**

    You must generate your entire response as a single block of structured text. Use the following \`[key]\` for every piece of information. Do not add any other commentary or a period at the end, unless a full sentence. If information cannot be determined, state "Undisclosed"

    **You must include information for each of the following tags, do not add other tags.**

  `
  Object.values(UNIFIED_MAPPINGS).forEach(value => {
    if (Object.hasOwn(value, 'searchGroup') && (value.searchGroup != '' && value.searchGroup != undefined)){
      prompt += `[${value.jsonKey}] ${value.promptInstructions}\n`
    }
  });

  prompt += `

    ---
    **Briefing Package for ${company.name}:**

    ${JSON.stringify(data)}
    `

  return prompt
}

/**
 * Generates a prompt for Gemini to format the synthesized company data into JSON.
 * @param {string} synthesizedText - The raw, synthesized text.
 * @returns {string} The generated prompt.
 */
function getFormatFinalCompanyPrompt(synthesizedText){
  prompt =  `
    You are a data formatting expert. Your only task is to convert the provided "Synthesized Text" into a perfectly valid, single-line, compact JSON object that strictly adheres to the provided "Final JSON Schema".

    **CRITICAL OUTPUT INSTRUCTIONS:**
    1.  The entire output must be **only** the raw JSON string.
    2.  **Do not, under any circumstances, wrap the JSON in markdown code fences like \`\`\`json ... \`\`\` or \`\`\` ... \`\`\`**
    3.  Do not add any explanatory text, notes, or any characters before or after the JSON string.
    4.  For each line in the Synthesized Text, find the \`[TAG]\` and use the corresponding information to populate the correct field in the JSON.

    ---
    **Final JSON Schema:**
    {
    `

    Object.values(UNIFIED_MAPPINGS).forEach(value => {
      if (Object.hasOwn(value, 'searchGroup') && (value.searchGroup != '' && value.searchGroup != undefined)){
        prompt += `"${value.jsonKey}": {"description": "", "sources" : []},\n`
      }
    });

    prompt += `
    }
    ---
    **Synthesized Text:**
    ${synthesizedText}
  `

  return prompt
}

/**
 * Parses the JSON output from Gemini and writes the data to the specified sheet row.
 * @param {Sheet} sheet - The Google Sheet to write to.
 * @param {Object} parsedData - The parsed JSON data from Gemini.
 * @param {number} row - The row number to write the data to.
 */
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

/**
 * Formats a cell value for display in the Google Sheet.
 * Handles single values, objects with descriptions and sources, and arrays of objects.
 * @param {*} value - The value to format.
 * @returns {string} The formatted string for the cell.
 */
function formatCellValue(value) {
  const NOT_FOUND = "Undisclosed"; // Use a constant for the default value.

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