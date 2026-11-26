import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import type {ServerResponse} from 'http';
import {defineConfig, type Plugin} from 'vite';
import {GoogleGenAI} from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const CHAT_STORE_PATH = '/tmp/k1ngkell-chat-store.json';

interface StoredChatMessage {
  id: string;
  author: string;
  clientId?: string;
  avatar: string;
  content: string;
  timestamp: string;
  role?: 'user' | 'mod' | 'admin';
  reactions?: Record<string, number>;
}

function loadChatStore(): Record<string, StoredChatMessage[]> {
  try {
    if (!fs.existsSync(CHAT_STORE_PATH)) return {};
    const parsed = JSON.parse(fs.readFileSync(CHAT_STORE_PATH, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveChatStore(store: Record<string, StoredChatMessage[]>) {
  try {
    fs.writeFileSync(CHAT_STORE_PATH, JSON.stringify(store), 'utf8');
  } catch {
    // Ignore write failure in read-only environments
  }
}

function geminiApiPlugin(): Plugin {
  const chatStore = loadChatStore();
  const chatClients = new Set<{
    res: ServerResponse;
    clientId: string;
    username: string;
    avatar: string;
  }>();
  const knownMembers = new Map<
    string,
    {clientId: string; username: string; avatar: string}
  >();

  // Seed knownMembers from persisted chat messages (real authors only)
  for (const list of Object.values(chatStore)) {
    if (!Array.isArray(list)) continue;
    for (const msg of list) {
      if (msg && msg.author && String((msg as {role?: string}).role || '') !== 'bot') {
        const key = (msg.clientId || msg.author).toLowerCase();
        knownMembers.set(key, {
          clientId: msg.clientId || `author-${key}`,
          username: msg.author,
          avatar: msg.avatar || '',
        });
      }
    }
  }

  const getOnlineUsers = () => {
    const unique = new Map<string, {clientId: string; username: string; avatar: string}>();
    for (const c of chatClients) {
      unique.set(c.clientId, {clientId: c.clientId, username: c.username, avatar: c.avatar});
    }
    return Array.from(unique.values());
  };

  const getOfflineUsers = () => {
    const onlineIds = new Set<string>();
    const onlineNames = new Set<string>();
    for (const u of chatClients) {
      onlineIds.add(u.clientId.toLowerCase());
      onlineNames.add(u.username.trim().toLowerCase());
    }
    const offline: Array<{clientId: string; username: string; avatar: string}> = [];
    const seenNames = new Set<string>();
    for (const m of knownMembers.values()) {
      const idKey = m.clientId.toLowerCase();
      const nameKey = m.username.trim().toLowerCase();
      if (!onlineIds.has(idKey) && !onlineNames.has(nameKey) && !seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        offline.push(m);
      }
    }
    return offline;
  };

  const broadcastChatEvent = (payload: unknown) => {
    const line = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of chatClients) {
      try {
        client.res.write(line);
      } catch {
        chatClients.delete(client);
      }
    }
  };

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

              const decodeHtml = (str: string) =>
                str
                  .replace(/<[^>]+>/g, '')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;|&apos;/g, "'")
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
                  .replace(/\s+/g, ' ')
                  .trim();

              const cleanTargetUrl = (rawHref: string): string => {
                let href = rawHref.replace(/&amp;/g, '&').trim();
                try {
                  if (href.includes('bing.com/ck/a')) {
                    const u = new URL(href).searchParams.get('u');
                    if (u && u.startsWith('a1')) {
                      const b64 = u.slice(2).replace(/-/g, '+').replace(/_/g, '/');
                      href = Buffer.from(b64, 'base64').toString('utf8');
                    }
                  }
                  const parsed = new URL(href);
                  parsed.searchParams.delete('msockid');
                  return parsed.toString();
                } catch {
                  return href;
                }
              };

              const results: Array<{
                title: string;
                snippet: string;
                url: string;
                source: string;
              }> = [];
              const seenUrls = new Set<string>();
              const engineLabel =
                engine === 'google'
                  ? 'Google'
                  : engine === 'duckduckgo'
                  ? 'DuckDuckGo'
                  : engine === 'brave'
                  ? 'Brave'
                  : 'Bing';

              let instantSummary = '';

              const webPromise = fetch(
                `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
                {
                  headers: {
                    'User-Agent':
                      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                  },
                  signal: AbortSignal.timeout(5000),
                }
              )
                .then(r => (r.ok ? r.text() : ''))
                .catch(() => '');

              const ddgPromise = fetch(
                `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
                {signal: AbortSignal.timeout(4000)}
              )
                .then(r => (r.ok ? r.json() : null))
                .catch(() => null);

              const [webHtml, ddgData] = await Promise.all([webPromise, ddgPromise]);

              if (webHtml) {
                const blocks = [...webHtml.matchAll(/<li class="b_algo"[^>]*>([\s\S]*?)<\/li>/g)];
                for (const block of blocks) {
                  const html = block[1];
                  const linkMatch =
                    html.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ||
                    html.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
                  if (!linkMatch) continue;

                  const url = cleanTargetUrl(linkMatch[1]);
                  if (!url.startsWith('http') || seenUrls.has(url)) continue;

                  const title = decodeHtml(linkMatch[2]);
                  if (!title) continue;

                  const snipMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
                  const snippet = snipMatch
                    ? decodeHtml(snipMatch[1])
                    : `Web result from ${engineLabel} for "${query}".`;

                  let hostSource = engineLabel;
                  try {
                    hostSource = new URL(url).hostname.replace(/^www\./, '');
                  } catch {
                    // keep engineLabel
                  }

                  seenUrls.add(url);
                  results.push({
                    title,
                    snippet,
                    url,
                    source: hostSource,
                  });
                }
              }

              if (ddgData && ddgData.AbstractText) {
                instantSummary = ddgData.AbstractText;
                if (ddgData.AbstractURL && !seenUrls.has(ddgData.AbstractURL)) {
                  const isWiki = /wikipedia\.org/i.test(ddgData.AbstractURL);
                  const entry = {
                    title: ddgData.Heading || query,
                    snippet: ddgData.AbstractText,
                    url: ddgData.AbstractURL,
                    source: ddgData.AbstractSource || 'Reference',
                  };
                  seenUrls.add(ddgData.AbstractURL);
                  if (isWiki && results.length > 0) {
                    results.push(entry);
                  } else {
                    results.unshift(entry);
                  }
                }
              }

              if (ddgData && Array.isArray(ddgData.RelatedTopics)) {
                for (const topic of ddgData.RelatedTopics.slice(0, 4)) {
                  if (topic && topic.Text && topic.FirstURL && !seenUrls.has(topic.FirstURL)) {
                    seenUrls.add(topic.FirstURL);
                    results.push({
                      title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
                      snippet: topic.Text,
                      url: topic.FirstURL,
                      source: engineLabel,
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
                  results: results.slice(0, 10),
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

        if (req.url?.startsWith('/api/favicon') && req.method === 'GET') {
          try {
            const reqUrl = new URL(req.url, 'http://localhost');
            const target = reqUrl.searchParams.get('url') || '';
            const parsed = new URL(target);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: 'Invalid URL protocol'}));
              return;
            }

            const host = parsed.hostname.toLowerCase();
            const isPrivateHost =
              host === 'localhost' ||
              host === '::1' ||
              host.endsWith('.local') ||
              /^127\./.test(host) ||
              /^10\./.test(host) ||
              /^192\.168\./.test(host) ||
              /^169\.254\./.test(host) ||
              /^172\.(1[6-9]|2\d|3[01])\./.test(host);

            const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`;
            let extractedFavicon = '';

            if (!isPrivateHost) {
              try {
                const pageRes = await fetch(parsed.toString(), {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; K1ngkellBot/1.0)',
                  Accept: 'text/html',
                },
                signal: AbortSignal.timeout(3500),
              });
              const ct = pageRes.headers.get('content-type') || '';
              if (pageRes.ok && ct.includes('text/html')) {
                const html = (await pageRes.text()).slice(0, 60000);
                const linkTags = html.match(/<link\b[^>]*>/gi) || [];
                for (const tag of linkTags) {
                  const relMatch = tag.match(/\brel\s*=\s*["']([^"']+)["']/i);
                  const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
                  if (
                    relMatch &&
                    hrefMatch &&
                    /\b(icon|shortcut icon|apple-touch-icon)\b/i.test(relMatch[1])
                  ) {
                    extractedFavicon = new URL(hrefMatch[1], parsed.origin).toString();
                    break;
                  }
                }
              }
              } catch {
                // Fall back to public favicon service if site blocks HTML fetch
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                faviconUrl: extractedFavicon || fallbackFavicon,
              })
            );
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: 'Invalid URL'}));
          }
          return;
        }

        if (req.url?.startsWith('/api/chat/stream') && req.method === 'GET') {
          const reqUrl = new URL(req.url, 'http://localhost');
          const clientId =
            (reqUrl.searchParams.get('clientId') || '').slice(0, 64) ||
            `anon-${Date.now()}`;
          const username =
            (reqUrl.searchParams.get('username') || '').trim().slice(0, 32) ||
            'Guest';
          const avatar = (reqUrl.searchParams.get('avatar') || '').slice(0, 256);

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          });

          const entry = {res, clientId, username, avatar};
          chatClients.add(entry);
          knownMembers.set(clientId.toLowerCase(), {clientId, username, avatar});

          res.write(
            `data: ${JSON.stringify({
              type: 'init',
              channels: chatStore,
              onlineUsers: getOnlineUsers(),
              offlineUsers: getOfflineUsers(),
            })}\n\n`
          );

          broadcastChatEvent({
            type: 'presence:update',
            onlineUsers: getOnlineUsers(),
            offlineUsers: getOfflineUsers(),
          });

          const heartbeat = setInterval(() => {
            try {
              res.write(': keepalive\n\n');
            } catch {
              clearInterval(heartbeat);
            }
          }, 25000);

          req.on('close', () => {
            clearInterval(heartbeat);
            chatClients.delete(entry);
            broadcastChatEvent({
              type: 'presence:update',
              onlineUsers: getOnlineUsers(),
              offlineUsers: getOfflineUsers(),
            });
            broadcastChatEvent({
              type: 'typing:clear',
              clientId,
            });
          });
          return;
        }

        if (req.url === '/api/chat/presence' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const clientId = String(data.clientId || '').trim().slice(0, 64);
              const username = String(data.username || '').trim().slice(0, 32);
              const avatar = typeof data.avatar === 'string' ? data.avatar.slice(0, 24000) : '';
              if (clientId) {
                for (const client of chatClients) {
                  if (client.clientId === clientId) {
                    if (username) client.username = username;
                    client.avatar = avatar;
                  }
                }
                const prevKnown = knownMembers.get(clientId.toLowerCase());
                knownMembers.set(clientId.toLowerCase(), {
                  clientId,
                  username: username || prevKnown?.username || 'Guest',
                  avatar: avatar || prevKnown?.avatar || '',
                });
                broadcastChatEvent({
                  type: 'presence:update',
                  onlineUsers: getOnlineUsers(),
                  offlineUsers: getOfflineUsers(),
                });
              }
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ok: true}));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: 'Invalid JSON'}));
            }
          });
          return;
        }

        if (req.url === '/api/chat/typing' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const channelId = String(data.channelId || '').trim().slice(0, 64);
              const clientId = String(data.clientId || '').trim().slice(0, 64);
              const username = String(data.username || 'Guest').trim().slice(0, 32) || 'Guest';
              const isTyping = Boolean(data.isTyping);
              if (channelId && clientId) {
                broadcastChatEvent({
                  type: 'typing:update',
                  channelId,
                  clientId,
                  username,
                  isTyping,
                });
              }
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ok: true}));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: 'Invalid JSON'}));
            }
          });
          return;
        }

        if (req.url === '/api/chat/react' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const channelId = String(data.channelId || '').trim();
              const messageId = String(data.messageId || '').trim();
              const emoji = String(data.emoji || '').trim().slice(0, 8);
              if (!channelId || !messageId || !emoji) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({error: 'Invalid reaction payload'}));
                return;
              }
              const list = chatStore[channelId] || [];
              const target = list.find(m => m.id === messageId);
              if (target) {
                target.reactions = target.reactions || {};
                target.reactions[emoji] = (target.reactions[emoji] || 0) + 1;
                saveChatStore(chatStore);
                broadcastChatEvent({
                  type: 'message:updated',
                  channelId,
                  message: target,
                });
              }
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ok: true, message: target || null}));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: 'Invalid JSON'}));
            }
          });
          return;
        }

        if (req.url?.startsWith('/api/chat') && req.method === 'GET') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              channels: chatStore,
              onlineUsers: getOnlineUsers(),
              offlineUsers: getOfflineUsers(),
            })
          );
          return;
        }

        if (req.url === '/api/chat' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const channelId = String(data.channelId || '').trim();
              const msg = data.message;
              if (
                !channelId ||
                !msg ||
                typeof msg.id !== 'string' ||
                typeof msg.content !== 'string' ||
                !msg.content.trim()
              ) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({error: 'Invalid message payload'}));
                return;
              }

              const sanitized: StoredChatMessage = {
                id: msg.id.slice(0, 64),
                author: String(msg.author || 'Guest').trim().slice(0, 32) || 'Guest',
                clientId:
                  typeof msg.clientId === 'string' ? msg.clientId.slice(0, 64) : undefined,
                avatar: typeof msg.avatar === 'string' ? msg.avatar.slice(0, 24000) : '',
                content: msg.content.trim().slice(0, 2000),
                timestamp: String(msg.timestamp || 'Just now').slice(0, 40),
                role: 'user',
                reactions:
                  msg.reactions && typeof msg.reactions === 'object'
                    ? msg.reactions
                    : {},
              };

              chatStore[channelId] = chatStore[channelId] || [];
              if (!chatStore[channelId].some(existing => existing.id === sanitized.id)) {
                chatStore[channelId].push(sanitized);
                if (chatStore[channelId].length > 200) {
                  chatStore[channelId] = chatStore[channelId].slice(-200);
                }
                saveChatStore(chatStore);
                broadcastChatEvent({
                  type: 'message:created',
                  channelId,
                  message: sanitized,
                });
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ok: true, message: sanitized}));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: 'Invalid JSON'}));
            }
          });
          return;
        }

        if (req.url === '/api/chat' && req.method === 'DELETE') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const channelId = String(data.channelId || '').trim();
              const messageId = String(data.messageId || '').trim();
              const clientId = String(data.clientId || '').trim();
              if (!channelId || !messageId) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({error: 'Invalid delete payload'}));
                return;
              }
              const list = chatStore[channelId] || [];
              const next = list.filter(
                m => !(m.id === messageId && (!m.clientId || m.clientId === clientId))
              );
              if (next.length !== list.length) {
                chatStore[channelId] = next;
                saveChatStore(chatStore);
                broadcastChatEvent({
                  type: 'message:deleted',
                  channelId,
                  messageId,
                });
              }
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ok: true}));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({error: 'Invalid JSON'}));
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

