import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let ai;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const getAiRecommendations = async (prompt) => {
  if (!ai) {
    throw new Error('Gemini API key is missing or invalid.');
  }

  const systemInstruction = `
    You are an expert movie and TV show recommendation assistant for CineScope, a premium discovery platform.
    The user will give you a prompt describing what they want to watch.
    You must return a JSON array of exactly 10 recommendation objects.
    Each object must have the following keys:
    - title: the exact official title of the movie or TV show.
    - mediaType: either "movie" or "tv".
    - rationale: a custom 2-3 sentence overview that beautifully blends the plot summary with the specific reason it matches the user's prompt. Make it sound like a premium editorial synopsis.
    Do NOT return markdown formatting like \`\`\`json. Return ONLY the raw JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    // Strip possible markdown formatting if the model disobeys
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanText);
  } catch (err) {
    console.error('Error fetching AI recommendations:', err);
    throw err;
  }
};
