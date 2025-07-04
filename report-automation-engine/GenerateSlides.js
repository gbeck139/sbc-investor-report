/**
 * Finds and replaces all {{placeholder}} tags throughout an entire Google Slides presentation
 * with values from a provided JSON data object.
 *
 * @param {GoogleAppsScript.Slides.Presentation} presentation The Google Slides presentation object to modify.
 * @param {Object} jsonData The JSON object containing the data to populate. 
 *   Keys in the object should match the placeholder names (without the curly braces).
 *   Example: { name: "My Company", headquarters: "New York" }
 */
function generateCompanySlideDeck(slide, jsonData) {
  // 1. Loop through each key in the provided JSON data.
  for (const key in jsonData) {
    // Get the value for the current key. If the value is null or undefined, default to an empty string.
    const value = jsonData[key] || '';
    
    // Create the placeholder tag format, e.g., "{{name}}"
    const placeholder = `{{${key}}}`;
    
    // Replace all occurrences of this placeholder throughout the entire presentation.
    slide.replaceAllText(placeholder, value);
  }
  
  // 2. (Optional but Recommended) Clean up any remaining placeholders that were not in the JSON data.
  // This prevents seeing "{{some_unused_tag}}" on the final slides.
  slide.replaceAllText(/\{\{.*?\}\}/g, '');
  
  Logger.log('Presentation population complete.');
}

function copySlideToPresentation(sourcePresentationId, sourceSlideIndex, destinationPresentationId) {
  // 1. Open the source and destination presentations
  const sourcePresentation = SlidesApp.openById(sourcePresentationId);
  const destinationPresentation = SlidesApp.openById(destinationPresentationId);

  // 2. Get the specific template slide from the source
  const templateSlide = sourcePresentation.getSlides()[sourceSlideIndex];

  if (!templateSlide) {
    throw new Error(`Slide not found at index ${sourceSlideIndex} in source presentation.`);
  }

  // 3. Insert the slide into the destination presentation at the specified index
  const newSlide = destinationPresentation.insertSlide(destinationPresentation.getSlides().length, templateSlide);
  
  Logger.log(`Successfully copied slide to destination presentation.`);
  
  // 4. Return the newly created slide object
  return newSlide;
}


function copyVerticalTemplate() {
  var TEMPLATE_ID = '1HphW-gruSiMlAeKmbH52RHkgXOp3GwIUZuE8ZqlQ0Uo';
  
  // Create a copy
  var templateFile = DriveApp.getFileById(TEMPLATE_ID);
  var newFile = templateFile.makeCopy('TEST One Pager');
  
  // Open the new presentation
  var presentation = SlidesApp.openById(newFile);
  // // 4. --- SAVE AND RETURN ---
  Logger.log(`Successfully created Google Slides report: ${presentation.getUrl()}`);
  return presentation
}

function getTestDeck(){
  var presentation = SlidesApp.openById('18bDOGtxxf21olSUD0JzJ1jULGNrO-oa0iiCAQ8L_Dgw');
  return presentation;
}