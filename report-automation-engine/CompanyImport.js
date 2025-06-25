/**
 * Script to extract, process, and write company updates from Google Drive.
 * This script works in three steps:
 *  1. Searches through the specified folders to find startup PDF updates.
 *  2. Sends the PDF file directly to a multimodal Gemini model for processing.
 *  3. Writes the extracted information to a Master Google Sheet for further analysis.
 * 
 * @copyright SBC
 * @author Matt Sebahar
 * @date 19/6/2025
 */


// ----TODO----
/*
"Select all companies - Select all companies within the "available companies"

Attempt to grab any pdf within the last 6 months

Google slide/ .pptx / docs / sheets/ excel 
to read in

update parent to be drive instead of cohorts 
  -> remove folder search info and have it created from parsing

  create "working" docs on how to use and maintain the drive
*/

// Get properties to access stored values
SCRIPT_PROPS = PropertiesService.getScriptProperties();

// Defines the folder Name and IDs for which the search will be performed upon. 
const FOLDER_SEARCH_INFO = {
//     'DC': '1_cb6HQPeZDPU0nczgScYlB2K7iuAXUuC',
//     'EA': '1JgRA1MQpWPNB8Sj65MfyOA8Vbn2Gc0__', 
     'EN': '1KG4ry2Tyhn5UVZO-LC2ob6jyIE_E2PiM',
//     'FI': '1oFceezKoGi-d_rabgqs-xZQ7j574BXi2', 
//     'FT': '1xkTbTCIoCBP5AlB6uINEVKJU320iUi7O', 
//     'SE': '1fkK0_KQ8Wym2rGLoHvFoYDjZnKudXU8G',
//    'SFF': '1U6mNtBdsGblFsQk8LasnZ6_JbBuU04EY'
};

// Temporarily creating a list, but will be updated on which companies to update
const COMPANIES_TO_UPDATE = [
    'NeedEnergy',
];

// The prompt for Gemini. The formatting is defined in the generationConfig.
const PROMPT = `You are a helpful assistant that extracts information from company update PDFs.
Based on the provided PDF file, extract the required information.
You are not to find any additional information or create information, only extract. You may paraphrase what the pdf says, but do not search or hallucinate.
If you cannot find a specific piece of information, leave the corresponding field empty or null.`;

// AI configurations 
const model = 'gemini-2.0-flash';
const api = 'generateContent';
const apiKey = SCRIPT_PROPS.getProperty('GEMINI_API_KEY');
const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${api}?key=${apiKey}`;

// Gather document properties to access mappings
const rowMappings = JSON.parse(SCRIPT_PROPS.getProperty('ROW_MAPPINGS'));
const cohorts = JSON.parse(SCRIPT_PROPS.getProperty('COHORTS'));

/**
 * Main function to initiate the PDF extraction process.
 */
// needs to accept cohorts , companies
function importPDFs() {
    let companyPDFs = {};
    // Iterate through cohort folder ID to find the parent folder.
    for (const folderID of Object.values(FOLDER_SEARCH_INFO)) {
        let parentFolder;
        try {
            parentFolder = DriveApp.getFolderById(folderID);
            if (!parentFolder) {
                Logger.log(`No folder found with ID: ${folderID}`);
                continue;
            }
        } catch (e) {
            Logger.log(`Error processing folder ${folderID}: ${e.message}`);
            continue;
        }
        
        // Gather the folders of the startups within each parent folder.
        const pdfFolders = getStartupPDFFolders(parentFolder);
        if (!pdfFolders) {
            Logger.log(`No PDF folders found in: ${folderID}`);
            continue;
        }

        Logger.log(`Found ${pdfFolders.length} PDF folders in: ${folderID}`);

        // For each folder, get the most recent PDF file
        for (const pdfFolder of pdfFolders) {
            const recentPDF = getCompanyPDF(pdfFolder.getId());
            let companyName = pdfFolder.getName();
            companyName = companyName.substring(7, companyName.length - 18)

            // If a PDF is found and is for a company we are mapping, store it to be processed
            if (recentPDF && rowMappings[companyName.toLowerCase()]) {
                Logger.log(`Found pdf for company ${companyName} titled: ${recentPDF}. This will be placed on row ${rowMappings[companyName.toLowerCase()]}`)
                companyPDFs[companyName.toLowerCase()] = recentPDF;
            }
        }
    }

    // For each of the companies we want to update, process the PDF files.
    for (const company of COMPANIES_TO_UPDATE) {
        const updatingCompany = company.toLowerCase();
        const updatePDF = companyPDFs[updatingCompany];

        if (updatePDF) {
            Logger.log(`Processing PDF for ${company}: ${updatePDF.getName()}`);

            // Call Gemini to extract data from the PDF and write to the sheet
            const geminiData = extractUsingGemini(updatePDF);
            if (geminiData) {
                const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MASTER_SHEET);
                writeGeminiDataToSheet(company, geminiData, sheet);
            } else {
                Logger.log(`Failed to get data from Gemini for ${company}.`);
            }
        } else {
            Logger.log(`No PDF found for company: ${company}`);
        }
    }
}

/**
 *  Searches through the specified parent (cohort) folder to collect a list of startup folders.
 * 
 *  @param {Folder} parentFolder - The parent Google Drive folder to search within.
 *  @return {Folder[]|null} An array of PDF folders for startups, or null if none found.
 */
function getStartupPDFFolders(parentFolder) {
    const finalFolders = [];
    try {
        const subFolders = parentFolder.getFolders();
        while (subFolders.hasNext()) {
            const subFolder = subFolders.next();
            if (subFolder.getName().includes('Startups')) {
                const startupFolders = subFolder.getFolders();
                while (startupFolders.hasNext()) {
                    const startupFolder = startupFolders.next();
                    if (startupFolder.getName().toLowerCase().includes('archives')) continue;
                    const pdfFolderName = startupFolder.getName() + ' - Company Updates';
                    const pdfFolder = startupFolder.getFoldersByName(pdfFolderName);
                    if (pdfFolder.hasNext()) finalFolders.push(pdfFolder.next());
                }
            }
        }
    } catch (e) {
        Logger.log(`Error while searching for startup folders: ${e.message}`);
    }
    return finalFolders.length > 0 ? finalFolders : null;
}

/**
 * Extracts the most recently updated PDF file from a specific folder.
 * 
 * @param {string} folderID The ID of the Google Drive folder to search for PDF files.
 * @return {File|null} The most recently updated PDF file, or null if none found or on error.
 */
function getCompanyPDF(folderID) {
    let mostRecentPDF = null;
    let files;
    try {
        const folder = DriveApp.getFolderById(folderID);
        files = folder.getFiles();
    } catch (e) {
        Logger.log(`Error accessing folder with ID ${folderID}: ${e.message}`);
        return null;
    }
    while (files.hasNext()) {
        const file = files.next();
        if (file.getMimeType() === MimeType.PDF && (!mostRecentPDF || file.getLastUpdated() > mostRecentPDF.getLastUpdated())) {
            mostRecentPDF = file;
        }
    }
    return mostRecentPDF;
}

/**
 * Converts a PDF file to a Gemini-ready payload string.
 * @param {File} pdfFile The PDF file to convert.
 * @return {string|null} A stringified JSON payload or null on error.
 */
function generateGeminiPayload(pdfFile) {
    let pdfBlob;
    try {
        pdfBlob = pdfFile.getBlob();
    } catch (e) {
        Logger.log(`Error getting blob from PDF file: ${e.message}`);
        return null;
    }

    const pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());

    // Set the proper formatting from COLUMN_MAPPINGS keys
    const formatConfig = {};
    for (const fieldName of Object.keys(COLUMN_MAPPINGS)) {
        formatConfig[fieldName] = { "type": "string" };
    }

    // Remove fields hubspot already provided.
    delete COLUMN_MAPPINGS.Name;
    delete COLUMN_MAPPINGS.Source;
    delete COLUMN_MAPPINGS.Sector;
    delete COLUMN_MAPPINGS.Website;
    
    // Define the generation configuration for Gemini
    const generationConfig = {
        "temperature": 0.00,
        "topP": 0.95,
        "topK": 40,
        "maxOutputTokens": 8192,
        "responseMimeType": "application/json",
        "responseSchema": {
            type: 'object',
            properties: formatConfig, 
        },
    };

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: PROMPT },
                { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
            ]
        }],
        generationConfig,
    };

    return JSON.stringify(payload);
}

/**
 * Calls Gemini to process the PDF file and extract relevant information.
 * @param {File} pdfFile The file of the PDF to process.
 * @return {Object|null} The parsed JSON object from Gemini or null on error.
 */
function extractUsingGemini(pdfFile) {
    const payload = generateGeminiPayload(pdfFile);

    if (!payload) {
        Logger.log("Failed to generate payload for Gemini.");
        return null;
    }

    const options = {
        'method': 'POST',
        'contentType': 'application/json',
        'payload': payload,
        'muteHttpExceptions': true
    };

    try {
        // Make the API call to Gemini
        const response = UrlFetchApp.fetch(apiURL, options);
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();

        // Check if the response is successful, and parse the response
        if (responseCode === 200) {
            const parsedResponse = JSON.parse(responseBody);
            if (parsedResponse.candidates && parsedResponse.candidates[0].content.parts[0].text) {
                const geminiContentString = parsedResponse.candidates[0].content.parts[0].text;
                return JSON.parse(geminiContentString); // Return the final data object
            } else {
                Logger.log(`Gemini API response was successful but malformed. Body: ${responseBody}`);
                return null;
            }
        } else {
            Logger.log(`Gemini API Error: ${responseCode} - ${responseBody}`);
            return null;
        }
    } catch (e) {
        Logger.log(`Failed to call or parse Gemini API response. Error: ${e.toString()}`);
        return null;
    }
}

/**
 * Writes the extracted information from Gemini to the Google Sheet.
 * @param {string} company The name of the company.
 * @param {Object} geminiData The data extracted from Gemini.
 * @param {Sheet} sheet The Google Sheet to write the data to.
 */
function writeGeminiDataToSheet(company, geminiData, sheet) {
    const row = rowMappings[company.toLowerCase()];
    if (!row) {
        Logger.log(`No row mapping found for company: ${company}`);
        return;
    }

    if (!geminiData || typeof geminiData !== 'object') {
        Logger.log(`Invalid Gemini data for ${company}. Aborting write.`);
        return;
    }
    Logger.log(`Writing data for ${company} to row ${row} in the sheet.`);

    for (const [field, value] of Object.entries(geminiData)) {
        const column = COLUMN_MAPPINGS[field];
        if (column && value != `null`) {
            try {
                // Get the cell indexing from column and row
                let cellIndex = column + row;
                sheet.getRange(cellIndex).setValue(value);
                Logger.log(`Wrote ${field} to ${cellIndex} for ${company}: ${value}`);
            } catch (e) {
                Logger.log(`Error writing to sheet for ${company} at row ${row}, col ${column}. Key: ${key}, Value: ${value}. Error: ${e.message}`);
            }
        }
    }
    Logger.log(`Data for ${company} written to row ${row} in the sheet.`);
}



