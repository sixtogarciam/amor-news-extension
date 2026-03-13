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

function Overlay() {
  const [newsAnalysis, setNewsAnalysis] = React.useState<any[]>([])
  const [headlineAnalysis, setHeadlineAnalysis] = React.useState<any | null>(null)
const [headlineText, setHeadlineText] = React.useState("")

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

// Buscar candidatos más razonables para cuerpo de noticia
const candidates = Array.from(
document.querySelectorAll(
"article, main article, [role='main'] article, [itemprop='articleBody'], [class*='article-body'], [class*='story-body'], [class*='content']"
)
) as HTMLElement[]

const scoredCandidates = candidates
.map((item) => {
const text = item.textContent?.trim() || ""
const paragraphs = item.querySelectorAll("p").length
const links = item.querySelectorAll("a").length
const headings = item.querySelectorAll("h1, h2").length

const rect = item.getBoundingClientRect()
const area = rect.width * rect.height

// descartar bloques claramente malos
if (text.length < 400) return null
if (paragraphs < 3) return null
if (area < 50000) return null
if (rect.width < 300 || rect.height < 200) return null

// evitar menús/cabeceras/bloques con demasiados enlaces
if (links > paragraphs * 3) return null

// puntuación heurística
const score =
text.length +
paragraphs * 300 +
headings * 500 -
links * 20

return { item, text, score }
})
.filter(Boolean) as { item: HTMLElement; text: string; score: number }[]

// elegir solo el mejor candidato
const bestCandidate = scoredCandidates.sort((a, b) => b.score - a.score)[0]

if (!bestCandidate) {
await storageCS.set("analytics", analytics)
setNewsAnalysis([])
return
}

const result = analyzeArticle(bestCandidate.text)
const htmlItem = bestCandidate.item

const headlineElement =
document.querySelector("h1") ||
bestCandidate.item.querySelector("h1") ||
bestCandidate.item.querySelector("h2")

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

// outline para no deformar el layout
htmlItem.style.outline = `3px solid ${borderColor}`
htmlItem.style.outlineOffset = "2px"
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