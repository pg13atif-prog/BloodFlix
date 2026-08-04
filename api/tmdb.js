export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const tmdbApiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || req.query.api_key || 'a8774e9165aeff756bdfdea2742a3d1f';
  if (!tmdbApiKey) {
    return res.status(500).json({ error: 'Server configuration error: missing TMDB API key' });
  }

  // Parse the original subpath from query parameter (injected via vercel.json rewrite)
  const { path } = req.query;

  if (!path || path === '/') {
    return res.status(400).json({ error: 'Missing TMDB request subpath' });
  }

  // Copy query parameters (excluding path) and append secure API key
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path') {
      queryParams.set(key, value);
    }
  }
  queryParams.set('api_key', tmdbApiKey);

  // Construct target TMDB API URL
  const targetUrl = `https://api.themoviedb.org/3${path.startsWith('/') ? path : '/' + path}?${queryParams.toString()}`;

  try {
    const apiRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: `TMDB API responded with status ${apiRes.status}` });
    }

    const data = await apiRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error proxying to TMDB:', err);
    return res.status(500).json({ error: 'Internal server error proxying TMDB request' });
  }
}
