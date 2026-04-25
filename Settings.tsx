import * as React from "react"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export function SettingsView() {
  const [apiKey, setApiKey] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

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
    <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* SECCIÓN API KEY */}
      <div style={{ 
        background: "#f9fafb", 
        padding: "16px", 
        borderRadius: "12px", 
        border: "1px solid #e5e7eb" 
      }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#374151", fontWeight: "bold", textTransform: "uppercase" }}>
          AI Configuration
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "13px", outline: "none" }}
          />
          <button
            onClick={saveApiKey}
            style={{
              backgroundColor: isSaving ? "#10b981" : "#00a9e0",
              color: "white", border: "none", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: "bold", cursor: "pointer"
            }}>
            {isSaving ? "✓ Key Saved" : "Save API Key"}
          </button>
        </div>
      </div>

      {/* ESPACIO PARA GRÁFICOS DE PABLO */}
      <div style={{ paddingBottom: "20px" }}>
        <h3 style={{ margin: "0 0 12px 4px", fontSize: "16px", color: "#1f2937", fontWeight: "bold" }}>Advanced Analytics</h3>
        <div style={{ 
          minHeight: "200px", background: "#ffffff", borderRadius: "12px", border: "2px dashed #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "13px", textAlign: "center", padding: "20px"
        }}>
          Aquí adaptaremos los gráficos de Pablo en cuanto me pases su código...
        </div>
      </div>
    </div>
  )
}