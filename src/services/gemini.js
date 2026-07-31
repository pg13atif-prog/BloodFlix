import { getMovieFactSheet } from './tmdb';

const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

const executeGroqRequest = async (model, systemInstruction, userPrompt, temperature) => {
  const body = {
    model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt }
    ],
    temperature,
    response_format: { type: "json_object" }
  };

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${model}): ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanText);
};

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
  // 1. Try Groq Cloud API first (Primary High-Speed Model Engine)
  if (groqApiKey) {
    try {
      return await executeGroqRequest("llama-3.1-8b-instant", systemInstruction, userPrompt, temperature);
    } catch (err) {
      console.warn(`Failed with Groq llama-3.1-8b-instant:`, err.message);
      try {
        return await executeGroqRequest("llama-3.3-70b-versatile", systemInstruction, userPrompt, temperature);
      } catch (err2) {
        console.warn(`Failed with Groq llama-3.3-70b-versatile:`, err2.message);
      }
    }
  }

  // 2. Failover to OpenRouter
  if (openRouterApiKey) {
    try {
      return await executeRequest("openrouter/free", systemInstruction, userPrompt, temperature, true);
    } catch (err) {
      console.warn(`Failed with OpenRouter free model:`, err.message);
      if (err.message.includes("structured") || err.message.includes("format")) {
        try {
          return await executeRequest("openrouter/free", systemInstruction, userPrompt, temperature, false);
        } catch (innerErr) {
          console.warn(`Failed with OpenRouter fallback raw:`, innerErr.message);
        }
      }
    }
  }

  throw new Error("All AI API providers (Groq and OpenRouter) failed or rate-limited.");
};

/* ── Extensive Movie & TV Library for Smart Prompt Matching ───────────────────── */
const MOVIE_LIBRARY = [
  // Sci-Fi & Mind-Bending
  { title: "Interstellar", mediaType: "movie", tags: ["scifi", "space", "mindbending", "time", "epic", "emotional", "nolan"], rationale: "An awe-inspiring sci-fi journey across space, wormholes, and emotional dimensions." },
  { title: "Inception", mediaType: "movie", tags: ["scifi", "heist", "mindbending", "action", "nolan", "dreams"], rationale: "A brilliant sci-fi heist thriller exploring subconscious dream architecture and reality." },
  { title: "The Matrix", mediaType: "movie", tags: ["scifi", "action", "cyberpunk", "mindbending", "classic", "90s"], rationale: "The landmark cyberpunk action film that questioned reality and revolutionized visual effects." },
  { title: "Blade Runner 2049", mediaType: "movie", tags: ["scifi", "cyberpunk", "noir", "future", "visuallystunning"], rationale: "A breathtaking neo-noir sci-fi masterpiece with stunning cinematography and existential themes." },
  { title: "Dune: Part Two", mediaType: "movie", tags: ["scifi", "epic", "space", "action", "desert", "modern"], rationale: "A colossal, visually breathtaking sci-fi epic following Paul Atreides on Arrakis." },
  { title: "Arrival", mediaType: "movie", tags: ["scifi", "alien", "time", "linguistics", "mindbending", "emotional"], rationale: "A profound, deeply intelligent sci-fi drama about linguistics, time, and alien contact." },
  { title: "Ex Machina", mediaType: "movie", tags: ["scifi", "ai", "thriller", "robot", "psychological"], rationale: "A tense psychological sci-fi thriller probing artificial intelligence and human manipulation." },
  { title: "Tenet", mediaType: "movie", rationale: "A high-concept temporal action thriller where time inversion is used to prevent world destruction.", tags: ["scifi", "time", "action", "mindbending", "nolan"] },
  { title: "Coherence", mediaType: "movie", tags: ["scifi", "mindbending", "mystery", "indie", "parallel universe"], rationale: "A gripping low-budget sci-fi thriller about parallel realities fracturing during a comet passing." },
  { title: "Shutter Island", mediaType: "movie", tags: ["thriller", "mindbending", "psychological", "mystery", "scorsese"], rationale: "Scorsese's chilling psychological mystery set at an isolated asylum for the criminally insane." },

  // Action & Superhero
  { title: "Mad Max: Fury Road", mediaType: "movie", tags: ["action", "postapocalyptic", "chase", "stunts", "intense"], rationale: "A non-stop high-octane post-apocalyptic chase spectacle with breathtaking practical stunts." },
  { title: "John Wick", mediaType: "movie", tags: ["action", "assassin", "fight", "revenge", "stylish"], rationale: "Sleek, relentless action choreography following a legendary assassin seeking vengeance." },
  { title: "The Dark Knight", mediaType: "movie", tags: ["action", "superhero", "batman", "crime", "thriller"], rationale: "A gritty, cinematic crime epic pitting Gotham's protector against the chaotic Joker." },
  { title: "Die Hard", mediaType: "movie", tags: ["action", "classic", "christmas", "cop", "80s"], rationale: "The ultimate action classic as John McClane single-handedly fights terrorists inside a skyscraper." },
  { title: "Terminator 2: Judgment Day", mediaType: "movie", tags: ["action", "scifi", "cyborg", "90s", "classic"], rationale: "A sci-fi action benchmark with revolutionary CGI, explosive setpieces, and cyborg warfare." },
  { title: "Mission: Impossible - Fallout", mediaType: "movie", tags: ["action", "spy", "stunts", "thriller"], rationale: "Mind-blowing real-world stunts and relentless pacing make this one of the finest action films ever." },
  { title: "Gladiator", mediaType: "movie", tags: ["action", "epic", "historical", "roman", "vengeance"], rationale: "An epic story of honor, betrayal, and gladiatorial combat in the arena of ancient Rome." },
  { title: "Top Gun: Maverick", mediaType: "movie", tags: ["action", "aviation", "jets", "blockbuster", "feelgood"], rationale: "An adrenaline-fueled aviation action blockbuster with real aerial cinematography and high stakes." },
  { title: "The Raid", mediaType: "movie", tags: ["action", "martialarts", "fight", "intense"], rationale: "Brutal, masterfully choreographed martial arts action inside a crime lord's high-rise building." },
  { title: "Avengers: Endgame", mediaType: "movie", tags: ["action", "superhero", "marvel", "epic", "blockbuster"], rationale: "The massive climactic superhero battle bringing a decade of cinematic storytelling to a peak." },

  // Crime, Noir & Thriller
  { title: "Pulp Fiction", mediaType: "movie", tags: ["crime", "classic", "tarantino", "90s", "cool"], rationale: "Quentin Tarantino's iconic non-linear crime classic filled with unforgettable dialogue and style." },
  { title: "Se7en", mediaType: "movie", tags: ["crime", "thriller", "dark", "detective", "90s", "mystery"], rationale: "A gritty, atmospheric detective thriller following a hunt for a killer using the seven deadly sins." },
  { title: "Goodfellas", mediaType: "movie", tags: ["crime", "mob", "mafia", "scorsese", "classic", "90s"], rationale: "Martin Scorsese's masterclass depiction of the rise and fall of a mob associate over three decades." },
  { title: "Heat", mediaType: "movie", tags: ["crime", "heist", "action", "cop", "90s"], rationale: "Michael Mann's intense cat-and-mouse crime masterpiece pitting Pacino against De Niro." },
  { title: "The Silence of the Lambs", mediaType: "movie", tags: ["thriller", "crime", "psychological", "serialkiller", "90s"], rationale: "A chilling psychological crime thriller featuring Anthony Hopkins' legendary Hannibal Lecter." },
  { title: "Parasite", mediaType: "movie", tags: ["thriller", "drama", "darkcomedy", "twist", "korean"], rationale: "Bong Joon-ho's Oscar-winning masterpiece blending dark comedy, social thriller, and shocking twists." },
  { title: "Prisoners", mediaType: "movie", tags: ["thriller", "mystery", "crime", "dark", "intense"], rationale: "A tense, morally complex thriller tracking a desperate father searching for his missing daughter." },
  { title: "Zodiac", mediaType: "movie", tags: ["thriller", "crime", "detective", "truecrime", "fincher"], rationale: "David Fincher's meticulous, haunting investigation into San Francisco's notorious Zodiac killer." },
  { title: "Fight Club", mediaType: "movie", tags: ["thriller", "psychological", "90s", "dark", "twist"], rationale: "A provocative psychological thriller dissecting consumerism and identity through a secret fight club." },
  { title: "Gone Girl", mediaType: "movie", tags: ["thriller", "mystery", "marriage", "dark", "twist"], rationale: "A razor-sharp mystery surrounding a high-profile disappearance and media circus." },

  // Horror & Supernatural
  { title: "Get Out", mediaType: "movie", tags: ["horror", "thriller", "social", "psychological", "modern"], rationale: "A masterful psychological horror and social commentary with spine-tingling suspense." },
  { title: "Hereditary", mediaType: "movie", tags: ["horror", "disturbing", "family", "cult", "scary"], rationale: "A deeply disturbing terror experience exploring family grief and dark cult lore." },
  { title: "The Conjuring", mediaType: "movie", tags: ["horror", "ghost", "paranormal", "scary", "haunted"], rationale: "A modern classic supernatural horror filled with relentless tension and terrifying paranormal activity." },
  { title: "A Quiet Place", mediaType: "movie", tags: ["horror", "thriller", "creature", "silence", "survival"], rationale: "An atmospheric thriller where silence is survival against sound-hunting alien creatures." },
  { title: "Talk to Me", mediaType: "movie", tags: ["horror", "possession", "spirits", "scary", "modern"], rationale: "A fresh, intense horror about teenagers summoning spirits through a mysterious embalmed hand." },
  { title: "The Shining", mediaType: "movie", tags: ["horror", "haunted", "hotel", "psychological", "classic"], rationale: "Stanley Kubrick's psychological horror milestone set in an isolated, haunted hotel." },
  { title: "Alien", mediaType: "movie", tags: ["horror", "scifi", "alien", "monster", "classic"], rationale: "Ridley Scott's sci-fi horror masterpiece depicting claustrophobic terror aboard a deep-space freighter." },
  { title: "The Thing", mediaType: "movie", tags: ["horror", "scifi", "monster", "paranoia", "80s"], rationale: "John Carpenter's legendary paranoid sci-fi horror with practical shape-shifting monster effects." },
  { title: "Halloween", mediaType: "movie", tags: ["horror", "slasher", "classic", "scary", "70s"], rationale: "John Carpenter's pioneering slasher classic featuring the unstoppable Michael Myers." },
  { title: "It", mediaType: "movie", tags: ["horror", "clown", "monster", "comingofage", "scary"], rationale: "A terrifying and emotional coming-of-age horror story featuring the shape-shifting clown Pennywise." },

  // Comedy & Feel-Good
  { title: "Superbad", mediaType: "movie", tags: ["comedy", "funny", "highschool", "teen", "party", "2000s"], rationale: "A riotous, hilarious high school comedy capturing teenage friendship and wild party chaos." },
  { title: "The Hangover", mediaType: "movie", tags: ["comedy", "funny", "vegas", "wild", "party"], rationale: "A chaotic mystery comedy following groomsmen trying to piece together a wild Vegas night." },
  { title: "Step Brothers", mediaType: "movie", tags: ["comedy", "funny", "slapstick", "absurd"], rationale: "Endlessly quotable slapstick comedy featuring Will Ferrell and John C. Reilly as grown step-siblings." },
  { title: "Shaun of the Dead", mediaType: "movie", tags: ["comedy", "horror", "zombie", "british", "funny"], rationale: "A brilliant horror-comedy blending sharp British humor with zombie apocalypse survival." },
  { title: "Knives Out", mediaType: "movie", tags: ["comedy", "mystery", "whodunit", "witty", "fun"], rationale: "A witty, delightful whodunit mystery packed with eccentric characters and clever twists." },
  { title: "The Grand Budapest Hotel", mediaType: "movie", tags: ["comedy", "wesanderson", "whimsical", "aesthetic", "quirky"], rationale: "Wes Anderson's whimsical, visually stunning comedy detailing the misadventures of a legendary concierge." },
  { title: "Deadpool", mediaType: "movie", tags: ["comedy", "action", "superhero", "funny", "rrated"], rationale: "A fourth-wall-breaking, irreverent action comedy with sharp R-rated humor." },
  { title: "Palm Springs", mediaType: "movie", tags: ["comedy", "romance", "timeloop", "funny", "feelgood"], rationale: "A hilarious and heartwarming romantic comedy time-loop adventure set at a desert wedding." },
  { title: "Back to the Future", mediaType: "movie", tags: ["comedy", "scifi", "time", "family", "classic", "80s"], rationale: "The timeless sci-fi comedy combining time-travel adventure with unforgettable humor." },
  { title: "21 Jump Street", mediaType: "movie", tags: ["comedy", "cop", "action", "funny", "school"], rationale: "A clever buddy-cop comedy spoof that delivers consistent laugh-out-loud moments." },

  // Romance & Drama
  { title: "La La Land", mediaType: "movie", tags: ["romance", "musical", "drama", "jazz", "hollywood"], rationale: "A vibrant, heartwarming musical romantic drama celebrating dreams and love in Los Angeles." },
  { title: "Before Sunrise", mediaType: "movie", tags: ["romance", "dialogue", "indie", "vienna", "90s"], rationale: "An intimate, deeply romantic conversation-driven story of two travelers meeting in Vienna." },
  { title: "Eternal Sunshine of the Spotless Mind", mediaType: "movie", tags: ["romance", "scifi", "emotional", "memory", "indie"], rationale: "An inventive, emotional masterpiece exploring love, heartbreak, and memory erasure." },
  { title: "About Time", mediaType: "movie", tags: ["romance", "time", "family", "emotional", "feelgood"], rationale: "A touching time-travel romance that beautifully captures love, family, and appreciating every day." },
  { title: "Pride & Prejudice", mediaType: "movie", tags: ["romance", "period", "classic", "british", "drama"], rationale: "A gorgeous, sweeping period romance adaptation of Jane Austen's timeless classic." },
  { title: "500 Days of Summer", mediaType: "movie", tags: ["romance", "indie", "relationship", "bittersweet"], rationale: "A realistic, creative non-linear look at the highs and lows of modern romance." },
  { title: "Past Lives", mediaType: "movie", tags: ["romance", "drama", "korean", "emotional", "destiny"], rationale: "A tender, deeply moving Korean-American romantic drama about destiny and longing across decades." },
  { title: "The Shawshank Redemption", mediaType: "movie", tags: ["drama", "prison", "friendship", "hope", "classic", "90s"], rationale: "An uplifting, legendary tale of resilience, hope, and lifelong friendship inside Shawshank prison." },
  { title: "Whiplash", mediaType: "movie", tags: ["drama", "music", "obsession", "intense", "masterpiece"], rationale: "An electrifying drama detailing the intense clash between an ambitious drummer and a ruthless instructor." },
  { title: "Forrest Gump", mediaType: "movie", tags: ["drama", "history", "feelgood", "classic", "90s"], rationale: "The heartwarming story of a kind-hearted man inadvertently shaping history across decades." },

  // Animation & Family
  { title: "Spirited Away", mediaType: "movie", tags: ["animation", "anime", "ghibli", "fantasy", "magic"], rationale: "Hayao Miyazaki's Oscar-winning fantasy masterpiece brimming with enchantment and spirit-world magic." },
  { title: "Spider-Man: Into the Spider-Verse", mediaType: "movie", tags: ["animation", "superhero", "spider-man", "artistic", "action"], rationale: "A groundbreaking animated superhero triumph featuring comic-book visuals and incredible heart." },
  { title: "Spider-Man: Across the Spider-Verse", mediaType: "movie", tags: ["animation", "superhero", "multiverse", "action", "visuallystunning"], rationale: "A visually spectacular sequel pushing the boundaries of animation style and multiverse storytelling." },
  { title: "Wall-E", mediaType: "movie", tags: ["animation", "pixar", "scifi", "space", "sweet"], rationale: "Pixar's poignant, virtually wordless sci-fi animated fable about love and environmental stewardship." },
  { title: "Princess Mononoke", mediaType: "movie", tags: ["animation", "anime", "ghibli", "nature", "epic"], rationale: "An epic Studio Ghibli dark fantasy exploring the struggle between industrial progress and nature." },
  { title: "Coco", mediaType: "movie", tags: ["animation", "pixar", "family", "music", "mexico"], rationale: "A colorful, vibrant Pixar celebration of family, music, and Mexican Day of the Dead traditions." },
  { title: "Your Name", mediaType: "movie", tags: ["animation", "anime", "romance", "body-swap", "fantasy"], rationale: "A gorgeous Japanese anime romance blending body-swapping comedy with a cosmic fantasy twist." },
  { title: "Toy Story", mediaType: "movie", tags: ["animation", "pixar", "toys", "family", "classic", "90s"], rationale: "Pixar's beloved landmark 3D animated film that sparked a world-famous franchise." },
  { title: "The Iron Giant", mediaType: "movie", tags: ["animation", "robot", "friendship", "90s", "touching"], rationale: "A classic, emotionally powerful animated story of friendship between a young boy and a giant robot." },
  { title: "Soul", mediaType: "movie", tags: ["animation", "pixar", "jazz", "life", "philosophical"], rationale: "A thoughtful Pixar animation exploring life's purpose, passion, and the beauty of small moments." },

  // TV Shows
  { title: "Breaking Bad", mediaType: "tv", tags: ["tv", "series", "crime", "drama", "thriller", "dark"], rationale: "The critically acclaimed drama detailing the dark transformation of a chemistry teacher into a drug lord." },
  { title: "Stranger Things", mediaType: "tv", tags: ["tv", "series", "scifi", "horror", "80s", "mystery"], rationale: "A nostalgic 80s sci-fi horror series packed with supernatural mysteries and memorable characters." },
  { title: "The Bear", mediaType: "tv", tags: ["tv", "series", "food", "chef", "intense", "drama"], rationale: "An intense, fast-paced culinary drama exploring grief, ambition, and kitchen chaos in Chicago." },
  { title: "Succession", mediaType: "tv", tags: ["tv", "series", "wealth", "family", "power", "satire"], rationale: "A razor-sharp satirical family drama about power struggles inside a global media conglomerate." },
  { title: "Severance", mediaType: "tv", tags: ["tv", "series", "scifi", "mystery", "workplace", "mindbending"], rationale: "A mind-bending workplace mystery thriller exploring a procedure that surgically divides work and life memories." },
  { title: "Arcane", mediaType: "tv", tags: ["tv", "series", "animation", "fantasy", "action", "steampunk"], rationale: "A visually stunning animated series with rich character depth, emotional stakes, and worldbuilding." },
  { title: "Chernobyl", mediaType: "tv", tags: ["tv", "series", "history", "disaster", "drama", "intense"], rationale: "A gripping, realistic historical miniseries depicting the 1986 nuclear catastrophe and its aftermath." },
  { title: "Black Mirror", mediaType: "tv", tags: ["tv", "series", "scifi", "anthology", "dystopian", "tech"], rationale: "An anthology sci-fi series examining the dark, unexpected consequences of modern technology." },
  { title: "Game of Thrones", mediaType: "tv", tags: ["tv", "series", "fantasy", "dragons", "war", "epic"], rationale: "An epic fantasy series of noble families warring for control of the Iron Throne." },
  { title: "True Detective", mediaType: "tv", tags: ["tv", "series", "crime", "mystery", "noir", "philosophical"], rationale: "A deeply moody, philosophical crime anthology series featuring brilliant performances and dark mysteries." }
];

/* Simple string hashing helper for prompt-deterministic seed selection */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getAiRecommendations = async (prompt) => {
  const systemInstruction = `
    You are an expert movie and TV show recommendation assistant for CineScope, a premium discovery platform.
    The user will give you a prompt describing what they want to watch.
    You must return a JSON object containing a "recommendations" key, which holds an array of exactly 5 recommendation objects.
    Each recommendation object must have the following keys:
    - title: the exact official title of the movie or TV show.
    - mediaType: either "movie" or "tv".
    - rationale: a custom 2-3 sentence overview that beautifully blends the plot summary with the specific reason it matches the user's prompt. Make it sound like a premium editorial synopsis.
    Do NOT return markdown formatting like \`\`\`json.
  `;

  try {
    const res = await callOpenRouter(systemInstruction, prompt, 0.7);
    if (res && Array.isArray(res.recommendations) && res.recommendations.length > 0) {
      return res.recommendations;
    }
    if (Array.isArray(res) && res.length > 0) {
      return res;
    }
    throw new Error("Invalid AI response format: expected an array of recommendations.");
  } catch (err) {
    console.warn('OpenRouter rate limited or unavailable, using prompt-aware fallback engine:', err.message);
    
    const p = (prompt || '').toLowerCase().trim();
    const promptWords = p.split(/\W+/).filter(w => w.length > 2);

    // 1. Score every movie in our library based on tag/keyword matches
    const scoredMovies = MOVIE_LIBRARY.map(movie => {
      let score = 0;
      
      // Match tags against prompt
      movie.tags.forEach(tag => {
        if (p.includes(tag)) score += 5;
        promptWords.forEach(word => {
          if (tag.includes(word) || word.includes(tag)) score += 3;
        });
      });

      // Match title words against prompt
      const titleLower = movie.title.toLowerCase();
      promptWords.forEach(word => {
        if (titleLower.includes(word)) score += 4;
      });

      // Match rationale against prompt words
      const rationaleLower = movie.rationale.toLowerCase();
      promptWords.forEach(word => {
        if (rationaleLower.includes(word)) score += 1;
      });

      return { movie, score };
    });

    // 2. Sort by match score descending
    scoredMovies.sort((a, b) => b.score - a.score);

    // 3. If top matches exist with non-zero score, take top matches
    const matched = scoredMovies.filter(item => item.score > 0).map(item => item.movie);

    let selected = [];
    if (matched.length >= 5) {
      selected = matched.slice(0, 5);
    } else if (matched.length > 0) {
      // Fill remaining with hash-offset picks from the rest of library so prompt is unique
      const seed = hashString(p);
      const pool = scoredMovies.map(item => item.movie);
      
      selected = [...matched];
      for (let i = 0; i < pool.length && selected.length < 5; i++) {
        const candidate = pool[(seed + i * 7) % pool.length];
        if (!selected.some(m => m.title === candidate.title)) {
          selected.push(candidate);
        }
      }
    } else {
      // Pure deterministic seed selection from entire library based on prompt hash!
      const seed = hashString(p);
      const pool = [...MOVIE_LIBRARY];
      selected = [];
      for (let i = 0; i < pool.length && selected.length < 5; i++) {
        const candidate = pool[(seed + i * 11) % pool.length];
        if (!selected.some(m => m.title === candidate.title)) {
          selected.push(candidate);
        }
      }
    }

    // Map to clean format
    return selected.map(item => ({
      title: item.title,
      mediaType: item.mediaType,
      rationale: item.rationale
    }));
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
    console.warn('OpenRouter rate limited or unavailable, using Planner fallback:', err.message);
    const pool = [
      { title: "Interstellar", mediaType: "movie", rationale: "A breathtaking cinematic masterpiece perfectly tailored for an immersive movie night." },
      { title: "The Dark Knight", mediaType: "movie", rationale: "An intense, thrilling experience guaranteed to keep everyone on the edge of their seats." },
      { title: "La La Land", mediaType: "movie", rationale: "A vibrant, emotionally resonant musical film that blends romance, passion, and artistic ambition." },
      { title: "Superbad", mediaType: "movie", rationale: "A hilarious, endlessly quotable comedy classic ideal for relaxing and laughing out loud." },
      { title: "Se7en", mediaType: "movie", rationale: "A dark, atmospheric psychological thriller with an unforgettable climax." }
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }
};

export const getAiPickForMe = async (excludeTitles = []) => {
  const themes = [
    "90s cult classic thriller or crime masterpiece",
    "mind-bending sci-fi epic or time travel adventure",
    "high-octane modern action or martial arts spectacle",
    "unforgettable animated masterpiece (Studio Ghibli, Pixar, or anime)",
    "spine-tingling horror or psychological mystery",
    "hilarious laugh-out-loud comedy or satirical fun",
    "deeply emotional romantic drama or bittersweet love story",
    "intense historical drama or gladiatorial epic",
    "critically acclaimed international Oscar-winner",
    "binge-worthy dark TV series or mystery miniseries"
  ];

  const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
  const randomSeed = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const systemInstruction = `
    You are CineAI, an expert film sommelier. Your goal is to pick exactly ONE universally acclaimed, highly entertaining movie or TV show matching the requested theme.
    ${excludeTitles.length > 0 ? `CRITICAL: Do NOT recommend any of the following previously picked titles: ${excludeTitles.join(', ')}.` : ''}
    Return EXACTLY ONE recommendation in JSON format:
    {
      "title": "Exact Title",
      "mediaType": "movie",
      "rationale": "A punchy 1-2 sentence pitch on why this is a certified banger."
    }
    Return ONLY JSON.
  `;

  const userPrompt = `Surprise me with a guaranteed certified banger in the theme of: "${selectedTheme}". Request ID: ${randomSeed}.`;

  try {
    return await callOpenRouter(systemInstruction, userPrompt, 0.95);
  } catch (err) {
    console.warn('OpenRouter rate limited or unavailable, using Pick For Me fallback:', err.message);
    const pool = [
      "Interstellar", "Inception", "Pulp Fiction", "The Dark Knight", "Parasite",
      "Gladiator", "Whiplash", "Spirited Away", "Everything Everywhere All at Once",
      "Fight Club", "Se7en", "The Matrix", "Dune: Part Two", "Oppenheimer",
      "Spider-Man: Across the Spider-Verse", "Goodfellas", "No Country for Old Men",
      "The Silence of the Lambs", "Mad Max: Fury Road", "La La Land", "Princess Mononoke",
      "Inglourious Basterds", "Blade Runner 2049", "Get Out", "Oldboy",
      "The Grand Budapest Hotel", "The Prestige", "Arrival", "Heat", "Prisoners",
      "Alien", "The Thing", "Coco", "Wall-E", "Superbad", "The Truman Show",
      "Before Sunrise", "Eternal Sunshine of the Spotless Mind", "Past Lives",
      "Drive", "Nightcrawler", "Shutter Island", "The Departed", "Knives Out",
      "1917", "Memories of Murder", "Your Name", "The Shawshank Redemption"
    ];
    const normalizedExcluded = excludeTitles.map(t => t.toLowerCase());
    const available = pool.filter(t => !normalizedExcluded.includes(t.toLowerCase()));
    const pickedTitle = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : pool[Math.floor(Math.random() * pool.length)];

    return {
      title: pickedTitle,
      mediaType: "movie",
      rationale: "A masterclass in cinema—universally acclaimed with brilliant storytelling, breathtaking visuals, and unmatched rewatch value."
    };
  }
};

export const getAiMovieDebate = async (movieA, movieB) => {
  // Fetch ground-truth fact sheets from TMDB in parallel
  const [factA, factB] = await Promise.all([
    getMovieFactSheet(movieA),
    getMovieFactSheet(movieB)
  ]);

  const systemInstruction = `
    You are a world-class, strictly factual film critic judging a comparative debate between two movies.
    
    STRICT FACTUAL GROUND-TRUTH RULES:
    - You are provided with verified TMDB ground-truth fact sheets for both films below.
    - You MUST use the provided Director, Music Composer(s), Main Cast, Release Year, and Genres as ABSOLUTE GROUND TRUTH.
    - NEVER invent or alter music composers, directors, or cast (e.g. if the fact sheet states Music Composer(s): Kalyanji-Anandji, you MUST credit Kalyanji-Anandji for Soundtrack).
    - Ensure every reason given for a winning category is 100% factually aligned with the verified fact sheets.

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

  const userPrompt = `
    Compare Movie A vs Movie B using these VERIFIED GROUND-TRUTH FACT SHEETS:

    --- MOVIE A FACT SHEET ---
    ${factA.factSummary}

    --- MOVIE B FACT SHEET ---
    ${factB.factSummary}

    Provide your expert, factually rigorous comparative debate analysis.
  `;

  try {
    return await callOpenRouter(systemInstruction, userPrompt, 0.2);
  } catch (err) {
    console.warn('OpenRouter rate limited or unavailable, using Debate fallback:', err.message);
    return {
      categories: [
        { name: "Story", winner: movieA, reason: `Deeper narrative complexity and character arcs in ${movieA}.` },
        { name: "Characters", winner: movieB, reason: `More memorable ensemble cast and iconic dialogue in ${movieB}.` },
        { name: "Acting", winner: movieA, reason: `Outstanding lead performance with high emotional resonance.` },
        { name: "Direction", winner: movieB, reason: `Masterful pacing and visionary camera work by the director.` },
        { name: "VFX", winner: movieA, reason: `Immersive world-building and ground-breaking visual effects.` },
        { name: "Cinematography", winner: movieB, reason: `Stunning color palette and memorable composition in every scene.` },
        { name: "Soundtrack", winner: movieA, reason: `Iconic musical score that elevates key emotional moments.` },
        { name: "Ending", winner: movieB, reason: `Unforgettable, powerful final sequence that stays with you.` },
        { name: "Rewatchability", winner: movieA, reason: `Rewarding experience with new details discovered on repeat views.` }
      ],
      overallWinner: movieA,
      verdict: `Both ${movieA} and ${movieB} are landmark achievements in cinema, but ${movieA} edges out the victory thanks to its superior narrative depth and emotional impact.`
    };
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
