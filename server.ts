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
  getUserBudgets,
  setUserBudget
} from "./src/serverDb";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body limit for image uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

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
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
    }
    registerUser(name, email, password);
    const loginResult = loginUser(email, password);
    res.status(201).json({ 
      message: "Usuário registrado com sucesso!",
      user: { id: loginResult.user.id, name: loginResult.user.name, email: loginResult.user.email },
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
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Obter dados do usuário autenticado
app.get("/api/auth/me", authMiddleware, (req: any, res) => {
  res.json({
    user: { id: req.user.id, name: req.user.name, email: req.user.email }
  });
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

// API Endpoint to expose public Supabase credentials at runtime to avoid Vite build-time baking issues
app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
    supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || "",
  });
});

// API Endpoint to parse spreadsheets or images of spreadsheets using Gemini
app.post("/api/parse-spreadsheet", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured on the server. Please check the Secrets panel in AI Studio.",
      });
    }

    const { imageBase64, mimeType, textData } = req.body;

    let prompt = `Você é um assistente especialista em finanças pessoais e extração de dados. Mapeie todas as transações de gastos e entradas contidas neste arquivo ou imagem. 
Identifique as seguintes seções típicas da planilha do usuário:
- Tabela Esquerda ('left'): Gastos mensais normais. Ex: Cartão, whey, Memoria Ram, Academia, Celular, Cartão de Mãe, Viagem, Assinatura, Descontos.
- Tabela Direita ('right'): Compras específicas ou de eletrônicos/tecnologia. Ex: RTX 5060, Alexa, Kit Ryzen, etc. Observe que alguns preços podem ter labels de texto como "Karinne" ou "3D" em vez de números. Se o preço for textual, defina o campo 'amount' como 0 e coloque esse texto no campo 'note'.
- Tabela de Parcelas/Recebíveis ('bottom_left'): Parcelas com datas/meses e descrições de reembolso ou parcelamento (ex: Notebook - Mãe, Pai - Celular, etc.).

Mapeie cada transação encontrada para este esquema JSON exato:
{
  "description": "Nome do produto ou descrição do item",
  "amount": 123.45, (valor numérico. Se for desconto ou redução, extraia o valor absoluto e marque 'isDiscount': true. Se o preço for textual, use 0),
  "date": "2026-07-13", (formato YYYY-MM-DD se puder deduzir da data ou mês como 01/12/2026. Se for apenas mês, coloque o primeiro dia desse mês),
  "type": "expense" ou "income", (os itens das tabelas left e right são 'expense' por padrão, exceto descontos que reduzem a soma total, ou se for um recebível de entrada),
  "tableSection": "left" ou "right" ou "bottom_left",
  "category": "Moradia" ou "Alimentação" ou "Transporte" ou "Lazer" ou "Tecnologia" ou "Saúde" ou "Família" ou "Outros",
  "isOrangeHighlight": true ou false, (se o item estava destacado em laranja ou destaque visual na planilha),
  "isDiscount": true ou false, (se é um desconto/dedução na planilha),
  "note": "Informações adicionais, ex: o preço textual como 'Karinne' ou '3D'"
}

Por favor, analise a planilha de entrada e retorne um array JSON válido de transações.`;

    let response;

    if (imageBase64 && mimeType) {
      // Parse spreadsheet image using Gemini Multimodal
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      };

      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, { text: prompt }],
        config: {
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
        },
      });
    } else if (textData) {
      // Parse text data (CSV/Excel converted values)
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Aqui estão os dados de texto estruturados da planilha do usuário:\n\n${textData}\n\n${prompt}`,
        config: {
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
        },
      });
    } else {
      return res.status(400).json({ error: "No image or text data provided for parsing." });
    }

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Empty response from Gemini model.");
    }

    const parsedTransactions = JSON.parse(textResult.trim());
    res.json({ transactions: parsedTransactions });
  } catch (error: any) {
    console.error("Error parsing spreadsheet:", error);
    res.status(500).json({
      error: "Ocorreu um erro ao processar a planilha. Certifique-se de que o arquivo é legível ou tente novamente.",
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Contexto dos dados do usuário:\n${dataContext}\n\nPergunta do usuário: ${prompt}`,
      config: {
        systemInstruction,
      }
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error("Error with AI Advisor:", error);
    res.status(500).json({ error: "Erro ao consultar o assessor financeiro.", details: error.message });
  }
});

// Vite middleware and static asset serving
async function startServer() {
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
