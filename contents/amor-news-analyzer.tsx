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

function getFrameBounds(target: HTMLElement) {
const containerRect = target.getBoundingClientRect()

const headline = (
document.querySelector("h1") ||
target.querySelector("h1") ||
target.querySelector("h2")
) as HTMLElement | null

const figures = Array.from(
document.querySelectorAll("figure img, picture img, img")
) as HTMLElement[]

const validImages = figures.filter((img) => {
const rect = img.getBoundingClientRect()
if (rect.width < 220 || rect.height < 140) return false

// solo imágenes cerca del artículo
const verticallyClose =
rect.bottom >= containerRect.top - 250 &&
rect.top <= containerRect.bottom + 250

if (!verticallyClose) return false

// preferir imágenes que queden dentro o muy cerca horizontalmente
const horizontallyClose =
rect.right >= containerRect.left - 200 &&
rect.left <= containerRect.right + 200

return horizontallyClose
})

const paragraphs = Array.from(target.querySelectorAll("p")).filter((p) => {
const rect = p.getBoundingClientRect()
const text = p.innerText?.trim() || ""
const style = window.getComputedStyle(p)
const classText = `${p.className || ""} ${p.parentElement?.className || ""}`.toLowerCase()

if (style.display === "none" || style.visibility === "hidden") return false
if (text.length < 45) return false
if (rect.width < 260 || rect.height < 14) return false

if (
classText.includes("related") ||
classText.includes("promo") ||
classText.includes("footer") ||
classText.includes("share") ||
classText.includes("advert") ||
classText.includes("ad") ||
classText.includes("caption") ||
classText.includes("label") ||
classText.includes("summary")
) {
return false
}

return true
}) as HTMLElement[]

let top = Number.POSITIVE_INFINITY
let left = Number.POSITIVE_INFINITY
let right = Number.NEGATIVE_INFINITY
let bottom = Number.NEGATIVE_INFINITY

const includeRect = (rect: DOMRect) => {
top = Math.min(top, rect.top)
left = Math.min(left, rect.left)
right = Math.max(right, rect.right)
bottom = Math.max(bottom, rect.bottom)
}

// 1. titular real
if (headline) {
const hr = headline.getBoundingClientRect()
if (hr.width > 150 && hr.height > 24) {
includeRect(hr)
}
}

// 2. imagen principal cercana al artículo
if (validImages.length > 0) {
validImages.sort((a, b) => {
const ar = a.getBoundingClientRect()
const br = b.getBoundingClientRect()

const aDistance = Math.abs(ar.top - containerRect.top)
const bDistance = Math.abs(br.top - containerRect.top)

return aDistance - bDistance
})

const mainImageRect = validImages[0].getBoundingClientRect()
includeRect(mainImageRect)
}

// 3. cuerpo real
paragraphs.forEach((p) => {
includeRect(p.getBoundingClientRect())
})

// fallback
if (
!Number.isFinite(top) ||
!Number.isFinite(left) ||
!Number.isFinite(right) ||
!Number.isFinite(bottom) ||
right <= left ||
bottom <= top
) {
return {
top: containerRect.top + window.scrollY,
left: containerRect.left + window.scrollX,
width: containerRect.width,
height: containerRect.height
}
}

// limitar a una zona razonable respecto al contenedor
top = Math.max(top, containerRect.top - 220)
left = Math.max(left, containerRect.left)
right = Math.min(right, containerRect.right)
bottom = Math.min(bottom, containerRect.bottom)

const bounds = {
top: top + window.scrollY,
left: left + window.scrollX,
width: Math.max(0, right - left),
height: Math.max(0, bottom - top)
}

console.log("AMOR frame bounds:", bounds)

return bounds
}

function mountArticleFrame(target: HTMLElement, color: string) {
const frame = ensureArticleFrame()

const updateFrame = () => {
const bounds = getFrameBounds(target)

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

const onUpdate = () => {
requestAnimationFrame(updateFrame)
}

updateFrame()

window.addEventListener("scroll", onUpdate, true)
window.addEventListener("resize", onUpdate)

return () => {
window.removeEventListener("scroll", onUpdate, true)
window.removeEventListener("resize", onUpdate)
frame.style.display = "none"
}
}

function scoreCandidate(item: HTMLElement, headlineElement: Element | null) {
const text = item.innerText?.trim() || ""
const paragraphs = item.querySelectorAll("p").length
const links = item.querySelectorAll("a").length
const headings = item.querySelectorAll("h1, h2").length
const nestedArticles = item.querySelectorAll("article").length

const rect = item.getBoundingClientRect()
const area = rect.width * rect.height
const viewportArea = window.innerWidth * window.innerHeight

if (text.length < 400) return -Infinity
if (paragraphs < 3) return -Infinity
if (rect.width < 280 || rect.height < 180) return -Infinity

// Evitar bloques gigantes tipo página completa
if (area > viewportArea * 3.5) return -Infinity

// Evitar contenedores muy “navegacionales”
if (links > paragraphs * 3) return -Infinity

let score = 0

score += Math.min(text.length, 12000)
score += paragraphs * 500
score += headings * 250
score -= links * 25
score -= nestedArticles * 150

if (headlineElement && item.contains(headlineElement)) {
score += 3000
}

const classText = `${item.className || ""} ${item.id || ""}`.toLowerCase()

if (
classText.includes("article") ||
classText.includes("story") ||
classText.includes("content") ||
classText.includes("body")
) {
score += 600
}

return score
}

function findBestArticleCandidate() : HTMLElement | null {

const prioritySelectors = [
"article",
"[itemprop='articleBody']",
"[data-gu-name='body']",
".article-body",
".article__body",
".story-body",
".main-content",
"#maincontent article",
".Page-lead",
".article-body_module_content__bnXL1"
]

for (const selector of prioritySelectors) {
const el = document.querySelector(selector) as HTMLElement | null
if (el && el.querySelectorAll("p").length > 3) {
console.log("AMOR priority selector used:", selector)
return el
}
}


const headlineElement = document.querySelector("h1")

const selectorCandidates = Array.from(
document.querySelectorAll(`
article,
[itemprop="articleBody"],
[role="article"],
[class*="article-body"],
[class*="story-body"],
[class*="post-content"],
[class*="entry-content"],
[class*="article-content"],
[class*="article__content"],
[class*="ArticleBody"],
main section,
main div
`)
) as HTMLElement[]

const filteredSelectorCandidates = selectorCandidates.filter((el) => {
const tag = el.tagName.toLowerCase()
if (tag === "body" || tag === "html") return false

const text = el.innerText?.trim() || ""
const paragraphs = el.querySelectorAll("p").length

return text.length > 200 && paragraphs >= 2
})

const ancestorCandidates: HTMLElement[] = []

if (headlineElement) {
let current = headlineElement.parentElement
let depth = 0

while (current && current !== document.body && depth < 10) {
ancestorCandidates.push(current)
current = current.parentElement
depth += 1
}
}

const allCandidates = [
...new Set([...ancestorCandidates, ...filteredSelectorCandidates])
]

const scored = allCandidates
.map((item) => ({
item,
score: scoreCandidate(item, headlineElement)
}))
.filter((entry) => Number.isFinite(entry.score))
.sort((a, b) => b.score - a.score)

if (scored.length > 0) {
return scored[0].item
}

if (headlineElement) {
let fallback = headlineElement.parentElement
let depth = 0

while (fallback && fallback !== document.body && depth < 10) {
const text = fallback.innerText?.trim() || ""
const paragraphs = fallback.querySelectorAll("p").length

if (text.length > 300 && paragraphs >= 2) {
return fallback
}

fallback = fallback.parentElement
depth += 1
}
}

return null
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
frameCleanupRef.current = mountArticleFrame(htmlItem, borderColor)

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