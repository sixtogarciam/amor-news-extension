import * as React from "react"
import newsData from "./data/news.json"
import { analyzeArticle } from "~lib/analysis"

import logoBase64 from "data-base64:~assets/logo_amor.png"

type NewsItem = {
  id: number
  title: string
  date: string
  source: string
  url: string
  summary: string
}

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

function IndexPopup() {
  const news = newsData as NewsItem[]

  return (
    <div
      style={{
        width: "384px", 
        minHeight: "600px", 
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        borderRadius: "12px", 
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", 
        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        overflow: "hidden"
      }}>
      
      {/* CABECERA GSI */}
      <div style={{ 
        width: "100%", 
        padding: "16px", 
        marginBottom: "16px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        backgroundColor: "#00a9e0", 
        position: "relative",
        flexShrink: 0
      }}>
        {/* LOGO */}
        <div style={{ width: "64px", flexShrink: 0 }}>
          <img src={logoBase64} alt="Logo" style={{ width: "100%", height: "auto" }} />
        </div>

        {/* TÍTULO (Solo "News Explorer") */}
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
          News Explorer
        </h1>

        {/* Div vacío para mantener el centrado perfecto */}
        <div style={{ width: "64px", flexShrink: 0 }}></div>
      </div>

      {/* SUBTÍTULO / DESCRIPCIÓN */}
      <div style={{ padding: "0 20px 16px 20px", flexShrink: 0, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#4b5563", lineHeight: 1.5 }}>
          Prototype news dataset with basic framing analysis.
        </p>
      </div>

      {/* LISTA DE NOTICIAS */}
      <div style={{ padding: "0 16px 16px 16px", overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
        {news.map((item) => {
          const analysis = analyzeArticle(`${item.title}. ${item.summary}`)

          return (
            <div
              key={item.id}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                border: "1px solid #f3f4f6" 
              }}>
              
              <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", color: "#1f2937", lineHeight: 1.4, fontWeight: "bold" }}>
                {item.title}
              </h4>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                {item.source} · {item.date}
              </div>

              <div style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#4b5563", lineHeight: 1.5 }}>
                {item.summary}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px", backgroundColor: "#f9fafb", padding: "10px", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "#374151" }}>
                  <strong>Moral:</strong>{" "}
                  <span style={{ color: getLevelColor(analysis.moralLanguage), fontWeight: "bold" }}>
                    {analysis.moralLanguage.toFixed(2)} ({getLevel(analysis.moralLanguage)})
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#374151" }}>
                  <strong>Manipulative:</strong>{" "}
                  <span style={{ color: getLevelColor(analysis.manipulativeScore), fontWeight: "bold" }}>
                    {analysis.manipulativeScore.toFixed(2)} ({getLevel(analysis.manipulativeScore)})
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#374151" }}>
                  <strong>Emotional:</strong>{" "}
                  <span style={{ color: getLevelColor(analysis.emotional), fontWeight: "bold" }}>
                    {analysis.emotional.toFixed(2)} ({getLevel(analysis.emotional)})
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#4b5563", marginBottom: "16px", lineHeight: 1.6 }}>
                <div>
                  <strong>Moral keywords:</strong>{" "}
                  {analysis.moralKeywords.length > 0 
                    ? analysis.moralKeywords.slice(0, 3).map((kw, i) => (
                        <span key={i} style={{ background: "#dcfce7", padding: "2px 6px", borderRadius: "4px", color: "#166534", marginRight: "4px", display: "inline-block", marginBottom: "2px" }}>{kw}</span>
                      ))
                    : "None"}
                </div>
                <div style={{ marginTop: "4px" }}>
                  <strong>Manipulative keywords:</strong>{" "}
                  {analysis.manipulativeKeywords.length > 0 
                    ? analysis.manipulativeKeywords.slice(0, 3).map((kw, i) => (
                        <span key={i} style={{ background: "#fee2e2", padding: "2px 6px", borderRadius: "4px", color: "#991b1b", marginRight: "4px", display: "inline-block", marginBottom: "2px" }}>{kw}</span>
                      ))
                    : "None"}
                </div>
                <div style={{ marginTop: "4px" }}>
                  <strong>Emotional keywords:</strong>{" "}
                  {analysis.emotionalKeywords.length > 0 
                    ? analysis.emotionalKeywords.slice(0, 3).map((kw, i) => (
                        <span key={i} style={{ background: "#fef3c7", padding: "2px 6px", borderRadius: "4px", color: "#92400e", marginRight: "4px", display: "inline-block", marginBottom: "2px" }}>{kw}</span>
                      ))
                    : "None"}
                </div>
              </div>

              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  fontSize: "13px",
                  color: "#00a9e0",
                  textDecoration: "none",
                  fontWeight: "bold"
                }}>
                Open article →
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default IndexPopup