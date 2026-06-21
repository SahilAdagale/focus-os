const OpenAI = require('openai')

async function generateWeeklyReport(metrics) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey.startsWith('sk-your-openai')) {
        console.warn('OpenAI API Key is missing or default placeholder. Skipping report generation.')
        return null
    }

    const openai = new OpenAI({ apiKey })

    const systemPrompt = `You are an elite cognitive performance analyst and attention scientist. 
Your job is to analyze a user's weekly focus & attention metrics, identify cognitive behavioral patterns, strengths, weaknesses, and provide highly actionable, science-based recommendations.

You MUST respond strictly with a JSON object. The JSON object must match this schema structure:
{
  "summary": "2-3 sentence executive summary of the user's attention quality this week",
  "strengths": ["3 key strengths with descriptions, e.g., High session depth during morning slots"],
  "weaknesses": ["3 key weaknesses with descriptions, e.g., High switch rate on Monday afternoons"],
  "patterns": ["3 interesting cognitive patterns noticed, e.g., Tab switching increases after 45 minutes of continuous work"],
  "recommendations": ["3 actionable, science-backed tips, e.g., Use the Pomodoro technique to implement structured breaks"],
  "cognitiveProfile": "A creative title representing their attention archetype, e.g., Deep Work Champion, Context-Switching Nomad, Flow-State Explorer, or Restless Tab-Hopper",
  "scoreVerdict": "A 1-2 sentence analysis of their average focus score relative to their work habits"
}
`

    const userPrompt = `Here are the focus metrics for the past week:
- Total sessions: ${metrics.totalSessions}
- Total focus time: ${metrics.totalFocusMinutes} minutes
- Average focus score (0-100 scale, where higher is better): ${metrics.avgFocusScore}
- Best session score: ${metrics.bestSessionScore || 'N/A'}
- Worst session score: ${metrics.worstSessionScore || 'N/A'}
- Total tab switches: ${metrics.totalTabSwitches}
- Average tab switches per minute: ${metrics.avgSwitchesPerMinute}
- Total distraction time: ${metrics.totalDistractionMinutes} minutes
- Average distraction ratio: ${metrics.avgDistractionRatio} (ratio of time spent on distracting sites)
- Total idle time: ${metrics.totalIdleMinutes} minutes
- Sessions per day (Monday to Sunday): ${JSON.stringify(metrics.sessionsPerDay)}
- Top distracting domains: ${JSON.stringify(metrics.topDistractingDomains)}
- Top productive domains: ${JSON.stringify(metrics.topProductiveDomains)}

Analyze this data and generate the cognitive report JSON object.`

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7
        })

        const content = response.choices[0].message.content
        const parsedReport = JSON.parse(content)

        // Validate structure
        const requiredKeys = ['summary', 'strengths', 'weaknesses', 'patterns', 'recommendations', 'cognitiveProfile', 'scoreVerdict']
        for (const key of requiredKeys) {
            if (!parsedReport[key]) {
                parsedReport[key] = (key === 'strengths' || key === 'weaknesses' || key === 'patterns' || key === 'recommendations') ? [] : ''
            }
        }

        return {
            report: parsedReport,
            model: response.model || model
        }
    } catch (error) {
        console.error('Failed to generate weekly report with OpenAI:', error)
        throw error
    }
}

module.exports = {
    generateWeeklyReport
}
