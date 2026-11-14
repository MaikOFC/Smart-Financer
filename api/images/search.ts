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

  const results: Array<{ id: string; title: string; thumbnail: string; fullUrl: string; source: string }> = [];
  const seenUrls = new Set<string>();

  const fetchWithTimeout = (url: string, options: RequestInit = {}, timeoutMs = 4500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  // 1. DuckDuckGo Imagens
  try {
    const ddgPageRes = await fetchWithTimeout(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
          }
        );
        if (imgRes.ok) {
          const data: any = await imgRes.json();
          for (const item of (data.results || []).slice(0, 20)) {
            const thumb = item.thumbnail || item.image;
            if (thumb && !seenUrls.has(thumb)) {
              seenUrls.add(thumb);
              results.push({
                id: `ddg-${Math.random().toString(36).slice(2, 8)}`,
                title: item.title || query,
                thumbnail: thumb,
                fullUrl: item.image || thumb,
                source: item.source || "Web",
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("Erro ao buscar no DuckDuckGo Images:", e);
  }

  // 2. Bing Web Images
  if (results.length < 15) {
    try {
      const bingRes = await fetchWithTimeout(
        `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9",
          },
        }
      );
      if (bingRes.ok) {
        const bHtml = await bingRes.text();
        const mRegex = /m="({[^"]+})"/g;
        let match;
        while ((match = mRegex.exec(bHtml)) !== null && results.length < 24) {
          try {
            const parsed = JSON.parse(match[1].replace(/&quot;/g, '"'));
            const thumb = (parsed.turl || parsed.murl || "").replace(/&amp;/g, "&");
            if (thumb && !seenUrls.has(thumb)) {
              seenUrls.add(thumb);
              results.push({
                id: `bing-${Math.random().toString(36).slice(2, 8)}`,
                title: parsed.t || query,
                thumbnail: thumb,
                fullUrl: parsed.murl || thumb,
                source: "Web",
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar no Bing Images:", e);
    }
  }

  // 3. Fallback Wikipedia PT + EN + Wikimedia Commons
  if (results.length < 8) {
    try {
      const ptWikiUrl = `https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrnamespace=0&gsrsearch=${encodeURIComponent(query)}&gsrlimit=10&prop=pageimages&pithumbsize=500&format=json`;
      const ptRes = await fetchWithTimeout(ptWikiUrl, { headers: { "User-Agent": "SmartFinancer/1.0" } });
      if (ptRes.ok) {
        const ptData: any = await ptRes.json();
        const pages = Object.values(ptData.query?.pages || {});
        for (const p of pages as any[]) {
          if (p.thumbnail?.source && !seenUrls.has(p.thumbnail.source)) {
            seenUrls.add(p.thumbnail.source);
            results.push({
              id: `wiki-pt-${p.pageid || Math.random()}`,
              title: p.title || query,
              thumbnail: p.thumbnail.source,
              fullUrl: p.thumbnail.source,
              source: "Wikipedia",
            });
          }
        }
      }
    } catch {}
  }

  if (results.length < 8) {
    try {
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json`;
      const cmRes = await fetchWithTimeout(commonsUrl, { headers: { "User-Agent": "SmartFinancer/1.0" } });
      if (cmRes.ok) {
        const cmData: any = await cmRes.json();
        const pages = Object.values(cmData.query?.pages || {});
        for (const p of pages as any[]) {
          const thumb = p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url;
          if (thumb && !thumb.endsWith(".svg") && !seenUrls.has(thumb)) {
            seenUrls.add(thumb);
            results.push({
              id: `commons-${p.pageid || Math.random()}`,
              title: (p.title || query).replace(/^File:/i, ""),
              thumbnail: thumb,
              fullUrl: p.imageinfo?.[0]?.url || thumb,
              source: "Wikimedia",
            });
          }
        }
      }
    } catch {}
  }

  return res.status(200).json({ results });
}
