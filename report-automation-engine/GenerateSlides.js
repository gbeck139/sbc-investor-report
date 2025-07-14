

/**
 * Automation to generate Google Slides presentations from a template, populated with company data.
 * This script is used to create one-page investor reports for alumni companies.
 * 
 * Grant Beck
 * SBC Australia
 * 07/07/2025
 */


/**
 * Populates a single slide with company data, replacing placeholders and images.
 * @param {Slide} slide - The Google Slides slide to populate.
 * @param {Object} jsonData - The JSON object containing the company's data.
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

  // Update the images
  for(const img of slide.getImages()){
    const blob = jsonData[img.getDescription()];
    
    // If we have a blob, use it, otherwise remove it!
    blob ? img.replace(jsonData[img.getDescription()]) : img.remove();
  }

  Logger.log('Presentation population complete.');
}

/**
 * Copies a slide from a source presentation to a destination presentation.
 * @param {string} sourcePresentationId - The ID of the source presentation.
 * @param {number} sourceSlideIndex - The index of the slide to copy.
 * @param {Presentation} destination - The destination presentation object.
 * @returns {Slide} The newly created slide object.
 */
function copySlideToPresentation(sourcePresentationId, sourceSlideIndex, destination) { 
  // 1. Open the source and destination presentations
  const sourcePresentation = SlidesApp.openById(sourcePresentationId);
  const destinationPresentation = destination;

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

/**
 * Creates a new Google Slides presentation by copying a template.
 * @param {string} templateId - The ID of the Google Slides template to copy.
 * @param {string} newFileName - The name for the new presentation file.
 * @returns {Presentation} The new Google Slides presentation object.
 */
function createNewDeckFromTemplate(templateId, newFileName) {
  
  // Create a copy
  var templateFile = DriveApp.getFileById(templateId);
  var newFile = templateFile.makeCopy(newFileName);
  
  // Open the new presentation
  var presentation = SlidesApp.openById(newFile.getId());
  // // 4. --- SAVE AND RETURN ---
  Logger.log(`Successfully created new Google Slides deck`);
  return presentation
}