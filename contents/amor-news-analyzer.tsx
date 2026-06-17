import * as React from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"
import { sendToBackground } from "@plasmohq/messaging"
import { Readability } from "@mozilla/readability"
import { analyzeArticle } from "~lib/analysis"

import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, RadialLinearScale } from "chart.js"
import { Doughnut, Bar, PolarArea } from "react-chartjs-2"

// @ts-ignore
import logoBase64 from "data-base64:~assets/logo_amor.png"

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, RadialLinearScale)

export const config = {
  matches: ["<all_urls>"],
  exclude_matches: [
    "*://*.google.com/*", "*://*.google.es/*", "*://*.bing.com/*", "*://*.youtube.com/*",
    "*://*.twitter.com/*", "*://*.x.com/*", "*://*.facebook.com/*", "*://*.wikipedia.org/*",
    "*://*.instagram.com/*", "*://*.amazon.es/*", "*://*.amazon.com/*"
  ],
  run_at: "document_idle"
}

const storageCS = new Storage()
const GSI = "#00a9e0"

function getLevelColor(score: number) {
  if (score >= 0.8) return "#d93832" // Rojo (80% - 100%) -> Nivel crítico
  if (score >= 0.6) return "#e68a00" // Naranja (60% - 80%) -> Nivel alto
  if (score >= 0.4) return "#f0ad4e" // Amarillo/Dorado (40% - 60%) -> Nivel medio
  if (score >= 0.2) return "#5cb85c" // Verde (20% - 40%) -> Nivel bajo
  return "#3b6a8c"                   // Azul acero (0% - 20%) -> Nivel muy bajo / Neutro
}

function isNewsArticle(): boolean {
  const path = window.location.pathname.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  if (path === '/' || path === '/index.html' || path.length < 25) return false;
  const rebelDomains = ["okdiario.com", "elespanol.com"];
  if (rebelDomains.some(domain => hostname.includes(domain))) return true;

  let isNewsJsonLd = false;
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const content = script.textContent?.toLowerCase() || "";
      if (content.includes('"@type":"recipe"') || content.includes('"@type": "recipe"')) return false;
      if (content.includes('"@type":"product"') || content.includes('"@type": "product"')) return false;
      if (content.includes('"newsarticle"') || content.includes('"reportagenewsarticle"') || content.includes('"article"')) {
        isNewsJsonLd = true;
      }
    } catch (e) {}
  }
  const isOgArticle = document.querySelector('meta[property="og:type"]')?.getAttribute("content")?.toLowerCase() === "article";
  const hasPublishedTime = !!document.querySelector('meta[property="article:published_time"]');
  const hasAuthor = !!document.querySelector('meta[name="author"]') || !!document.querySelector('meta[property="article:author"]');
  
  if (isOgArticle || hasPublishedTime || hasAuthor || isNewsJsonLd) return true;
  return false;
}

// 1. REINTRODUCIMOS EL COMPONENTE PROGRESSBAR ORIGINAL
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
        background: bgColor, color: "#222", padding: "3px 8px", borderRadius: 12,
        fontSize: 11, marginRight: 4, marginBottom: 4, display: "inline-block",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
      {word}
    </span>
  )
}

function highlightKeywords(element: HTMLElement, keywords: string[], color: string) {
  if (!keywords.length) return
  const uniqueKeywords = [...new Set(keywords)].filter(Boolean)
  const escapedKeywords = uniqueKeywords.map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const combinedRegex = new RegExp(`\\b(${escapedKeywords.join("|")})\\b`, "gi")
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent || parent.tagName.toLowerCase() === "script" || parent.tagName.toLowerCase() === "style" || parent.classList.contains("amor-highlight")) {
        return NodeFilter.FILTER_REJECT
      }
      return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    }
  })
  const textNodes: Text[] = []
  let currentNode: Node | null
  while ((currentNode = walker.nextNode())) textNodes.push(currentNode as Text)
  textNodes.forEach((textNode) => {
    const originalText = textNode.nodeValue || ""
    if (!combinedRegex.test(originalText)) return
    const highlightedText = originalText.replace(combinedRegex, `<span class="amor-highlight" style="background:${color}; padding:2px 4px; border-radius:3px;">$1</span>`)
    const wrapper = document.createElement("span")
    wrapper.innerHTML = highlightedText
    textNode.parentNode?.replaceChild(wrapper, textNode)
  })
}

function removeHighlights() {
  const highlights = document.querySelectorAll('span.amor-highlight');
  highlights.forEach(span => {
    const cleanText = document.createTextNode(span.textContent || "");
    span.parentNode?.replaceChild(cleanText, span);
  });
}

export default function Overlay() {
  const [isActive] = useStorage("extension_active", true)
  const [chartType] = useStorage("preferred_chart_type", "progress") // Progreso por defecto
  
  // Leemos las preferencias de los toggles de análisis
  const [showMoral] = useStorage("show_moral", true)
  const [showManipulative] = useStorage("show_manipulative", true)
  const [showEmotional] = useStorage("show_emotional", true)
  const [showExaggeration] = useStorage("show_exaggeration", true)
  
  const [newsAnalysis, setNewsAnalysis] = React.useState<any[]>([])
  const [headlineAnalysis, setHeadlineAnalysis] = React.useState<any | null>(null)
  const [headlineText, setHeadlineText] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    let isCancelled = false;
    if (!isActive) {
      removeHighlights();
      setNewsAnalysis([]);
      setIsLoading(false);
      return;
    }
    if (newsAnalysis.length > 0 || isLoading) return;

    const analyzePage = async () => {
      let attempts = 0;
      let validArticleFound = false;
      while (attempts < 6) {
        if (isNewsArticle()) {
          validArticleFound = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      if (!validArticleFound || isCancelled) return;

      const analytics = (await storageCS.get<any>("analytics")) || { articlesAnalyzed: 0, clickbaitDetected: 0, sensationalDetected: 0 }
      const results: any[] = []
      let articleData = null;
      let articleText = "";
      let detectedHeadline = "";

      try {
        const documentClone = document.cloneNode(true) as Document;
        const junk = documentClone.querySelectorAll('script, style, noscript, iframe');
        junk.forEach(el => el.remove());
        articleData = new Readability(documentClone).parse();
      } catch (e) {
        console.error("AMOR: Error crítico al ejecutar Readability", e);
      }

      if (articleData && articleData.textContent) {
        articleText = articleData.textContent.trim();
        // Priorizamos el H1 real que ve el usuario en la pantalla
        detectedHeadline = document.querySelector('h1')?.textContent?.trim() || articleData.title?.trim() || "";
      } else {
        detectedHeadline = document.querySelector('h1')?.textContent?.trim() || document.title;
        const paragraphs = Array.from(document.querySelectorAll('article p, .article-content p, p'))
                                .map(p => p.textContent?.trim() || "")
                                .filter(text => text.length > 100);
        articleText = paragraphs.slice(0, 15).join("\n\n");
      }

      if (articleText.length < 150) {
         setNewsAnalysis([]);
         return;
      }

      setIsLoading(true);
      const [articleResponse, headlineResponse] = await Promise.all([
        sendToBackground({ name: "analyzeNews", body: { text: articleText } }),
        detectedHeadline
          ? sendToBackground({ name: "analyzeNews", body: { text: detectedHeadline } })
          : Promise.resolve({ data: null })
      ]);

      if (isCancelled) {
        setIsLoading(false);
        return;
      }
      setIsLoading(false);

      // --- LÓGICA DE FALLBACK (Motor Local de Emergencia) ---
      let result;
      let headlineResult = null;

      // Detectamos el idioma de la página web automáticamente (por defecto inglés si no es español)
      const pageLang = document.documentElement.lang.toLowerCase().startsWith("es") ? "es" : "en";

      // 1. Gestionar el artículo
      if (articleResponse.error || !articleResponse.data) {
        console.warn("AMOR: Fallo en OpenAI. Activando diccionarios de emergencia para el artículo...");
        result = analyzeArticle(articleText, "general", pageLang, false); 
      } else {
        result = articleResponse.data; // Todo dinámico gracias a la IA
      }

      // 2. Gestionar el titular
      if (detectedHeadline) {
        if (headlineResponse.error || !headlineResponse.data) {
          console.warn("AMOR: Fallo en OpenAI. Activando diccionarios de emergencia para el titular...");
          headlineResult = analyzeArticle(detectedHeadline, "general", pageLang, true);
        } else {
          headlineResult = headlineResponse.data;
        }
      }

      if (headlineResult) {
        setHeadlineText(detectedHeadline)
        setHeadlineAnalysis(headlineResult)
      } else {
        setHeadlineText("")
        setHeadlineAnalysis(null)
      }

      // El subrayado ahora usa lo que haya dicho OpenAI (o los diccionarios si OpenAI falló)
      highlightKeywords(document.body, result.moralKeywords || [], "#b7f5b7")
      highlightKeywords(document.body, result.manipulativeKeywords || [], "#ffb3b3")
      highlightKeywords(document.body, result.emotionalKeywords || [], "#ffd699")
      
      results.push({ element: document.body, ...result })
      
      analytics.articlesAnalyzed += 1;
      if (result.emotional >= 0.6) analytics.clickbaitDetected += 1;
      if (result.exaggeration >= 0.6) analytics.sensationalDetected += 1;
      await storageCS.set("analytics", analytics)
      
      setNewsAnalysis(results)
    }

    analyzePage()
    return () => { isCancelled = true; }
  }, [isActive])

  if (!isActive || (newsAnalysis.length === 0 && !isLoading)) return null

  const currentItem = newsAnalysis[0]
  const framingScores = currentItem
    ? [
        { type: "Moral Focus", value: currentItem.moralLanguage },
        { type: "Loaded Language", value: currentItem.manipulativeScore ?? 0 },
        { type: "Emotional", value: currentItem.emotional },
        { type: "Exaggeration", value: currentItem.exaggeration }
      ].sort((a, b) => b.value - a.value)
    : []

  const dominantFraming = framingScores[0]
  const secondaryFraming = framingScores[1]

  // --- LÓGICA DINÁMICA DE CHART.JS (Añade datos solo si están activados) ---
  const activeLabels = [];
  const activeData = [];
  const activeBgColors = [];
  const activeBorderColors = [];

  if (showMoral) {
    activeLabels.push('Moral Language');
    activeData.push((currentItem?.moralLanguage || 0) * 100);
    activeBgColors.push('#5cb85c');
    activeBorderColors.push('#4cae4c');
  }
  if (showManipulative) {
    activeLabels.push('Manipulative');
    activeData.push((currentItem?.manipulativeScore || 0) * 100);
    activeBgColors.push('#d9534f');
    activeBorderColors.push('#d43f3a');
  }
  if (showEmotional) {
    activeLabels.push('Emotional');
    activeData.push((currentItem?.emotional || 0) * 100);
    activeBgColors.push('#f0ad4e');
    activeBorderColors.push('#eea236');
  }
  if (showExaggeration) {
    activeLabels.push('Exaggeration');
    activeData.push((currentItem?.exaggeration || 0) * 100);
    activeBgColors.push('#5bc0de');
    activeBorderColors.push('#46b8da');
  }

  const chartData = {
    labels: activeLabels,
    datasets: [
      {
        label: 'Score %',
        data: activeData,
        backgroundColor: activeBgColors,
        borderWidth: chartType === 'bar' ? 1 : 0,
        borderColor: chartType === 'bar' ? activeBorderColors : undefined,
      },
    ],
  }

  const commonOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          font: { size: 11, family: "ui-sans-serif, system-ui, sans-serif" }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        cornerRadius: 4,
        callbacks: {
          label: (context: any) => ` ${context.label}: ${context.raw.toFixed(0)}%`
        }
      }
    }
  }

  const barOptions = {
    ...commonOptions,
    plugins: { ...commonOptions.plugins, legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { stepSize: 25 } }
    }
  }

  const polarOptions = {
    ...commonOptions,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { 
          display: false, // Seguimos ocultando los números
          stepSize: 20    // Creamos un anillo de referencia cada 20% (20, 40, 60, 80, 100)
        },
        grid: { 
          display: true,  // Recuperamos las líneas de los anillos
          color: 'rgba(0, 0, 0, 0.08)', // Gris muy sutil para no ensuciar
          circular: true
        },
        angleLines: { display: false } // Ocultamos las líneas radiales rectas
      }
    }
  }

  // Comprueba si el usuario lo apagó todo
  const noAnalysisSelected = !showMoral && !showManipulative && !showEmotional && !showExaggeration;

  return (
    <div style={{
        position: "fixed", bottom: 24, right: 24, width: 384, background: "white",
        borderRadius: 12, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", zIndex: 999999,
        maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
        fontFamily: "ui-sans-serif, system-ui, sans-serif"
      }}>
      
      <div style={{ width: "100%", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: GSI, position: "relative" }}>
        <div style={{ width: "64px" }}><img src={logoBase64} alt="Logo" style={{ width: "100%", height: "auto" }} /></div>
        <h1 style={{ margin: 0, position: "absolute", left: "50%", transform: "translateX(-50%)", color: "white", fontSize: "24px", fontWeight: "bold" }}>News Analyzer</h1>
        <div style={{ width: "64px" }}></div>
      </div>

      <div style={{ padding: 16, overflowY: "auto" }}>
        
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⏱️</div>
            <h3 style={{ margin: 0, color: "#333", fontSize: 16 }}>Analizando sesgos con IA...</h3>
            <p style={{ margin: "8px 0 0 0", color: "#777", fontSize: 13 }}>Leyendo el artículo y calculando encuadres. Esto puede tardar unos segundos.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "#e1f5fe", padding: 12, borderRadius: 8, borderLeft: `3px solid ${GSI}` }}>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Dominant Signal</div>
                <div style={{ fontSize: 14, fontWeight: "bold", color: "#222" }}>{dominantFraming && dominantFraming.value > 0 ? dominantFraming.type : "Neutral"}</div>
              </div>
              <div style={{ flex: 1, background: "#e1f5fe", padding: 12, borderRadius: 8, borderLeft: `3px solid ${GSI}` }}>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Secondary Signal</div>
                <div style={{ fontSize: 14, fontWeight: "bold", color: "#222" }}>{secondaryFraming && secondaryFraming.value > 0 ? secondaryFraming.type : "None"}</div>
              </div>
            </div>

            {headlineText && headlineAnalysis && !noAnalysisSelected && (
              <div style={{ background: "#f0f8ff", borderRadius: 8, padding: 12, border: `1px solid ${GSI}`, marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 12, color: "#006699", textTransform: "uppercase" }}>Headline Analysis</h4>
                <div style={{ fontSize: 12, fontStyle: "italic", color: "#1a365d", marginBottom: 12, lineHeight: 1.4 }}>"{headlineText}"</div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                  {showMoral && (
                    <div style={{ fontSize: 11 }}>
                      <span style={{ color: "#5a7a94" }}>Moral:</span> <strong style={{ color: getLevelColor(headlineAnalysis.moralLanguage) }}>{(headlineAnalysis.moralLanguage * 100).toFixed(0)}%</strong>
                    </div>
                  )}
                  {showManipulative && (
                    <div style={{ fontSize: 11 }}>
                      <span style={{ color: "#5a7a94" }}>Manipulative:</span> <strong style={{ color: getLevelColor(headlineAnalysis.manipulativeScore) }}>{(headlineAnalysis.manipulativeScore * 100).toFixed(0)}%</strong>
                    </div>
                  )}
                  {showEmotional && (
                    <div style={{ fontSize: 11 }}>
                      <span style={{ color: "#5a7a94" }}>Emotional:</span> <strong style={{ color: getLevelColor(headlineAnalysis.emotional) }}>{(headlineAnalysis.emotional * 100).toFixed(0)}%</strong>
                    </div>
                  )}
                  {showExaggeration && (
                    <div style={{ fontSize: 11 }}>
                      <span style={{ color: "#5a7a94" }}>Exaggeration:</span> <strong style={{ color: getLevelColor(headlineAnalysis.exaggeration) }}>{(headlineAnalysis.exaggeration * 100).toFixed(0)}%</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", paddingBottom: 6 }}>Article Analysis</h4>
              
              {noAnalysisSelected ? (
                 <p style={{ fontSize: 12, color: "#999", textAlign: "center", fontStyle: "italic" }}>All analysis types disabled in settings.</p>
              ) : chartType === 'progress' ? (
                // Diseño de barras de progreso original (CLASSIC)
                <div>
                   {showMoral && <ProgressBar label="Moral Language" score={currentItem?.moralLanguage ?? 0} color="#5cb85c" />}
                   {showManipulative && <ProgressBar label="Manipulative Language" score={currentItem?.manipulativeScore ?? 0} color="#d9534f" />}
                   {showEmotional && <ProgressBar label="Emotional Intensity" score={currentItem?.emotional ?? 0} color="#f0ad4e" />}
                   {showExaggeration && <ProgressBar label="Exaggeration Level" score={currentItem?.exaggeration ?? 0} color="#5bc0de" />}
                </div>
              ) : (
                // Diseño Chart.js Dinámico
                <div style={{ height: "180px", width: "100%", display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                  {chartType === 'doughnut' && <Doughnut data={chartData} options={commonOptions as any} />}
                  {chartType === 'bar' && <Bar data={chartData} options={barOptions as any} />}
                  {chartType === 'polarArea' && <PolarArea data={chartData} options={polarOptions as any} />}
                </div>
              )}
            </div>

            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "#333", borderBottom: "1px solid #eee", paddingBottom: 6 }}>Detected Keywords</h4>
              
              {showMoral && (
                <div style={{ marginBottom: 8 }}>
                  {currentItem?.moralKeywords?.length > 0 ? (
                    [...new Set(currentItem.moralKeywords)].map((kw: string, i: number) => <KeywordChip key={`m-${i}`} word={kw} bgColor="#dff0d8" />)
                  ) : <span style={{ fontSize: 11, color: "#999" }}>No moral lexicon detected.</span>}
                </div>
              )}
              
              {showManipulative && (
                <div style={{ marginBottom: 8 }}>
                  {currentItem?.manipulativeKeywords?.length > 0 && (
                    [...new Set(currentItem.manipulativeKeywords)].map((kw: string, i: number) => <KeywordChip key={`man-${i}`} word={kw} bgColor="#f2dede" />)
                  )}
                </div>
              )}
              
              {showEmotional && (
                <div>
                  {currentItem?.emotionalKeywords?.length > 0 && (
                    [...new Set(currentItem.emotionalKeywords)].map((kw: string, i: number) => <KeywordChip key={`e-${i}`} word={kw} bgColor="#fcf8e3" />)
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}