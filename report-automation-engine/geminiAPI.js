/**
 * A dedicated script for making calls to the Gemini API.
 * This script handles API requests, including grounding (web search) and retries.
 * 
 * Grant Beck
 * SBC Australia
 * 12/06/2025
 */

/**
 * Makes a call to the Gemini API with a given prompt and model.
 * Handles API requests, including grounding (web search) and retries.
 * @param {string} model - The name of the Gemini model to use (e.g., 'gemini-2.5-pro').
 * @param {string} prompt - The user prompt to send to the model.
 * @param {boolean} grounding - Whether to enable grounding (Google Search) for the request.
 * @returns {string} The text content from the Gemini API response.
 * @throws {Error} If the API call fails after multiple retries.
 */
function callGeminiAPI(model, prompt, grounding) {
  const maxRetries = 3;
  let lastError = null;

  let tools = [];
  if (grounding) {
    tools = [{
      googleSearch: {}
    }];
  }

  const generationConfig = {
    topP: 0.95,
    topK: 64,
    temperature: 0,
    maxOutputTokens: 65536,
    responseMimeType: 'text/plain',
  };

  const payload = {
    generationConfig,
    contents: [{
      role: 'user',
      parts: [{
        text: prompt
      }],
    }, ],
    tools: tools
  };

  let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getGeminiApiKey()}`;
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (model == 'gemini-2.5-pro' && i > 1){
        model = 'gemini-2.5-pro-preview-03-25'
        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getGeminiApiKey()}`;
      }

      const apiResponse = UrlFetchApp.fetch(url, options);
      const responseCode = apiResponse.getResponseCode();
      const responseBody = apiResponse.getContentText();

      if (responseCode === 200) {
        Logger.log("Got response 200");
        const parsedResponse = JSON.parse(responseBody);

        if (
          parsedResponse.candidates &&
          parsedResponse.candidates[0] &&
          parsedResponse.candidates[0].content &&
          parsedResponse.candidates[0].content.parts &&
          parsedResponse.candidates[0].content.parts[0] &&
          parsedResponse.candidates[0].content.parts[0].text
        ) {
          const candidate = parsedResponse.candidates[0];
          let generatedText = candidate.content.parts[0].text;

          if (grounding && candidate.groundingMetadata) {
            Logger.log("Supports:\n" + JSON.stringify(candidate.groundingMetadata.groundingSupports, null, 2));
            Logger.log("Chunks:\n" + JSON.stringify(candidate.groundingMetadata.groundingChunks, null, 2));
            generatedText = addCitations(candidate);
          } else {
            Logger.log("Grounding Metadata was not present in this response.");
          }
          generatedText = cleanJsonString(generatedText);
          Logger.log("Final Text (with citations if grounded)" + generatedText);
          return generatedText;
        } else {
          const finishReason = parsedResponse.candidates && parsedResponse.candidates[0] ? parsedResponse.candidates[0].finishReason : 'unknown';
          lastError = new Error(`Invalid Gemini API response format. Finish Reason: ${finishReason}`);
          Logger.log(`WARNING: Candidate found but it has no text parts. Finish Reason: ${finishReason}. Attempt ${i + 1}/${maxRetries}`);
          Logger.log("Problematic JSON response:", JSON.stringify(parsedResponse, null, 2));
        }
      } else {
        lastError = new Error(`API call failed with response code ${responseCode}: ${responseBody}`);
        Logger.log(`Error: Received response code ${responseCode} on attempt ${i + 1}/${maxRetries}. Body: ${responseBody}`);
      }
    } catch (e) {
      lastError = e;
      Logger.log(`Exception during API call or parsing on attempt ${i + 1}/${maxRetries}: ${e.message}`);
    }

    if (i < maxRetries - 1) {
      Logger.log("Retrying in 5 seconds...");
      Utilities.sleep(5000);
    }
  }

  Logger.log(`All API call attempts failed. Last error: ${lastError.message}`);
  throw new Error(`API call failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

/**
 * Injects citation links into the generated text from the Gemini API.
 * @param {Object} candidate - The candidate object from the Gemini API response.
 * @returns {string} The text with added citations.
 */
function addCitations(candidate) { 
    let text = candidate.content.parts[0].text;
    const supports = candidate.groundingMetadata?.groundingSupports;
    const chunks = candidate.groundingMetadata?.groundingChunks;

    if (!supports || !chunks) {
        Logger.log("No 'groundingSupports' or 'groundingChunks' found. Returning original text.");
        return text; // Return the original text if there's nothing to cite.
    }

    const sortedSupports = Array.isArray(supports) ? [...supports].sort(
        (a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0)
    ) : [];

    for (const support of sortedSupports) {
        const endIndex = support.segment?.endIndex;
        if (endIndex === undefined || !support.groundingChunkIndices?.length) {
            continue;
        }

        const citationLinks = support.groundingChunkIndices
            .map(i => {
                const title = chunks[i]?.web?.title;
                if (title) {
                    return `(${title})`; 
                }
                return null;
            })
            .filter(Boolean); // Filter out any nulls if a chunk had no URI

        if (citationLinks.length > 0) {
            const citationString = " " + citationLinks.join(" ");
            text = text.slice(0, endIndex) + citationString + text.slice(endIndex);
        }
    }
    return text;
}

/**
 * Cleans the raw text response from the Gemini API, removing markdown code fences.
 * @param {string} rawText - The raw text to clean.
 * @returns {string} The cleaned text, ready for JSON parsing.
 */
function cleanJsonString(rawText) {
  if (!rawText) return "";

  let cleanText = rawText.trim();

  // Handle the ```json wrapper
  if (cleanText.startsWith("```json")) {
    // Find the first newline character
    const firstNewlineIndex = cleanText.indexOf('\n');
    
    if (firstNewlineIndex !== -1) {
      // If a newline is found, take the substring starting just after it
      cleanText = cleanText.substring(firstNewlineIndex + 1);
    } else {
      // Fallback in case there's no newline (e.g., "```json{...}")
      cleanText = cleanText.substring(7);
    }
  } 
  // Handle the simple ``` wrapper
  else if (cleanText.startsWith("```")) {
    const firstNewlineIndex = cleanText.indexOf('\n');
    if (firstNewlineIndex !== -1) {
      cleanText = cleanText.substring(firstNewlineIndex + 1);
    } else {
       // Fallback for "```{...}"
      cleanText = cleanText.substring(3);
    }
  }
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.slice(0, -3);
  }

  return cleanText.trim();
}