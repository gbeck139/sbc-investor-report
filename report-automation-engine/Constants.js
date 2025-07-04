/**
 * Shared Constants for HubspotImport and Gemini Search scripts.
 * All constants defined here are accessible across all .gs files in this Apps Script project.
 */

const SCRIPT_PROPS = PropertiesService.getScriptProperties();

// --- API Key Accessor Functions ---
// These functions provide a global way to access API keys from script properties.
function getHsApiKey() {
  const apiKey = SCRIPT_PROPS.getProperty('HUBSPOT_API_KEY');
  if (!apiKey) {
    throw new Error("HUBSPOT_API_KEY not found in script properties. Please set it up in Project Settings.");
  }
  return apiKey;
}

function getGeminiApiKey() {
  const apiKey = SCRIPT_PROPS.getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found in script properties. Please set it up in Project Settings.");
  }
  return apiKey;
}

// --- Drive Config ---
const DRIVE_IDS = ['0ANlAdFJelSKxUk9PVA'];


// --- Sheet Configuration ---
const MASTER_SHEET = 'Master Sheet'; // Name of the sheet to update/create
const FINAL_SHEET = 'Final Sheet';
const ROW = 2; // Starting row for company data
const COMPANY_UPDATE_ROW = 2;
const HUBSPOT_ROW = 3;
const GEMINI_ROW = 4;
const ROW_SPACING = 3; // Rows to skip between company entries (e.g., if each company takes 3 rows)
const finalColumnLetters = "AG";

const UNIFIED_MAPPINGS = {
  // --- Top-Level Identifiers ---
  'Name': { column: 'A', jsonKey: 'name', tag: '[COMPANY_NAME]', hubspot: 'name'},
  'Source': { column: 'B', jsonKey: 'source' },
  'Sector': { column: 'C', jsonKey: 'sector', tag: '[SECTOR]', hubspot: 'n1_4__company___industry' },
  'Website': { column: 'D', jsonKey: 'website', tag: '[COMPANY_WEBSITE]', hubspot: 'website' },

  // --- Qualitative Analysis ---
  'Company Summary': { column: 'E', jsonKey: 'companySummary', tag: '[COMPANY_SUMMARY]', hubspot: 'n5_3_05__updated_company_description' },
  'Business Model': { column: 'G', jsonKey: 'businessModel', tag: '[BUSINESS_MODEL]' },
  'Key Differentiators': { column: 'H', jsonKey: 'keyDifferentiators', tag: '[KEY_DIFFERENTIATORS]' },
  'Founder Commentary': { column: 'AE', jsonKey: 'founderCommentary', tag: '[FOUNDER_COMMENTARY]' },
  'Fund Commentary': { column: 'AF', jsonKey: 'fundCommentary', tag: '[FUND_COMMENTARY]' },

  // --- Key Metrics ---
  'Current Valuation': { column: 'V', jsonKey: 'currentValuation', tag: '[CURRENT_VALUATION]', hubspot: 'n5_03_00__company_valuation' },
  'ARR (Annual Recurring Revenue)': { column: 'W', jsonKey: 'arr', tag: '[ANNUAL_RECURRING_REVENUE]', hubspot: 'n5_3_12__what_is_your_current_annual_recurring_revenue__arr_' },
  'Gross Profit': { column: 'Z', jsonKey: 'grossProfit', tag: '[GROSS_PROFIT]' },
  'Runway': { column: 'X', jsonKey: 'cashRunway', tag: '[CASH_RUNWAY]', hubspot: 'n5_3_11__what_is_your_current_company_runway' },
  'Employee Count': { column: 'F', jsonKey: 'employeeCount', tag: '[EMPLOYEE_COUNT]', hubspot: 'n5_3_06__current_number_of_full_time_employees' },
  'Customer Count': { column: 'Y', jsonKey: 'customerCount', tag: '[CUSTOMER_COUNT]' },
  'Retention (Customer or Revenue)': { column: 'AA', jsonKey: 'retention', tag: '[RETENTION_RATE]' },

  // --- Fundraising History ---
  'Total Capital Raised': { column: 'I', jsonKey: 'totalCapitalRaised', tag: '[TOTAL_CAPITAL_RAISED]', hubspot: 'n5_3_09__total_amount_of_money_raised_to_date' },
  'Initial Investment': { column: 'J', jsonKey: 'initialInvestment', tag: '[INITIAL_INVESTMENT_AMOUNT]' },
  'Lead Investor': { column: 'K', jsonKey: 'leadInvestor', tag: '[LAST_ROUND_LEAD_INVESTOR]' },
  'Last Round: Date': { column: 'L', jsonKey: 'lastRoundDate', tag: '[LAST_ROUND_DATE]', hubspot: 'n5_0_06__alumni___latest_funding_round___date' },
  'Last Round: Type': { column: 'M', jsonKey: 'lastRoundType', tag: '[LAST_ROUND_TYPE]', hubspot: 'n5_0_08__alumni___raising_round' },
  'Last Round: Amount': { column: 'N', jsonKey: 'lastRoundAmount', tag: '[LAST_ROUND_AMOUNT]' },

  // --- Current Fundraising ---
  'Currently Raising?': { column: 'O', jsonKey: 'isCurrentlyRaising', tag: '[IS_CURRENTLY_RAISING]' },
  'Current Raise: Target': { column: 'P', jsonKey: 'targetAmount', tag: '[CURRENT_RAISE_TARGET]', hubspot: 'n5_3_10__how_much_are_they_currently_fundraising_' },
  'Current Raise: Committed': { column: 'Q', jsonKey: 'committedAmount', tag: '[CURRENT_RAISE_COMMITTED]', hubspot: 'n5_3_11__how_much_out_of_this_amount_is_already_committed' },
  'Current Raise: Committed Percent': { column: 'R', jsonKey: 'committedPercent', tag: '[CURRENT_RAISE_COMMITTED_PERCENT]' },
  'Current Raise: Pre Money': { column: 'S', jsonKey: 'preMoneyValuation', tag: '[CURRENT_RAISE_PRE_MONEY]' },
  'Current Raise: Post Money': { column: 'T', jsonKey: 'postMoneyValuation', tag: '[CURRENT_RAISE_POST_MONEY]' },
  'Current Raise: Terms': { column: 'U', jsonKey: 'terms', tag: '[CURRENT_RAISE_TERMS]', hubspot: 'n5_2_09__what_are_the_basic_terms_of_this_raise' },

  // --- Subjective Analysis ---
  'Recent Highlights and News': { column: 'AB', jsonKey: 'recentHighlightsAndNews', tag: '[RECENT_HIGHLIGHT_AND_NEWS]', hubspot: 'n5_3_10__last_6_month_highlights' },
  'Strategic Focus': { column: 'AC', jsonKey: 'strategicFocus', tag: '[STRATEGIC_FOCUS]' },
  'Risks': { column: 'AD', jsonKey: 'risks', tag: '[RISK]' },

  // --- Final Report ---
  'Report Link': { column: 'AG', jsonKey: 'reportLink' }
};

// --- Execution Limits for Gemini Search ---
const MAX_EXECUTION_TIME_MS = 5 * 60 * 1000; // 5 minutes (allowing buffer for the 6-min limit)
const BATCH_SIZE = 5; // Process 5 companies per execution (adjust based on actual Gemini response time)










