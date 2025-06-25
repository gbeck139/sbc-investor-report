// File: Code.gs

const SCRIPT_PROPS = PropertiesService.getScriptProperties();

// --- WEB APP FUNCTIONS ---

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('SBC Update Processor')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Includes the content of another HTML file. This is used by the template in Index.html.
 * @param {string} filename The name of the HTML file to include (e.g., 'JavaScript').
 * @returns {string} The content of the file.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}



/**
 * Gets the list of folder IDs from storage to populate the UI.
 * @returns {string[]} An array of folder IDs.
 */
function getFolderData() {
  const folderData = SCRIPT_PROPS.getProperty('SBC_UPDATE_FOLDERS');
  // Provide a default empty array if nothing is stored
  return folderData ? JSON.parse(folderData) : [];
}

/**
 * Saves the list of folder IDs to storage.
 * @param {string[]} folders An array of folder IDs to save.
 * @returns {string} A success message.
 */
function saveFolderData(folders) {
  if (!Array.isArray(folders)) {
    return 'Invalid data format. Expected an array of folder IDs.';
  }
  SCRIPT_PROPS.setProperty('SBC_UPDATE_FOLDERS', JSON.stringify(folders));
  return 'Folder list saved successfully!';
}

/**
 * Accesses the existing companies based upon the last hubspot import.
 * @returns {string[]} A sorted, unique list of company names.
 */
function getCompanyList() {
  const mappingsString = SCRIPT_PROPS.getProperty('ROW_MAPPINGS');
  if (!mappingsString) return []; // Return empty if no mappings exist
  
  const mappings = JSON.parse(mappingsString);
  return Object.keys(mappings).sort();
}

/**
 * Returns the cohorts and tehir companies
 */
function getInitialData() {
  try {
    const cohortsJSON = SCRIPT_PROPS.getProperty('COHORTS');
    Logger.log(JSON.parse(cohortsJSON));
    return JSON.parse(cohortsJSON);
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * The MAIN function called by the UI to start all processes.
 * It takes an options object from the frontend.
 * @param {object} options { companies: string[], runHubspot: boolean, runPdf: boolean }
 */
function runProcesses(options) {
  const logOutput = [];
  try {
    logOutput.push("Process started on the server...");
    
    // --- Run HubSpot Import if selected ---
    if (options.runHubspot) {
      logOutput.push("\n--- Running HubSpot Import ---");
      try {
        // We'll "borrow" the UI from createSheets to give feedback
        const ui = SpreadsheetApp.getUi();
        const companies = getCompaniesFromHs();
        logOutput.push(`Fetched ${companies.length} companies from HubSpot.`);
        
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        let workingSheet = spreadsheet.getSheetByName(MASTER_SHEET);

        if(!workingSheet) {
          logOutput.push(`Sheet '${MASTER_SHEET}' not found. Creating it...`);
          workingSheet = spreadsheet.insertSheet(MASTER_SHEET);
        }

        let rowMappings = {};
        let cohortMappings = {};
        companies.forEach((company,index) => { 
            const currentRow = STARTING_ROW + (index * ROW_SPACING);
            writeToRow(workingSheet, company.properties, currentRow);
            
            let name = company.properties.name;
            rowMappings[name.toLowerCase()] = currentRow;

            let cohort = company.properties.program_name; 
            if (cohort in cohortMappings) {
              cohortMappings[cohort].push(name);
            } else { 
              cohortMappings[cohort] = [name];
            }
        });
        
        SCRIPT_PROPS.setProperty('ROW_MAPPINGS', JSON.stringify(rowMappings));
        SCRIPT_PROPS.setProperty('COHORTS', JSON.stringify(cohortMappings));
        logOutput.push("✅ Successfully updated Row and Cohort mappings.");

      } catch (e) {
        logOutput.push(`--> ERROR during HubSpot import: ${e.message}`);
      }
    }

    // --- Run PDF Extraction if selected ---
    if (options.runPdf) {
      logOutput.push("\n--- Running PDF Extraction ---");
      // Use the default folder info for now, as UI doesn't select folders anymore
      const folderIds = Object.values(DEFAULT_FOLDER_INFO);
      processCompanyPdfs(folderIds, options.companies, logOutput);
    }
    
    return logOutput.join('\n');
    
  } catch(e) {
    return `\n!!! A CRITICAL ERROR OCCURRED: ${e.message} !!!`;
  }
}