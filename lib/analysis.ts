export type AnalysisResult = {
  emotional: number
  exaggeration: number
  moralLanguage: number
  manipulativeScore: number
  moralKeywords: string[]
  manipulativeKeywords: string[]
  emotionalKeywords: string[]
  framingDensity: number
  detectedCategory: string 
  detectedLanguage: string
}

const MORAL_TERMS_EN = ["justice", "rights", "duty", "moral", "ethics", "fairness", "responsibility", "authority", "loyalty", "care", "harm", "freedom", "equality", "solidarity", "compassion", "respect", "law", "security", "migrant", "immigrant", "border", "asylum", "refugee", "children", "families", "human rights", "protection", "deportation", "policy"]
const MANIPULATIVE_TERMS_EN = ["shocking", "unbelievable", "incredible", "outrageous", "terrifying", "disastrous", "devastating", "explosive", "massive", "urgent", "chaos", "threat", "crisis", "scandal", "radical", "extreme", "failed", "dangerous", "collapse", "catastrophic", "illegal", "invasion", "flood", "surge", "emergency"]
const EMOTIONAL_TERMS_EN = ["fear", "anger", "angry", "hope", "pain", "suffering", "victim", "danger", "panic", "dramatic", "tragic", "alarming", "worried", "concerned", "hurt", "trauma", "despair", "distress", "anxiety", "threatened", "vulnerable"]

const MORAL_TERMS_ES = ["justicia", "derechos", "deber", "moral", "ética", "equidad", "responsabilidad", "autoridad", "lealtad", "cuidado", "daño", "libertad", "igualdad", "solidaridad", "compasión", "respeto", "ley", "seguridad", "migrante", "inmigrante", "inmigrantes", "inmigración", "frontera", "asilo", "refugiado", "niños", "familias", "derechos humanos", "protección", "deportación", "política", "regularización", "extranjero", "extranjeros"]
const MANIPULATIVE_TERMS_ES = ["impactante", "increíble", "indignante", "aterrador", "desastroso", "devastador", "explosivo", "masivo", "urgente", "caos", "amenaza", "crisis", "escándalo", "radical", "extremo", "fracaso", "peligroso", "colapso", "catastrófico", "ilegal", "invasión", "avalancha", "oleada", "emergencia", "desborde", "desbordado", "alarma"]
const EMOTIONAL_TERMS_ES = ["miedo", "ira", "enfado", "esperanza", "dolor", "sufrimiento", "víctima", "peligro", "pánico", "dramático", "trágico", "alarmante", "preocupado", "preocupación", "herido", "trauma", "desesperación", "angustia", "ansiedad", "amenazado", "vulnerable", "incertidumbre"]

// NUEVA FUNCIÓN: Ahora cuenta TODO, incluyendo duplicados
function findMatches(text: string, terms: string[]): string[] {
  const matches: string[] = [];
  terms.forEach((term) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedTerm}\\b`, "gi"); // La "g" busca en todo el texto sin parar
    const found = text.match(regex);
    if (found) {
      // Añadimos al array todas las veces que haya salido la palabra
      matches.push(...found.map(w => w.toLowerCase())); 
    }
  });
  return matches;
}

function normalizeScore(count: number, maxCount: number): number {
  return Math.min(1, count / maxCount)
}

export function analyzeArticle(text: string, category: string = "general", language: string = "en"): AnalysisResult {
  const moralTerms = language === "es" ? MORAL_TERMS_ES : MORAL_TERMS_EN;
  const manipulativeTerms = language === "es" ? MANIPULATIVE_TERMS_ES : MANIPULATIVE_TERMS_EN;
  const emotionalTerms = language === "es" ? EMOTIONAL_TERMS_ES : EMOTIONAL_TERMS_EN;

  // Ahora estas variables contienen TODOS los duplicados (ej: ["miedo", "miedo", "víctima"])
  const moralKeywords = findMatches(text, moralTerms)
  const manipulativeKeywords = findMatches(text, manipulativeTerms)
  const emotionalKeywords = findMatches(text, emotionalTerms)

  const exclamationCount = (text.match(/!/g) || []).length + (text.match(/¡/g) || []).length 
  const questionCount = (text.match(/\?/g) || []).length + (text.match(/¿/g) || []).length

  const totalWords = text.trim().split(/\s+/).length
  const lengthFactor = Math.max(1, Math.sqrt(totalWords / 75)) 

  const totalKeywords = moralKeywords.length + manipulativeKeywords.length + emotionalKeywords.length
  const framingDensity = totalKeywords / Math.max(totalWords, 1)

  // MITIGACIÓN CORREGIDA: Tragedia y Opinión muestran sus valores reales
  let emotionalWeight = 1.0;
  let manipulativeWeight = 1.0;

  if (category === "satire") {
    // Solo la sátira se silencia porque es un chiste, no manipulación real
    emotionalWeight = 0.2;
    manipulativeWeight = 0.2;
  }

  // Al haber duplicados, la puntuación subirá mucho más en textos muy cargados
  const emotionalRaw = normalizeScore(emotionalKeywords.length / lengthFactor, 6) + normalizeScore(exclamationCount, 10) * 0.25;
  const emotional = Math.min(1, emotionalRaw * emotionalWeight);

  const exaggerationRaw = normalizeScore(manipulativeKeywords.length / lengthFactor, 6) + normalizeScore(exclamationCount + questionCount, 12) * 0.2;
  const exaggeration = Math.min(1, exaggerationRaw * manipulativeWeight);

  const moralLanguage = normalizeScore(moralKeywords.length / lengthFactor, 8);

  const manipulativeRaw = normalizeScore(manipulativeKeywords.length / lengthFactor, 6) + normalizeScore(exclamationCount, 10) * 0.2 + normalizeScore(questionCount, 8) * 0.15;
  const manipulativeScore = Math.min(1, manipulativeRaw * manipulativeWeight);

  return {
    emotional: Number(emotional.toFixed(2)),
    exaggeration: Number(exaggeration.toFixed(2)),
    moralLanguage: Number(moralLanguage.toFixed(2)),
    manipulativeScore: Number(manipulativeScore.toFixed(2)),
    framingDensity: Number(framingDensity.toFixed(3)),
    moralKeywords,
    manipulativeKeywords,
    emotionalKeywords,
    detectedCategory: category,
    detectedLanguage: language
  }
}