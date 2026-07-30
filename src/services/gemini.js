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

export const getAiPlannerRecommendation = async (answers) => {
  if (!ai) throw new Error('Gemini API key is missing.');

  const systemInstruction = `
    You are CineAI, an elite movie sommelier. 
    The user has answered questions about their mood, genre, timeline, and company.
    Return EXACTLY ONE perfect movie recommendation in JSON format:
    {
      "title": "Exact Title",
      "mediaType": "movie",
      "rationale": "A 2-3 sentence personalized pitch explaining why this is the absolute perfect choice for their specific answers."
    }
    Return ONLY JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: JSON.stringify(answers),
      config: { systemInstruction, temperature: 0.7, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (err) {
    console.error('Error fetching Planner recommendation:', err);
    throw err;
  }
};

export const getAiPickForMe = async () => {
  if (!ai) throw new Error('Gemini API key is missing.');

  const systemInstruction = `
    You are CineAI. Your goal is to pick exactly ONE universally acclaimed, highly entertaining movie.
    Return EXACTLY ONE movie recommendation in JSON format:
    {
      "title": "Exact Title",
      "mediaType": "movie",
      "rationale": "A punchy 1-2 sentence pitch on why this is a certified banger."
    }
    Return ONLY JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: "Surprise me with a guaranteed crowd-pleaser.",
      config: { systemInstruction, temperature: 0.9, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (err) {
    console.error('Error fetching Pick For Me:', err);
    throw err;
  }
};

export const getAiMovieDebate = async (movieA, movieB) => {
  if (!ai) throw new Error('Gemini API key is missing.');

  const systemInstruction = `
    You are a professional film critic judging a bout between two movies.
    Compare them across exactly these 9 categories: Story, Characters, Acting, Direction, VFX, Cinematography, Soundtrack, Ending, Rewatchability.
    Return a JSON object with this exact structure:
    {
      "categories": [
        { "name": "Story", "winner": "Title of Winner", "reason": "1 short sentence why" },
        ...
      ],
      "overallWinner": "Title of Overall Winner",
      "verdict": "A 2-3 sentence final verdict summarizing the debate."
    }
    Return ONLY JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `Compare "${movieA}" vs "${movieB}".`,
      config: { systemInstruction, temperature: 0.7, responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (err) {
    console.error('Error fetching Debate result:', err);
    throw err;
  }
};
