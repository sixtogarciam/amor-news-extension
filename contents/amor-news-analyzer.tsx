import * as React from "react"
import * as ReactDOM from "react-dom"
import { Storage } from "@plasmohq/storage"
import { analyzeArticle } from "~lib/analysis"

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

function renderBar(score: number) {
const filled = Math.round(score * 10)
const empty = 10 - filled
return "█".repeat(filled) + "░".repeat(empty)
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
tag === "script" ||
tag === "style" ||
tag === "noscript" ||
parent.classList.contains("amor-highlight")
) {
return NodeFilter.FILTER_REJECT
}

if (!node.nodeValue || !node.nodeValue.trim()) {
return NodeFilter.FILTER_REJECT
}

return NodeFilter.FILTER_ACCEPT
}
}
)

const textNodes: Text[] = []
let currentNode: Node | null

while ((currentNode = walker.nextNode())) {
textNodes.push(currentNode as Text)
}

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

function ensureArticleFrame() {
let frame = document.getElementById("amor-article-frame") as HTMLDivElement | null

if (!frame) {
frame = document.createElement("div")
frame.id = "amor-article-frame"
frame.style.position = "absolute"
frame.style.pointerEvents = "none"
frame.style.zIndex = "999998"
frame.style.borderRadius = "10px"
frame.style.boxSizing = "border-box"
frame.style.transition = "all 0.12s ease"
document.body.appendChild(frame)
}

return frame
}

function getReadableParagraphs(scope: ParentNode): HTMLElement[] {
const headline = document.querySelector("h1") as HTMLElement | null
const headlineRect = headline?.getBoundingClientRect()

return Array.from(scope.querySelectorAll("p")).filter((p) => {
const el = p as HTMLElement
const text = el.innerText?.trim() || ""
const rect = el.getBoundingClientRect()

const cls =
`${el.className || ""} ${el.parentElement?.className || ""} ${el.parentElement?.id || ""}`.toLowerCase()

if (text.length < 40) return false
if (rect.width < 220 || rect.height < 12) return false

if (
cls.includes("related") ||
cls.includes("promo") ||
cls.includes("footer") ||
cls.includes("share") ||
cls.includes("advert") ||
cls.includes("ad") ||
cls.includes("caption") ||
cls.includes("read-next") ||
cls.includes("readnext") ||
cls.includes("carousel") ||
cls.includes("recommend") ||
cls.includes("newsletter") ||
cls.includes("social") ||
cls.includes("conversation") ||
cls.includes("comment") ||
cls.includes("most-read") ||
cls.includes("popular") ||
cls.includes("sidebar") ||
cls.includes("outbrain") ||
cls.includes("podcast") ||
cls.includes("listen") ||
cls.includes("from-the-take") ||
cls.includes("take")
) {
return false
}

if (headlineRect) {
const horizontalOverlap =
Math.min(rect.right, headlineRect.right) - Math.max(rect.left, headlineRect.left)

if (horizontalOverlap < Math.min(120, headlineRect.width * 0.35)) {
return false
}
}

return true
}) as HTMLElement[]
}

function calculateContentRect(container: HTMLElement) {
  const allParas = Array.from(container.querySelectorAll("p")).filter(p => {
    const rect = p.getBoundingClientRect()
    return p.innerText.trim().length > 40 && rect.width > 200 && rect.height > 0
  })

  if (allParas.length === 0) return container.getBoundingClientRect()

  // 1. Definir la columna real con los 5 párrafos más largos
  const longestParas = [...allParas].sort((a, b) => b.innerText.length - a.innerText.length).slice(0, 5)

  let minPLeft = Infinity
  let maxPRight = -Infinity
  longestParas.forEach(p => {
    const r = p.getBoundingClientRect()
    minPLeft = Math.min(minPLeft, r.left)
    maxPRight = Math.max(maxPRight, r.right)
  })

  // 2. FRENO DE MANO INFERIOR
  let stopBottom = Infinity
  const stopSelectors = [
    "[id*='comment']", "[class*='comment']",
    "[id*='related']", "[class*='related']",
    "[id*='recommend']", "[class*='recommend']",
    "[class*='author']", "footer", ".hub", ".tags", ".byline"
  ]
  
  stopSelectors.forEach(selector => {
    const nodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    nodes.forEach(node => {
      if (container.contains(node)) {
        const rect = node.getBoundingClientRect()
        if (rect.top > longestParas[0].getBoundingClientRect().top + 200 && rect.height > 10) {
          stopBottom = Math.min(stopBottom, rect.top)
        }
      }
    })
  })

  // 3. Buscamos y filtramos los elementos
  const contentSelectors = `p, img, ul, ol, figure, h2, h3, h4`
  const rawElements = container.querySelectorAll(contentSelectors)

  const elements = Array.from(rawElements).filter(rawEl => {
    const el = rawEl as HTMLElement
    const text = el.innerText?.trim() || ""
    const classes = (el.className + " " + (el.parentElement?.className || "")).toLowerCase()

    const junkClasses = ["related", "read-more", "readnext", "comments", "advert", "sidebar", "promo", "newsletter", "footer", "author", "share", "tags", "social", "hub", "recommend", "byline"]
    if (junkClasses.some(cls => classes.includes(cls))) return false

    const isInsideLink = el.closest('a') !== null
    if (isInsideLink) {
      if (el.tagName.toLowerCase() === 'img') return false
      if (text.length > 40) return false
    }

    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    if (el.tagName.toLowerCase() === 'p' && text.length < 40) return false
    if (el.tagName.toLowerCase() === 'img' && (rect.width < 250 || rect.height < 100)) return false

    // --- EL TRUCO DEL CENTRO DE GRAVEDAD ---
    // Calculamos el centro matemático del elemento
    const elementCenter = rect.left + (rect.width / 2)
    
    // Si su centro está a la izquierda de la noticia (The Guardian) o a la derecha (AP)... lo descartamos.
    if (elementCenter < minPLeft - 20 || elementCenter > maxPRight + 20) {
      return false
    }
    
    if (rect.top >= stopBottom) return false

    return true
  })

  if (elements.length === 0) return container.getBoundingClientRect()

  let minTop = Infinity
  let minLeft = Infinity
  let maxRight = -Infinity
  let maxBottom = -Infinity

  for (const el of elements) {
    const rect = el.getBoundingClientRect()
    minTop = Math.min(minTop, rect.top)
    minLeft = Math.min(minLeft, rect.left)
    maxRight = Math.max(maxRight, rect.right)
    maxBottom = Math.max(maxBottom, rect.bottom)
  }

  return {
    top: minTop,
    left: minLeft,
    width: maxRight - minLeft,
    height: maxBottom - minTop,
    right: maxRight,
    bottom: maxBottom,
    x: minLeft,
    y: minTop
  }
}

function getFrameBounds(bestCandidate: HTMLElement) {
  const contentRect = calculateContentRect(bestCandidate)
  
  let top = contentRect.top
  let left = contentRect.left
  let width = contentRect.width
  let bottom = contentRect.bottom

  const headline = document.querySelector("h1") as HTMLElement | null
  if (headline) {
    const hRect = headline.getBoundingClientRect()
    // Quitamos la restricción de que hRect.top >= 0 para que no lo pierda al hacer scroll
    if (hRect.top < top && hRect.bottom <= top + 300) {
      top = hRect.top 
    }
    // Ajustamos el ancho si el título sobresale un poco
    if (hRect.width > width) {
      left = Math.min(left, hRect.left)
      width = hRect.width
    }
  }

  const bounds = {
    top: top + window.scrollY,
    left: left + window.scrollX,
    width: Math.max(0, width),
    height: Math.max(0, bottom - top)
  }

  return bounds
}

function mountArticleFrame(bestCandidate: HTMLElement, color: string) {
const frame = ensureArticleFrame()
let rafId = 0
let retries = 0
let intervalId: number | null = null

const updateFrame = () => {
const bounds = getFrameBounds(bestCandidate)

if (bounds.width < 120 || bounds.height < 120) {
frame.style.display = "none"
return
}

frame.style.display = "block"
frame.style.top = `${Math.max(0, bounds.top - 4)}px`
frame.style.left = `${Math.max(0, bounds.left - 4)}px`
frame.style.width = `${Math.max(0, bounds.width + 8)}px`
frame.style.height = `${Math.max(0, bounds.height + 8)}px`
frame.style.border = `3px solid ${color}`
frame.style.boxShadow =
"0 0 0 2px rgba(255,255,255,0.9), 0 0 12px rgba(0,0,0,0.15)"
frame.style.background = "transparent"
}

const scheduleUpdate = () => {
cancelAnimationFrame(rafId)
rafId = requestAnimationFrame(updateFrame)
}

updateFrame()

window.addEventListener("resize", scheduleUpdate)
window.addEventListener("scroll", scheduleUpdate, true)

const observer = new MutationObserver(() => {
scheduleUpdate()
})

observer.observe(bestCandidate, {
childList: true,
subtree: true,
characterData: true
})

intervalId = window.setInterval(() => {
updateFrame()
retries += 1

if (retries >= 12 && intervalId !== null) {
clearInterval(intervalId)
intervalId = null
}
}, 500)

return () => {
window.removeEventListener("resize", scheduleUpdate)
window.removeEventListener("scroll", scheduleUpdate, true)
observer.disconnect()
cancelAnimationFrame(rafId)

if (intervalId !== null) {
clearInterval(intervalId)
}

frame.style.display = "none"
}
}


function findBestArticleCandidate(): HTMLElement | null {
  // 1. Recopilamos todos los contenedores posibles de la página
  const candidates = Array.from(
    document.querySelectorAll(`
      article, [itemprop="articleBody"], [role="article"],
      .article-body, .story-body, .post-content, .entry-content,
      main, section, div
    `)
  ) as HTMLElement[]

  // 2. Filtramos los que son demasiado pequeños para ser una noticia
  const validCandidates = candidates.filter(el => {
    const tag = el.tagName.toLowerCase()
    if (tag === "body" || tag === "html") return false
    
    const rect = el.getBoundingClientRect()
    const textLength = el.innerText?.trim().length || 0
    return rect.width > 300 && rect.height > 200 && textLength > 250
  })

  // 3. Puntuamos cada contenedor basándonos en su densidad de texto vs enlaces
  const scored = validCandidates.map(item => {
    let score = 0
    const pCount = item.querySelectorAll("p").length
    const aCount = item.querySelectorAll("a").length
    const textLength = item.innerText?.length || 0
    
    // Si no hay apenas párrafos, o hay muchísimos enlaces (es un menú o footer), lo descartamos
    if (pCount < 2) return { item, score: -Infinity }
    if (aCount > pCount * 4) return { item, score: -Infinity }

    // Premiamos la cantidad de texto y párrafos (el cuerpo de la noticia)
    score += pCount * 50
    score += textLength / 100

    // Premiamos si la clase HTML suena a artículo
    const cls = (item.className + " " + item.id).toLowerCase()
    if (cls.includes("article") || cls.includes("story") || cls.includes("content")) {
      score += 200
    }
    // Penalizamos si la clase suena a menú lateral o comentarios
    if (cls.includes("sidebar") || cls.includes("comment") || cls.includes("footer") || cls.includes("related")) {
      score -= 500
    }

    // Penalizamos suavemente si es extremadamente ancho (para evitar coger toda la web entera)
    if (item.getBoundingClientRect().width > 1200) {
      score -= 300
    }

    return { item, score }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score)

  // 4. Devolvemos el ganador
  if (scored.length > 0) {
    console.log("AMOR Nuevo Mejor Candidato:", scored[0].item)
    return scored[0].item
  }

  // 5. Salvavidas extremo: Si todo falla (ej. Al Jazeera), buscamos la etiqueta article o el H1
  console.log("AMOR Usando salvavidas para encontrar candidato")
  const fallbackArticle = document.querySelector("article")
  const fallbackH1 = document.querySelector("h1")
  
  return fallbackArticle || (fallbackH1?.parentElement as HTMLElement) || null
}

function Overlay() {
  const [newsAnalysis, setNewsAnalysis] = React.useState<any[]>([])
  const [headlineAnalysis, setHeadlineAnalysis] = React.useState<any | null>(null)
const [headlineText, setHeadlineText] = React.useState("")
const frameCleanupRef = React.useRef<null | (() => void)>(null)


  React.useEffect(() => {
    const analyzePage = async () => {
const threshold = (await storageCS.get<number>("threshold")) ?? 0.6
const analytics =
(await storageCS.get<any>("analytics")) || {
articlesAnalyzed: 0,
clickbaitDetected: 0,
sensationalDetected: 0
}

const results: any[] = []

const bestCandidate: HTMLElement | null = findBestArticleCandidate()

if (bestCandidate) {
console.log("AMOR bestCandidate:", bestCandidate)
console.log("AMOR tag:", bestCandidate.tagName)
console.log("AMOR id:", bestCandidate.id)
console.log("AMOR class:", bestCandidate.className)
console.log("AMOR text length:", bestCandidate.innerText?.length || 0)
console.log("AMOR paragraphs:", bestCandidate.querySelectorAll("p").length)
console.log("AMOR rect:", bestCandidate.getBoundingClientRect())
}

if (!bestCandidate) {
frameCleanupRef.current?.()
frameCleanupRef.current = null
await storageCS.set("analytics", analytics)
setNewsAnalysis([])
return
}

const articleText = bestCandidate.innerText?.trim() || ""
const result = analyzeArticle(articleText)

let htmlItem: HTMLElement = bestCandidate

const headlineElement =
document.querySelector("h1") ||
bestCandidate.querySelector("h1") ||
bestCandidate.querySelector("h2")

const detectedHeadline = headlineElement?.textContent?.trim() || ""

if (detectedHeadline) {
const headlineResult = analyzeArticle(detectedHeadline)
setHeadlineText(detectedHeadline)
setHeadlineAnalysis(headlineResult)
} else {
setHeadlineText("")
setHeadlineAnalysis(null)
}

const scores = [
{ type: "Moral", value: result.moralLanguage },
{ type: "Manipulative", value: result.manipulativeScore },
{ type: "Emotional", value: result.emotional },
{ type: "Exaggeration", value: result.exaggeration }
]

scores.sort((a, b) => b.value - a.value)

highlightKeywords(htmlItem, result.moralKeywords || [], "#b7f5b7")
highlightKeywords(htmlItem, result.manipulativeKeywords || [], "#ffb3b3")
highlightKeywords(htmlItem, result.emotionalKeywords || [], "#ffd699")

const moralColor =
result.moralLanguage > 0.7
? "lightgreen"
: result.moralLanguage > 0.4
? "lightyellow"
: "lightcoral"

let borderColor = moralColor

if (result.emotional > threshold) {
borderColor = CLICKBAIT_COLOR
analytics.clickbaitDetected += 1
} else if (result.exaggeration > threshold) {
borderColor = SENSATIONAL_COLOR
analytics.sensationalDetected += 1
}

frameCleanupRef.current?.()
frameCleanupRef.current = mountArticleFrame(bestCandidate, borderColor)

htmlItem.title = `Moral: ${result.moralLanguage.toFixed(
2
)}, Emotional: ${result.emotional.toFixed(
2
)}, Exaggeration: ${result.exaggeration.toFixed(2)}`

results.push({ element: htmlItem, ...result })
analytics.articlesAnalyzed += 1

await storageCS.set("analytics", analytics)
setNewsAnalysis(results)
}


analyzePage()

return () => {
frameCleanupRef.current?.()
}
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
        bottom: 20,
        right: 20,
        width: 320,
        background: "white",
        borderRadius: 16,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        padding: 16,
        zIndex: 999999,
        maxHeight: "50%",
        overflowY: "auto",
        fontFamily: "Arial"
      }}>
      <h3>AMOR News Analyzer</h3>

{headlineText && (
<div
style={{
marginBottom: 12,
padding: 10,
background: "#f7f7f7",
borderRadius: 8,
fontSize: 12,
lineHeight: 1.5
}}>
<div style={{ marginBottom: 6 }}>
<strong>Headline:</strong> {headlineText}
</div>

{headlineAnalysis && (
<>
<div>
<strong>Headline moral:</strong> {headlineAnalysis.moralLanguage.toFixed(2)}{" "}
<span
style={{
color: getLevelColor(headlineAnalysis.moralLanguage),
fontWeight: "bold"
}}>
({getLevel(headlineAnalysis.moralLanguage)})
</span>
</div>

<div>
<strong>Headline manipulative:</strong>{" "}
{headlineAnalysis.manipulativeScore.toFixed(2)}{" "}
<span
style={{
color: getLevelColor(headlineAnalysis.manipulativeScore),
fontWeight: "bold"
}}>
({getLevel(headlineAnalysis.manipulativeScore)})
</span>
</div>

<div>
<strong>Headline emotional:</strong> {headlineAnalysis.emotional.toFixed(2)}{" "}
<span
style={{
color: getLevelColor(headlineAnalysis.emotional),
fontWeight: "bold"
}}>
({getLevel(headlineAnalysis.emotional)})
</span>
</div>

<div>
<strong>Headline exaggeration:</strong> {headlineAnalysis.exaggeration.toFixed(2)}{" "}
<span
style={{
color: getLevelColor(headlineAnalysis.exaggeration),
fontWeight: "bold"
}}>
({getLevel(headlineAnalysis.exaggeration)})
</span>
</div>
</>
)}
</div>
)}
      <div style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.4 }}>
<div>
<strong>Dominant framing:</strong>{" "}
{dominantFraming ? dominantFraming.type : "Unknown"}
</div>
<div>
<strong>Secondary signal:</strong>{" "}
{secondaryFraming ? secondaryFraming.type : "Unknown"}
</div>
<div
style={{
marginBottom: 12,
padding: 10,
background: "#f7f7f7",
borderRadius: 8,
fontSize: 12,
lineHeight: 1.6
}}>
<div style={{ fontWeight: "bold", marginBottom: 6 }}>
Framing distribution
</div>

<div>
Moral:{" "}
<span style={{ fontFamily: "monospace" }}>
{renderBar(currentItem?.moralLanguage ?? 0)}
</span>
</div>

<div>
Manipulative:{" "}
<span style={{ fontFamily: "monospace" }}>
{renderBar(currentItem?.manipulativeScore ?? 0)}
</span>
</div>

<div>
Emotional:{" "}
<span style={{ fontFamily: "monospace" }}>
{renderBar(currentItem?.emotional ?? 0)}
</span>
</div>

<div>
Exaggeration:{" "}
<span style={{ fontFamily: "monospace" }}>
{renderBar(currentItem?.exaggeration ?? 0)}
</span>
</div>
</div>
</div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {newsAnalysis.map((item, idx) => (
          <li key={idx} style={{ marginBottom: 12 }}>

<div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>
<div>
<strong>Moral:</strong> {item.moralLanguage.toFixed(2)}{" "}
<span
style={{
color: getLevelColor(item.moralLanguage),
fontWeight: "bold"
}}>
({getLevel(item.moralLanguage)})
</span>
</div>

<div>
<strong>Manipulative:</strong>{" "}
{(item.manipulativeScore ?? 0).toFixed(2)}{" "}
<span
style={{
color: getLevelColor(item.manipulativeScore ?? 0),
fontWeight: "bold"
}}>
({getLevel(item.manipulativeScore ?? 0)})
</span>
</div>

<div>
<strong>Emotional:</strong> {item.emotional.toFixed(2)}{" "}
<span
style={{
color: getLevelColor(item.emotional),
fontWeight: "bold"
}}>
({getLevel(item.emotional)})
</span>
</div>

<div>
<strong>Exaggeration:</strong> {item.exaggeration.toFixed(2)}{" "}
<span
style={{
color: getLevelColor(item.exaggeration),
fontWeight: "bold"
}}>
({getLevel(item.exaggeration)})
</span>
</div>
<div>
<strong>Framing density:</strong>{" "}
{(item.framingDensity ?? 0).toFixed(3)}
</div>
</div>

<div style={{ fontSize: 11, color: "#777", marginTop: 8, lineHeight: 1.4 }}>
<div>
<strong>Moral keywords:</strong>{" "}
{item.moralKeywords?.join(", ") || "None"}
</div>
<div>
<strong>Manipulative keywords:</strong>{" "}
{item.manipulativeKeywords?.join(", ") || "None"}
</div>
<div>
<strong>Emotional keywords:</strong>{" "}
{item.emotionalKeywords?.join(", ") || "None"}
</div>
</div>

          </li>
        ))}
      </ul>
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