import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

// Creamos la instancia para leer el almacenamiento local
const storage = new Storage()

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    res.send({ error: "No text provided" });
    return;
  }

  // 1. Recuperamos la clave guardada por el usuario en el popup de Settings
  const userApiKey = await storage.get("openai_api_key");

  // 2. Si el usuario no ha guardado ninguna clave, cortamos aquí y mandamos el error
  if (!userApiKey) {
    res.send({ error: "No se ha configurado la API Key de OpenAI. Por favor, añádela en el menú de configuración (engranaje)." });
    return;
  }

  // Aquí está nuestro Prompt Maestro incrustado en el sistema
  const systemPrompt = `Actúa como un analista de medios experto, lingüista y detector de sesgos cognitivos. 
Tu tarea es analizar el siguiente artículo de noticias y evaluar su nivel de encuadre moral, intensidad emocional, exageración y lenguaje manipulativo.

Analiza el texto cuidadosamente y devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta. No incluyas texto explicativo antes ni después, ni bloques de código markdown, solo el JSON puro:

{
  "emotional": [Número decimal entre 0.0 y 1.0 que indique la intensidad emocional],
  "exaggeration": [Número decimal entre 0.0 y 1.0 que indique el nivel de sensacionalismo],
  "moralLanguage": [Número decimal entre 0.0 y 1.0 que indique el uso de juicios de valor o moralidad],
  "manipulativeScore": [Número decimal entre 0.0 y 1.0 que indique el lenguaje diseñado para persuadir],
  "moralKeywords": ["lista", "de", "palabras", "exactas", "que", "denotan", "moralidad"],
  "manipulativeKeywords": ["lista", "de", "palabras", "exactas", "que", "son", "manipuladoras"],
  "emotionalKeywords": ["lista", "de", "palabras", "exactas", "que", "evocan", "emoción"]
}`;

  try {
    // Usamos el modelo gpt-3.5-turbo porque es rapidísimo y muy barato, perfecto para analizar textos.
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 3. Sustituimos la variable de entorno local por la clave del usuario
        "Authorization": `Bearer ${userApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `TEXTO A ANALIZAR:\n${text}` }
        ],
        temperature: 0.2 // Temperatura baja para que el análisis sea objetivo y no se ponga creativo
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Error from OpenAI API:", data.error);
      res.send({ error: data.error.message });
      return;
    }

    const jsonString = data.choices[0].message.content;
    
    // Convertimos la respuesta de texto de OpenAI (que es un JSON en string) a un objeto de verdad
    const parsedData = JSON.parse(jsonString);
    
    res.send({ data: parsedData });

  } catch (error) {
    console.error("Failed to fetch or parse OpenAI response:", error);
    res.send({ error: "Failed to communicate with OpenAI" });
  }
}

export default handler;