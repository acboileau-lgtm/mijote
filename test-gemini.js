import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const response = await ai.models.generateContent({
  model: "gemini-3.5-flash-lite",
  contents: "Réponds uniquement : Mijoté fonctionne !"
});

console.log(response.text);