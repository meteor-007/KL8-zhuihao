import express from 'express';
import { createServer as createViteServer } from 'vite';
import iconv from 'iconv-lite';

const app = express();
const PORT = 3000;

// Cache the fetched data
let cachedData: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

app.get('/api/data', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedData.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      return res.json({ status: 'ok', data: cachedData });
    }

    const response = await fetch('http://data.17500.cn/kl8_desc.txt', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const textContent = iconv.decode(buffer, 'gb2312');

    const lines = textContent.trim().split('\n');
    const data = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 22) {
        const issue = parts[0];
        const date = parts[1];
        const numbers = parts.slice(2, 22).map(n => parseInt(n, 10));

        if (date.length === 10 && date[4] === '-' && date[7] === '-') {
          data.push({
            issue,
            date,
            numbers
          });
        }
      }
    }

    // Sort by issue descending (newest first)
    data.sort((a, b) => b.issue.localeCompare(a.issue));

    cachedData = data;
    lastFetchTime = now;

    res.json({ status: 'ok', data: cachedData });
  } catch (error) {
    console.error('Error fetching data:', error);
    // If fetch fails, return cached data if available
    if (cachedData.length > 0) {
      res.json({ status: 'ok', data: cachedData, cached: true });
    } else {
      res.status(500).json({ status: 'error', message: String(error) });
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
