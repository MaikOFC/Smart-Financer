import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { 
  registerUser, 
  loginUser, 
  getUserByToken, 
  logoutUser,
  getUserTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransactionsBatch,
  getUserBudgets,
  setUserBudget,
  getUserDefaultSalary,
  setUserDefaultSalary
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
        defaultSalary: user.defaultSalary || 2500
      },
      token
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Obter dados do usuário autenticado
app.get("/api/auth/me", authMiddleware, (req: any, res) => {
  res.json({
    user: { 
      id: req.user.id, 
      name: req.user.name, 
      email: req.user.email,
      defaultSalary: req.user.defaultSalary || 2500
    }
  });
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
      aiModelIntegration: !!process.env.GEMINI_API_KEY ? "Gemini 2.5 Flash Ativo" : "Não Configurado",
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

// Candidate models in order of priority (Fast, lightweight & economic flash models)
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-flash-latest",
];

// Helper to call Gemini with automatic exponential backoff, timeout and model fallback
async function callGeminiWithFallback(aiClient: GoogleGenAI, requestConfig: any): Promise<any> {
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[Gemini] Requesting model ${modelName} (attempt ${attempt + 1})...`);
        
        // Wrap with a 15-second timeout per attempt to guarantee no infinite hanging
        const generatePromise = aiClient.models.generateContent({
          ...requestConfig,
          model: modelName,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ao conectar com modelo ${modelName}`)), 15000)
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

// Fallback local heuristic parser for tabular text (CSV/XLSX) in case AI models are completely unavailable
function parseTabularTextFallback(textData: string): any[] {
  const lines = textData.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const transactions: any[] = [];
  const currentDate = new Date().toISOString().split("T")[0];

  for (const line of lines) {
    // Remove "Linha X: " prefix if present
    const cleanLine = line.replace(/^Linha\s+\d+:\s*/i, "").trim();
    if (!cleanLine) continue;

    const parts = cleanLine.split("|").map((p) => p.trim());
    if (parts.length === 0) continue;

    // Search for a currency/number in the parts
    let amount = 0;
    let description = "";
    let dateStr = currentDate;
    let foundAmount = false;

    for (const part of parts) {
      // Check if it's a date
      const dateMatch = part.match(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/);
      if (dateMatch) {
        const rawDate = dateMatch[0];
        if (rawDate.includes("/")) {
          const segs = rawDate.split("/");
          if (segs.length === 3) {
            if (segs[0].length === 4) {
              dateStr = `${segs[0]}-${segs[1].padStart(2, "0")}-${segs[2].padStart(2, "0")}`;
            } else {
              const year = segs[2].length === 2 ? `20${segs[2]}` : segs[2];
              dateStr = `${year}-${segs[1].padStart(2, "0")}-${segs[0].padStart(2, "0")}`;
            }
          }
        } else {
          dateStr = rawDate.replace(/\//g, "-");
        }
        continue;
      }

      // Check if it's a monetary amount
      const numMatch = part.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
      const parsedNum = parseFloat(numMatch);
      if (!isNaN(parsedNum) && parsedNum > 0 && !foundAmount && !part.includes("/") && !part.includes("-")) {
        amount = parsedNum;
        foundAmount = true;
        continue;
      }

      // If it looks like text description and not just numbers/dates
      if (part.length > 1 && !description && !/^[\d\s.,:/-]+$/.test(part)) {
        description = part;
      }
    }

    if (description && amount > 0) {
      transactions.push({
        description,
        amount,
        date: dateStr,
        type: "expense",
        tableSection: "left",
        category: "Outros",
        isOrangeHighlight: false,
        isDiscount: false,
        note: null,
      });
    }
  }

  return transactions;
}

// API Endpoint to parse spreadsheets or images of spreadsheets using Gemini
app.post("/api/parse-spreadsheet", async (req, res) => {
  try {
    const { imageBase64, mimeType, textData } = req.body;

    if (!imageBase64 && !textData) {
      return res.status(400).json({ error: "Nenhum dado de imagem ou texto foi fornecido para processamento." });
    }

    let prompt = `Você é um assistente especialista em finanças pessoais e extração de dados. Mapeie todas as transações de gastos e entradas contidas neste arquivo ou imagem. 
Identifique as seguintes seções típicas da planilha do usuário:
- Tabela Esquerda ('left'): Gastos mensais normais. Ex: Cartão, whey, Memoria Ram, Academia, Celular, Cartão de Mãe, Viagem, Assinatura, Descontos.
- Tabela Direita ('right'): Compras específicas ou de eletrônicos/tecnologia. Ex: RTX 5060, Alexa, Kit Ryzen, etc. Observe que alguns preços podem ter labels de texto como "Karinne" ou "3D" em vez de números. Se o preço for textual, defina o campo 'amount' como 0 e coloque esse texto no campo 'note'.
- Tabela de Parcelas/Recebíveis ('bottom_left'): Parcelas com datas/meses e descrições de reembolso ou parcelamento (ex: Notebook - Mãe, Pai - Celular, etc.).

Mapeie cada transação encontrada para este esquema JSON exato:
{
  "description": "Nome do produto ou descrição do item",
  "amount": 123.45, (valor numérico positivo. Se for desconto ou redução, extraia o valor absoluto e marque 'isDiscount': true. Se o preço for textual, use 0),
  "date": "2026-07-13", (formato YYYY-MM-DD se puder deduzir da data ou mês como 01/12/2026. Se for apenas mês, coloque o primeiro dia desse mês),
  "type": "expense" ou "income", (os itens das tabelas left e right são 'expense' por padrão, exceto descontos que reduzem a soma total, ou se for um recebível de entrada),
  "tableSection": "left" ou "right" ou "bottom_left",
  "category": "Moradia" ou "Alimentação" ou "Transporte" ou "Lazer" ou "Tecnologia" ou "Saúde" ou "Família" ou "Outros",
  "isOrangeHighlight": true ou false, (se o item estava destacado em laranja ou destaque visual na planilha),
  "isDiscount": true ou false, (se é um desconto/dedução na planilha),
  "note": "Informações adicionais, ex: o preço textual como 'Karinne' ou '3D'"
}

Por favor, analise a planilha de entrada e retorne um array JSON válido de transações.`;

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
            note: { type: Type.STRING },
          },
          required: ["description", "amount", "type", "tableSection"],
        },
      },
    };

    let parsedTransactions: any[] = [];

    if (ai) {
      try {
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
            contents: `Aqui estão os dados de texto estruturados da planilha do usuário:\n\n${textData}\n\n${prompt}`,
            config: schemaConfig,
          });
        }

        if (response && response.text) {
          const cleanJson = response.text.trim();
          parsedTransactions = JSON.parse(cleanJson);
        }
      } catch (aiErr: any) {
        console.error("AI parse attempt failed, evaluating fallbacks:", aiErr);
        // If it was tabular text data, attempt local fallback parser
        if (textData) {
          console.log("Using local tabular heuristic fallback parser...");
          parsedTransactions = parseTabularTextFallback(textData);
        }

        // If still empty, throw
        if (!parsedTransactions || parsedTransactions.length === 0) {
          throw aiErr;
        }
      }
    } else {
      // No AI key configured, try local parser if text data exists
      if (textData) {
        parsedTransactions = parseTabularTextFallback(textData);
      } else {
        return res.status(500).json({
          error: "A chave da API Gemini não está configurada no servidor. Configure a chave no painel Secrets.",
        });
      }
    }

    if (!parsedTransactions || parsedTransactions.length === 0) {
      return res.status(422).json({
        error: "Nenhuma transação legível pôde ser extraída do arquivo. Verifique a clareza dos dados e tente novamente.",
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
        t.isDiscount ? ", Desconto" : ""
      }${t.note ? `, Nota: ${t.note}` : ""}]`
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
