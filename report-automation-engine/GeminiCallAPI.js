function callGeminiAPI(prompt) {
  
  const generationConfig = {
    topP: 0.95,
    topK: 64,
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
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${getGeminiApiKey()}`;
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(url, options);
  console.log(response.getContentText());
  const generatedText = ''

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const parsedResponse = JSON.parse(responseBody);
      generatedText = parsedResponse.candidates[0].content.parts[0].text;
      Logger.log(generatedText);
    } else {
      Logger.log(`Error: Received response code ${responseCode}`);
      Logger.log(responseBody);
    }
  } catch (e) {
    Logger.log(`Exception during API call: ${e.message}`);
  }

  return generatedText
}
