/**
 * =================================================================
 * REPORT GENERATOR - V2 (SIMPLIFIED & EXPANDED)
 * =================================================================
 * Takes the final aggregated JSON and generates a visual one-pager
 * in a Google Doc, with direct data mapping and expanded sections.
 *
 * @param {object} finalJson The aggregated data object.
 * @return {string} The URL of the newly created Google Doc.
 */
function generateCompanyOnePager(finalJson) {
  // 1. Create the Google Doc. The name is now pulled directly from the JSON.
  const companyName = 'Pencil'; // Simple way to get the name
  const doc = DocumentApp.create(`${companyName} - One-Pager`);
  const body = doc.getBody();

  // 2. Build the document section by section with the raw JSON data.
  buildDocHeader(body, finalJson);
  buildDocInfoSection(body, finalJson);
  buildMetricsAndFundraisingTables(body, finalJson);
  buildNarrativeSections(body, finalJson);

  // 3. Save, log, and return the URL.
  doc.saveAndClose();
  Logger.log(`Successfully created Google Doc report: ${doc.getUrl()}`);
  return doc.getUrl();
}

/**
 * Builds the header with logo and founder commentary.
 */
function buildDocHeader(body, data) {
  const BEREEV_GRAY = '#F0F0F0';
  const FONT_FAMILY = 'Lexend';
  const logoUrl = 'https://www.gstatic.com/images/icons/material/system/2x/business_center_black_48dp.png'; // Placeholder Logo

  const headerTable = body.insertTable(0, [['', '']]);
  headerTable.setBorderWidth(0);

  // Left Cell: Logo
  const logoCell = headerTable.getCell(0, 0);
  logoCell.setWidth(100).setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
  try {
    const logoBlob = UrlFetchApp.fetch(logoUrl).getBlob();
    const desiredLogoWidth = 75;
    const logoImage = logoCell.insertImage(0, logoBlob);
    const originalWidth = logoImage.getWidth();
    if (originalWidth > 0) {
      const aspectRatio = logoImage.getHeight() / originalWidth;
      logoImage.setWidth(desiredLogoWidth).setHeight(desiredLogoWidth * aspectRatio);
    } else {
      logoImage.setWidth(desiredLogoWidth);
    }
  } catch (e) {
    logoCell.getChild(0).asParagraph().appendText('[Logo]');
    Logger.log(`Could not load logo. Error: ${e.message}`);
  }

  // Right Cell: Founder Commentary Box
  const founderCell = headerTable.getCell(0, 1);
  founderCell.setWidth(350).setBackgroundColor(BEREEV_GRAY)
    .setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER).setPaddingTop(10).setPaddingBottom(10);
  
  // Add title and the full quote directly
  const title = founderCell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  title.appendText('Founder Commentary').setBold(true).setFontFamily(FONT_FAMILY).setFontSize(11);
  
  const commentary = founderCell.appendParagraph(data.founderCommentary.description || 'N/A');
  commentary.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontFamily(FONT_FAMILY).setFontSize(10).setItalic(true);
  
  body.appendParagraph('');
}

/**
 * Builds the main company info section.
 * (Final Version)
 * @param {Body} body The document body.
 * @param {object} data The simplified reportData object.
 */
function buildDocInfoSection(body, data) {
  const FONT_FAMILY = 'Lexend';
  const companyName = data.companySummary.description.split(' ')[0];
  
  // Create the title paragraph
  const titleParagraph = body.appendParagraph(companyName);
  
  // Final version: Apply styles manually and directly.
  // This bypasses the unreliable .setHeading() method altogether for maximum stability.
  titleParagraph.setBold(true);
  titleParagraph.setFontSize(20); 
  titleParagraph.setFontFamily(FONT_FAMILY);
  titleParagraph.setAlignment(DocumentApp.HorizontalAlignment.LEFT);

  // --- For the simpler paragraphs below, .setAttributes is safe ---
  const infoStyle = {};
  infoStyle[DocumentApp.Attribute.FONT_FAMILY] = FONT_FAMILY;
  infoStyle[DocumentApp.Attribute.FONT_SIZE] = 11;

  const headquartersParagraph = body.appendParagraph(`Business Model: ${data.businessModel.description || 'N/A'}`);
  headquartersParagraph.setAttributes(infoStyle);
  
  const websiteParagraph = body.appendParagraph(`Description: ${data.companySummary.description || 'N/A'}`);
  websiteParagraph.setAttributes(infoStyle);
  
  body.appendParagraph(''); // Spacer
}

/**
 * Builds the expanded tables for Key Metrics and Fundraising.
 */
function buildMetricsAndFundraisingTables(body, data) {
  const FONT_FAMILY = 'Lexend';
  const tableHeaderStyle = { [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.BACKGROUND_COLOR]: '#F0F0F0' };
  const tableTextStyle = { [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY, [DocumentApp.Attribute.FONT_SIZE]: 10 };

  // --- Key Metrics Table ---
  body.appendParagraph('Key Metrics').setBold(true).setFontFamily(FONT_FAMILY);
  const metricsData = [
    ['ARR', data.arr.description || 'N/A'],
    ['Current Pre-Money Valuation', data.currentValuation.description || 'N/A'],
    ['Total Capital Raised', data.totalCapitalRaised.description || 'N/A'],
    ['Employee Count', data.employeeCount.description || 'N/A'],
    ['Cash Runway', data.cashRunway.description || 'N/A']
  ];
  body.appendTable(metricsData).setAttributes(tableTextStyle).getRow(0).setAttributes(tableHeaderStyle);
  body.appendParagraph('');

  // --- Fundraising Details Table ---
  body.appendParagraph('Fundraising Details').setBold(true).setFontFamily(FONT_FAMILY);
  const fundraisingData = [
    ['Currently Raising?', data.isCurrentlyRaising.description || 'N/A'],
    ['Round Terms', data.terms.description || 'N/A'],
    ['Target Amount', data.targetAmount.description || 'N/A'],
    ['Committed Amount', data.committedAmount.description || 'N/A'],
    ['Lead Investor(s)', data.leadInvestor.description || 'N/A'],
    ['Last Round', `${data.lastRoundType.description} - ${data.lastRoundAmount.description} (${data.lastRoundDate.description})`]
  ];
  body.appendTable(fundraisingData).setAttributes(tableTextStyle).getRow(0).setAttributes(tableHeaderStyle);
  body.appendParagraph('');
}

/**
 * Builds the narrative sections for highlights, differentiators, etc.
 */
function buildNarrativeSections(body, data) {
  // Helper function to create a styled section box
  const createSectionBox = (title, content, backgroundColor, fontColor) => {
    const table = body.appendTable([['']]).setBorderWidth(0);
    const cell = table.getCell(0, 0);
    cell.setBackgroundColor(backgroundColor).setPaddingTop(15).setPaddingBottom(15).setPaddingLeft(15).setPaddingRight(15);
    
    const titlePara = cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.LEFT);
    titlePara.appendText(title).setBold(true).setForegroundColor(fontColor).setFontSize(12);
    
    cell.appendParagraph(content || 'N/A').setForegroundColor(fontColor).setFontSize(11);
    body.appendParagraph('');
  };
  
  const BEREEV_GREEN = '#008080';
  const LIGHT_GRAY = '#F0F0F0';

  createSectionBox('Recent Highlights & News', data.recentHighlightsAndNews.description, BEREEV_GREEN, '#FFFFFF');
  createSectionBox('Key Differentiators', data.keyDifferentiators.description, LIGHT_GRAY, '#000000');
  createSectionBox('Strategic Focus', data.strategicFocus.description, LIGHT_GRAY, '#000000');
  createSectionBox('Identified Risks', data.risks.description, LIGHT_GRAY, '#000000');
}