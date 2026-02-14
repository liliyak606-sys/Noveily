
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Comic } from "../types";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const getAiPageAnalysis = async (imageBlob: Blob, prompt: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  try {
    // FIX: Always use a fresh instance to ensure up-to-date API key as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = await blobToBase64(imageBlob);

    // FIX: Using gemini-3-pro-preview for complex reasoning and multimodal analysis tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: imageBlob.type || 'image/png',
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze the page. Please try again.");
  }
};

export const generateAiTitle = async (imageBlob: Blob): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = await blobToBase64(imageBlob);
    const prompt = "Analyze this comic book cover art. Suggest a short, catchy, and fitting title for the comic. Respond with only the title text, with no special formatting like markdown or quotes.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: imageBlob.type || 'image/png',
            },
          },
          { text: prompt },
        ],
      },
    });

    const generatedTitle = response.text?.trim();
    if (!generatedTitle) {
      throw new Error("AI did not return a title.");
    }
    // Remove potential quotes from the AI response
    return generatedTitle.replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Gemini API Error (Title Generation):", error);
    throw new Error("Failed to generate title with AI. Please try again.");
  }
};


export const searchComicCovers = async (comics: Comic[], query: string): Promise<Comic[]> => {
    if (!process.env.API_KEY) throw new Error("API Key is missing.");

    const lowerCaseQuery = query.toLowerCase();
    
    // First, get all comics that match by title
    const titleMatches = comics.filter(comic => comic.title.toLowerCase().includes(lowerCaseQuery));
    const titleMatchIds = new Set(titleMatches.map(c => c.id));
    
    // Then, search the rest via AI
    const comicsToSearchAi = comics.filter(comic => !titleMatchIds.has(comic.id));

    const aiMatchPromises = comicsToSearchAi.map(async (comic) => {
        if (comic.coverImageBlob) {
            try {
                // FIX: Fresh instance right before call for each request
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const base64Data = await blobToBase64(comic.coverImageBlob);
                const prompt = `Does the cover of this comic book match the description "${query}"? The cover might show characters, scenes, or represent the mood. Answer with only "YES" or "NO".`;

                const response = await ai.models.generateContent({
                    // FIX: Using gemini-3-pro-preview for multimodal search verification
                    model: 'gemini-3-pro-preview',
                    contents: { parts: [{ inlineData: { data: base64Data, mimeType: comic.coverImageBlob.type || 'image/png' } }, { text: prompt }] },
                });

                const textResponse = response.text?.trim().toUpperCase();
                if (textResponse === 'YES') {
                    return comic;
                }
            } catch (error) {
                console.error(`AI search failed for comic ${comic.title}`, error);
            }
        }
        return null;
    });

    const aiMatches = (await Promise.all(aiMatchPromises)).filter((c): c is Comic => c !== null);

    return [...titleMatches, ...aiMatches];
};
