
// --- WEB APP FUNCTIONS ---

const COHORT_LIST = {};

/**
 * Serves the initial HTML for the web application.
 * This function is automatically called when a user visits the web app's URL.
 * @param {Object} e - The event parameter for a Google Apps Script web app request.
 * @returns {HtmlOutput} The HTML content to be displayed to the user.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('SBC Update Processor')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Fetches company data from HubSpot, maps companies to cohorts,
 * and calculates their starting row in the Google Sheet.
 * Stores the resulting mappings in Script Properties for later use.
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
 * Performs initial setup tasks when the web app is loaded.
 * This includes updating the list of cohort folders from Google Drive and mapping companies from HubSpot.
 * @returns {Object} A dictionary of cohorts and their associated companies, used to populate the UI.
 */
function getInitialData() {
  updateFolders(DRIVE_IDS);
  mapCompanies();
  return COHORT_LIST;
}

/**
 * Scans specified Google Drive folders to find and store the IDs of cohort folders.
 * This is used to locate company update documents later in the process.
 * @param {string[]} sharedDriveIds - A list of Google Drive IDs to search within.
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
            console.log(`Error processing folder ${folderObj.name}: ${e.message}`);
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

    console.log(`Successfully created a trigger for ${TARGET_FUNCTION_NAME} to run every minute.`);
    // This return value can be sent back to your web app's success handler.
    return `Success: Trigger created for ${TARGET_FUNCTION_NAME}.`;

  } catch (e) {
    console.log(`Error creating trigger: ${e.toString()}`);
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
        console.log(`Deleted pre-existing trigger with ID: ${trigger.getUniqueId()}`);
      }
    }
  } catch (e) {
    console.log(`Error deleting trigger: ${e.toString()}`);
  }
}

/**
 * The core function executed by the time-driven trigger.
 * It processes one company from the queue stored in Script Properties at a time.
 * This trigger-based approach avoids exceeding Google Apps Script's execution time limits.
 */
function companyTrigger() {

  // Gather and parse the infromation to process from the properties
  const options = JSON.parse(SCRIPT_PROPS.getProperty('PROCESS_QUEUE')); 
  let workingOps = options[0];
  let comps = workingOps.companies;

  console.log(`Process Queue: Working on ${comps}.`)

  // Select just one company for now and update the settings
  const company = comps.splice(0, 1);
  options[0].companies = comps;


  // If on the last company, move on to the next process or delete it all and finish
  if (comps.length === 0) 
    if (options.length === 1){
      deleteExistingTrigger();
      SCRIPT_PROPS.deleteProperty('PROCESS_QUEUE');
    } else      
      options.splice(0,1);  // Set up the next round to start the new processes

  // Relog the options with one company removed
  SCRIPT_PROPS.setProperty('PROCESS_QUEUE', JSON.stringify(options));

  // Run the selected methods for the controlled amount of companies passed by triggers
  if (workingOps.runPdf) {
    console.log("Grant will look into it");

    analyzePDFs(company);
  }

  if (workingOps.runGemini) {
    console.log("You totally ran gemini");

    geminiSearch(company);
  }
  if (workingOps.runSynthesis) {
    console.log("Grant got cream cheese on the motherboard sorry!!");

    synthesizeData(company);
  }

  // Check for the final company to create a deck if needed
  if (comps.length === 0 && workingOps.runDeck)
      deckCreation(workingOps.deck)
}

/**
 * The main function called by the UI to start all processes.
 * It takes an options object from the frontend, saves it to Script Properties,
 * and creates a time-driven trigger to handle the processing queue.
 * @param {object} options - An object containing the user's selections from the UI.
 *   - {string[]} companies: A list of company names to process.
 *   - {string[]} cohorts: A list of selected cohorts.
 *   - {boolean} runHubspot: Whether to run the HubSpot import.
 *   - {boolean} runPdf: Whether to run the PDF analysis.
 *   - {boolean} runGemini: Whether to run the Gemini web search.
 *   - {boolean} runSynthesis: Whether to run the data synthesis.
 *   - {boolean} runDeck: Whether to generate the final slide deck.
 * @returns {string} A log of the initial actions taken.
 */
function runProcesses(options) {
  const logOutput = [];

  try {
    logOutput.push("Process started on the server...");

    // Run HubSpot Import if selected 
    if (options.runHubspot) {
      logOutput.push("\n--- Running HubSpot Import ---");

      createSheets(options.companies);
    }

    // If only running hubspot and a deck, skip the trigger mechanism
    if (!options.runGemini && !options.runSynthesis && !options.runPdf){
      if (options.runDeck)
        deckCreation(options.companies);
              
      console.log(`Processes finished, returning before trigger creation`);
      return;
    }

    // If running a deck, save which companies to do it for.
    if(options.runDeck)
      options['deck'] = options.companies;

    // Initilize options to the old list, or a new empty one
    let oldOps = SCRIPT_PROPS.getProperty('PROCESS_QUEUE');
    oldOps = oldOps ? JSON.parse(oldOps) : [];

    // Add the new operations and store them
    oldOps = oldOps.concat([options]);
    let opsString = JSON.stringify(oldOps);
    SCRIPT_PROPS.setProperty('PROCESS_QUEUE', opsString);
    console.log(opsString);

    //Start triggering company selections which will scrape from script props
    createMinuteTrigger();

    return logOutput.join('\n');

  } catch (e) {
    return `\n!!! A CRITICAL ERROR OCCURRED: ${e.message} !!!`;
  }
}
