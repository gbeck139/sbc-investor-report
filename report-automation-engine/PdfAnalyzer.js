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

Google slide/ .pptx / docs / sheets/ excel -> Docs Doesn't get read - Tell Trev
to read in

create "working" docs on how to use and maintain the drive
*/

// The prompt for Gemini. The formatting is defined in the generationConfig.
const PROMPT = `You are a helpful assistant that extracts information from company update PDFs.
Based on the provided PDF files, extract the required information.
You are not to find any additional information or create information, only extract. You may paraphrase what the pdf says, but do not search or hallucinate.
If you cannot find a specific piece of information, leave the corresponding field empty or null.`;

// AI configurations 
const model = 'gemini-2.0-flash';
const api = 'generateContent';
const apiKey = SCRIPT_PROPS.getProperty('GEMINI_API_KEY');
const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${api}?key=${apiKey}`;

// Saved script info
const companyMappings = JSON.parse(SCRIPT_PROPS.getProperty(`ROW_MAPPINGS`))
const cohortFolders = JSON.parse(SCRIPT_PROPS.getProperty(`COHORT_FOLDERS`));

/**
 * Main function to initiate the PDF extraction process.
 */
function analyzePDFs(updateCompanies = ['Xempla']) {
  const companyPDFs = {};

  // Use Drive API to search for company update folders directly
  const companyFolderMap = searchCompanyUpdateFolders(updateCompanies);

  // For each company, get the most recent PDF if folder was found
  for (const company of updateCompanies) {
    const companyKey = company.toLowerCase();
    const folderId = companyFolderMap[companyKey];

    if (folderId) {
      Logger.log(`Found folder for ${company}: ${folderId}`);
      const recentPDFs = getCompanyPDFs(folderId);

      if (recentPDFs.length > 0 && companyMappings[companyKey]) 
            companyPDFs[companyKey] = recentPDFs;
          
      else  
        Logger.log(`No PDF found in folder for company: ${company}`);
      }
    else 
      Logger.log(`No Company Updates folder found for: ${company}`);
    
  }

  /* COMMENTED OUT - OLD FOLDER TRAVERSAL CODE
  const cohortCheck = {}
  const companySet = new Set(updateCompanies.map(name => name.toLowerCase()));

  // Create a list of which cohorts we want
  for (var cohortName of updateCohorts) {
    const cohortPrefix = cohortName.match(/^[A-Z]+/);
    if (!cohortPrefix)
      continue;

    cohortCheck[cohortPrefix[0]] = true;
  }

  // Iterate through cohort folders to find the parent folder, skipping if not selected
  for (const foldID of cohortFolders) {

    // Access folder and important info
    const folderObj = DriveApp.getFolderById(foldID);
    const folderName = folderObj.getName();
    const folderPrefix = folderName.match(/^[A-Z]+/);

    if (!folderPrefix || !cohortCheck[folderPrefix[0]])
      continue;

    // Gather the folders of the startups within each parent folder.
    const pdfFolders = getStartupPDFFolders(folderObj);
    if (!pdfFolders) {
      Logger.log(`No PDF folders found in: ${folderName}`);
      continue;
    }

    Logger.log(`Found ${pdfFolders.length} PDF folders in: ${folderName}`);

    // For each folder, get the most recent PDF file
    for (const pdfFolder of pdfFolders) {
      let companyName = pdfFolder.getName();
      companyName = companyName.substring(7, companyName.length - 18).trim().toLowerCase();
      Logger.log(companyName);

      // Skip if not sought after
      if (!companySet.has(companyName))
        continue;

      const recentPDF = getCompanyPDF(pdfFolder.getId());

      // If a PDF is found and is for a company we are mapping, store it to be processed
      if (recentPDF && companyMappings[companyName]) {
        Logger.log(`Found pdf for company ${companyName} titled: ${recentPDF}. This will be placed on row ${companyMappings[companyName]}`)
        companyPDFs[companyName] = recentPDF;
      }
    }
  }
  */

  // For each of the companies we want to update with a PDF, process the PDF files.
  for (const company of updateCompanies) {
    const updatePDFs = companyPDFs[company.toLowerCase()];

    if (updatePDFs && updatePDFs.length > 0) {
      Logger.log(`Processing PDFs for ${company}: ${updatePDFs}`);

      // Call Gemini to extract data from the PDF and write to the sheet
      const geminiData = extractUsingGemini(updatePDFs);
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
 *  @param {Folder} parentFolder - The parent Google Drive folder to search within ie. EN21-23.
 *  @return {Folder[]|null} An array of PDF folders for startups, or null if none found.
 */
function getStartupPDFFolders(parentFolder) {
  const finalFolders = [];
  try {
    const subFolders = parentFolder.getFolders();
    while (subFolders.hasNext()) {

      // Gather all of the folders that are Startup collections
      const subFolder = subFolders.next();
      if (subFolder.getName().includes('Startups')) {
        const startupFolders = subFolder.getFolders();

        // Iterate through all of the different startups 
        while (startupFolders.hasNext()) {
          const startupFolder = startupFolders.next();

          // Skip archives
          if (startupFolder.getName().toLowerCase().includes('archives')) 
            continue;
          
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
function getCompanyPDFs(folderID) {
  const recentPdfs = [];
  const allPdfs = []; 
  let files;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  try {
    const folder = DriveApp.getFolderById(folderID);
    files = folder.getFiles();
  } catch (e) {
    Logger.log(`Error accessing folder with ID ${folderID}: ${e.message}`);
    return null;
  }

  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.PDF) {
      allPdfs.push(file);
      // Check if the PDF was updated in the last 6 months
      if (file.getLastUpdated().getTime() >= sixMonthsAgo.getTime()) 
        recentPdfs.push(file);
      
    }
  }

  // If 2 or more pdfs in the last 6 months, return them all
  if (recentPdfs.length >= 2) 
        return recentPdfs;
  else {
    // Otherwise, sort what we have decending and return two most recent
    allPdfs.sort((a, b) => b.getLastUpdated().getTime() - a.getLastUpdated().getTime());
    return allPdfs.slice(0, 2);
  }
}

/**
 * Converts a PDF file to a Gemini-ready payload string.
 * @param {File} pdfFile The PDF file to convert.
 * @return {string|null} A stringified JSON payload or null on error.
 */
function generateGeminiPayload(pdfFiles) {
  const parts = [
    {text: PROMPT}
  ];
 pdfFiles.forEach(pdfFile => {
    try {
      const pdfBlob = pdfFile.getBlob();
      const pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());
      parts.push({
        inline_data: { mime_type: "application/pdf", data: pdfBase64 }
      });
    } catch (e) {
      Logger.log(`Error getting blob from PDF file: ${e.message}`);
    }
  });

  // Set the proper formatting from COLUMN_MAPPINGS keys
  const formatConfig = {};
  for (const fieldName of Object.keys(UNIFIED_MAPPINGS)) {
    formatConfig[fieldName] = { "type": "string" };
  }

  // Remove fields hubspot already provided.
  delete formatConfig.Name;
  delete formatConfig.Source;
  delete formatConfig.Sector;
  delete formatConfig.Website;


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
      parts: parts // Constructed dynamically above
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
function extractUsingGemini(pdfFiles) {
  const payload = generateGeminiPayload(pdfFiles);

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
 * Search for Company Updates folders using Drive API for specified companies
 * @param {Array} updateCompanies - Array of company names to search for
 * @return {Object} Map of company names (lowercase) to folder IDs, or null if not found
 */
function searchCompanyUpdateFolders(updateCompanies) {
  const companyFolderMap = {};
  const SHARED_DRIVE_ID = '0ANlAdFJelSKxUk9PVA'; 

  for (const company of updateCompanies) {
    const companyKey = company.toLowerCase();
    const searchName = `${company} - Company Updates`;
    
    Logger.log(`Searching for folder: ${searchName}`);
    
    try {
      // Search for folders with the exact company update folder name
      const query = `mimeType='application/vnd.google-apps.folder' and trashed=false and name contains '${company} - Company Updates'`;
      const response = Drive.Files.list({
        q: query,
        driveId: SHARED_DRIVE_ID,
        corpora: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: 'files(id,name)'
      });

      if (response.files && response.files.length > 0) {
        // Take the first match
        companyFolderMap[companyKey] = response.files[0].id;
        Logger.log(`Found folder for ${company}: ${response.files[0].name}`);
      } else {
        // Try with case variations if exact match fails
        const caseVariations = [
          `${company.toLowerCase()} - Company Updates`,
          `${company.toUpperCase()} - Company Updates`,
          `${company}`
        ];
        
        let found = false;
        for (const variation of caseVariations) {
          const varQuery = `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${variation}'`;
          const varResponse = Drive.Files.list({
            q: varQuery,
            driveId: SHARED_DRIVE_ID,
            corpora: 'drive',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            fields: 'files(id,name)'
          });
          
          if (varResponse.files && varResponse.files.length > 0) {
            companyFolderMap[companyKey] = varResponse.files[0].id;
            Logger.log(`Found folder for ${company} with variation: ${variation}, ID: ${varResponse.files[0].id}`);
            found = true;
            break;
          }
        }
        
        if (!found) {
          companyFolderMap[companyKey] = null;
          Logger.log(`No folder found for company: ${company}`);
        }
      }
    } catch (e) {
      Logger.log(`Error searching for ${company}: ${e.message}`);
      companyFolderMap[companyKey] = null;
    }
  }

  return companyFolderMap;
}

/**
 * Writes the extracted information from Gemini to the Google Sheet.
 * @param {string} company The name of the company.
 * @param {Object} geminiData The data extracted from Gemini.
 * @param {Sheet} sheet The Google Sheet to write the data to.
 */
function writeGeminiDataToSheet(company, geminiData, sheet) {
  const row = companyMappings[company.toLowerCase()];
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
    const column = UNIFIED_MAPPINGS[field].column;
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
