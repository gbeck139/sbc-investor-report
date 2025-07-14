function getSingleCompany(sheet, targetCompanyName) {
  // --- Step 1: Get the 'Name' column from our single source of truth ---
  const nameColumnLetter = UNIFIED_MAPPINGS['Name'].column;
  if (!nameColumnLetter) {
    Logger.log('Error: "Name" column not defined in UNIFIED_MAPPINGS.');
    return null;
  }
  
  foundCell = getCompanyRow(sheet, nameColumnLetter, targetCompanyName);

  // --- Step 3: Process the result ---
  if (foundCell) {
    const companyRow = foundCell.getRow();
    Logger.log(`Found company "${targetCompanyName}" at row ${companyRow}.`);
    
    // PERFECT REUSE: Now that we have the row, use our existing helper
    // to read all the data for that single company.
    const companyData = readRowData(sheet, companyRow);
    companyData.sheetRow = companyRow;
    return companyData; // Returns the full, structured company object
  } else {
    Logger.log(`Company "${targetCompanyName}" not found in the sheet.`);
    return null; // Company not found
  }
}

function getCompanyRow(sheet, nameColumnLetter, targetCompanyName){
  const nameColumnRange = sheet.getRange(`${nameColumnLetter}:${nameColumnLetter}`);

  // --- Step 2: Use TextFinder for a highly optimized search ---
  const textFinder = nameColumnRange.createTextFinder(targetCompanyName.trim());
  textFinder.matchCase(false); // Make the search case-insensitive
  textFinder.matchEntireCell(true); // Ensures "Innovate" doesn't match "Innovate Inc."
  
  return textFinder.findNext(); 
}

function readRowData(sheet, rowNumber) {
  if (!rowNumber) return {}; // Return empty object if row number is invalid

  // --- Efficiency: Read the entire row's data in one API call ---
  const range = sheet.getRange("A" + rowNumber + ":" + finalColumnLetters + rowNumber);
  const rowValues = range.getValues()[0]; // getValues() returns a 2D array, get the first row

  const jsonObject = {};
  for (const fieldName in UNIFIED_MAPPINGS) {
    const mappingInfo = UNIFIED_MAPPINGS[fieldName];
    const column = mappingInfo.column; // e.g., 'A', 'B', 'C'
    const jsonKey = mappingInfo.jsonKey; // e.g., 'name', 'source', 'sector'

    if (column && jsonKey) {
      // Convert column letter ('A') to array index (0)
      const columnIndex = columnLetterToIndex(column);
      
      // Assign the value from the spreadsheet to our clean jsonKey
      jsonObject[jsonKey] = rowValues[columnIndex];
    }
  }
  return jsonObject;
}

function writeToCell(sheet, column, row, value) {
  // Basic handling for array/object data - convert to a readable string
  if (typeof value === 'object' && value !== null) {
    value = JSON.stringify(value, null, 2);
  }
  sheet.getRange(column + row).setValue(value);
}

function columnLetterToIndex(columnLetter) {
  let column = 0;
  let length = columnLetter.length;
  for (let i = 0; i < length; i++) {
    column += (columnLetter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column - 1;
}

function normalizeFields(record) {
  // for (const field of CORE_FIELDS) {
  //   if (!record[field] || record[field] === '') {
  //     record[field] = 'Undisclosed';
  //   }
  // }

  // Clean boolean logic for "Currently Raising?"
  const raisingVal = (record.isCurrentlyRaising.description || '').toString().toLowerCase();
  record.isCurrentlyRaising.description = (raisingVal === 'yes') ? true :
                                 (raisingVal === 'no') ? false : 'Undisclosed';

  return record;
}






/**
 * Fetches a company logo from the Logo API.
 *
 * @param {string} domain The domain of the company (e.g., "google.com").
 * @return {Blob} The company logo as a blob, or null if not found.
 */
function getCompanyLogo(domain) {
  // The endpoint for the Logo API.
  const apiUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;
  const backupURL = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://startupbootcamp.org&size=128`

  try {
    // Make a request to the API, muting error exceptions
    const response = UrlFetchApp.fetch(apiUrl, {
      muteHttpExceptions: true 
    });

    // Get the blob if the request was successful.
    if (response.getResponseCode() == 200) {
      const logoBlob = response.getBlob();
      return logoBlob;
    } else {
      console.error(`Could not fetch logo for ${domain}. Utilizing SBC logo instead. Status code: ${response.getResponseCode()}.`)
      return UrlFetchApp.fetch(backupURL).getBlob();
;
    }
  } catch (error) {
    // Log any other errors that occur during the fetch.
    console.error(`An error occurred while fetching the logo for ${domain}: ${error.toString()}`);
    return UrlFetchApp.fetch(backupURL).getBlob;
  }
}

/**
 * Fetches a country flag from the FlagsAPI.
 * @param {string} countryCode The 2-letter ISO country code (e.g., "US", "CA", "DE").
 * @return {GoogleAppsScript.Base.Blob} The country flag as a blob, or null if not found.
 */
function getCountryFlag(countryCode) {
  // Available styles ('flat' or 'shiny') and size (16, 24, 32, 48, 64).
  const style = 'flat';
  const size = '64';
  const apiUrl = `https://flagsapi.com/${countryCode}/${style}/${size}.png`;

  try {
    const response = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() == 200) {
      return response.getBlob();
    } else {
      console.error(`Could not fetch flag for ${countryCode}. Status code: ${response.getResponseCode()}`);
      return null;
    }
  } catch (error) {
    console.error(`An error occurred while fetching the flag for ${countryCode}: ${error.toString()}`);
    return null;
  }
}