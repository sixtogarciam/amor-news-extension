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

function Overlay() {
  const [newsAnalysis, setNewsAnalysis] = React.useState<any[]>([])

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

// 1) Intentar detectar un artículo principal
const mainArticle =
  document.querySelector("main article") ||
  document.querySelector("article") ||
  document.querySelector("[role='main'] article") ||
  document.querySelector("main") ||
  document.querySelector("[role='main']")

if (mainArticle) {
  const text = mainArticle.textContent?.trim() || ""

  if (text.length >= 200) {
    const result = analyzeArticle(text)

    const htmlItem = mainArticle as HTMLElement

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

    htmlItem.style.border = `3px solid ${borderColor}`
    htmlItem.style.borderRadius = "8px"
    htmlItem.style.padding = "4px"
    htmlItem.title = `Moral: ${result.moralLanguage.toFixed(
      2
    )}, Emotional: ${result.emotional.toFixed(
      2
    )}, Exaggeration: ${result.exaggeration.toFixed(2)}`

    results.push({ element: htmlItem, ...result })
    analytics.articlesAnalyzed += 1
  }
} else {
  // 2) Si no hay artículo principal claro, usar fallback anterior
  const newsItems = document.querySelectorAll(
    "article, .news-item, [class*='article'], [class*='story']"
  )

  newsItems.forEach((item) => {
    const text = item.textContent?.trim() || ""

    if (text.length < 120) return

    const links = item.querySelectorAll("a")
    if (links.length === 0) return

    const result = analyzeArticle(text)

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

    const htmlItem = item as HTMLElement
    htmlItem.style.border = `3px solid ${borderColor}`
    htmlItem.style.borderRadius = "8px"
    htmlItem.style.padding = "4px"
    htmlItem.title = `Moral: ${result.moralLanguage.toFixed(
      2
    )}, Emotional: ${result.emotional.toFixed(
      2
    )}, Exaggeration: ${result.exaggeration.toFixed(2)}`

    results.push({ element: htmlItem, ...result })
    analytics.articlesAnalyzed += 1
  })
}

      await storageCS.set("analytics", analytics)
      setNewsAnalysis(results)
    }

    analyzePage()
  }, [])

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

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {newsAnalysis.map((item, idx) => (
          <li key={idx} style={{ marginBottom: 8 }}>
            <strong
              style={{
                color:
                  item.emotional > 0.6
                    ? CLICKBAIT_COLOR
                    : item.exaggeration > 0.6
                      ? SENSATIONAL_COLOR
                      : GSI
              }}>
              {item.element.textContent?.slice(0, 80)}...
            </strong>

            <div style={{ fontSize: 12, color: "#555" }}>
              Moral: {item.moralLanguage.toFixed(2)}, Emotional:{" "}
              {item.emotional.toFixed(2)}, Exaggeration:{" "}
              {item.exaggeration.toFixed(2)}
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