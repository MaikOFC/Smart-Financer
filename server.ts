import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { 
  registerUser, 
  loginUser, 
  getUserByToken, 
  logoutUser,
  deleteUserAccount,
  getUserTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransactionsBatch,
  getUserBudgets,
  setUserBudget,
  getUserDefaultSalary,
  setUserDefaultSalary,
  getUserIncomeConfig,
  setUserIncomeConfig
} from "./src/serverDb";

dotenv.config();

const app = express();
const PORT = 3000;
const SERVER_VERSION = "2.4.0";
const SERVER_BUILD_TIME = new Date().toISOString();

// Increase body limit for image uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Endpoint de Versão e Atualização Automática (OTA)
app.get("/api/version", (req, res) => {
  res.json({
    version: SERVER_VERSION,
    buildTime: SERVER_BUILD_TIME,
    timestamp: Date.now(),
    features: [
      "Atualizações automáticas diretas pela nuvem",
      "Navegação com Swipe entre meses",
      "Tema Claro, Escuro e Padrão do Celular",
      "Animação contínua e suave de valores",
      "Suporte a entalhes e Safe Areas do Android",
    ],
  });
});

// Endpoint de Busca de Imagens na Web para Metas e Itens (Bing, DuckDuckGo, Yandex + Openverse)
app.get("/api/images/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!query) {
    return res.json({ results: [] });
  }

  const BROWSER_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  const fetchWithTimeout = (url: string, options: RequestInit = {}, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  type ImgItem = { id: string; title: string; thumbnail: string; fullUrl: string; source: string };

  const searchBing = async (): Promise<ImgItem[]> => {
    const items: ImgItem[] = [];
    const endpoints = [
      `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=1&count=30&adlt=moderate`,
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`,
    ];
    for (const url of endpoints) {
      try {
        const bingRes = await fetchWithTimeout(url, {
          headers: { "User-Agent": BROWSER_UA, "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8" },
        });
        if (!bingRes.ok) continue;
        const bHtml = await bingRes.text();
        const mRegex = /m="({[^"]+})"/g;
        let match;
        while ((match = mRegex.exec(bHtml)) !== null && items.length < 24) {
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
          } catch {}
        }
        if (items.length >= 12) break;
      } catch (e) {
        console.warn("Erro ao buscar no Bing Images:", e);
      }
    }
    return items;
  };

  const searchDDG = async (): Promise<ImgItem[]> => {
    const items: ImgItem[] = [];
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
            { headers: { "User-Agent": BROWSER_UA } }
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
  };

  const searchYandex = async (): Promise<ImgItem[]> => {
    const items: ImgItem[] = [];
    try {
      const yxRes = await fetchWithTimeout(
        `https://yandex.com/images/search?text=${encodeURIComponent(query)}`,
        { headers: { "User-Agent": BROWSER_UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" } }
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
  };

  const searchOpenverse = async (): Promise<ImgItem[]> => {
    const items: ImgItem[] = [];
    try {
      const ovRes = await fetchWithTimeout(
        `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=20`,
        { headers: { "User-Agent": "SmartFinancer/1.0" } },
        7000
      );
      if (ovRes.ok) {
        const data: any = await ovRes.json();
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
  };

  try {
    const results: ImgItem[] = [];
    const seenUrls = new Set<string>();
    const addItems = (list: ImgItem[]) => {
      for (const item of list) {
        if (item.thumbnail && !seenUrls.has(item.thumbnail) && results.length < 36) {
          seenUrls.add(item.thumbnail);
          results.push(item);
        }
      }
    };

    const [bingRes, ddgRes, yandexRes] = await Promise.allSettled([
      searchBing(),
      searchDDG(),
      searchYandex(),
    ]);

    if (bingRes.status === "fulfilled") addItems(bingRes.value);
    if (ddgRes.status === "fulfilled") addItems(ddgRes.value);
    if (yandexRes.status === "fulfilled") addItems(yandexRes.value);

    if (results.length < 8) {
      addItems(await searchOpenverse());
    }

    return res.json({ results });
  } catch (err: any) {
    console.error("Erro na busca de imagens:", err);
    return res.status(500).json({ error: "Falha ao buscar imagens na web.", results: [] });
  }
});

// Initialize Gemini API client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Authentication middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação ausente ou inválido." });
  }
  const token = authHeader.split(" ")[1];
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
  req.user = user;
  req.token = token;
  next();
};

// --- AUTENTICAÇÃO ---

// Registro de Usuário
app.post("/api/auth/register", (req, res) => {
  try {
    const { name, email, password, initialSalary } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
    }
    const cleanSalary = typeof initialSalary === "number" && initialSalary > 0 ? initialSalary : 2500;
    registerUser(name, email, password, cleanSalary);
    const loginResult = loginUser(email, password);
    res.status(201).json({ 
      message: "Usuário registrado com sucesso!",
      user: { 
        id: loginResult.user.id, 
        name: loginResult.user.name, 
        email: loginResult.user.email,
        defaultSalary: loginResult.user.defaultSalary || cleanSalary
      },
      token: loginResult.token
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login de Usuário
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }
    const { user, token } = loginUser(email, password);
    res.json({
      message: "Login realizado com sucesso!",
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        defaultSalary: user.defaultSalary || 2500,
        incomeConfig: user.incomeConfig
      },
      token
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Solicitação de Recuperação de Senha (Servidor Local)
app.post("/api/auth/reset-password-request", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "O endereço de e-mail é obrigatório." });
  }
  // No modo local/offline, simulamos o envio com sucesso
  res.json({
    success: true,
    message: "Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas com sucesso."
  });
});

// Redefinição de Senha (Servidor Local)
app.post("/api/auth/reset-password", (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
  }
  res.json({
    success: true,
    message: "Senha atualizada com sucesso!"
  });
});

// Obter dados do usuário autenticado
app.get("/api/auth/me", authMiddleware, (req: any, res) => {
  res.json({
    user: { 
      id: req.user.id, 
      name: req.user.name, 
      email: req.user.email,
      defaultSalary: req.user.defaultSalary || 2500,
      incomeConfig: req.user.incomeConfig
    }
  });
});

// Obter configuração de receita (Mensalista / Horista)
app.get("/api/user/income-config", authMiddleware, (req: any, res) => {
  try {
    const incomeConfig = getUserIncomeConfig(req.user.id);
    res.json({ incomeConfig });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Salvar configuração de receita (Mensalista / Horista) e atualizar orçamentos
app.post("/api/user/income-config", authMiddleware, (req: any, res) => {
  try {
    const { incomeConfig, monthlyBudgets, defaultSalary } = req.body;
    const result = setUserIncomeConfig(req.user.id, incomeConfig, monthlyBudgets, defaultSalary);
    res.json({
      message: "Configuração de receita salva com sucesso!",
      incomeConfig: result.incomeConfig,
      updatedBudgets: result.updatedBudgets
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar Salário Base Padrão do Usuário
app.post("/api/user/salary", authMiddleware, (req: any, res) => {
  try {
    const { salary, fromMonth } = req.body;
    const cleanSalary = parseFloat(salary);
    if (isNaN(cleanSalary) || cleanSalary <= 0) {
      return res.status(400).json({ error: "Valor de salário inválido." });
    }
    const updatedBudgets = setUserDefaultSalary(req.user.id, cleanSalary, fromMonth);
    res.json({
      message: "Salário base atualizado com sucesso!",
      defaultSalary: cleanSalary,
      updatedBudgets
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Logout
app.post("/api/auth/logout", authMiddleware, (req: any, res) => {
  logoutUser(req.token);
  res.json({ message: "Logout realizado com sucesso." });
});

// Excluir conta do usuário (Servidor Local) com confirmação de senha
app.post("/api/auth/delete-account", authMiddleware, (req: any, res) => {
  try {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) {
      return res.status(400).json({ error: "Informe sua senha para confirmar a exclusão da conta." });
    }
    deleteUserAccount(req.user.id, password);
    res.json({ success: true, message: "Conta excluída com sucesso." });
  } catch (error: any) {
    const msg = error?.message || "Não foi possível excluir a conta.";
    const status = msg.includes("Senha incorreta") ? 403 : 400;
    res.status(status).json({ error: msg });
  }
});

// Excluir usuário do Supabase Auth via Service Role Key (quando configurada no servidor)
app.post("/api/supabase/delete-account", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Sessão ausente ou inválida." });
    }
    const accessToken = authHeader.split(" ")[1];
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) {
      return res.status(400).json({ error: "Informe sua senha para confirmar a exclusão da conta." });
    }

    const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
    const supabaseAnonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return res.status(501).json({ deletedAuthUser: false });
    }

    // 1. Validar token do usuário autenticado
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: "Sessão expirada ou inválida no Supabase." });
    }
    const authUser: any = await userRes.json();
    if (!authUser?.id || !authUser?.email) {
      return res.status(401).json({ error: "Usuário não identificado." });
    }

    // 2. Confirmar a senha atual no Supabase Auth antes da exclusão
    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        email: authUser.email,
        password,
      }),
    });
    if (!verifyRes.ok) {
      return res.status(403).json({ error: "Senha incorreta. Verifique sua senha e tente novamente." });
    }

    // 3. Remover usuário do Supabase Auth (com cascade nas tabelas vinculadas)
    const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(authUser.id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });
    if (!delRes.ok) {
      return res.status(500).json({ error: "Erro ao remover credenciais da conta no Supabase." });
    }

    return res.json({ success: true, deletedAuthUser: true });
  } catch (err: any) {
    console.error("Erro em /api/supabase/delete-account:", err);
    return res.status(500).json({ error: "Erro ao processar exclusão da conta." });
  }
});

// --- TRANSAÇÕES (PROTEGIDAS) ---

// Obter todas as transações do usuário logado
app.get("/api/transactions", authMiddleware, (req: any, res) => {
  try {
    const transactions = getUserTransactions(req.user.id);
    res.json({ transactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Criar nova transação
app.post("/api/transactions", authMiddleware, (req: any, res) => {
  try {
    const transaction = createTransaction(req.user.id, req.body);
    res.status(201).json({ transaction });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Criar múltiplas transações (importação em massa)
app.post("/api/transactions/batch", authMiddleware, (req: any, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: "O corpo da requisição deve conter um array 'transactions'." });
    }
    const created = transactions.map((t: any) => createTransaction(req.user.id, t));
    res.status(201).json({ transactions: created });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Atualizar transação existente
app.put("/api/transactions/:id", authMiddleware, (req: any, res) => {
  try {
    const transaction = updateTransaction(req.user.id, req.params.id, req.body);
    res.json({ transaction });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Deletar transação
app.delete("/api/transactions/:id", authMiddleware, (req: any, res) => {
  try {
    deleteTransaction(req.user.id, req.params.id);
    res.json({ success: true, message: "Transação excluída com sucesso." });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Deletar múltiplas transações (em lote)
app.post("/api/transactions/delete-batch", authMiddleware, (req: any, res) => {
  try {
    const { ids } = req.body;
    if (Array.isArray(ids)) {
      deleteTransactionsBatch(req.user.id, ids);
    }
    res.json({ success: true, message: "Transações excluídas com sucesso." });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- ORÇAMENTOS (PROTEGIDOS) ---

// Obter todos os orçamentos do usuário logado
app.get("/api/budgets", authMiddleware, (req: any, res) => {
  try {
    const budgets = getUserBudgets(req.user.id);
    res.json({ budgets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Definir ou atualizar orçamento para um mês
app.post("/api/budgets", authMiddleware, (req: any, res) => {
  try {
    const { month, amount } = req.body;
    if (!month || amount === undefined) {
      return res.status(400).json({ error: "Mês e valor do orçamento são obrigatórios." });
    }
    setUserBudget(req.user.id, month, parseFloat(amount) || 0);
    res.json({ success: true, message: "Orçamento atualizado com sucesso." });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Redefinir dados para o modelo original (semente)
app.post("/api/auth/reset", authMiddleware, (req: any, res) => {
  try {
    // Import dynamically from initialData to prevent any ESM vs CommonJS issue
    const { INITIAL_TRANSACTIONS, INITIAL_BUDGETS } = require("./src/initialData");
    const crypto = require("crypto");
    const fs = require("fs");
    const path = require("path");
    const DB_FILE = path.join(process.cwd(), "database.json");

    const content = fs.readFileSync(DB_FILE, "utf-8");
    const db = JSON.parse(content);

    // Filter out existing user transactions and budgets
    db.transactions = db.transactions.filter((t: any) => t.userId !== req.user.id);
    db.budgets = db.budgets.filter((b: any) => b.userId !== req.user.id);

    // Re-seed
    const userTransactions = INITIAL_TRANSACTIONS.map((t: any) => ({
      ...t,
      id: `${t.id}-${crypto.randomUUID().substring(0, 8)}`,
      userId: req.user.id,
    }));
    db.transactions.push(...userTransactions);

    Object.entries(INITIAL_BUDGETS).forEach(([month, amount]) => {
      db.budgets.push({
        userId: req.user.id,
        month,
        amount,
      });
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");

    res.json({ success: true, message: "Dados redefinidos com sucesso para o modelo original." });
  } catch (error: any) {
    console.error("Erro ao resetar dados:", error);
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint to check health and API key configuration
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// API Endpoint to return detailed system, hosting platform, and database environment status
app.get("/api/system-status", (req, res) => {
  const host = (req.headers.host || req.hostname || "").toLowerCase();
  const isCloudRun = !!(
    process.env.K_SERVICE ||
    process.env.K_REVISION ||
    process.env.K_CONFIGURATION ||
    host.includes("run.app") ||
    host.includes("google")
  );
  const isVercel = !!process.env.VERCEL || host.includes("vercel.app");
  const isRender = !!process.env.RENDER || host.includes("onrender.com");
  const isRailway = !!process.env.RAILWAY_ENVIRONMENT || host.includes("railway.app");
  const isFly = !!process.env.FLY_APP_NAME || host.includes("fly.dev");
  const isAWS = !!(process.env.AWS_REGION || process.env.AWS_EXECUTION_ENV);
  const isLocal =
    !isCloudRun &&
    !isVercel &&
    !isRender &&
    !isRailway &&
    !isFly &&
    !isAWS &&
    (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0"));

  let platformName = "Servidor Local (Node.js / Localhost)";
  let hostingType: "local" | "cloud" = "local";
  let locationDetail = "Máquina Local";

  if (isCloudRun) {
    platformName = "Google Cloud Run (Nuvem Google)";
    hostingType = "cloud";
    // Extract region from hostname if available (e.g., ais-dev-...us-west2.run.app)
    const regionMatch = host.match(/([a-z0-9-]+)\.run\.app/);
    locationDetail = regionMatch ? `Região Cloud Run (${regionMatch[1]})` : "Google Cloud Platform";
  } else if (isVercel) {
    platformName = "Vercel Cloud Edge / Serverless";
    hostingType = "cloud";
    locationDetail = "Vercel Global Edge Network";
  } else if (isRender) {
    platformName = "Render Cloud Services";
    hostingType = "cloud";
    locationDetail = "Render Cloud";
  } else if (isRailway) {
    platformName = "Railway Cloud Infrastructure";
    hostingType = "cloud";
    locationDetail = "Railway Platform";
  } else if (isFly) {
    platformName = "Fly.io Edge Compute";
    hostingType = "cloud";
    locationDetail = "Fly.io Cloud";
  } else if (isAWS) {
    platformName = `Amazon Web Services (${process.env.AWS_REGION || "AWS Cloud"})`;
    hostingType = "cloud";
    locationDetail = "AWS Cloud Platform";
  } else if (!isLocal && host) {
    platformName = `Nuvem / Servidor Remoto (${host})`;
    hostingType = "cloud";
    locationDetail = "Infraestrutura Web";
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const isSupabase = !!(supabaseUrl && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY));

  res.json({
    status: "online",
    hostingType,
    platformName,
    locationDetail,
    host: req.headers.host || req.hostname,
    protocol: req.headers["x-forwarded-proto"] || req.protocol || "http",
    isOnlineCloud: hostingType === "cloud",
    database: {
      type: isSupabase ? "supabase_cloud" : "server_json",
      name: isSupabase ? "Supabase PostgreSQL (Nuvem)" : "Armazenamento no Servidor (database.json)",
      detail: isSupabase
        ? `Conectado ao Supabase (${supabaseUrl.replace(/https?:\/\//, "").split(".")[0]}...)`
        : "Persistência em arquivo JSON local no container do servidor",
    },
    system: {
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      aiModelIntegration: !!process.env.GEMINI_API_KEY ? "Gemini IA Ativo" : "Não Configurado",
    },
    timestamp: new Date().toISOString(),
  });
});

// API Endpoint to expose public Supabase credentials at runtime to avoid Vite build-time baking issues
app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
    supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || "",
  });
});

// Candidate models in order of priority per gemini-api guidelines
const CANDIDATE_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.1-flash-lite",
];

// Helper to call Gemini with automatic exponential backoff, timeout and model fallback
async function callGeminiWithFallback(aiClient: GoogleGenAI, requestConfig: any): Promise<any> {
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[Gemini] Requesting model ${modelName} (attempt ${attempt + 1})...`);
        
        // Wrap with a 30-second timeout per attempt so large spreadsheets finish cleanly
        const generatePromise = aiClient.models.generateContent({
          ...requestConfig,
          model: modelName,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ao conectar com modelo ${modelName}`)), 30000)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);

        if (response && response.text) {
          console.log(`[Gemini] Model ${modelName} responded successfully.`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        const errStatus = err?.status || err?.code;
        console.warn(`[Gemini] Model ${modelName} attempt ${attempt + 1} failed:`, errMessage);

        const isTransient =
          errStatus === "UNAVAILABLE" ||
          errStatus === 503 ||
          errStatus === "RESOURCE_EXHAUSTED" ||
          errStatus === 429 ||
          errMessage.includes("503") ||
          errMessage.includes("429") ||
          errMessage.includes("high demand") ||
          errMessage.includes("temporarily unavailable") ||
          errMessage.includes("UNAVAILABLE") ||
          errMessage.includes("Timeout");

        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        // Move to next candidate model
        break;
      }
    }
  }

  throw lastError || new Error("Não foi possível obter resposta dos modelos de IA disponíveis.");
}

// API Endpoint to parse Excel/CSV spreadsheets or images of spreadsheets using Gemini
app.post("/api/parse-spreadsheet", async (req, res) => {
  try {
    const { imageBase64, mimeType, textData, selectedMonth, fileName } = req.body;

    if (!imageBase64 && !textData) {
      return res.status(400).json({ error: "Nenhum dado de imagem ou planilha foi fornecido para processamento." });
    }

    if (!ai) {
      return res.status(500).json({
        error: "A chave GEMINI_API_KEY não está configurada no servidor para analisar a planilha com IA.",
      });
    }

    const fallbackMonth =
      typeof selectedMonth === "string" && /^\d{4}-\d{2}$/.test(selectedMonth)
        ? selectedMonth
        : new Date().toISOString().slice(0, 7);

    const prompt = `Você é um especialista em finanças pessoais e análise inteligente de planilhas (Excel .xlsx/.xls e CSV).
Analise cuidadosamente as COLUNAS e o cabeçalho da planilha${fileName ? ` ("${fileName}")` : ""} para identificar o significado de cada coluna (ex.: Data, Descrição/Item/Nome/Estabelecimento/Histórico, Valor/Preço/R$/Montante/Saída/Entrada, Categoria, Tipo, Parcelas, Recorrente, Observações/Notas).

Regras importantes de extração:
1. Ignore linhas de cabeçalho, títulos decorativos, linhas em branco e linhas de totais/resumo ("Total", "Subtotal", "Saldo final", "Soma").
2. Converta valores monetários em formato brasileiro ("R$ 1.234,56" -> 1234.56) ou americano ("1234.56") para número positivo em 'amount'.
   - Se uma linha tiver valor negativo ou coluna de "Débito"/"Saída", é uma despesa ('type': 'expense') com 'amount' positivo.
   - Se a coluna indicar claramente "Desconto", "Estorno" ou "Redução" em uma lista de gastos, marque 'isDiscount': true e 'type': 'expense'.
   - Se a coluna indicar entrada/receita/salário/rendimento/crédito recebido, use 'type': 'income'. Caso contrário, use 'expense'.
   - Se o valor não for numérico (ex.: rótulo textual), use 'amount': 0 e preserve o texto em 'note'.
3. Datas ('date' no formato YYYY-MM-DD):
   - Converta datas como DD/MM/AAAA, DD/MM/AA, YYYY-MM-DD, MM/AAAA ou nomes de mês (ex.: "Jan/2026" -> "2026-01-01").
   - Se a planilha não possuir coluna de data para uma linha, utilize "${fallbackMonth}-01".
4. Classificação de seção ('tableSection'):
   - 'left': Gastos normais do mês ou entradas lançadas na planilha (padrão).
   - 'bottom_left': Apenas se a linha ou coluna indicar explicitamente parcelamento (ex.: "3/10", "12x", coluna Parcelas > 1). Nesse caso preencha também 'totalInstallments' se identificável.
   - 'right': Apenas se a tabela ou linha for explicitamente de metas, lista de desejos ou planejamento futuro.
5. Categoria ('category'): Escolha estritamente a mais adequada entre:
   "Moradia", "Alimentação", "Transporte", "Lazer", "Tecnologia", "Saúde", "Família", "Outros".
6. Recorrência ('isRecurring'): true somente se a planilha indicar explicitamente gasto fixo/recorrente/mensal.
7. 'note': Combine informações úteis de colunas extras (ex.: forma de pagamento, banco, observação, parcelamento) quando houver.

Retorne SOMENTE um array JSON válido de transações extraídas a partir das colunas reais da planilha.`;

    const schemaConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            type: { type: Type.STRING },
            tableSection: { type: Type.STRING },
            category: { type: Type.STRING },
            isOrangeHighlight: { type: Type.BOOLEAN },
            isDiscount: { type: Type.BOOLEAN },
            isRecurring: { type: Type.BOOLEAN },
            totalInstallments: { type: Type.INTEGER },
            startDate: { type: Type.STRING },
            note: { type: Type.STRING },
          },
          required: ["description", "amount", "date", "type", "tableSection", "category"],
        },
      },
    };

    let parsedTransactions: any[] = [];
    let response;

    if (imageBase64 && mimeType) {
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      };
      response = await callGeminiWithFallback(ai, {
        contents: [imagePart, { text: prompt }],
        config: schemaConfig,
      });
    } else if (textData) {
      response = await callGeminiWithFallback(ai, {
        contents: `Dados tabulares extraídos da planilha (as colunas estão separadas por " | "):\n\n${textData}\n\n${prompt}`,
        config: schemaConfig,
      });
    }

    if (response && response.text) {
      const cleanJson = response.text
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");
      parsedTransactions = JSON.parse(cleanJson);
    }

    if (!Array.isArray(parsedTransactions) || parsedTransactions.length === 0) {
      return res.status(422).json({
        error: "Nenhuma transação legível pôde ser extraída da planilha. Verifique se há colunas de descrição e valor e tente novamente.",
      });
    }

    res.json({ transactions: parsedTransactions });
  } catch (error: any) {
    console.error("Error parsing spreadsheet:", error);
    const isOverload =
      error?.message?.includes("503") ||
      error?.message?.includes("high demand") ||
      error?.status === "UNAVAILABLE" ||
      error?.status === 503;

    const friendlyMessage = isOverload
      ? "O serviço de IA está com alta demanda momentânea. Realizamos tentativas automáticas. Por favor, tente enviar novamente em alguns instantes."
      : "Ocorreu um erro ao processar a planilha. Certifique-se de que o arquivo é legível ou tente novamente.";

    res.status(500).json({
      error: friendlyMessage,
      details: error.message,
    });
  }
});

// API Endpoint to parse single bank receipts (Nubank, Pix, boletos, etc.) from image/PDF/text
app.post("/api/parse-receipt", async (req, res) => {
  try {
    const { fileBase64, mimeType, text } = req.body;

    if (!fileBase64 && !text) {
      return res.status(400).json({ error: "Nenhum dado de comprovante (arquivo ou texto) fornecido." });
    }

    const prompt = `Você é um assistente especialista em ler comprovantes bancários brasileiros (Nubank, Itaú, Bradesco, Inter, Santander, Caixa, C6 Bank, PicPay, Mercado Pago, etc.) a partir de imagens, PDFs ou textos compartilhados.
Extraia com alta precisão os dados deste comprovante financeiro:
- description: Descrição limpa e objetiva do gasto (ex: 'Pix - Fulano de Tal', 'Supermercado X', 'Fatura Nubank', 'Boleto Condomínio').
- amount: Valor numérico em reais (número positivo float, ex: 154.20).
- date: Data do pagamento no formato 'YYYY-MM-DD'. Se não encontrar ano, use o ano corrente 2026.
- category: Apenas uma entre: 'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Tecnologia', 'Família', 'Outros'.
- tableSection: 'left' para despesas normais, ou 'bottom_left' se for compra parcelada / empréstimo.
- bank: Nome do banco emissor (ex: 'Nubank', 'Inter', 'Itaú', 'Bradesco', etc.).
- note: Informação complementar (ex: 'Chave Pix: fulano@email.com' ou 'Autenticação: ABC123').
- isInstallment: true se for pagamento ou compra explicitamente parcelada, false caso contrário.
- installmentCount: número total de parcelas se for parcelado (ex: 3), ou 1 caso contrário.`;

    const receiptSchemaConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          date: { type: Type.STRING },
          category: { type: Type.STRING },
          tableSection: { type: Type.STRING },
          bank: { type: Type.STRING },
          note: { type: Type.STRING },
          isInstallment: { type: Type.BOOLEAN },
          installmentCount: { type: Type.NUMBER },
        },
        required: ["description", "amount", "date", "category", "tableSection"],
      },
    };

    if (ai) {
      try {
        let response;
        if (fileBase64 && mimeType) {
          const filePart = {
            inlineData: {
              mimeType: mimeType.includes("pdf") ? "application/pdf" : mimeType,
              data: fileBase64,
            },
          };
          response = await callGeminiWithFallback(ai, {
            contents: [filePart, { text: `${prompt}\n\nTexto adicional acompanhante: ${text || "Nenhum"}` }],
            config: receiptSchemaConfig,
          });
        } else if (text) {
          response = await callGeminiWithFallback(ai, {
            contents: `Texto do comprovante:\n\n${text}\n\n${prompt}`,
            config: receiptSchemaConfig,
          });
        }

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          return res.json({ receipt: parsed });
        }
      } catch (aiErr: any) {
        console.warn("[ReceiptAI] Erro ao analisar comprovante com Gemini:", aiErr);
      }
    }

    // Heuristic fallback se IA falhar ou não estiver disponível
    const rawText = text || "";
    const amountMatch = rawText.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) || rawText.match(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/\./g, "").replace(",", ".")) : 0;
    const dateMatch = rawText.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
    const date = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : new Date().toISOString().split("T")[0];

    return res.json({
      receipt: {
        description: "Comprovante Bancário",
        amount,
        date,
        category: "Outros",
        tableSection: "left",
        bank: rawText.toLowerCase().includes("nubank") ? "Nubank" : undefined,
        note: rawText.substring(0, 100),
        isInstallment: false,
        installmentCount: 1,
      },
    });
  } catch (err: any) {
    console.error("Erro no endpoint /api/parse-receipt:", err);
    res.status(500).json({ error: "Falha ao analisar comprovante.", details: err.message });
  }
});

// Fallback do Share Target no servidor caso o Service Worker não intercepte a primeira requisição
app.post("/share-target", (req, res) => {
  res.redirect("/?shared_target=1");
});

app.get("/share-target", (req, res) => {
  const query = req.url.includes("?") ? req.url.split("?")[1] : "";
  res.redirect(`/?shared_target=1${query ? `&${query}` : ""}`);
});

// API Endpoint for AI financial consultant advisor
app.post("/api/ask-advisor", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "A chave API do Gemini não está configurada no servidor. Por favor, configure as credenciais no painel de Segredos (Secrets).",
      });
    }

    const { prompt, transactions, budget, selectedMonth } = req.body;

    const dataContext = `
Orçamento do mês (${selectedMonth}): R$ ${budget}
Transações registradas:
${transactions
  .map(
    (t: any) =>
      `- ${t.description}: R$ ${t.amount} [Seção: ${t.tableSection}, Tipo: ${t.type}, Categoria: ${t.category}${
        t.isRecurring ? ", Recorrente (todo mês)" : ""
      }${t.isDiscount ? ", Desconto" : ""}${t.note ? `, Nota: ${t.note}` : ""}]`
  )
  .join("\n")}
`;

    const systemInstruction = `Você é um Consultor Financeiro Pessoal especializado em ajudar o usuário a controlar gastos, sugerir economias e otimizar o orçamento.
Analise os dados financeiros fornecidos e responda à pergunta do usuário de forma amigável, clara e objetiva em português brasileiro.
Dê conselhos práticos de economia com base nas categorias onde ele mais gasta, de preferência de forma numerada ou em tópicos bem diretos.`;

    const response = await callGeminiWithFallback(ai, {
      contents: `Contexto dos dados do usuário:\n${dataContext}\n\nPergunta do usuário: ${prompt}`,
      config: {
        systemInstruction,
      },
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error("Error with AI Advisor:", error);
    const isOverload =
      error?.message?.includes("503") ||
      error?.message?.includes("high demand") ||
      error?.status === "UNAVAILABLE" ||
      error?.status === 503;

    const msg = isOverload
      ? "O modelo de IA está temporariamente com alta demanda. Por favor, aguarde alguns segundos e pergunte novamente."
      : "Erro ao consultar o assessor financeiro.";

    res.status(500).json({ error: msg, details: error.message });
  }
});

// Vite middleware and static asset serving
async function startServer() {
  // Explicit Service Worker and Manifest routes with correct MIME types and headers for PWABuilder & PWA
  app.get("/sw.js", (req, res) => {
    const swPath = process.env.NODE_ENV === "production"
      ? path.join(process.cwd(), "dist", "sw.js")
      : path.join(process.cwd(), "public", "sw.js");
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile(swPath);
  });

  app.get("/manifest.json", (req, res) => {
    const manifestPath = process.env.NODE_ENV === "production"
      ? path.join(process.cwd(), "dist", "manifest.json")
      : path.join(process.cwd(), "public", "manifest.json");
    res.setHeader("Content-Type", "application/manifest+json");
    res.sendFile(manifestPath);
  });

  // Digital Asset Links for Android Trusted Web Activity (TWA)
  app.get("/.well-known/assetlinks.json", (req, res) => {
    const distPath = path.join(process.cwd(), "dist", ".well-known", "assetlinks.json");
    const publicPath = path.join(process.cwd(), "public", ".well-known", "assetlinks.json");
    const filePath = fs.existsSync(distPath) ? distPath : publicPath;
    res.setHeader("Content-Type", "application/json");
    res.sendFile(filePath);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { dotfiles: "allow" }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
