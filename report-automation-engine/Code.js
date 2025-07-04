
// --- WEB APP FUNCTIONS ---

const COHORT_LIST = {};


function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('SBC Update Processor')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 *  Function to get the information from hubspot and create a cohort mapping list
 */
function mapCompanies() {
  const rowMaps = {}
  getCompaniesFromHs().forEach((company, i) => {
    const cohort = company.properties.program_name;
    const name = company.properties.name;
    
    rowMaps[name.toLowerCase()] = ROW + (ROW_SPACING * i);

    if (cohort in COHORT_LIST)
      COHORT_LIST[cohort].push(name);
    else
      COHORT_LIST[cohort] = [name];
  });

  // Save the properties for use later in the script.
  const props = {
    'ROW_MAPPINGS': JSON.stringify(rowMaps),
    'COHORTS': JSON.stringify(COHORT_LIST)
  }
  SCRIPT_PROPS.setProperties(props);
}

/**
 * Performs any startup commands and return information required for builiding webpage
 */
function getInitialData() {
  updateFolders(DRIVE_IDS);
  mapCompanies();
  return COHORT_LIST;
}

/**
 * Function to access the list of folder IDs from the specified (shared) Google Drive.
 * Returns just the top level as that is where a cohorts would be found
 * 
 * @param {List{String}} sharedDriveIds - A list of IDs to search within.
 */
function updateFolders(sharedDriveIds = ['0ANlAdFJelSKxUk9PVA']) {
  var pageToken = null;
  const folders = [];
  for (const sharedDriveId of sharedDriveIds) {
    do {
      var response = Drive.Files.list({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false and '" + sharedDriveId + "' in parents",
        driveId: sharedDriveId,
        corpora: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageToken: pageToken
      });

      // If we get a response, iterate through it
      if (response.files && response.files.length > 0)
        for (const folderObj of response.files) {
          try {
            const parentFolder = DriveApp.getFolderById(folderObj.id);

            // Check that the parent folder is valid and is a Cohort Year (numbers in name)
            if (!parentFolder || parentFolder.getName().replace(/\D/g, '') === '')
              continue;

            folders.push(parentFolder.getId());

          } catch (e) {
            Logger.log(`Error processing folder ${folderObj.name}: ${e.message}`);
            continue;
          }
        }

      // Continue grabbing the next page till finished
      pageToken = response.nextPageToken;
    }
    while (pageToken);
  }

  SCRIPT_PROPS.setProperty(`COHORT_FOLDERS`, JSON.stringify(folders));
}

/**
 * Checks if a cohort name (e.g., "FT21") belongs within a folder name's range (e.g., "FT19-21").
 * @param {string} folderName The name of the Google Drive folder.
 * @param {string} cohortName The name of the cohort from the UI.
 * @return {boolean} True if the cohort is contained within the folder's range.
 */
function containsCohort(folderName, cohortName) {
  // Regex to extract the cohort prefix 
  const prefixRegex = /^[A-Z]+/;

  // Check the prefix fulfills the regex
  const cohortPrefix = cohortName.match(/^[A-Z]+/);
  if (!cohortPrefix)
    return false;

  // Return whether the prefixes match
  return folderName.startsWith(cohortMatch[0]);
}

/**
 * The MAIN function called by the UI to start all processes.
 * It takes an options object from the frontend.
 * @param {object} options {companies: string[], cohorts: string[] runHubspot: boolean, runPdf: boolean }
 */
function runProcesses(options) {
  const logOutput = [];
  try {
    logOutput.push("Process started on the server...");

    // --- Run HubSpot Import if selected ---
    if (options.runHubspot) {
      logOutput.push("\n--- Running HubSpot Import ---");

      createSheets(options.companies);
    }

    // --- Run PDF Extraction if selected ---
    if (options.runPdf) {
      logOutput.push("\n--- Running PDF Extraction ---");

      analyzePDFs(options.companies, options.cohorts);
    }

    if (options.runGemini) {
      logOutput.push("\n--- Running External Search ---");

      Logger.log("You totally ran gemini")

      geminiSearch(options.companies);

    }
    if (options.runOnePager) {
      logOutput.push("\n--- Running OnePager Creation ---");

      Logger.log("Grant got cream cheese on the motherboard sorry!!")

      // Replace with method call  -- createOnePager(options.companies);

    }

    return logOutput.join('\n');

  } catch (e) {
    return `\n!!! A CRITICAL ERROR OCCURRED: ${e.message} !!!`;
  }
}