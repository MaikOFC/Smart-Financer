import app from "../server";

export default function handler(req: any, res: any) {
  // Garantir que a URL recebida pela Serverless Function do Vercel seja roteada com o prefixo /api
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  return app(req, res);
}
