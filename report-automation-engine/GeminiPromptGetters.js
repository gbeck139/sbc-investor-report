function getSearchCompanyInfoPrompt(companyName, companyWebsite){
  return `
    You are a market analyst. Your task is to perform in-depth market research on ${companyName} (${companyWebsite}) and extract key qualitative information.

    **Instructions:**
    1.  Use your search capabilities to find information for each category listed below.
    2.  For each piece of information you find, write it on a new line.
    3.  Start each line with a \`[BRACKET_TAG]\` to identify the category.
    4.  If you find multiple distinct items for one category (like two different news articles), create a separate line for each.
    5.  If after a thorough search you cannot find information for a category, do not include the tag.
    6.  Do not generate or fabricate information. Every statement must be grounded in a verifiable source.

    ---
    **Categories to Extract:**

    [COMPANY_SUMMARY] A 2-3 sentence overview of the company's mission and core product.
    [BUSINESS_MODEL] The company's primary business model (e.g., B2B SaaS, Marketplace).
    [KEY_DIFFERENTIATORS] A unique aspect of their technology, partnerships, or market strategy.
    [RECENT_HIGHLIGHT_AND_NEWS] A significant recent milestone, product update, or partnership. (Include the date if available).
    [STRATEGIC_FOCUS] A current strategic priority, such as a fundraising goal or product launch.
    [RISK] A potential risk or challenge facing the company.
    [FOUNDER_COMMENTARY] A direct quote or paraphrased statement from a founder.
    [FUND_COMMENTARY] A direct quote or paraphrased statement from an investment fund about the company.
  `
}

function getSearchCompanyMetricsPrompt(companyName, companyWebsite){
  return `
    "You are a financial analyst. Your task is to perform in-depth market research on ${companyName} (${companyWebsite}) and extract key performance metrics.

    **Instructions:**
    1.  Use your search capabilities to find the most recent and relevant data for each metric listed below.
    2.  For each metric you find, write it on a new line.
    3.  Start each line with a \`[BRACKET_TAG]\`.
    4.  After the tag, state the metric's value and any relevant context (like date, period, or currency).
    5.  If after a thorough search you cannot find a metric, do not include a line for it.
    6.  Report all monetary values in their original currency.

    ---
    **Metrics to Extract:**

    [CURRENT_VALUATION]
    [ANNUAL_RECURRING_REVENUE]
    [GROSS_PROFIT]
    [CASH_RUNWAY]
    [EMPLOYEE_COUNT] (Specify if the number is approximate, e.g., from LinkedIn).
    [CUSTOMER_COUNT] (Specify if the number is a minimum, e.g., "over 1,000").
    [RETENTION_RATE] (Specify the type, e.g., "Net Revenue Retention")."
  `
}

function getSearchCompanyFundingPrompt(companyName, companyWebsite){
  return `
    You are a venture capital analyst. Your task is to perform in-depth market research on ${companyName} (${companyWebsite}) and extract all relevant fundraising information.

    **Instructions:**
    1.  Use your search capabilities to find information for each category listed below.
    2.  For each piece of information you find, write it on a new line.
    3.  Start each line with a \`[BRACKET_TAG]\` to identify the category.
    4.  If you find multiple items for one category (like two lead investors), create a separate line for each.
    5.  If after a thorough search you cannot find information for a category, do not include the tag.

    ---
    **Categories to Extract:**

    **Part 1: Historical Fundraising**
    [TOTAL_CAPITAL_RAISED]
    [INITIAL_INVESTMENT_AMOUNT_AND_TYPE]
    [LAST_ROUND_DATE]
    [LAST_ROUND_TYPE]
    [LAST_ROUND_AMOUNT]
    [LAST_ROUND_LEAD_INVESTOR]

    **Part 2: Current Fundraising Status**
    [IS_CURRENTLY_RAISING] (State "Yes" or "No" based on available information).
    [CURRENT_RAISE: TARGET]
    [CURRENT_RAISE: COMMITTED]
    [CURRENT_RAISE: COMMITTED_PERCENT]
    [CURRENT_RAISE: PRE_MONEY]
    [CURRENT_RAISE: POST_MONEY] 
    [CURRENT_RAISE: TERMS]
  `
}

function getFormatCompanyInfoPrompt(extractedText){
  return `
    You are a data formatting expert. Your only task is to convert the provided "Extracted Text" into a perfectly valid, single-line, compact JSON object that strictly adheres to the provided "JSON Schema".
    **Do not, under any circumstances, wrap the JSON in markdown code fences like \`\`\`json ... \`\`\` or \`\`\` ... \`\`\`.**

    For each line in the Extracted Text, find the \`[TAG]\` and use the corresponding information and source URL to populate the correct field in the JSON.

    ---
    **JSON Schema:**
    {
    "companySummary": {"description": "", "sources" : []},
    "businessModel": {"description": "", "sources" : []},
    "keyDifferentiators": [{"description": "", "sources" : []}],
    "recentHighlightsAndNews": [{"description": "", "date": "", "sources" : []}],
    "strategicFocus": {"description": "", "sources" : []},
    "risks": [{"description": "", "sources" : []}],
    "founderCommentary": [{"description": "", "sources" : []}],
    "fundCommentary": [{"description": "", "sources" : []}]
    }

    ---
    ${extractedText}
  `
}

function getFormatCompanyMetricsPrompt(extractedText){
  return `
    "You are a data formatting expert. Your only task is to convert the provided "Extracted Text" into a perfectly valid, single-line, compact JSON object that strictly adheres to the provided "JSON Schema".
    **Do not, under any circumstances, wrap the JSON in markdown code fences like \`\`\`json ... \`\`\` or \`\`\` ... \`\`\`.**

    For each line in the Extracted Text, find the \`[TAG]\` and use the corresponding information and source URL to populate the correct field in the JSON.

    ---
    **JSON Schema:**
    {
      "currentValuation": {"description": "", "sources" : []},
      "arr": {"description": "", "sources" : []},
      "grossProfit": {"description": "", "sources" : []},
      "cashRunway": {"description": "", "sources" : []},
      "employeeCount": {"description": "", "sources" : []},
      "customerCount": {"description": "", "sources" : []},
      "retention": {"description": "", "sources" : []},
    }
    ---
    ${extractedText}
  `
}

function getFormatCompanyFundingPrompt(extractedText){
  return `
    You are a data formatting expert. Your only task is to convert the provided "Extracted Text" into a perfectly valid, single-line, compact JSON object that strictly adheres to the provided "JSON Schema".
    **Do not, under any circumstances, wrap the JSON in markdown code fences like \`\`\`json ... \`\`\` or \`\`\` ... \`\`\`.**

    For each line in the Extracted Text, find the \`[TAG]\` and use the corresponding information and source URL to populate the correct field in the JSON.

    ---
    **JSON Schema:**
    {
      "totalCapitalRaised": {"description": "", "sources" : []},
      "initialInvestment": {"description": "", "sources" : []},
      "leadInvestor": {"description": "", "sources" : []},
      "lastRoundDate": {"description": "", "sources" : []},
      "lastRoundType": {"description": "", "sources" : []},
      "lastRoundAmount": {"description": "", "sources" : []},
      "isCurrentlyRaising": {"description": "", "sources" : []},
      "preMoneyValuation": {"description": "", "sources" : []},
      "postMoneyValuation": {"description": "", "sources" : []},
      "targetAmount": {"description": "", "sources" : []},
      "committedAmount": {"description": "", "sources" : []},
      "committedPercent": {"description": "", "sources" : []},
      "terms": {"description": "", "sources" : []}
    }

    ---
    **Extracted Text:**
    ${extractedText}
  `
}

function getSynthesizeFinalCompanyPrompt(companyName, companyWebsite, internalRow, hubspotRow, geminiRow) {

  data = formatDataForSynthesis(internalRow, hubspotRow, geminiRow);

  return `
    **Persona:** You are a senior venture capital analyst. Your specialty is synthesizing incomplete and potentially conflicting data from multiple sources to build a clear, actionable investment thesis.

    **Primary Objective:** You will analyze a "Briefing Package" for ${companyName} (${companyWebsite}). Your goal is to reconcile all the factual data and then generate an updated subjective analysis.

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

    ---
    **Part 3: Output Instructions**

    You must generate your entire response as a single block of structured text. Use the following \`[BRACKET_TAGS]\` for every piece of information. Do not add any other commentary.

    **You must include information for each of the following tags, do not add other tags.**

    [COMPANY_SUMMARY] A 2-3 sentence overview of the company's mission and core product.
    [BUSINESS_MODEL] The company's primary business model (e.g., B2B SaaS, Marketplace).
    [KEY_DIFFERENTIATORS] A unique aspect of their technology, partnerships, or market strategy.
    [RECENT_HIGHLIGHT_AND_NEWS] A significant recent milestone, product update, or partnership. (Include the date if available).
    [STRATEGIC_FOCUS] A current strategic priority, such as a fundraising goal or product launch.
    [RISK] A potential risk or challenge facing the company.
    [FOUNDER_COMMENTARY] A direct quote or paraphrased statement from a founder.
    [FUND_COMMENTARY] A direct quote or paraphrased statement from an investment fund about the company.
    [CURRENT_VALUATION]
    [ANNUAL_RECURRING_REVENUE]
    [GROSS_PROFIT]
    [RUNWAY]
    [EMPLOYEE_COUNT] (Specify if the number is approximate, e.g., from LinkedIn).
    [CUSTOMER_COUNT] (Specify if the number is a minimum, e.g., "over 1,000").
    [RETENTION_RATE] (Specify the type, e.g., "Net Revenue Retention")."
    [TOTAL_CAPITAL_RAISED]
    [INITIAL_INVESTMENT_AMOUNT]
    [LEAD_INVESTOR]
    [LAST_ROUND_DATE]
    [LAST_ROUND_TYPE]
    [LAST_ROUND_AMOUNT]
    [LAST_ROUND_LEAD_INVESTOR]
    [IS_CURRENTLY_RAISING] (State "Yes" or "No" based on available information).
    [CURRENT_RAISE_TARGET]
    [CURRENT_RAISE_COMMITTED]
    [CURRENT_RAISE_COMMITTED_PERCENT]
    [CURRENT_RAISE_PRE_MONEY]
    [CURRENT_RAISE_POST_MONEY] 
    [CURRENT_RAISE_TERMS]

    ---
    **Briefing Package for ${companyName}:**

    ${JSON.stringify(data)}
    `
}

function getFormatFinalCompanyPrompt(synthesizedText){
  return `
    You are a data formatting expert. Your only task is to convert the provided "Synthesized Text" into a perfectly valid, single-line, compact JSON object that strictly adheres to the provided "Final JSON Schema".

    **CRITICAL OUTPUT INSTRUCTIONS:**
    1.  The entire output must be **only** the raw JSON string.
    2.  **Do not, under any circumstances, wrap the JSON in markdown code fences like \`\`\`json ... \`\`\` or \`\`\` ... \`\`\`.**
    3.  Do not add any explanatory text, notes, or any characters before or after the JSON string.
    4.  For each line in the Synthesized Text, find the \`[TAG]\` and use the corresponding information to populate the correct field in the JSON.

    ---
    **Final JSON Schema:**
    {
      "companySummary": {
        "description": "",
        "sources": []
      },
      "businessModel": {
        "description": "",
        "sources": []
      },
      "keyDifferentiators": {
        "description": "",
        "sources": []
      },
      "recentHighlightsAndNews": {
        "description": "",
        "date": "",
        "sources": []
      },
      "strategicFocus": {
        "description": "",
        "sources": []
      },
      "risks": {
        "description": "",
        "sources": []
      },
      "founderCommentary": {
        "description": "",
        "sources": []
      },
      "fundCommentary": {
        "description": "",
        "sources": []
      },
      "currentValuation": {
        "description": "",
        "sources": []
      },
      "arr": {
        "description": "",
        "sources": []
      },
      "grossProfit": {
        "description": "",
        "sources": []
      },
      "cashRunway": {
        "description": "",
        "sources": []
      },
      "employeeCount": {
        "description": "",
        "sources": []
      },
      "customerCount": {
        "description": "",
        "sources": []
      },
      "retention": {
        "description": "",
        "sources": []
      },
      "totalCapitalRaised": {
        "description": "",
        "sources": []
      },
      "initialInvestment": {
        "description": "",
        "sources": []
      },
      "leadInvestor": {
        "description": "",
        "sources": []
      },
      "lastRoundDate": {
        "description": "",
        "sources": []
      },
      "lastRoundType": {
        "description": "",
        "sources": []
      },
      "lastRoundAmount": {
        "description": "",
        "sources": []
      },
      "isCurrentlyRaising": {
        "description": "",
        "sources": []
      },
      "preMoneyValuation": {
        "description": "",
        "sources": []
      },
      "postMoneyValuation": {
        "description": "",
        "sources": []
      },
      "targetAmount": {
        "description": "",
        "sources": []
      },
      "committedAmount": {
        "description": "",
        "sources": []
      },
      "committedPercent": {
        "description": "",
        "sources": []
      },
      "terms": {
        "description": "",
        "sources": []
      }
    }

    ---
    **Synthesized Text:**
    ${synthesizedText}
  `
}



