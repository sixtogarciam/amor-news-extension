import * as React from "react"
import * as ReactDOM from "react-dom"
import { Storage } from "@plasmohq/storage"
import { analyzeArticle } from "~lib/analysis"
import { Readability } from "@mozilla/readability"

// @ts-ignore
import logoBase64 from "data-base64:~assets/logo_amor.png"

export const config = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

const storageCS = new Storage()

const GSI = "#00a9e0"
const CLICKBAIT_COLOR = "#f1c40f"
const SENSATIONAL_COLOR = "#e67e22"

function getLevel(score: number) {
  if (score >= 0.6) return "High"
  if (score >= 0.3) return "Medium"
  return "Low"
}

function getLevelColor(score: number) {
  if (score >= 0.6) return "#d9534f"
  if (score >= 0.3) return "#f0ad4e"
  return "#777"
}

// NUEVOS COMPONENTES VISUALES
function ProgressBar({ label, score, color }: { label: string; score: number; color: string }) {
  const percent = Math.max(0, Math.min(100, score * 100))
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "#444", fontWeight: 500 }}>
        <span>{label}</span>
        <span style={{ color }}>{percent.toFixed(0)}%</span>
      </div>
      <div style={{ height: 6, background: "#e9ecef", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: color, transition: "width 0.5s ease-out", borderRadius: 3 }} />
      </div>
    </div>
  )
}

function KeywordChip({ word, bgColor }: { word: string; bgColor: string }) {
  return (
    <span
      style={{
        background: bgColor,
        color: "#222",
        padding: "3px 8px",
        borderRadius: 12,
        fontSize: 11,
        marginRight: 4,
        marginBottom: 4,
        display: "inline-block",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
      {word}
    </span>
  )
}

function highlightKeywords(
  element: HTMLElement,
  keywords: string[],
  color: string
) {
  if (!keywords.length) return

  const uniqueKeywords = [...new Set(keywords)].filter(Boolean)
  const escapedKeywords = uniqueKeywords.map((keyword) =>
    keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  )
  const combinedRegex = new RegExp(`\\b(${escapedKeywords.join("|")})\\b`, "gi")

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT

        const tag = parent.tagName.toLowerCase()
        if (
          tag === "script" || tag === "style" || tag === "noscript" ||
          parent.classList.contains("amor-highlight")
        ) {
          return NodeFilter.FILTER_REJECT
        }

        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT

        return NodeFilter.FILTER_ACCEPT
      }
    }
  )

  const textNodes: Text[] = []
  let currentNode: Node | null
  while ((currentNode = walker.nextNode())) textNodes.push(currentNode as Text)

  textNodes.forEach((textNode) => {
    const originalText = textNode.nodeValue || ""
    if (!combinedRegex.test(originalText)) return
    const highlightedText = originalText.replace(
      combinedRegex,
      `<span class="amor-highlight" style="background:${color}; padding:2px 4px; border-radius:3px;">$1</span>`
    )
    const wrapper = document.createElement("span")
    wrapper.innerHTML = highlightedText
    textNode.parentNode?.replaceChild(wrapper, textNode)
  })
}

function Overlay() {
  const [newsAnalysis, setNewsAnalysis] = React.useState<any[]>([])
  const [headlineAnalysis, setHeadlineAnalysis] = React.useState<any | null>(null)
  const [headlineText, setHeadlineText] = React.useState("")

  React.useEffect(() => {
    const analyzePage = async () => {
      const threshold = (await storageCS.get<number>("threshold")) ?? 0.6
      const analytics = (await storageCS.get<any>("analytics")) || {
        articlesAnalyzed: 0,
        clickbaitDetected: 0,
        sensationalDetected: 0
      }

      const results: any[] = []

      // --- 1. MAGIA DE READABILITY ---
      let articleData = null;
      try {
        const documentClone = document.cloneNode(true) as Document;
        articleData = new Readability(documentClone).parse();
      } catch (e) {
        console.error("AMOR: Error al ejecutar Readability", e);
      }

      if (!articleData) {
        console.log("AMOR: Readability no detectó un artículo válido aquí.");
        await storageCS.set("analytics", analytics)
        setNewsAnalysis([])
        return
      }

      // --- 2. ANÁLISIS DEL TEXTO (El "Cerebro") ---
      const articleText = articleData.textContent?.trim() || ""
      const result = analyzeArticle(articleText)

      const detectedHeadline = articleData.title?.trim() || ""
      if (detectedHeadline) {
        const headlineResult = analyzeArticle(detectedHeadline)
        setHeadlineText(detectedHeadline)
        setHeadlineAnalysis(headlineResult)
      } else {
        setHeadlineText("")
        setHeadlineAnalysis(null)
      }

      // --- 3. SUBRAYAR PALABRAS CLAVE ---
      highlightKeywords(document.body, result.moralKeywords || [], "#b7f5b7")
      highlightKeywords(document.body, result.manipulativeKeywords || [], "#ffb3b3")
      highlightKeywords(document.body, result.emotionalKeywords || [], "#ffd699")

      if (result.emotional > threshold) {
        analytics.clickbaitDetected += 1
      } else if (result.exaggeration > threshold) {
        analytics.sensationalDetected += 1
      }
      
      results.push({ element: document.body, ...result })

      analytics.articlesAnalyzed += 1
      await storageCS.set("analytics", analytics)
      setNewsAnalysis(results)
    }

    analyzePage()
  }, [])

  const currentItem = newsAnalysis[0]

  const framingScores = currentItem
    ? [
        { type: "Moral", value: currentItem.moralLanguage },
        { type: "Manipulative", value: currentItem.manipulativeScore ?? 0 },
        { type: "Emotional", value: currentItem.emotional },
        { type: "Exaggeration", value: currentItem.exaggeration }
      ].sort((a, b) => b.value - a.value)
    : []

  const dominantFraming = framingScores[0]
  const secondaryFraming = framingScores[1]

  if (newsAnalysis.length === 0) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 384, // Ensanchado para igualar al popup
        background: "white",
        borderRadius: 12,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        zIndex: 999999,
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      }}>
      
      {/* CABECERA GSI EXACTA AL POPUP */}
      <div style={{ 
        width: "100%", 
        padding: "16px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        backgroundColor: GSI, 
        position: "relative",
        flexShrink: 0
      }}>
        {/* LOGO */}
        <div style={{ width: "64px", flexShrink: 0 }}>
          <img src={logoBase64} alt="Logo" style={{ width: "100%", height: "auto" }} />
        </div>

        {/* TÍTULO */}
        <h1 style={{ 
          margin: 0,
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          color: "white", 
          fontSize: "24px", 
          fontWeight: "bold", 
          whiteSpace: "nowrap"
        }}>
          News Analyzer
        </h1>

        {/* Div vacío para mantener el centrado perfecto */}
        <div style={{ width: "64px", flexShrink: 0 }}></div>
      </div>

      {/* CONTENEDOR SCROLL */}
      <div style={{ padding: 16, overflowY: "auto" }}>
        
        {/* SECCIÓN: ENCUADRE DOMINANTE */}
        <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: "#f8f9fa", padding: 12, borderRadius: 8, borderLeft: `3px solid ${GSI}` }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Dominant Signal</div>
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#222" }}>{dominantFraming ? dominantFraming.type : "Neutral"}</div>
          </div>
          <div style={{ flex: 1, background: "#f8f9fa", padding: 12, borderRadius: 8, borderLeft: "3px solid #ccc" }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Secondary Signal</div>
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#222" }}>{secondaryFraming ? secondaryFraming.type : "None"}</div>
          </div>
        </div>

        {/* SECCIÓN: ANÁLISIS DEL TITULAR (MOVIDO ARRIBA) */}
        {headlineText && headlineAnalysis && (
          <div style={{ background: "#f8f9fa", borderRadius: 8, padding: 12, border: "1px solid #eee", marginBottom: 24 }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 12, color: "#555", textTransform: "uppercase" }}>Headline Analysis</h4>
            <div style={{ fontSize: 12, fontStyle: "italic", color: "#444", marginBottom: 12, lineHeight: 1.4 }}>"{headlineText}"</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
              <div style={{ fontSize: 11 }}>
                <span style={{ color: "#777" }}>Moral:</span> <strong style={{ color: getLevelColor(headlineAnalysis.moralLanguage) }}>{(headlineAnalysis.moralLanguage * 100).toFixed(0)}%</strong>
              </div>
              <div style={{ fontSize: 11 }}>
                <span style={{ color: "#777" }}>Manipulative:</span> <strong style={{ color: getLevelColor(headlineAnalysis.manipulativeScore) }}>{(headlineAnalysis.manipulativeScore * 100).toFixed(0)}%</strong>
              </div>
              <div style={{ fontSize: 11 }}>
                <span style={{ color: "#777" }}>Emotional:</span> <strong style={{ color: getLevelColor(headlineAnalysis.emotional) }}>{(headlineAnalysis.emotional * 100).toFixed(0)}%</strong>
              </div>
              <div style={{ fontSize: 11 }}>
                <span style={{ color: "#777" }}>Exaggeration:</span> <strong style={{ color: getLevelColor(headlineAnalysis.exaggeration) }}>{(headlineAnalysis.exaggeration * 100).toFixed(0)}%</strong>
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN: ANÁLISIS DEL ARTÍCULO (BARRAS) */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", paddingBottom: 6 }}>Article Analysis</h4>
          <ProgressBar label="Moral Language" score={currentItem?.moralLanguage ?? 0} color="#5cb85c" />
          <ProgressBar label="Manipulative Tone" score={currentItem?.manipulativeScore ?? 0} color="#d9534f" />
          <ProgressBar label="Emotional Load" score={currentItem?.emotional ?? 0} color="#f0ad4e" />
          <ProgressBar label="Exaggeration Level" score={currentItem?.exaggeration ?? 0} color="#5bc0de" />
        </div>

        {/* SECCIÓN: PALABRAS CLAVE DETECTADAS */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", paddingBottom: 6 }}>Detected Keywords</h4>
          
          <div style={{ marginBottom: 8 }}>
            {currentItem?.moralKeywords?.length > 0 ? (
              currentItem.moralKeywords.map((kw: string, i: number) => <KeywordChip key={`m-${i}`} word={kw} bgColor="#dff0d8" />)
            ) : <span style={{ fontSize: 11, color: "#999" }}>No moral lexicon detected.</span>}
          </div>
          
          <div style={{ marginBottom: 8 }}>
            {currentItem?.manipulativeKeywords?.length > 0 && (
              currentItem.manipulativeKeywords.map((kw: string, i: number) => <KeywordChip key={`man-${i}`} word={kw} bgColor="#f2dede" />)
            )}
          </div>
          
          <div>
            {currentItem?.emotionalKeywords?.length > 0 && (
              currentItem.emotionalKeywords.map((kw: string, i: number) => <KeywordChip key={`e-${i}`} word={kw} bgColor="#fcf8e3" />)
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

const existingRoot = document.getElementById("amor-overlay-root")

if (!existingRoot) {
  const container = document.createElement("div")
  container.id = "amor-overlay-root"
  document.body.appendChild(container)

  ReactDOM.render(<Overlay />, container)
}