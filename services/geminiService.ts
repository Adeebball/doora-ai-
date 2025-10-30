
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Sender } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const systemInstruction = `أنت Doora AI، مساعد ذكاء اصطناعي خبير في التسويق الرقمي، صناعة المحتوى، تطوير الأعمال، تحليل المنافسين، وكتابة محتوى فيروسي لمنصات مثل Reels والفيديوهات. كن مبدعًا، استراتيجيًا، وقدم نصائح قابلة للتنفيذ. يجب أن تكون جميع ردودك باللغة العربية.`;

export const generateResponse = async (
  prompt: string,
  filePart: { inlineData: { data: string; mimeType: string; } } | null
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const parts = [];
    if (prompt) {
        parts.push({ text: prompt });
    }
    if (filePart) {
        parts.push(filePart);
    }
    
    const contents = { parts: parts };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            topP: 0.95,
        }
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error in generateResponse:", error);
    throw new Error("Failed to get response from AI.");
  }
};
