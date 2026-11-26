import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {GoogleGenAI} from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/gemini/chat' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const {message, customApiKey, systemInstruction} = data;
              const apiKey = customApiKey || process.env.GEMINI_API_KEY;

              if (!apiKey) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error:
                      'No Gemini API key available. Please add your key in the AI tab or configure GEMINI_API_KEY.',
                  })
                );
                return;
              }

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'aistudio-build',
                  },
                },
              });

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: message,
                config: {
                  systemInstruction:
                    systemInstruction ||
                    'You are K1ngkell AI, a friendly, ultra-knowledgeable gaming, music, streaming, and creative digital companion. Provide clear, enthusiastic, helpful advice with great formatting.',
                },
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({text: response.text || ''}));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: err.message || 'Failed to process AI request',
                })
              );
            }
          });
          return;
        }

        if (req.url === '/api/web-search' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const query = String(data.query || '').trim();
              const engine = String(data.engine || 'google');

              if (!query) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({error: 'Search query is required.'}));
                return;
              }

              const results: Array<{
                title: string;
                snippet: string;
                url: string;
                source: string;
              }> = [];

              let instantSummary = '';

              // Fetch Wikipedia OpenSearch + Summary in parallel with DuckDuckGo Instant Answer
              const wikiPromise = fetch(
                `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`
              )
                .then(r => r.json())
                .catch(() => null);

              const ddgPromise = fetch(
                `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
              )
                .then(r => r.json())
                .catch(() => null);

              const [wikiData, ddgData] = await Promise.all([wikiPromise, ddgPromise]);

              if (ddgData && ddgData.AbstractText) {
                instantSummary = ddgData.AbstractText;
                if (ddgData.AbstractURL) {
                  results.push({
                    title: ddgData.Heading || query,
                    snippet: ddgData.AbstractText,
                    url: ddgData.AbstractURL,
                    source: ddgData.AbstractSource || 'Reference',
                  });
                }
              }

              if (ddgData && Array.isArray(ddgData.RelatedTopics)) {
                for (const topic of ddgData.RelatedTopics.slice(0, 4)) {
                  if (topic && topic.Text && topic.FirstURL) {
                    results.push({
                      title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
                      snippet: topic.Text,
                      url: topic.FirstURL,
                      source: engine === 'duckduckgo' ? 'DuckDuckGo' : 'Web Topic',
                    });
                  }
                }
              }

              if (Array.isArray(wikiData) && Array.isArray(wikiData[1])) {
                const titles: string[] = wikiData[1];
                const descriptions: string[] = wikiData[2] || [];
                const urls: string[] = wikiData[3] || [];
                for (let i = 0; i < titles.length; i++) {
                  if (urls[i]) {
                    results.push({
                      title: titles[i],
                      snippet: descriptions[i] || `Encyclopedia entry for ${titles[i]}.`,
                      url: urls[i],
                      source: 'Wikipedia',
                    });
                  }
                }
              }

              // Optional Gemini instant answer summary when server key is configured
              const apiKey = process.env.GEMINI_API_KEY;
              if (!instantSummary && apiKey) {
                try {
                  const ai = new GoogleGenAI({
                    apiKey,
                    httpOptions: {
                      headers: {'User-Agent': 'aistudio-build'},
                    },
                  });
                  const aiRes = await ai.models.generateContent({
                    model: 'gemini-3.8-flash',
                    contents: `Provide a concise, factual 2-3 sentence search overview for the query: "${query}".`,
                  });
                  if (aiRes.text) {
                    instantSummary = aiRes.text;
                  }
                } catch {
                  // Ignore AI fallback failure
                }
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  query,
                  engine,
                  instantSummary,
                  results: results.slice(0, 8),
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: err.message || 'Search failed'}));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

