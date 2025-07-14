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
const TEMPLATE_ID = '1ZpZxSyw9GQseP7tSLp5lLcLbSvkAkB45IzIY4g0sF5Q';  

// --- Sheet Configuration ---
const MASTER_SHEET = 'Master Sheet'; // Name of the sheet to update/create
const FINAL_SHEET = 'Final Sheet';
const ROW = 2; // Starting row for company data
const COMPANY_UPDATE_ROW = 2;
const HUBSPOT_ROW = 3;
const GEMINI_ROW = 4;
const ROW_SPACING = 3; // Rows to skip between company entries (e.g., if each company takes 3 rows)
const finalColumnLetters = "AJ";


const UNIFIED_MAPPINGS = {
    // --- Top-Level Info ---
    'Name': {
        column: 'A',
        jsonKey: 'name',
        hubspot: 'name'
    },
    'Source': {
        column: 'B',
        jsonKey: 'source'
    },
    'Sector': {
        column: 'C',
        jsonKey: 'sector',
        hubspot: 'n1_4__company___industry'
    },
    'Website': {
        column: 'D',
        jsonKey: 'website',
        hubspot: 'website'
    },
    'Founding Location': {
        column: 'AH',
        hubspot: 'country__2',
        jsonKey: 'foundingLocation'
    },
    'Logo ISO': {
        column: 'AJ',
        jsonKey: 'logoISO',
        promptInstruction: 'Convert the Founding Location to an ISO 3166-1 alpha-2 country code (2 letters) (e.g., "US", "GB", "CA")'
    },
    'Founders': {
        column: 'AI',
        jsonKey: 'founders',
        promptInstruction: 'The founder or a list of co-founders of the company',
        searchGroup: 'generalInfo'
    },

    // --- Qualitative Analysis ---
    'Company Summary': {
        column: 'E',
        jsonKey: 'companySummary',
        promptInstructions: 'A 2 sentence overview of the company\'s mission and core product',
        searchGroup: 'generalInfo',
        hubspot: 'n5_3_05__updated_company_description'
    },
    'Business Model': {
        column: 'G',
        jsonKey: 'businessModel',
        searchGroup: 'generalInfo',
        promptInstructions: 'The company\'s primary business model (e.g., B2B SaaS, Marketplace)'
    },
    'Key Differentiators': {
        column: 'H',
        jsonKey: 'keyDifferentiators',
        searchGroup: 'generalInfo',
        isArray: true,
        promptInstructions: 'Unique aspects of their technology, partnerships, or market strategy'
    },
    'Recent Highlights and News': {
        column: 'AB',
        jsonKey: 'recentHighlightsAndNews',
        searchGroup: 'generalInfo',
        isArray: true,
        promptInstructions: 'Significant recent milestones, product updates, or partnerships. (Include the date if available).',
        hubspot: 'n5_3_10__last_6_month_highlights'
    },
    'Strategic Focus': {
        column: 'AC',
        jsonKey: 'strategicFocus',
        searchGroup: 'generalInfo',
        promptInstructions: 'A current strategic priority, such as a fundraising goal or product launch.'
    },
    'Risks': {
        column: 'AD',
        jsonKey: 'risks',
        searchGroup: 'generalInfo',
        promptInstructions: 'A potential risk or challenge facing the company.'
    },
    'Founder Commentary': {
        column: 'AE',
        jsonKey: 'founderCommentary',
        searchGroup: 'generalInfo',
        promptInstructions: 'A direct quote or paraphrased statement from a founder.'
    },
    'Fund Commentary': {
        column: 'AF',
        jsonKey: 'fundCommentary',
        searchGroup: 'generalInfo',
        promptInstructions: 'A direct quote or paraphrased statement from an investment fund about the company.'
    },

    // --- Key Metrics ---
    'Current Valuation': {
        column: 'V',
        jsonKey: 'currentValuation',
        searchGroup: 'keyMetrics',
        promptInstructions: '',
        hubspot: 'n5_03_00__company_valuation'
    },
    'ARR (Annual Recurring Revenue)': {
        column: 'W',
        jsonKey: 'arr',
        searchGroup: 'keyMetrics',
        promptInstructions: 'One total ARR value',
        hubspot: 'n5_3_12__what_is_your_current_annual_recurring_revenue__arr_'
    },
    'Gross Profit': {
        column: 'Z',
        jsonKey: 'grossProfit',
        searchGroup: 'keyMetrics',
        promptInstructions: ''
    },
    'Runway': {
        column: 'X',
        jsonKey: 'cashRunway',
        searchGroup: 'keyMetrics',
        promptInstructions: '',
        hubspot: 'n5_3_11__what_is_your_current_company_runway'
    },
    'Employee Count': {
        column: 'F',
        jsonKey: 'employeeCount',
        searchGroup: 'keyMetrics',
        promptInstructions: '',
        hubspot: 'n5_3_06__current_number_of_full_time_employees'
    },
    'Customer Count': {
        column: 'Y',
        jsonKey: 'customerCount',
        searchGroup: 'keyMetrics',
        promptInstructions: 'Specified if the number is a minimum, e.g., "over 1,000"'
    },
    'Retention (Customer or Revenue)': {
        column: 'AA',
        jsonKey: 'retention',
        searchGroup: 'keyMetrics',
        promptInstructions: 'Specified type, e.g., "Net Revenue Retention"'
    },

    // --- Fundraising History ---
    'Total Capital Raised': {
        column: 'I',
        jsonKey: 'totalCapitalRaised',
        searchGroup: 'funding',
        promptInstructions: 'Only include the grand total',
        hubspot: 'n5_3_09__total_amount_of_money_raised_to_date'
    },
    'Initial Investment': {
        column: 'J',
        searchGroup: 'funding',
        jsonKey: 'initialInvestment',
        promptInstructions: ''
    },
    'Lead Investor': {
        column: 'K',
        jsonKey: 'leadInvestor',
        searchGroup: 'funding',
        promptInstructions: ''
    },
    'Last Round: Date': {
        column: 'L',
        jsonKey: 'lastRoundDate',
        searchGroup: 'funding',
        promptInstructions: '',
        hubspot: 'n5_0_06__alumni___latest_funding_round___date'
    },
    'Last Round: Type': {
        column: 'M',
        jsonKey: 'lastRoundType',
        searchGroup: 'funding',
        promptInstructions: '',
        hubspot: 'n5_0_08__alumni___raising_round'
    },
    'Last Round: Amount': {
        column: 'N',
        jsonKey: 'lastRoundAmount',
        searchGroup: 'funding',
        promptInstructions: ''
    },

    // --- Current Fundraising ---
    'Currently Raising?': {
        column: 'O',
        jsonKey: 'isCurrentlyRaising',
        searchGroup: 'currentRaise',
        promptInstructions: 'State "Yes" or "No" or "Undisclosed" based on available information'
    },
    'Current Raise: Target': {
        column: 'P',
        jsonKey: 'targetAmount',
        searchGroup: 'currentRaise',
        promptInstructions: '',
        hubspot: 'n5_3_10__how_much_are_they_currently_fundraising_'
    },
    'Current Raise: Committed': {
        column: 'Q',
        jsonKey: 'committedAmount',
        searchGroup: 'currentRaise',
        promptInstructions: '',
        hubspot: 'n5_3_11__how_much_out_of_this_amount_is_already_committed'
    },
    'Current Raise: Committed Percent': {
        column: 'R',
        jsonKey: 'committedPercent',
        searchGroup: 'currentRaise',
        promptInstructions: ''
    },
    'Current Raise: Pre Money': {
        column: 'S',
        jsonKey: 'preMoneyValuation',
        searchGroup: 'currentRaise',
        promptInstructions: ''
    },
    'Current Raise: Post Money': {
        column: 'T',
        jsonKey: 'postMoneyValuation',
        searchGroup: 'currentRaise',
        promptInstructions: ''
    },
    'Current Raise: Terms': {
        column: 'U',
        jsonKey: 'terms',
        searchGroup: 'currentRaise',
        promptInstructions: '',
        hubspot: 'n5_2_09__what_are_the_basic_terms_of_this_raise'
    },

    // --- Final Report ---
    'Report Link': {
        column: 'AG',
        jsonKey: 'reportLink'
    },
};

