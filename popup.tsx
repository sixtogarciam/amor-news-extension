import * as React from "react"
import { Storage } from "@plasmohq/storage"

// @ts-ignore
import logoBase64 from "data-base64:~assets/logo_amor.png"

const storage = new Storage()

function IndexPopup() {
  const [analytics, setAnalytics] = React.useState({
    articlesAnalyzed: 0,
    clickbaitDetected: 0,
    sensationalDetected: 0
  })
  
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    // 1. Leer las estadísticas guardadas
    storage.get("analytics").then((val: any) => {
      if (val) {
        setAnalytics({
          articlesAnalyzed: val.articlesAnalyzed || 0,
          clickbaitDetected: val.clickbaitDetected || 0,
          sensationalDetected: val.sensationalDetected || 0
        })
      }
    })

    // 2. Leer si la extensión está encendida o apagada
    storage.get("extension_active").then((val: any) => {
      if (typeof val === "boolean") {
        setIsActive(val)
      } else {
        // Por defecto, si es la primera vez, la encendemos
        storage.set("extension_active", true)
      }
    })
  }, [])

  // Función para encender/apagar la extensión
  const toggleExtension = async () => {
    const newState = !isActive
    setIsActive(newState)
    await storage.set("extension_active", newState)
  }

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
      
      {/* CABECERA GSI (DISEÑO INTACTO) */}
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
        <div style={{ width: "64px", flexShrink: 0 }}>
          <img src={logoBase64} alt="Logo" style={{ width: "100%", height: "auto" }} />
        </div>

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
          Framing Monitor
        </h1>

        <div style={{ width: "64px", flexShrink: 0 }}></div>
      </div>

      {/* ÁREA DEL INTERRUPTOR (Reemplaza al subtítulo) */}
      <div style={{ padding: "0 20px 16px 20px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#4b5563", lineHeight: 1.5, textAlign: "center" }}>
          {isActive 
            ? "The analyzer is running in the background." 
            : "The analyzer is currently paused."}
        </p>
        
        <button
          onClick={toggleExtension}
          style={{
            backgroundColor: isActive ? "#d9534f" : "#5cb85c", // Rojo para apagar, Verde para encender
            color: "white",
            border: "none",
            borderRadius: "20px",
            padding: "8px 24px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            transition: "background-color 0.2s ease"
          }}
        >
          {isActive ? "Turn OFF Analyzer" : "Turn ON Analyzer"}
        </button>
      </div>

      {/* DASHBOARD DE ESTADÍSTICAS (Usando tus cajitas con sombra) */}
      <div style={{ padding: "0 16px 16px 16px", overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
        
        <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1f2937", paddingLeft: "4px" }}>
          Your Reading Stats
        </h3>

        {/* Tarjeta 1: Total Analizado */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid #f3f4f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span style={{ fontSize: "15px", color: "#4b5563", fontWeight: "500" }}>Articles Analyzed</span>
          <span style={{ fontSize: "24px", fontWeight: "bold", color: "#00a9e0" }}>{analytics.articlesAnalyzed}</span>
        </div>

        {/* Tarjeta 2: Clickbait/Emocional */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid #f3f4f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span style={{ fontSize: "15px", color: "#4b5563", fontWeight: "500" }}>High Emotion Warnings</span>
          <span style={{ fontSize: "24px", fontWeight: "bold", color: "#f0ad4e" }}>{analytics.clickbaitDetected}</span>
        </div>

        {/* Tarjeta 3: Exageración */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid #f3f4f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span style={{ fontSize: "15px", color: "#4b5563", fontWeight: "500" }}>Exaggerated Headlines</span>
          <span style={{ fontSize: "24px", fontWeight: "bold", color: "#d9534f" }}>{analytics.sensationalDetected}</span>
        </div>

      </div>
    </div>
  )
}

export default IndexPopup