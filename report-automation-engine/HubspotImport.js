/**
 * Automation to move companies from Hubspot to Sheets in preparation for further manipulaton.
 * Utilizes the hubspot API to pull companies within the Alumni sector according to specified filters. 
 * Used for Portfolio Management as the data collection step in creating one pagers for investors 
 * 
 * Matt Sebahar
 * SBC Australia
 * 18/06/2025
 */

// --- HubSpot Fetching Configuration ---
// Mapping of HubSpot internal property names to where they *initially* go in the sheet.
const HUBSPOT_COLUMN_MAPPINGS = {
  'name': 'A',
  'n1_4__company___industry': 'C',
  'website': 'D',
  'n5_3_05__updated_company_description': 'E',
  'n5_3_06__current_number_of_full_time_employees': 'F',
  'n5_3_09__total_amount_of_money_raised_to_date': 'I',
  'n5_0_06__alumni___latest_funding_round___date': 'L',
  'n5_0_08__alumni___raising_round': 'M',
  'n5_3_10__how_much_are_they_currently_fundraising_': 'P',
  'n5_3_11__how_much_out_of_this_amount_is_already_committed': 'Q',
  'n5_2_09__what_are_the_basic_terms_of_this_raise': 'U',
  'n5_03_00__company_valuation': 'V',
  'n5_3_12__what_is_your_current_annual_recurring_revenue__arr_': 'W',
  'n5_3_11__what_is_your_current_company_runway': 'X',
  'n5_3_10__last_6_month_highlights': 'AB',
  // 'country__2' : ''

};

const rowMappings = JSON.parse(SCRIPT_PROPS.getProperty('ROW_MAPPINGS'));

// Values to fetch from HubSpot (derived from COLUMN_MAPPINGS keys)
const HUBSPOT_FETCH_VALS = Object.keys(HUBSPOT_COLUMN_MAPPINGS);
HUBSPOT_FETCH_VALS.push('program_name') // Add cohort for filtering later

// Filters for fetching companies from HubSpot
const HUBSPOT_FILTER_VALS = [
  { // [1.1] Group is any of SBC - AU 
    'propertyName': 'n1_1__group',
    'operator': 'CONTAINS_TOKEN',
    'value': 'SBC - AU'
  },
  // AND
  { // [5.0] Alumni - Cohort (Program Attended) is known 
    'propertyName': 'program_name',
    'operator': 'HAS_PROPERTY'
  },
  // AND
  { // [5.0] Alumni - Operating Status is any of Operating or Currently Dormant  
    'propertyName': 'operatingstatus',
    'operator': 'IN',
    'values': ['Operating', 'Currently Dormant']
  }
];


/**
 * Main function of the script displayed to user
 * Handles the function calls for gathering data from hubspot, and then passing that information into a new sheet.
 */
function createSheets(updateList = ['needenergy']) {
  mapCompanies();
  const updateSet = new Set(updateList.map(name => name.toLowerCase()));

  let workingSheet;
  try {
    // Attempt to get the sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    workingSheet = spreadsheet.getSheetByName(MASTER_SHEET);

    // Create one if unable to locate the sheet
    if (!workingSheet)
      workingSheet = spreadsheet.insertSheet(MASTER_SHEET);
  } catch (e) {
    Logger.log('Error in sheets' + e.toString());
  }

  // Write each companies data if specified in updateList
  HS_COMPANIES.forEach((company) => {
    let name = company.properties.name.toLowerCase();
    if (updateSet.has(name)) {
      Logger.log(rowMappings);
      Logger.log(name);
      writeToRow(workingSheet, company.properties, rowMappings[name] + 1);

    }
  }
  );
}

/**
 * Method to access hubspot API
 * Utilizes the built in filters to select and return just Alumni. 
 * Filters are defined above, but should not be changed as this is meant for Alumni. 
 */
function getCompaniesFromHs() {
  // URL For accessing Hs
  const apiURL = 'https://api.hubapi.com/crm/v3/objects/companies/search';
  // List to collect companies
  let companyList = [];
  // Hubspot token for the following page
  let nextPage = null;

  // Make one request [Max 100 per request] and continue on while there is more pages
  do {
    const payload =
    {
      'filterGroups':
        [
          {
            'filters': HUBSPOT_FILTER_VALS
          }
          //, OR
          // Enter additional values if desired
        ],
      'properties': HUBSPOT_FETCH_VALS,
      'limit': 100, // Max possible val
      'after': nextPage
    };

    // Configure Request
    const params =
    {
      'method': 'post',
      'contentType': 'application/json',
      'headers': { 'Authorization': 'Bearer ' + getHsApiKey() },
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true // Will handle exceptions in house
    };

    // Fetch from API
    const response = UrlFetchApp.fetch(apiURL, params);
    const rCode = response.getResponseCode();
    const rBody = response.getContentText();

    // Check for any errors
    if (rCode !== 200)
      throw new Error(`HubSpot API Error (${rCode}): ${rBody}`);

    // Begin parsing and appending data
    const data = JSON.parse(rBody);
    companyList = companyList.concat(data.results);

    // Update to the next page if it exists, or set to null
    nextPage = data.paging && data.paging.next ? data.paging.next.after : null;
  }
  while (nextPage);

  // Report the amount of companies and return them
  Logger.log(`Fetched a total of ${companyList.length} companies.`);
  return companyList;
}

/**
 * Writes a companies data to the specified location using the HUBSPOT_COLUMN_MAPPING
 * @param {Sheet} sheet The google Sheet object to write to.
 * @param {Object} companyData the properties object from the company
 * @param {number} rowNum The starting ow number for this company
 */
function writeToRow(sheet, companyData, rowNum) {
  for (const column in UNIFIED_MAPPINGS) {
    const dict = UNIFIED_MAPPINGS[column];
    if (!dict.hubspot)
      continue;


    const cell = dict.column + rowNum;
    const val = companyData[dict.hubspot] || 'N/A';
    sheet.getRange(cell).setValue(val);
  }
}
