import * as React from "react"
import newsData from "./data/news.json"

type NewsItem = {
  id: number
  title: string
  date: string
  source: string
  url: string
  summary: string
}

function IndexPopup() {
  const news = newsData as NewsItem[]

  return (
    <div
      style={{
        padding: 16,
        width: 380,
        fontFamily: "Arial, sans-serif"
      }}>
      <h2 style={{ marginTop: 0 }}>AMOR News Explorer</h2>
      <p style={{ fontSize: 14, color: "#555" }}>
        Prototype news dataset loaded from local JSON.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {news.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
              background: "#fff"
            }}>
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>
              {item.title}
            </div>

            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              {item.source} · {item.date}
            </div>

            <div style={{ fontSize: 13, color: "#444", marginBottom: 8 }}>
              {item.summary}
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 13,
                color: "#00a9e0",
                textDecoration: "none"
              }}>
              Open article
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

export default IndexPopup