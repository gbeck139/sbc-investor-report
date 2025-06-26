function callGeminiAPI(model, prompt, grounding) {
  let tools = []
  if (grounding){
    tools = [
      {
      googleSearch: {} // Enables Google Search grounding
      },
    // {
    //   urlContext: {}   // Enables URL context reading
    // }
    ];
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
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
        ],
      },
    ],
    tools: tools
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getGeminiApiKey()}`;
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  let generatedText = '';

    try {
        const apiResponse = UrlFetchApp.fetch(url, options);
        const responseCode = apiResponse.getResponseCode();
        const responseBody = apiResponse.getContentText();

        if (responseCode === 200) {
            const parsedResponse = JSON.parse(responseBody);

            if (parsedResponse.candidates && parsedResponse.candidates[0]) {
                const candidate = parsedResponse.candidates[0]; // Get the first candidate object
                generatedText = candidate.content.parts[0].text
                // Log the metadata from the candidate object
                if (grounding && candidate.groundingMetadata) {
                    Logger.log("Supports:\n" + JSON.stringify(candidate.groundingMetadata.groundingSupports, null, 2));
                    Logger.log("Chunks:\n" + JSON.stringify(candidate.groundingMetadata.groundingChunks, null, 2));
                    generatedText = addCitations(candidate); 
                } else {
                    Logger.log("Grounding Metadata was not present in this response.");
                }

                generatedText = cleanJsonString(generatedText)
                Logger.log("Final Text (with citations if grounded)" + generatedText);
            } else {
                Logger.log("WARNING: Gemini response structure is not as expected, 'candidates' field not found.");
            }
        } else {
            Logger.log(`Error: Received response code ${responseCode}`);
        }
    } catch (e) {
        Logger.log(`Exception during API call or parsing: ${e.message}`);
    }

    return generatedText;
}


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
                    // This creates a markdown-style link for clarity
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

  // Now, reliably handle the closing fence at the end of the string
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.slice(0, -3);
  }

  // Return the cleaned text, trimmed again to remove any final whitespace
  return cleanText.trim();
}