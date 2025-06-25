/**
 * This function prepares a detailed prompt with company data, sends it to the Gemini API,
 * and logs the generated investment analysis.
 */
function generateInvestmentAnalysis() {

  // --- 1. Data Preparation ---
  // This is the data you'll collect from your various sources.
  const data = [
      ['PuriFire Energy, formerly known as Purifire Tech Labs, is a UK-based cleantech company established in 2020.[1][2] The company focuses on decarbonizing the shipping and chemical industries by converting waste carbon and wastewater into green hydrogen and carbon-neutral biomethanol.[1][3][4] Their proprietary hydrothermal liquefaction and gasification technologies are designed to address the global plastic waste problem and reduce carbon emissions.[3][5]', '', 'PuriFire is pioneering the cost-effective production of green methanol to decarbonise the global shipping and chemical industries. PuriFire’s patented process converts waste water into Hydrogen (H2) and Carbon Dioxide (CO2) and into green methanol, resulting in massive capex and energy savings.'], // Company Summary
      ['PuriFire Energy follows a B2B model, offering its technology to industries to help them convert waste into valuable products.[5] The company\'s primary focus is on scaling its technology for the production of green hydrogen and carbon-neutral methanol.[3]', '', ''], // Business Mode
      ['The main distinguishing feature of PuriFire Energy is its proprietary technology that integrates hydrothermal gasification with carbon capture.[3] In contrast to other methods, their process does not depend on electrolysis for hydrogen generation and can use different forms of waste carbon and water.[4] Their system is also reported to be at least 35% more affordable in terms of capital expenditure (CAPEX) and 30 percent less energy-intensive compared to competing technologies.[4]', '', ''], // Key Differentiators
      ['', '', ''], // Founder Commentary
      ['', '', ''], // Fund Commentary
      ['', '', '£9,870,000 - A$18,779,649'], // Current Valuation
      ['', '', 'Pre-Revenue'], // ARR (Annual Recurring Revenue)
      ['', '', ''], // Gross Profit
      ['', '', '24 Months'], // Runway
      ['12', '', '4'], // Team Size / Employee Count
      ['', '', ''], // Customer Count
      ['', '', ''], // Retention (Customer or Revenue)
      ['A$6.95 million', '', '£3.525M total 525K is in grants'], // Total Capital Raised
      ['A$209,000', '', ''], // Initial Investment
      ['HICO Investment Group', '', ''], // Lead Investor (Last Round)
      ['08-2024', '', ''], // Last Round: Date
      ['Seed', '', 'Bridge Round/Pre-Series A Bridge'], // Last Round: Type
      ['A$6.74 million', '', ''], // Last Round: Amount
      ['No', '', ''], // Currently Raising? (Yes/No)
      ['', '', '£1,000,000'], // Current Raise: Target
      ['', '', ''], // Current Raise: Committed
      ['', '', ''], // Current Raise: Pre-Money Valuation
      ['', '', ''], // Current Raise: Post-Money Valuation
      ['', '', 'SAFE'], // Current Raise: Terms (SAFE, etc.)
      ['In August 2024, the company, which will soon be rebranded as PuriFire Energy, joined TWI as an industrial member to further develop its high-temperature and high-pressure hydrothermal gasification reactor and bio-methanol production.[4] In the same month, they successfully raised £2.7 million in a seed funding round led by HICO Investment Group, along with a £525,000 grant from Innovate UK.[1]', '', ''], // Existing Recent News
      ['The company\'s strategic priority is to advance its technology for producing sustainable fuel and to launch a pilot project by mid-2025.[1] This project will focus on converting liquid digestate from anaerobic digestion and other wet feedstocks into green methanol.[1] They are also concentrating on scaling their production of green hydrogen and biomethanol to compete with fossil fuels.[5]', '', ''], // Existing Strategic Focus
      ['', '', ''] // Existing Risks
    ];

  // --- 2. Prompt Construction ---
  // Build the prompt text by inserting the data into the template.
  const prompt_text = `
    "Persona: ""You are a senior venture capital analyst. Your specialty is synthesizing incomplete and potentially conflicting data to build a clear, actionable investment thesis. You will evaluate a briefing package on PuriFire Energy (https://www.purifire.co.uk/) and produce a definitive analysis for our internal report.""

    Primary Objective:

    ""Your task is twofold:

    Reconcile Conflicting Data: First, you must investigate and reconcile information from three sources: 'Gemini with Grounding Research,' 'Internal Company Updates,' and 'HubSpot CRM Data.' Since timestamps are not always available, you must use analytical reasoning to determine the most plausible current state of the company.
    Update & Enhance Subjective Analysis: Next, you will review the pre-existing subjective analysis we have provided (Recent News, Strategic Focus, Risks). You will fact-check this analysis against your reconciled data, update it with new information, and enhance it with your broad external knowledge of the cleantech market.""
    Part 1: Data Reconciliation Logic (without Timestamps)

    ""To reconcile the data, apply the following hierarchy of evidence to determine the most credible information:

    Prioritize Direct, Specific Statements: A direct statement from a primary source (e.g., a CEO quote in a company update like 'Our ARR is now $1.2M') is the most reliable. A specific news report of a completed event (e.g., 'TechCrunch reports the $5M seed round has closed') is also highly credible.
    Use Logical Progression: Infer the sequence of events. Information about planning an action (e.g., 'preparing data room for raise') is older than information about that action being completed (e.g., 'seed round has closed'). A larger team size or higher ARR is almost always more recent than a smaller number.
    Seek Corroboration: When multiple sources point to the same conclusion (e.g., public news and an internal update both mention a new partnership), that data has high confidence.
    Acknowledge Uncertainty: If a definitive conclusion cannot be drawn, explicitly state the conflict (e.g., 'The cash runway is uncertain; internal data suggests 14 months, but public analysis implies a much shorter timeframe based on the last funding round.')""
    Briefing Package for PuriFire Energy:

    | Category | Gemini with Grounding Research (Public) | Internal Company Updates (Private) | HubSpot CRM Data (Private) |
    | :--- | :--- | :--- | :--- |
    | **--- Company Fundamentals ---** | | | |
    | **Company Summary** | ${data[0][0]} | ${data[0][1]} | ${data[0][2]} |
    | **Business Model** | ${data[1][0]} | ${data[1][1]} | ${data[1][2]} |
    | **Key Differentiators** | ${data[2][0]} | ${data[2][1]} | ${data[2][2]} |
    | **Founder Commentary** | ${data[3][0]} | ${data[3][1]} | ${data[3][2]} |
    | **Fund Commentary** | ${data[4][0]} | ${data[4][1]} | ${data[4][2]} |
    | **--- Key Metrics ---** | | | |
    | **Current Valuation** | ${data[5][0]} | ${data[5][1]} | ${data[5][2]} |
    | **ARR (Annual Recurring Revenue)** | ${data[6][0]} | ${data[6][1]} | ${data[6][2]} |
    | **Gross Profit** | ${data[7][0]} | ${data[7][1]} | ${data[7][2]} |
    | **Runway** | ${data[8][0]} | ${data[8][1]} | ${data[8][2]} |
    | **Team Size / Employee Count** | ${data[9][0]} | ${data[9][1]} | ${data[9][2]} |
    | **Customer Count** | ${data[10][0]} | ${data[10][1]} | ${data[10][2]} |
    | **Retention (Customer or Revenue)** | ${data[11][0]} | ${data[11][1]} | ${data[11][2]} |
    | **--- Fundraising Details ---** | | | |
    | **Total Capital Raised** | ${data[12][0]} | ${data[12][1]} | ${data[12][2]} |
    | **Initial Investment** | ${data[13][0]} | ${data[13][1]} | ${data[13][2]} |
    | **Lead Investor (Last Round)** | ${data[14][0]} | ${data[14][1]} | ${data[14][2]} |
    | **Last Round: Date** | ${data[15][0]} | ${data[15][1]} | ${data[15][2]} |
    | **Last Round: Type** | ${data[16][0]} | ${data[16][1]} | ${data[16][2]} |
    | **Last Round: Amount** | ${data[17][0]} | ${data[17][1]} | ${data[17][2]} |
    | **--- Current Fundraising Status ---** | | | |
    | **Currently Raising? (Yes/No)** | ${data[18][0]} | ${data[18][1]} | ${data[18][2]} |
    | **Current Raise: Target** | ${data[19][0]} | ${data[19][1]} | ${data[19][2]} |
    | **Current Raise: Committed** | ${data[20][0]} | ${data[20][1]} | ${data[20][2]} |
    | **Current Raise: Pre-Money Valuation** | ${data[21][0]} | ${data[21][1]} | ${data[21][2]} |
    | **Current Raise: Post-Money Valuation**| ${data[22][0]} | ${data[22][1]} | ${data[22][2]} |
    | **Current Raise: Terms (SAFE, etc.)**| ${data[23][0]} | ${data[23][1]} | ${data[23][2]} |
    | | | | |
    | **--- Existing Subjective Analysis ---**| | | |
    | **Existing 'Recent News'** | ${data[24][0]} |
    | **Existing 'Strategic Focus'** | ${data[25][0]} |
    | **Existing 'Risks'** | ${data[26][0]} |

    Part 2: Subjective Analysis Generation

    ""Based on your reconciled view from Part 1, generate the definitive versions of the following three sections. For each one:

    First, review any Existing text provided in the briefing package.
    Then, compare it against your reconciled facts.
    Finally, generate a new, improved paragraph that is factually accurate and insightful. If the existing text was largely correct, enhance it. If it was outdated, replace it. If none was provided, create it from scratch.""
    1. Recent News and Highlights:

    ""Produce an updated paragraph summarizing the company's recent momentum. Ensure it reflects the most current and significant events you identified, blending public news with confidential wins to create a complete picture.""
    2. Strategic Focus:

    ""Generate a definitive paragraph on the company's strategic direction. This must be aligned with your reconciled understanding of their fundraising status, key hires, and product milestones. If our Existing 'Strategic Focus' was misaligned (e.g., focused on product when they are clearly in a fundraising sprint), correct it.""
    3. Risks:

    ""Create a comprehensive paragraph detailing the most significant risks.
    Validate & Update Internal Risks: Review our Existing 'Risks' and validate them against the reconciled facts. Update or remove any that are no longer relevant.
    Add External & Market Risks: Crucially, enhance the analysis by adding risks based on your broad external knowledge (e.g., new competitor moves, macroeconomic headwinds, or investment climate shifts) that may not be mentioned in our internal files.""

    Part 3: Final Output Generation 

    ""Generate your entire response by following these two steps precisely:

    Step 1: Display the Reconciled Data Table.
    First, present the complete, reconciled data in a two-column table. The first column must be 'Category,' and the second must be 'Reconciled & Verified Data.' This table should include every single field from the briefing package, each with a single, synthesized value."
    Step 2: Display the Subjective Analysis.
    Second, after presenting the table, generate the three subjective analysis sections (1. Recent News and Highlights, 2. Strategic Focus, 3. Risks) as separate paragraphs."
    `;
  
  

  return callGeminiAPI(prompt_text);



}