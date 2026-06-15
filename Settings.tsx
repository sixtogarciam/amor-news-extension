import * as React from "react"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

const storage = new Storage()

export function SettingsView() {
  const [apiKey, setApiKey] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  
  // Opciones de visualización (Por defecto "progress" para recuperar las barras horizontales)
  const [chartType, setChartType] = useStorage("preferred_chart_type", "progress")
  
  // Checkboxes para encender/apagar cada análisis (Por defecto todos activados)
  const [showMoral, setShowMoral] = useStorage("show_moral", true)
  const [showManipulative, setShowManipulative] = useStorage("show_manipulative", true)
  const [showEmotional, setShowEmotional] = useStorage("show_emotional", true)
  const [showExaggeration, setShowExaggeration] = useStorage("show_exaggeration", true)

  React.useEffect(() => {
    storage.get("openai_api_key").then((val: string) => {
      if (val) setApiKey(val)
    })
  }, [])

  const saveApiKey = async () => {
    setIsSaving(true)
    await storage.set("openai_api_key", apiKey)
    setTimeout(() => setIsSaving(false), 1000)
  }

  return (
    <div style={{ padding: "0 16px 16px 16px", overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* SECCIÓN 1: API KEY */}
      <div>
        <h3 style={{ margin: "0 0 8px 4px", fontSize: "15px", color: "#1f2937", fontWeight: "bold" }}>
          AI Configuration
        </h3>
        <div style={{
          background: "white", borderRadius: "12px", padding: "16px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: "12px"
        }}>
          <input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ 
              padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", 
              fontSize: "14px", outline: "none", letterSpacing: apiKey ? "2px" : "normal", fontFamily: "inherit"
            }}
          />
          <button
            onClick={saveApiKey}
            style={{
              backgroundColor: isSaving ? "#5cb85c" : "#00a9e0", color: "white", border: "none", 
              borderRadius: "8px", padding: "12px", fontSize: "14px", fontWeight: "bold", cursor: "pointer", 
              transition: "background-color 0.2s ease"
            }}>
            {isSaving ? "✓ Key Saved" : "Save API Key"}
          </button>
        </div>
      </div>

      {/* SECCIÓN 2: TIPOS DE ANÁLISIS A MOSTRAR */}
      <div>
        <h3 style={{ margin: "0 0 8px 4px", fontSize: "15px", color: "#1f2937", fontWeight: "bold" }}>
          Types of Analysis
        </h3>
        <div style={{
          background: "white", borderRadius: "12px", padding: "16px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: "12px"
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#4b5563" }}>
            <input type="checkbox" checked={showMoral} onChange={(e) => setShowMoral(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#00a9e0", cursor: "pointer" }} />
            Moral Language
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#4b5563" }}>
            <input type="checkbox" checked={showManipulative} onChange={(e) => setShowManipulative(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#00a9e0", cursor: "pointer" }} />
            Manipulative Language
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#4b5563" }}>
            <input type="checkbox" checked={showEmotional} onChange={(e) => setShowEmotional(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#00a9e0", cursor: "pointer" }} />
            Emotional Intensity
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#4b5563" }}>
            <input type="checkbox" checked={showExaggeration} onChange={(e) => setShowExaggeration(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#00a9e0", cursor: "pointer" }} />
            Exaggeration Level
          </label>
        </div>
      </div>

      {/* SECCIÓN 3: SELECTOR DE GRÁFICOS */}
      <div>
        <h3 style={{ margin: "0 0 8px 4px", fontSize: "15px", color: "#1f2937", fontWeight: "bold" }}>
          Chart Type
        </h3>
        <div style={{
          background: "white", borderRadius: "12px", padding: "16px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid #f3f4f6", display: "flex", justifyContent: "space-around", alignItems: "center"
        }}>
          
          {/* BOTÓN PROGRESS (CLASSIC) */}
          <div onClick={() => setChartType('progress')} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "8px", 
              border: chartType === 'progress' ? "3px solid #00a9e0" : "1px solid #d1d5db",
              backgroundColor: chartType === 'progress' ? "#f0f9ff" : "white",
              display: "flex", justifyContent: "center", alignItems: "center", transition: "0.2s"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={chartType === 'progress' ? "#00a9e0" : "#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="12" x2="14" y2="12"></line>
                <line x1="4" y1="18" x2="18" y2="18"></line>
              </svg>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "500", color: chartType === 'progress' ? "#00a9e0" : "#6b7280" }}>Progress</span>
          </div>

          {/* BOTÓN DOUGHNUT */}
          <div onClick={() => setChartType('doughnut')} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "8px", 
              border: chartType === 'doughnut' ? "3px solid #00a9e0" : "1px solid #d1d5db",
              backgroundColor: chartType === 'doughnut' ? "#f0f9ff" : "white",
              display: "flex", justifyContent: "center", alignItems: "center", transition: "0.2s"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={chartType === 'doughnut' ? "#00a9e0" : "#9ca3af"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4"></circle>
              </svg>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "500", color: chartType === 'doughnut' ? "#00a9e0" : "#6b7280" }}>Doughnut</span>
          </div>

          {/* BOTÓN BARRAS */}
          <div onClick={() => setChartType('bar')} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "8px", 
              border: chartType === 'bar' ? "3px solid #00a9e0" : "1px solid #d1d5db",
              backgroundColor: chartType === 'bar' ? "#f0f9ff" : "white",
              display: "flex", justifyContent: "center", alignItems: "center", transition: "0.2s"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={chartType === 'bar' ? "#00a9e0" : "#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "500", color: chartType === 'bar' ? "#00a9e0" : "#6b7280" }}>Bar</span>
          </div>

          {/* BOTÓN POLAR AREA */}
          <div onClick={() => setChartType('polarArea')} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "8px", 
              border: chartType === 'polarArea' ? "3px solid #00a9e0" : "1px solid #d1d5db",
              backgroundColor: chartType === 'polarArea' ? "#f0f9ff" : "white",
              display: "flex", justifyContent: "center", alignItems: "center", transition: "0.2s"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={chartType === 'polarArea' ? "#00a9e0" : "#9ca3af"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "500", color: chartType === 'polarArea' ? "#00a9e0" : "#6b7280" }}>Polar Area</span>
          </div>

        </div>
      </div>

    </div>
  )
}