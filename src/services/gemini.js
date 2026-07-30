const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

const callOpenRouter = async (systemInstruction, userPrompt, temperature = 0.7) => {
  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key is missing.');
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "CineScope"
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash:free",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      temperature,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanText);
};

export const getAiRecommendations = async (prompt) => {
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
    return await callOpenRouter(systemInstruction, prompt, 0.7);
  } catch (err) {
    console.error('Error fetching AI recommendations:', err);
    throw err;
  }
};

export const getAiPlannerRecommendation = async (answers) => {
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
    return await callOpenRouter(systemInstruction, JSON.stringify(answers), 0.7);
  } catch (err) {
    console.error('Error fetching Planner recommendation:', err);
    throw err;
  }
};

export const getAiPickForMe = async () => {
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
    return await callOpenRouter(systemInstruction, "Surprise me with a guaranteed crowd-pleaser.", 0.9);
  } catch (err) {
    console.error('Error fetching Pick For Me:', err);
    throw err;
  }
};

export const getAiMovieDebate = async (movieA, movieB) => {
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
    return await callOpenRouter(systemInstruction, `Compare "${movieA}" vs "${movieB}".`, 0.7);
  } catch (err) {
    console.error('Error fetching Debate result:', err);
    throw err;
  }
};
