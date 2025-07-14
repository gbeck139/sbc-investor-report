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

const generalSearchInstructions = `
  -  Use your search capabilities to find information for each category with corresponding key listed below.
  -  For each piece of information you find, write it on a new line.
  -  Start each line with the key name (e.g. [companySummary]) to identify the category.
  -  If after a thorough search you cannot find information for a category, do not output it.
  -  Do not generate or fabricate information. Every statement must be grounded in a verifiable source.`


const formatInstructions = `
  You are a data formatting expert. Your only task is to convert the provided "Extracted Text" into a perfectly valid, single-line, compact JSON object that strictly adheres to the provided "JSON Schema".

  **CRITICAL OUTPUT INSTRUCTIONS:**
  1.  The entire output must be **only** the raw JSON string.
  2. Do not, under any circumstances, wrap the JSON in markdown code fences like \`\`\`json ... \`\`\` or \`\`\` ... \`\`\`.

  For each line in the Extracted Text, find the \`[key]\` and use the corresponding information and source URL to populate the correct field in the JSON.`


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
  Logger.log(prompt)

  return prompt
}

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

  Logger.log(prompt)
  return prompt
}

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
  
  Logger.log(prompt)

  return prompt

}

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

  Logger.log(prompt)
  return prompt
}

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

  Logger.log(prompt)
  return prompt
    
}

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

  Logger.log(prompt)
  return prompt
}

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

  Logger.log(prompt)
  return prompt
}

function getFormatFinalCompanyPrompt(synthesizedText){
  prompt =  `
    You are a data formatting expert. Your only task is to convert the provided "Synthesized Text" into a perfectly valid, single-line, compact JSON object that strictly adheres to the provided "Final JSON Schema".

    **CRITICAL OUTPUT INSTRUCTIONS:**
    1.  The entire output must be **only** the raw JSON string.
    2.  **Do not, under any circumstances, wrap the JSON in markdown code fences like \`\`\`json ... \`\`\` or \`\`\` ... \`\`\`.**
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

  Logger.log(prompt)
  return prompt
}
