
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

// The name of the function to be triggered every minute
const TARGET_FUNCTION_NAME = 'companyTrigger';

/**
 * Creates a new time-driven trigger that runs every minute.
 * It's designed to be called from a web app's front-end using google.script.run.
 * It first deletes any existing trigger for the target function to prevent duplicates.
 */
function createMinuteTrigger() {
  try {
    // Delete existing triggers before creating a new one.
    deleteExistingTrigger();

    // Create a new trigger to run the target function every minute.
    ScriptApp.newTrigger(TARGET_FUNCTION_NAME)
      .timeBased()
      .everyMinutes(1)
      .create();

    Logger.log(`Successfully created a trigger for ${TARGET_FUNCTION_NAME} to run every minute.`);
    // This return value can be sent back to your web app's success handler.
    return `Success: Trigger created for ${TARGET_FUNCTION_NAME}.`;

  } catch (e) {
    Logger.log(`Error creating trigger: ${e.toString()}`);
    // This error will be sent back to your web app's failure handler.
    throw new Error(`Failed to create trigger. Error: ${e.message}`);
  }
}

/**
 * Finds and deletes any trigger that is set to run the target function.
 * This is a helper function called by createMinuteTrigger to avoid creating duplicate triggers.
 */
function deleteExistingTrigger() {
  try {
    const allTriggers = ScriptApp.getProjectTriggers();
    for (const trigger of allTriggers) {
      if (trigger.getHandlerFunction() === TARGET_FUNCTION_NAME) {
        ScriptApp.deleteTrigger(trigger);
        Logger.log(`Deleted pre-existing trigger with ID: ${trigger.getUniqueId()}`);
      }
    }
  } catch (e) {
    Logger.log(`Error deleting trigger: ${e.toString()}`);
    // We don't throw an error here because failing to delete an old trigger
    // shouldn't necessarily stop the creation of a new one.
  }
}

function companyTrigger() {

  // Gather and parse the infromation to process from the properties
  const options = JSON.parse(SCRIPT_PROPS.getProperty('PROCESS_QUEUE'));


  const comps = options.companies;
  // Upon the completion of all processes, delete the trigger and finish
  if (comps.length === 0) {
    deleteExistingTrigger();
    return;
  }

  // Select just one company for now
  const company = comps.splice(0, 1);

  console.log(company, comps);

  // Relog the options with one company removed
  options.companies = comps;
  SCRIPT_PROPS.setProperty('PROCESS_QUEUE', JSON.stringfiy(options));

  // Run the selected methods for the controlled amount of companies passed by triggers
  if (options.runPdf) {
    console.log("Grant will look into it");
    analyzePDFs(company, options.cohorts);
  }

  if (options.runGemini) {
    console.log("You totally ran gemini")

    geminiSearch(company);

  }
  if (options.runOnePager) {

    console.log("Grant got cream cheese on the motherboard sorry!!")

    synthesizeAndCreateDeck(company);
  }


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

    // Check for already existing run options and update them.
    const oldOptions = JSON.parse(SCRIPT_PROPS.getProperty('PROCESS_QUEUE'));

    oldOptions.companies.concat(options.companies);
    oldOptions.runPdf = oldOptions.runPdf || options.runPdf;
    oldOptions.runGemini = oldOptions.runGemini || options.runGemini;
    oldOptions.runOnePager = oldOptions.runOnePager || options.runOnePager;

    // Store the options we want to process
    SCRIPT_PROPS.setProperty('PROCESS_QUEUE', JSON.stringify(oldOptions));

    //Start triggering company selections which will scrape from script props
    createMinuteTrigger();

    return logOutput.join('\n');

  } catch (e) {
    return `\n!!! A CRITICAL ERROR OCCURRED: ${e.message} !!!`;
  }
}