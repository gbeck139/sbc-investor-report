# Investor Report Automation Engine

This Google Apps Script project automates the generation of one-page investor reports for alumni companies of the Startupbootcamp program. It pulls data from various sources, including HubSpot, Google Drive, and external web searches using the Gemini API, to create a comprehensive and up-to-date overview of each company.

## Core Functionality

The primary objective of this project is to streamline the creation of investor reports by automating the following processes:

1.  **Data Aggregation:**
    *   **HubSpot:** Imports company data directly from HubSpot, including key metrics, contact information, and program details.
    *   **Google Drive:** Scans designated Google Drive folders for company update documents (PDFs) and extracts relevant information.
    *   **Gemini Search:** Utilizes the Gemini API with grounding to perform web searches and gather the latest news, financial data, and other public information.

2.  **Data Synthesis:**
    *   The collected data from all sources is processed and written to a "Master Sheet" in Google Sheets.
    *   A synthesizer prompt is used with the Gemini API to analyze and synthesize the aggregated data, creating a unified and coherent narrative for each company.
    *   The synthesized information is then written to a "Final Sheet" in Google Sheets.

3.  **Report Generation:**
    *   The final, synthesized data is used to populate a pre-designed Google Slides template.
    *   Each company's report is generated as a single-page slide, providing a concise and visually appealing overview for investors.

### AI-Powered Workflow

The project leverages a sophisticated multi-step AI process to ensure both high-quality data analysis and efficient processing. This is achieved by using two different Gemini models, each suited for its specific task:

*   **Analysis and Synthesis (Gemini 2.5 Pro):** The more complex analytical tasks are handled by Gemini 2.5 Pro.
    *   In `GeminiSearch.js`, it performs grounded web searches to find the latest public information.
    *   In `PdfAnalyzer.js`, it extracts structured data from unstructured PDF documents.
    *   In `GeminiSynthesis.js`, it takes on the most complex task: analyzing and reconciling potentially conflicting data from HubSpot, PDFs, and web searches to create a single, coherent source of truth.

*   **Data Formatting (Gemini 2.0 Flash):** After the analysis and synthesis steps, the powerful but more expensive model's text output is passed to Gemini 2.0 Flash. This smaller, faster model is exclusively used for a critical, high-speed task: converting the natural language output into a strictly valid JSON format. This two-model approach optimizes for both analytical depth and operational efficiency.

## Project Structure

The project is organized into several script files, each responsible for a specific part of the automation process:

*   **`Code.js`:** Contains the main web app functions, including the user interface (UI) for initiating the process and managing the execution flow.
*   **`Constants.js`:** Defines shared constants and configuration settings used across the project, such as API keys, sheet names, and data mappings.
*   **`HubspotImport.js`:** Handles the import of company data from HubSpot using the HubSpot API.
*   **`PdfAnalyzer.js`:** Searches for and analyzes PDF documents in Google Drive to extract company updates.
*   **`GeminiSearch.js`:** Performs web searches using the Gemini API to gather public information about the companies.
*   **`GeminiSynthesis.js`:** Synthesizes the data from all sources using the Gemini API to create the final report content.
*   **`GenerateSlides.js`:** Populates the Google Slides template with the synthesized data to generate the final one-page reports.
*   **`Founders.js`:** A utility script for retrieving founder information.
*   **`Utilities.js`:** Contains helper functions used by other scripts in the project.
*   **`Test.js`:** Includes test functions for development and debugging purposes.
*   **`geminiAPI.js`:** A dedicated script for making calls to the Gemini API.

## Getting Started

To use this project, you will need to:

1.  **Set up a Google Apps Script project:** Create a new project and copy the code from this repository into the corresponding script files.
2.  **Configure API keys:** Add your HubSpot and Gemini API keys to the script properties.
3.  **Set up Google Drive folders:** Create the necessary folder structure in Google Drive for storing company update documents.
4.  **Create a Google Sheets spreadsheet:** Set up a new spreadsheet with two sheets named "Master Sheet" and "Final Sheet".
5.  **Create a Google Slides template:** Design a one-page template for the investor reports.
6.  **Deploy the project as a web app:** This will provide a UI for running the automation process.

## Usage

Once the project is set up and deployed, you can use the web app to:

1.  **Select the companies and cohorts** you want to generate reports for.
2.  **Choose the data sources** you want to include (HubSpot, Google Drive, Gemini Search).
3.  **Initiate the process:** The script will then run in the background, collecting, synthesizing, and generating the reports automatically.

The generated reports will be saved as individual slides in a new Google Slides presentation, which can then be shared with investors.
