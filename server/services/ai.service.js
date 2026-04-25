const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Models to try in order — if the primary fails, fall back to the next
const MODEL_CHAIN = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/**
 * Clean and parse JSON from Gemini's response
 * Sometimes the model wraps JSON in markdown blocks like ```json ... ```
 */
const parseGeminiJSON = (text) => {
    try {
        // Strip markdown code blocks if present
        let cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error('Failed to parse Gemini output as JSON:', text);
        throw new Error('AI produced invalid JSON output.');
    }
};

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Call Gemini with retry + model fallback
 * Retries on 503 (high demand) and 429 (rate limit) errors
 */
const callGeminiWithRetry = async (prompt) => {
    let lastError = null;

    for (const modelName of MODEL_CHAIN) {
        const model = genAI.getGenerativeModel({ model: modelName });

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                return result.response.text();
            } catch (error) {
                lastError = error;
                const status = error.status || error.httpStatusCode || 0;
                const isRetryable = status === 503 || status === 429;

                console.warn(`Gemini ${modelName} attempt ${attempt}/${MAX_RETRIES} failed (${status}): ${error.message}`);

                if (isRetryable && attempt < MAX_RETRIES) {
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    await sleep(delay);
                    continue;
                }
                // Non-retryable error or exhausted retries for this model — try next model
                break;
            }
        }
    }

    // All models + retries exhausted
    console.error('All Gemini models failed:', lastError);
    const status = lastError?.status || lastError?.httpStatusCode || 0;
    if (status === 429) {
        throw new Error('AI quota exceeded. Please wait a minute and try again.');
    } else if (status === 503) {
        throw new Error('AI service is temporarily overloaded. Please try again in a moment.');
    }
    throw new Error('Failed to get AI response. Please try again later.');
};

/**
 * Generate User-facing Insights (Senior Agent AI)
 */
const generateVisitInsights = async (visitData) => {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const prompt = `You are a senior field mentor generating a precise, data-rich Minutes of Meeting (MOM) for a B2B agency visit in the education consultancy sector. Analyze the FULL visit thread — original visit + all followUpMeetings combined.

VISIT DATA:
${JSON.stringify(visitData, null, 2)}

FIELD REFERENCE (so you know what each key means):
- meta.companyName: Agency/company name
- meta.bdmName / meta.rmName: BDM and RM who conducted the visit
- meta.meetingStart / meetingEnd: Visit date and time
- agencyProfile: Address, PIN, website, establishment year, business model, office area, infra rating, computer lab, Google reviews
- promoterTeam: Promoter name & designation, total staff, coaching team size, country team size, countries promoted, coaching courses, VAS offered
- marketingOps: Marketing activities, avg daily walk-ins, walk-in ratio, brochure usage, total visa/coaching yearly, total branches
- kananSpecific.prepcomAcademy: "Prepcom", "Appcom", "Both", or "None" — determines if the agent is ACTIVE with Kanan
- kananSpecific.onboardingDate: Date they became a Kanan partner (if applicable)
- kananSpecific.isAppcom / appcomOnboardingDate: APPCOM status and onboarding date
- enquiryStats: Monthly avg enquiries for admissions, coaching, Canada, IELTS
- partnership.workingCountries: Countries they work with through Kanan
- partnership.feedback: Their direct feedback about Kanan's services
- studentCounts: Number of students in Canada/USA/UK
- kananTools: Academy Portal usage & courses, Books usage & courses, Classroom Content usage, trainer & counsellor ratings
- opsTech.techPlatforms: Technology/platforms they use
- opsTech.techWillingness: Willingness to adopt new tech (1-5)
- budget.marketing2026 / coaching2026: 2026 budget plans in INR
- competency.pricingRating: Pricing competitiveness rating
- support.biggestChallenge: Their biggest operational challenge
- support.painPoints: Specific pain points raised by the agent (CRITICAL — use exact content)
- support.solutions: Solutions provided during the visit (CRITICAL — use exact content)
- support.interestedServices: Kanan services they expressed interest in
- support.need*: Training / Marketing / Tech / Partner / VAS support needs (true/false flags)
- postVisit.actionPoints: Committed action items after the visit (CRITICAL — use exact content)
- postVisit.remarks: Agent's own remarks and observations (CRITICAL — use exact content)
- followUpMeetings: Array of follow-up visits with date, notes, and key outcomes

INSTRUCTIONS:

1. "summary" — Write 2-3 tight sentences. THE VERY FIRST SENTENCE must state clearly whether the agency is ACTIVE with Kanan or not, based on kananSpecific.prepcomAcademy (Prepcom/Appcom/Both = active; None or missing = not active or prospect). Then mention: who visited whom, when, and the overall outcome or relationship status. Pull actual data — company name, BDM/RM names, visit date, Kanan status. No vague filler.

2. "bulletPoints" — Minimum 8, maximum 14 precise one-liners. MANDATORY sections to cover (skip a line only if the data is genuinely absent):
   - Team & Agency: staff count, coaching team, country team, establishment year, branches
   - Business: business model, walk-ins/day, visa and coaching yearly numbers, countries promoted
   - Kanan Tools: which tools they use (Portal/Books/Classroom), courses, trainer and counsellor ratings
   - Budget & Tech: 2026 marketing and coaching budget, tech platforms, tech willingness rating
   - Enquiry Stats: monthly admissions, coaching, Canada, IELTS averages
   - Partnership: countries working with Kanan, student counts, onshore referral
   - Pain Points: Quote the actual pain points from support.painPoints verbatim or closely paraphrased
   - Solutions Given: Quote the actual solutions from support.solutions verbatim or closely paraphrased
   - Action Points: List each committed action from postVisit.actionPoints
   - Feedback/Remarks: Key takeaway from postVisit.remarks and partnership.feedback
   Format: "Category: detail" — be specific with numbers, names, and dates when available.

3. "suggestions" — 2-3 sentences of warm, motivating senior guidance. Reference the ACTUAL action points and pain points from this visit — do not give generic advice. Acknowledge what went well. Give 1-2 specific next steps tied to what was discussed. Think: senior reviewing the field report and coaching the agent forward.

Return ONLY this JSON, no markdown wrapping:
{
    "summary": "...",
    "bulletPoints": ["...", "..."],
    "suggestions": "..."
}`;

    try {
        const responseText = await callGeminiWithRetry(prompt);
        return parseGeminiJSON(responseText);
    } catch (error) {
        console.error('generateVisitInsights error:', error);
        throw error;
    }
};

/**
 * Generate Admin Audit Evaluation (Audit Expert AI)
 */
const evaluateAdminAudit = async (visitData) => {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const prompt = `You are a highly experienced audit director who reviews field visit reports in the education consultancy sector. You are honest, fair, and thorough. Analyze the FULL visit thread — original visit + all followUpMeetings combined.

VISIT DATA:
${JSON.stringify(visitData, null, 2)}

First, do everything the "senior mentor" would — understand the summary, key facts, and progression. Then apply your audit lens:

Scoring guide:
- 8-10 "successful": 80%+ fields filled with real data, specific remarks/action points, clear engagement.
- 4-7 "needs_improvement": Key data present but gaps exist (missing metrics, vague remarks, incomplete sections).
- 1-3 "failed": Mostly empty, no actionable data, clear low effort.

Rules:
- "strengths" — 2-4 short one-liners of what the agent did well. Be specific (e.g. "Captured all team details and budgets").
- "weaknesses" — 2-4 short one-liners of what's missing or weak. Be specific (e.g. "No pain points recorded").
- "reasoning" — 2-3 sentence honest verdict. If good, say so. If poor, say so plainly.
- Keep everything concise. No paragraphs in arrays — one-liners only.

Return ONLY this JSON, no markdown wrapping:
{
    "status": "successful" | "needs_improvement" | "failed",
    "score": <number 1-10>,
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "reasoning": "..."
}`;

    try {
        const responseText = await callGeminiWithRetry(prompt);
        const parsed = parseGeminiJSON(responseText);

        // Ensure constraints
        if (!['successful', 'needs_improvement', 'failed'].includes(parsed.status)) {
            parsed.status = 'needs_improvement';
        }
        if (typeof parsed.score !== 'number' || parsed.score < 1 || parsed.score > 10) parsed.score = 5;
        if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
        if (!Array.isArray(parsed.weaknesses)) parsed.weaknesses = [];

        return parsed;
    } catch (error) {
        console.error('evaluateAdminAudit error:', error);
        throw error;
    }
};

/**
 * Audit Expense Claim against Company Travel Policy
 */
const auditExpenseClaim = async (claimData) => {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const prompt = `You are a strict but fair corporate expense auditor. You must audit the following expense claim against the company's official travel policy. Be thorough — flag every violation and warning, but also acknowledge compliant items.

COMPANY TRAVEL POLICY:
======================

1. TRAVEL MODE POLICY (to/from Vadodara):
   - All train travel MUST be in 3rd AC Class (for Rajdhani, Tejas, Shatabdi), 2nd Class (for Express, Superfast) or Volvo Buses.
   - No upgrades unless pre-approved by management.
   - Tickets must be booked 21 days in advance via Vicky Ray (HOD Ticketing).

2. INTRA-CITY TRAVEL POLICY:
   - Must use public transport (Metro, BRTS, City Bus) first.
   - If unavailable, cabs ONLY through Ola, Uber, or other apps (for records).
   - Daily intra-city caps:
     * Tier-1 Cities (Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune): INR 1,000/day
     * Tier-2 Cities (Ahmedabad, Jaipur, Lucknow, Chandigarh, etc.): INR 600/day
     * Tier-3 Cities (all others): INR 400/day

3. ACCOMMODATION POLICY:
   - All hotel bookings done by Vicky Ray (HOD Ticketing).
   - Only complimentary breakfast included — NO lunch/dinner on hotel bill.
   - Must be booked 21 days in advance.

4. DAILY FOOD ALLOWANCE:
   - INR 600 per day for Lunch + Dinner combined.
   - Breakfast is covered by hotel (complimentary).

5. PROHIBITED ITEMS:
   - Alcohol or any intoxicants are STRICTLY PROHIBITED.
   - Claims containing alcohol will be flagged as critical violations.

EXPENSE CLAIM DATA:
${JSON.stringify(claimData, null, 2)}

AUDIT INSTRUCTIONS:
- Check EACH expense item against the relevant policy.
- For travel expenses: verify mode, class, and booking method.
- For intra-city expenses: check daily caps based on city tier. Group expenses by date and compare daily totals against tier limits.
- For food expenses: check daily total against INR 600 cap. Flag if any single day exceeds.
- For hotel expenses: verify it was booked properly (flag if employee booked directly).
- Look for any alcohol or prohibited items in descriptions/vendor names.
- Calculate an overall compliance score (0-100).

Return ONLY this JSON, no markdown wrapping:
{
    "complianceScore": <number 0-100>,
    "overallStatus": "compliant" | "warning" | "violation",
    "flags": [
        {
            "expenseId": "<the _id of the flagged expense, or null for general flags>",
            "type": "travel_class" | "intra_city_cap" | "food_allowance" | "prohibited_item" | "booking_compliance" | "accommodation" | "missing_receipt" | "other",
            "severity": "info" | "warning" | "critical",
            "message": "<clear description of the issue>",
            "policyRef": "<which policy section this relates to, e.g. 'Section 2: Intra-city Travel'>"
        }
    ],
    "recommendations": "<2-3 sentences of actionable recommendations for the approver>",
    "summary": "<2-3 sentence overall audit summary>"
}

Scoring guide:
- 90-100 "compliant": All items within policy, minor or no issues.
- 60-89 "warning": Some items exceed limits or missing details, but no critical violations.
- 0-59 "violation": Critical policy violations found (prohibited items, major overages, etc.).`;

    try {
        const responseText = await callGeminiWithRetry(prompt);
        const parsed = parseGeminiJSON(responseText);

        // Ensure constraints
        if (!['compliant', 'warning', 'violation'].includes(parsed.overallStatus)) {
            parsed.overallStatus = 'warning';
        }
        if (typeof parsed.complianceScore !== 'number' || parsed.complianceScore < 0 || parsed.complianceScore > 100) {
            parsed.complianceScore = 50;
        }
        if (!Array.isArray(parsed.flags)) parsed.flags = [];

        return parsed;
    } catch (error) {
        console.error('auditExpenseClaim error:', error);
        throw error;
    }
};

module.exports = {
    generateVisitInsights,
    evaluateAdminAudit,
    auditExpenseClaim
};
