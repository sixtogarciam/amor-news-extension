import * as React from "react"
import newsData from "./data/news.json"
import { analyzeArticle } from "~lib/analysis"

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
if (score >= 0.6) return "#d9534f" // rojo
if (score >= 0.3) return "#f0ad4e" // naranja
return "#777" // gris
}

function IndexPopup() {
const news = newsData as NewsItem[]

return (
<div
style={{
padding: 16,
width: 380,
fontFamily: "Arial, sans-serif",
background: "#f8f9fb"
}}>
<h2 style={{ marginTop: 0, marginBottom: 8 }}>AMOR News Explorer</h2>
<p style={{ fontSize: 14, color: "#555", marginTop: 0 }}>
Prototype news dataset with basic framing analysis.
</p>

<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
{news.map((item) => {
const analysis = analyzeArticle(`${item.title}. ${item.summary}`)

return (
<div
key={item.id}
style={{
border: "1px solid #ddd",
borderRadius: 10,
padding: 12,
background: "#fff",
boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
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

<div
style={{
fontSize: 12,
color: "#333",
marginBottom: 8,
lineHeight: 1.5
}}>
<div>
<strong>Moral:</strong> {analysis.moralLanguage.toFixed(2)}{" "}
<span style={{ color: getLevelColor(analysis.moralLanguage), fontWeight: "bold" }}>
({getLevel(analysis.moralLanguage)})
</span>
</div>
<div>
<strong>Manipulative:</strong> {analysis.manipulativeScore.toFixed(2)}{" "}
<span
style={{
color: getLevelColor(analysis.manipulativeScore),
fontWeight: "bold"
}}>
({getLevel(analysis.manipulativeScore)})
</span>
</div>
<div>
<strong>Emotional:</strong> {analysis.emotional.toFixed(2)}{" "}
<span style={{ color: getLevelColor(analysis.emotional), fontWeight: "bold" }}>
({getLevel(analysis.emotional)})
</span>
</div>

</div>

<div style={{ fontSize: 11, color: "#777", marginBottom: 8 }}>
<div>
<strong>Moral keywords:</strong>{" "}
{analysis.moralKeywords.slice(0, 3).join(", ") || "None"}
</div>
<div>
<strong>Manipulative keywords:</strong>{" "}
{analysis.manipulativeKeywords.slice(0, 3).join(", ") ||
"None"}
</div>
<div>
<strong>Emotional keywords:</strong>{" "}
{analysis.emotionalKeywords.slice(0, 3).join(", ") || "None"}
</div>
</div>

<a
href={item.url}
target="_blank"
rel="noreferrer"
style={{
fontSize: 13,
color: "#00a9e0",
textDecoration: "none",
fontWeight: "bold"
}}>
Open article
</a>
</div>
)
})}
</div>
</div>
)
}

export default IndexPopup