
import { GoogleGenAI, Type } from "@google/genai";
import { Profile } from "../types";
import { formatEventSentence } from "../utils/formatters";

export const generateAiProfileSummary = async (profile: Profile): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const events = profile.timeline.map(ev => formatEventSentence(profile.name, ev)).join('\n');
  const memories = profile.memories.map(m => m.content).join('\n');
  
  const prompt = `
    Generate a respectful, high-quality, narrative life summary for ${profile.name} (born ${profile.birthYear}).
    Use the following timeline events and family stories to weave a cohesive biographical sketch.
    
    Timeline:
    ${events}
    
    Family Stories:
    ${memories}
    
    Instructions:
    - Focus on the impact of their life.
    - Keep it under 250 words.
    - Maintain an archival, historical, and elegant tone.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text || "Summary unavailable.";
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Failed to generate AI summary.";
  }
};

export const getHistoricalContext = async (profile: Profile): Promise<{ text: string, sources: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const lifePeriod = `${profile.birthYear} to ${profile.deathYear || 'the present'}`;
  const locations = Array.from(new Set(profile.timeline.map(e => e.place).filter(Boolean))).join(', ');
  
  const prompt = `Provide a comprehensive historical deep-dive into the era and specific locations inhabited by ${profile.name} during their life from ${lifePeriod}. 
  The primary locations were: ${locations}.
  
  Research and describe:
  1. Specific local history and atmosphere of ${locations} during these decades.
  2. Major global events (wars, movements, economic shifts) that significantly altered their daily world.
  3. Technological innovations or cultural changes that a person living in ${locations} would have witnessed.
  
  Format this as a "Historical Narrative" for a family archive. Be specific, evocative, and archival in tone.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro-preview-05-06',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return {
      text: response.text || "Historical research unavailable.",
      sources: sources
    };
  } catch (error) {
    console.error("Gemini Research Error:", error);
    return { 
      text: "Our digital archives could not be reached. Please check your connection and try again.", 
      sources: [] 
    };
  }
};
