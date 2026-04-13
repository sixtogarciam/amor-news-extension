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

// --- DICCIONARIOS EN INGLÉS (EXPANDIDOS) ---
const MORAL_TERMS_EN = ["justice", "rights", "duty", "moral", "ethics", "fairness", "responsibility", "authority", "loyalty", "care", "harm", "freedom", "equality", "solidarity", "compassion", "respect", "law", "security", "migrant", "migrants", "immigrant", "immigrants", "immigration", "border", "borders", "asylum", "refugee", "refugees", "children", "child", "families", "family", "human rights", "protection", "deportation", "policy", "elderly", "minors", "elite", "elites", "corruption", "government", "state", "constitution", "values", "principles", "nation", "patriotism", "vulnerable"]
const MANIPULATIVE_TERMS_EN = ["shocking", "unbelievable", "incredible", "outrageous", "terrifying", "disastrous", "devastating", "explosive", "massive", "urgent", "chaos", "threat", "crisis", "scandal", "radical", "extreme", "failed", "dangerous", "collapse", "catastrophic", "illegal", "invasion", "flood", "surge", "emergency", "brutal", "historic", "unprecedented", "definitive", "savage", "epic", "monumental", "destructive", "relentless", "shameful", "unacceptable", "intolerable", "horrific"]
const EMOTIONAL_TERMS_EN = ["fear", "anger", "angry", "hope", "pain", "suffering", "victim", "victims", "danger", "panic", "dramatic", "tragic", "alarming", "worried", "concerned", "hurt", "trauma", "despair", "distress", "anxiety", "threatened", "vulnerable", "uncertainty", "tears", "heartbreaking", "defenseless", "crying", "sadness", "sad", "terrified", "dread", "terror", "horror", "pity", "indignation", "devastated"]

// --- DICCIONARIOS EN ESPAÑOL (EXPANDIDOS) ---
const MORAL_TERMS_ES = ["justicia", "derechos", "deber", "moral", "ética", "equidad", "responsabilidad", "autoridad", "lealtad", "cuidado", "daño", "libertad", "igualdad", "solidaridad", "compasión", "respeto", "ley", "seguridad", "migrante", "migrantes", "inmigrante", "inmigrantes", "inmigración", "frontera", "fronteras", "asilo", "refugiado", "refugiados", "niños", "niñas", "niño", "niña", "familias", "familia", "derechos humanos", "protección", "deportación", "política", "regularización", "extranjero", "extranjeros", "ancianos", "anciano", "menores", "menor", "infancia", "patriarcado", "élite", "élites", "corrupción", "gobierno", "estado", "constitución", "valores", "principios", "nación", "patria", "casta"]
const MANIPULATIVE_TERMS_ES = ["impactante", "increíble", "indignante", "aterrador", "desastroso", "devastador", "explosivo", "masivo", "urgente", "caos", "amenaza", "crisis", "escándalo", "radical", "extremo", "fracaso", "peligroso", "colapso", "catastrófico", "ilegal", "invasión", "avalancha", "oleada", "emergencia", "desborde", "desbordado", "alarma", "dramático", "brutal", "histórico", "definitivo", "inédito", "salvaje", "escandaloso", "inaudito", "épico", "monumental", "destructivo", "implacable", "vergonzoso", "inaceptable", "intolerable", "horrible"]
const EMOTIONAL_TERMS_ES = ["miedo", "ira", "enfado", "esperanza", "dolor", "sufrimiento", "víctima", "víctimas", "peligro", "pánico", "dramático", "trágico", "alarmante", "preocupado", "preocupación", "herido", "heridos", "trauma", "desesperación", "angustia", "ansiedad", "amenazado", "vulnerable", "incertidumbre", "lágrimas", "desgarrador", "indefenso", "llanto", "tristeza", "tristes", "aterrado", "pavor", "terror", "horror", "lástima", "indignación", "conmocionado"]

function findMatches(text: string, terms: string[]): string[] {
  const matches: string[] = [];
  terms.forEach((term) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedTerm}\\b`, "gi"); 
    const found = text.match(regex);
    if (found) {
      matches.push(...found.map(w => w.toLowerCase())); 
    }
  });
  return matches;
}

function normalizeScore(count: number, maxCount: number): number {
  return Math.min(1, count / maxCount)
}

export function analyzeArticle(text: string, category: string = "general", language: string = "en", isHeadline: boolean = false): AnalysisResult {
  const moralTerms = language === "es" ? MORAL_TERMS_ES : MORAL_TERMS_EN;
  const manipulativeTerms = language === "es" ? MANIPULATIVE_TERMS_ES : MANIPULATIVE_TERMS_EN;
  const emotionalTerms = language === "es" ? EMOTIONAL_TERMS_ES : EMOTIONAL_TERMS_EN;

  const moralKeywords = findMatches(text, moralTerms)
  const manipulativeKeywords = findMatches(text, manipulativeTerms)
  const emotionalKeywords = findMatches(text, emotionalTerms)

  const exclamationCount = (text.match(/!/g) || []).length + (text.match(/¡/g) || []).length 
  const questionCount = (text.match(/\?/g) || []).length + (text.match(/¿/g) || []).length

  const totalWords = text.trim().split(/\s+/).length
  
  // Mantenemos la densidad pura de la Opción 3 para reflejar la longitud real del titular
  const lengthFactor = isHeadline ? Math.max(0.1, Math.sqrt(totalWords / 75)) : Math.max(1, Math.sqrt(totalWords / 75)) 

  const totalKeywords = moralKeywords.length + manipulativeKeywords.length + emotionalKeywords.length
  const framingDensity = totalKeywords / Math.max(totalWords, 1)

  let emotionalWeight = 1.0;
  let manipulativeWeight = 1.0;

  if (category === "satire") {
    emotionalWeight = 0.2;
    manipulativeWeight = 0.2;
  }

  // Si es titular, somos muchísimo más sensibles (los umbrales bajan a la mitad)
  const maxEmotional = isHeadline ? 3 : 6;
  const maxManipulative = isHeadline ? 3 : 6;
  const maxMoral = isHeadline ? 4 : 12;
  const maxExclamations = isHeadline ? 4 : 10;

  const emotionalRaw = normalizeScore(emotionalKeywords.length / lengthFactor, maxEmotional) + normalizeScore(exclamationCount, maxExclamations) * 0.25;
  const emotional = Math.min(1, emotionalRaw * emotionalWeight);

  const exaggerationRaw = normalizeScore(manipulativeKeywords.length / lengthFactor, maxManipulative) + normalizeScore(exclamationCount + questionCount, maxExclamations + 2) * 0.2 + normalizeScore(emotionalKeywords.length / lengthFactor, maxEmotional) * 0.1;
  const exaggeration = Math.min(1, exaggerationRaw * manipulativeWeight);

  const moralLanguage = normalizeScore(moralKeywords.length / lengthFactor, maxMoral);

  const manipulativeRaw = normalizeScore(manipulativeKeywords.length / lengthFactor, maxManipulative) + normalizeScore(exclamationCount, maxExclamations) * 0.2 + normalizeScore(questionCount, isHeadline ? 3 : 8) * 0.15;
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