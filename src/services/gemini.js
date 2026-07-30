const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

const executeRequest = async (model, systemInstruction, userPrompt, temperature, useJsonFormat) => {
  const body = {
    model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt }
    ],
    temperature
  };

  if (useJsonFormat) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "CineScope"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error (${model}): ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanText);
};

const callOpenRouter = async (systemInstruction, userPrompt, temperature = 0.7) => {
  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key is missing.');
  }

  // Fallback list of models, prioritizing the user's preferred models
  const models = [
    "inclusionai/ling-3.0-flash:free",
    "google/gemini-2-flash-thinking-exp:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free"
  ];

  let lastError = null;

  for (const model of models) {
    try {
      // Try with structured outputs first
      return await executeRequest(model, systemInstruction, userPrompt, temperature, true);
    } catch (err) {
      console.warn(`Failed with model ${model} (structured output):`, err.message);
      lastError = err;
      
      // If it failed because of structured-outputs compatibility, retry WITHOUT response_format
      if (
        err.message.includes("structured-outputs") || 
        err.message.includes("response_format") || 
        err.message.includes("structured_outputs")
      ) {
        try {
          return await executeRequest(model, systemInstruction, userPrompt, temperature, false);
        } catch (innerErr) {
          console.warn(`Failed with model ${model} (fallback raw):`, innerErr.message);
          lastError = innerErr;
        }
      }
    }
  }

  throw new Error(`All fallback models failed. Last error: ${lastError?.message}`);
};

export const getAiRecommendations = async (prompt) => {
  const systemInstruction = `
    You are an expert movie and TV show recommendation assistant for CineScope, a premium discovery platform.
    The user will give you a prompt describing what they want to watch.
    You must return a JSON object containing a "recommendations" key, which holds an array of exactly 10 recommendation objects.
    Each recommendation object must have the following keys:
    - title: the exact official title of the movie or TV show.
    - mediaType: either "movie" or "tv".
    - rationale: a custom 2-3 sentence overview that beautifully blends the plot summary with the specific reason it matches the user's prompt. Make it sound like a premium editorial synopsis.
    Do NOT return markdown formatting like \`\`\`json.
  `;

  try {
    const res = await callOpenRouter(systemInstruction, prompt, 0.7);
    if (res && Array.isArray(res.recommendations)) {
      return res.recommendations;
    }
    if (Array.isArray(res)) {
      return res;
    }
    throw new Error("Invalid AI response format: expected an array of recommendations.");
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

export const getFriendCompatibilityRecs = async (myProfile, friendProfile) => {
  // 1. Sort profiles deterministically so identical inputs produce identical prompt strings
  const sortedMyProfile = [...myProfile].sort();
  const sortedFriendProfile = [...friendProfile].sort();

  // Helper to extract genres, eras, ratings from profile strings: "Title (Year, Genre, ★Rating)"
  const parseProfileItem = (itemStr) => {
    const match = itemStr.match(/\((\d{4}|—),\s*([^,]+),\s*★([\d.]+)\)/);
    if (!match) return { year: null, genre: 'Unknown', rating: 7.0 };
    return {
      year: match[1] !== '—' ? parseInt(match[1], 10) : null,
      genre: match[2].trim(),
      rating: parseFloat(match[3]) || 7.0
    };
  };

  const myParsed = sortedMyProfile.map(parseProfileItem);
  const friendParsed = sortedFriendProfile.map(parseProfileItem);

  // 2. Compute mathematical baseline metrics
  const myGenres = new Set(myParsed.map(p => p.genre).filter(g => g !== 'Unknown'));
  const friendGenres = new Set(friendParsed.map(p => p.genre).filter(g => g !== 'Unknown'));
  const genreIntersection = [...myGenres].filter(g => friendGenres.has(g)).length;
  const genreUnion = new Set([...myGenres, ...friendGenres]).size;
  const mathGenreScore = genreUnion > 0 ? Math.round((genreIntersection / genreUnion) * 100) : 50;

  // Rating standards delta
  const myAvgRating = myParsed.reduce((s, p) => s + p.rating, 0) / (myParsed.length || 1);
  const friendAvgRating = friendParsed.reduce((s, p) => s + p.rating, 0) / (friendParsed.length || 1);
  const ratingDelta = Math.abs(myAvgRating - friendAvgRating);
  const mathRatingScore = Math.max(20, Math.round(100 - ratingDelta * 25));

  // Era overlap (decades)
  const myDecades = new Set(myParsed.map(p => p.year ? Math.floor(p.year / 10) * 10 : null).filter(Boolean));
  const friendDecades = new Set(friendParsed.map(p => p.year ? Math.floor(p.year / 10) * 10 : null).filter(Boolean));
  const eraIntersection = [...myDecades].filter(d => friendDecades.has(d)).length;
  const eraUnion = new Set([...myDecades, ...friendDecades]).size;
  const mathEraScore = eraUnion > 0 ? Math.round((eraIntersection / eraUnion) * 100) : 60;

  const systemInstruction = `
    You are CineAI, the world's leading movie taste analyst. Perform a deterministic, accurate compatibility analysis between two users.

    Mathematically computed baseline scores for reference:
    - Genre Overlap Baseline: ${mathGenreScore}%
    - Era Alignment Baseline: ${mathEraScore}%
    - Rating Standards Baseline: ${mathRatingScore}%

    ## Output Requirements:
    Return a JSON object with this EXACT structure:
    {
      "compatibility": ${Math.round(mathGenreScore * 0.4 + mathEraScore * 0.3 + mathRatingScore * 0.3)},
      "breakdown": {
        "genreOverlap": ${mathGenreScore},
        "eraAlignment": ${mathEraScore},
        "ratingStandards": ${mathRatingScore},
        "thematicTaste": ${Math.round((mathGenreScore + mathEraScore) / 2)}
      },
      "summary": "A 1-2 sentence accurate summary of how their tastes complement or clash.",
      "recommendations": [
        { "title": "Exact Movie Title", "rationale": "A personalized 2-sentence explanation connecting this pick to BOTH users' specific tastes." }
      ]
    }

    Rules:
    - Return exactly 5 recommendations.
    - Recommendations should be highly-rated movies NEITHER user has listed — suggest something new.
    - Be consistent, deterministic, and precise.
    - Do NOT return markdown formatting like \`\`\`json.
  `;

  const prompt = `
    ## User A's Movie Profile:
    ${sortedMyProfile.join('\n    ')}

    ## User B's Movie Profile:
    ${sortedFriendProfile.join('\n    ')}
  `;

  try {
    // Temperature set to 0.1 for deterministic & stable AI output across iterations
    const res = await callOpenRouter(systemInstruction, prompt, 0.1);
    if (res && typeof res.compatibility === 'number' && Array.isArray(res.recommendations)) {
      return {
        compatibility: Math.min(100, Math.max(0, res.compatibility)),
        breakdown: res.breakdown || {
          genreOverlap: mathGenreScore,
          eraAlignment: mathEraScore,
          ratingStandards: mathRatingScore,
          thematicTaste: Math.round((mathGenreScore + mathEraScore) / 2)
        },
        summary: res.summary || null,
        recommendations: res.recommendations.slice(0, 5)
      };
    }
    if (res && Array.isArray(res.recommendations)) {
      return {
        compatibility: Math.round(mathGenreScore * 0.4 + mathEraScore * 0.3 + mathRatingScore * 0.3),
        breakdown: { genreOverlap: mathGenreScore, eraAlignment: mathEraScore, ratingStandards: mathRatingScore, thematicTaste: Math.round((mathGenreScore + mathEraScore) / 2) },
        summary: null,
        recommendations: res.recommendations.slice(0, 5)
      };
    }
    throw new Error("Invalid compatibility response structure.");
  } catch (err) {
    console.error('Error fetching friend compatibility recommendations:', err);
    throw err;
  }
};
