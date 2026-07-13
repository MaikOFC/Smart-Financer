import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

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

// API Endpoint to check health and API key configuration
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
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
