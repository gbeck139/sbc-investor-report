/**
 * Shared Constants for HubspotImport and Gemini Search scripts.
 * All constants defined here are accessible across all .gs files in this Apps Script project.
 */

SCRIPT_PROPS = PropertiesService.getScriptProperties();

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


// --- Sheet Configuration ---
const MASTER_SHEET = 'Master Sheet'; // Name of the sheet to update/create
const FINAL_SHEET = 'Final Sheet';
const ROW = 3; // Starting row for company data
const COMPANY_UPDATE_ROW = 2;
const GEMINI_ROW = 4;
const ROW_SPACING = 3; // Rows to skip between company entries (e.g., if each company takes 3 rows)

// --- Gemini API & Search Configuration ---
// Mapping for where Gemini's *search output* categories go in the sheet.
// Ensure these keys exactly match the 'Category' names Gemini outputs in its table.
const COLUMN_MAPPINGS = {
    'Name' : 'A',
    'Source' : 'B',
    'Sector' : 'C',
    'Website' : 'D',
    'Company Summary': 'E',
    'Business Model': 'G',
    'Key Differentiators': 'H',
    'Founder Commentary': 'AE',
    'Fund Commentary': 'AF',

    'Current Valuation': 'V',
    'ARR (Annual Recurring Revenue)': 'W',
    'Gross Profit': 'Z',
    'Runway': 'X',
    'Employee Count': 'F', 
    'Customer Count': 'Y',
    'Retention (Customer or Revenue)': 'AA',

    'Total Capital Raised': 'I',
    'Initial Investment': 'J',
    'Lead Investor': 'K', 
    'Last Round: Date': 'L',
    'Last Round: Type': 'M',
    'Last Round: Amount': 'N',

    'Currently Raising?': 'O', 
    'Current Raise: Target': 'P',
    'Current Raise: Committed': 'Q',
    'Current Raise: Committed Percent' : 'R',
    'Current Raise: Pre Money': 'S', 
    'Current Raise: Post Money': 'T', 
    'Current Raise: Terms': 'U', 
    
    'Recent Highlights and News': 'AB', 
    'Strategic Focus': 'AC',
    'Risks': 'AD',

    'Report Link': 'AG'
};

// --- Execution Limits for Gemini Search ---
const MAX_EXECUTION_TIME_MS = 5 * 60 * 1000; // 5 minutes (allowing buffer for the 6-min limit)
const BATCH_SIZE = 5; // Process 5 companies per execution (adjust based on actual Gemini response time)