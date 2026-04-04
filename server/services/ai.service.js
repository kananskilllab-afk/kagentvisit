const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
 * Generate User-facing Insights (Senior Agent AI)
 */
const generateVisitInsights = async (visitData) => {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are a friendly, experienced senior field mentor in the education consultancy industry. An agent has submitted a visit report (and possibly follow-up visits). Analyze the FULL thread — original visit + all followUpMeetings combined.

VISIT DATA:
${JSON.stringify(visitData, null, 2)}

Return 3 things:

1. "summary" — 2-3 sentence executive summary. Mention the company/student name, what happened, and current status. Be accurate, no fluff.

2. "bulletPoints" — Short one-liner bullet points (max 8). Each bullet = one fact or metric. No paragraphs, no filler, no repeating what's obvious. Good examples:
   - "Staff: 12 total, 4 coaching, 3 country team"
   - "Uses Kanan Portal & Books; no Classroom Content"
   - "Walk-ins: 8/day, Visa: 120/yr, Coaching: 80/yr"
   - "Budget 2026: ₹3L marketing, ₹1.5L coaching"
   - "Pain point: Needs counsellor training"
   Skip any bullet where data is missing. Combine related facts into one bullet where possible.

3. "suggestions" — Friendly, motivating senior advice in 2-3 sentences. If the visit went well, genuinely acknowledge it — say "great job" or "well done". Then give 1-2 specific, actionable next steps. Never be discouraging. Think of it as a senior patting the agent on the back and guiding them forward.

Keep everything concise. No walls of text.

Return ONLY this JSON, no markdown wrapping:
{
    "summary": "...",
    "bulletPoints": ["...", "..."],
    "suggestions": "..."
}`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return parseGeminiJSON(responseText);
    } catch (error) {
        console.error('generateVisitInsights error:', error);
        throw new Error('Failed to generate insights via AI.');
    }
};

/**
 * Generate Admin Audit Evaluation (Audit Expert AI)
 */
const evaluateAdminAudit = async (visitData) => {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
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
        throw new Error('Failed to evaluate audit via AI.');
    }
};

module.exports = {
    generateVisitInsights,
    evaluateAdminAudit
};
