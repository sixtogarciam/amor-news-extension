export type AnalysisResult = {
emotional: number
exaggeration: number
moralLanguage: number
manipulativeScore: number
moralKeywords: string[]
manipulativeKeywords: string[]
emotionalKeywords: string[]
framingDensity: number
}

const MORAL_TERMS = [
"justice",
"rights",
"duty",
"moral",
"ethics",
"fairness",
"responsibility",
"authority",
"loyalty",
"care",
"harm",
"freedom",
"equality",
"solidarity",
"compassion",
"respect",
"law",
"security",
"migrant",
"migrants",
"immigration",
"immigrant",
"immigrants",
"border",
"borders",
"asylum",
"refugee",
"refugees",
"children",
"families",
"human rights",
"protection",
"detention",
"deportation",
"reform",
"policy",
"policies"
]

const MANIPULATIVE_TERMS = [
"shocking",
"unbelievable",
"incredible",
"outrageous",
"terrifying",
"disastrous",
"devastating",
"explosive",
"massive",
"urgent",
"chaos",
"threat",
"crisis",
"scandal",
"radical",
"extreme",
"failed",
"dangerous",
"collapse",
"catastrophic",
"illegal",
"invasion",
"flood",
"surge",
"wave",
"emergency"
]

const EMOTIONAL_TERMS = [
"fear",
"anger",
"angry",
"hope",
"pain",
"suffering",
"victim",
"danger",
"panic",
"dramatic",
"tragic",
"alarming",
"emergency",
"worried",
"concerned",
"hurt",
"trauma",
"despair",
"distress",
"anxiety",
"threatened",
"vulnerable"
]
function findMatches(text: string, terms: string[]): string[] {
const lowerText = text.toLowerCase()

return terms.filter((term) => lowerText.includes(term.toLowerCase()))
}

function normalizeScore(count: number, maxCount: number): number {
return Math.min(1, count / maxCount)
}

export function analyzeArticle(text: string): AnalysisResult {
const moralKeywords = findMatches(text, MORAL_TERMS)
const manipulativeKeywords = findMatches(text, MANIPULATIVE_TERMS)
const emotionalKeywords = findMatches(text, EMOTIONAL_TERMS)

const exclamationCount = (text.match(/!/g) || []).length
const questionCount = (text.match(/\?/g) || []).length

const totalWords = text.trim().split(/\s+/).length
const lengthFactor = Math.max(1, Math.sqrt(totalWords / 100))

const totalKeywords =
moralKeywords.length +
manipulativeKeywords.length +
emotionalKeywords.length

const framingDensity = totalKeywords / Math.max(totalWords, 1)

const emotional = Math.min(
1,
normalizeScore(emotionalKeywords.length / lengthFactor, 8) +
normalizeScore(exclamationCount, 12) * 0.25
)

const exaggeration = Math.min(
1,
normalizeScore(manipulativeKeywords.length / lengthFactor, 8) +
normalizeScore(exclamationCount + questionCount, 14) * 0.2
)

const moralLanguage = normalizeScore(moralKeywords.length / lengthFactor, 10)

const manipulativeScore = Math.min(
1,
normalizeScore(manipulativeKeywords.length / lengthFactor, 8) +
normalizeScore(exclamationCount, 12) * 0.2 +
normalizeScore(questionCount, 10) * 0.15
)


return {
emotional: Number(emotional.toFixed(2)),
exaggeration: Number(exaggeration.toFixed(2)),
moralLanguage: Number(moralLanguage.toFixed(2)),
manipulativeScore: Number(manipulativeScore.toFixed(2)),
framingDensity: Number(framingDensity.toFixed(3)),
moralKeywords,
manipulativeKeywords,
emotionalKeywords
}
}