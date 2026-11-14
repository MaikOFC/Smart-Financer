interface ImageSearchItem {
  id: string;
  title: string;
  thumbnail: string;
  fullUrl: string;
  source: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const fetchWithTimeout = (url: string, options: RequestInit = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

async function searchBingImages(query: string): Promise<ImageSearchItem[]> {
  const items: ImageSearchItem[] = [];
  const endpoints = [
    `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=1&count=30&adlt=moderate`,
    `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
        },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const mRegex = /m="({[^"]+})"/g;
      let match;
      while ((match = mRegex.exec(html)) !== null && items.length < 24) {
        try {
          const parsed = JSON.parse(match[1].replace(/&quot;/g, '"'));
          const thumb = String(parsed.turl || parsed.murl || "").replace(/&amp;/g, "&").trim();
          const full = String(parsed.murl || thumb).replace(/&amp;/g, "&").trim();
          if (thumb && thumb.startsWith("http")) {
            items.push({
              id: `bing-${Math.random().toString(36).slice(2, 8)}`,
              title: parsed.t || query,
              thumbnail: thumb,
              fullUrl: full,
              source: "Bing",
            });
          }
        } catch {
          // ignore malformed match
        }
      }
      if (items.length >= 12) break;
    } catch (e) {
      console.warn("Erro ao buscar no Bing Images:", e);
    }
  }
  return items;
}

async function searchDuckDuckGoImages(query: string): Promise<ImageSearchItem[]> {
  const items: ImageSearchItem[] = [];
  try {
    const ddgPageRes = await fetchWithTimeout(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      }
    );
    if (ddgPageRes.ok) {
      const ddgHtml = await ddgPageRes.text();
      const vqdMatch = ddgHtml.match(/vqd=([0-9-]+)/);
      if (vqdMatch) {
        const vqd = vqdMatch[1];
        const imgRes = await fetchWithTimeout(
          `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`,
          {
            headers: {
              "User-Agent": BROWSER_UA,
            },
          }
        );
        if (imgRes.ok) {
          const data: any = await imgRes.json();
          for (const item of (data.results || []).slice(0, 20)) {
            const thumb = item.thumbnail || item.image;
            if (thumb && String(thumb).startsWith("http")) {
              items.push({
                id: `ddg-${Math.random().toString(36).slice(2, 8)}`,
                title: item.title || query,
                thumbnail: thumb,
                fullUrl: item.image || thumb,
                source: item.source || "DuckDuckGo",
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Erro ao buscar no DuckDuckGo Images:", e);
  }
  return items;
}

async function searchYandexImages(query: string): Promise<ImageSearchItem[]> {
  const items: ImageSearchItem[] = [];
  try {
    const yxRes = await fetchWithTimeout(
      `https://yandex.com/images/search?text=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      }
    );
    if (yxRes.ok) {
      const html = await yxRes.text();
      const matches = html.match(/\/\/avatars\.mds\.yandex\.net\/i\?id=[A-Za-z0-9_-]+(?:&(?:amp;)?n=[0-9]+)?/g) || [];
      for (const raw of matches.slice(0, 24)) {
        const url = "https:" + raw.replace(/&amp;/g, "&");
        items.push({
          id: `yx-${Math.random().toString(36).slice(2, 8)}`,
          title: query,
          thumbnail: url,
          fullUrl: url,
          source: "Yandex",
        });
      }
    }
  } catch (e) {
    console.warn("Erro ao buscar no Yandex Images:", e);
  }
  return items;
}

async function searchOpenverseImages(query: string): Promise<ImageSearchItem[]> {
  const items: ImageSearchItem[] = [];
  try {
    const res = await fetchWithTimeout(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=20`,
      { headers: { "User-Agent": "SmartFinancer/1.0" } },
      7000
    );
    if (res.ok) {
      const data: any = await res.json();
      for (const item of data.results || []) {
        const thumb = item.thumbnail || item.url;
        if (thumb && String(thumb).startsWith("http")) {
          items.push({
            id: `ov-${item.id || Math.random().toString(36).slice(2, 8)}`,
            title: item.title || query,
            thumbnail: thumb,
            fullUrl: item.url || thumb,
            source: "Openverse",
          });
        }
      }
    }
  } catch (e) {
    console.warn("Erro ao buscar no Openverse:", e);
  }
  return items;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const rawQ = req.query?.q;
  const query = typeof rawQ === "string" ? rawQ.trim() : "";
  if (!query) {
    return res.status(200).json({ results: [] });
  }

  const results: ImageSearchItem[] = [];
  const seenUrls = new Set<string>();
  const addItems = (list: ImageSearchItem[]) => {
    for (const item of list) {
      if (item.thumbnail && !seenUrls.has(item.thumbnail) && results.length < 36) {
        seenUrls.add(item.thumbnail);
        results.push(item);
      }
    }
  };

  // Executa buscadores globais da web em paralelo (Bing, DuckDuckGo, Yandex)
  const [bingRes, ddgRes, yandexRes] = await Promise.allSettled([
    searchBingImages(query),
    searchDuckDuckGoImages(query),
    searchYandexImages(query),
  ]);

  if (bingRes.status === "fulfilled") addItems(bingRes.value);
  if (ddgRes.status === "fulfilled") addItems(ddgRes.value);
  if (yandexRes.status === "fulfilled") addItems(yandexRes.value);

  // Fallback amplo via Openverse (sem Wikipedia) se retornar poucos resultados
  if (results.length < 8) {
    const ovItems = await searchOpenverseImages(query);
    addItems(ovItems);
  }

  return res.status(200).json({ results });
}
