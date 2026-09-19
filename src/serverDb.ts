import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Transaction } from "./types";
import { INITIAL_TRANSACTIONS, INITIAL_BUDGETS } from "./initialData";

// In Vercel serverless environment, local filesystem is read-only except /tmp
const DB_FILE = process.env.VERCEL
  ? path.join("/tmp", "database.json")
  : (process.env.DB_FILE || path.join(process.cwd(), "database.json"));

let inMemoryDb: DbSchema | null = null;

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  defaultSalary?: number;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface DbSchema {
  users: User[];
  sessions: Session[];
  transactions: (Transaction & { userId: string })[];
  budgets: { userId: string; month: string; amount: number }[];
}

// Ensure database file exists and is initialized
function initDb(): DbSchema {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  // 1. If DB_FILE exists in target path (/tmp or cwd)
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      inMemoryDb = JSON.parse(content);
      return inMemoryDb!;
    } catch (e) {
      console.warn("Aviso ao ler banco de dados JSON de DB_FILE:", e);
    }
  }

  // 2. If running on Vercel, attempt to copy seed from bundled database.json in root cwd
  if (process.env.VERCEL) {
    const bundledPath = path.join(process.cwd(), "database.json");
    if (fs.existsSync(bundledPath)) {
      try {
        const content = fs.readFileSync(bundledPath, "utf-8");
        inMemoryDb = JSON.parse(content);
        try {
          fs.writeFileSync(DB_FILE, content, "utf-8");
        } catch (_) {}
        return inMemoryDb!;
      } catch (_) {}
    }
  }

  // 3. Fallback default schema
  const defaultData: DbSchema = {
    users: [],
    sessions: [],
    transactions: [],
    budgets: [],
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
  } catch (e) {
    console.warn("Aviso: Não foi possível gravar arquivo DB em disco (usando memória):", e);
  }

  inMemoryDb = defaultData;
  return inMemoryDb;
}

// Save database
function saveDb(data: DbSchema) {
  inMemoryDb = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Aviso ao salvar DB em disco (mantido em memória):", e);
  }
}

// Hash password with SHA-256
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Generate secure random session token
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// --- USER OPERATIONS ---

export function registerUser(name: string, email: string, passwordPlain: string, initialSalary: number = 2500) {
  const db = initDb();
  
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = db.users.find((u) => u.email === normalizedEmail);
  if (existingUser) {
    throw new Error("Este e-mail já está cadastrado.");
  }

  let userId = crypto.randomUUID();
  // Garante que o ID gerado seja único e não conflite com nenhum já cadastrado no banco
  while (db.users.some((u) => u.id === userId)) {
    userId = crypto.randomUUID();
  }

  const cleanSalary = typeof initialSalary === "number" && initialSalary > 0 ? initialSalary : 2500;

  const newUser: User = {
    id: userId,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(passwordPlain),
    defaultSalary: cleanSalary,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  // Seed user with the initial print template data
  const userTransactions = INITIAL_TRANSACTIONS.map((t) => ({
    ...t,
    id: `${t.id}-${crypto.randomUUID().substring(0, 8)}`,
    userId: userId,
  }));
  db.transactions.push(...userTransactions);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const budgetEntries: Record<string, number> = {
    ...INITIAL_BUDGETS,
    [currentMonthStr]: cleanSalary,
  };

  for (let i = 0; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    budgetEntries[mStr] = cleanSalary;
  }

  Object.entries(budgetEntries).forEach(([month, amount]) => {
    db.budgets.push({
      userId,
      month,
      amount,
    });
  });

  saveDb(db);
  return newUser;
}

export function loginUser(email: string, passwordPlain: string) {
  const db = initDb();
  const normalizedEmail = email.toLowerCase().trim();
  const user = db.users.find((u) => u.email === normalizedEmail);
  
  if (!user || user.passwordHash !== hashPassword(passwordPlain)) {
    throw new Error("E-mail ou senha incorretos.");
  }

  // Create session
  const token = generateToken();
  const session: Session = {
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };

  db.sessions.push(session);
  saveDb(db);

  return { user, token };
}

export function getUserByToken(token: string): User | null {
  const db = initDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    // Session expired
    db.sessions = db.sessions.filter((s) => s.token !== token);
    saveDb(db);
    return null;
  }

  const user = db.users.find((u) => u.id === session.userId);
  return user || null;
}

export function logoutUser(token: string) {
  const db = initDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveDb(db);
}

// --- TRANSACTION OPERATIONS ---

export function getUserTransactions(userId: string): Transaction[] {
  const db = initDb();
  return db.transactions
    .filter((t) => t.userId === userId)
    .map(({ userId, ...transaction }) => transaction);
}

export function createTransaction(userId: string, t: Omit<Transaction, "id"> & { id?: string }): Transaction {
  const db = initDb();
  const newTransaction: Transaction & { userId: string } = {
    ...t,
    id: t.id || `manual-${Date.now()}-${crypto.randomUUID().substring(0, 4)}`,
    userId,
  };

  db.transactions.push(newTransaction);
  saveDb(db);

  const { userId: _, ...result } = newTransaction;
  return result;
}

export function updateTransaction(userId: string, id: string, updates: Partial<Transaction>): Transaction {
  const db = initDb();
  const index = db.transactions.findIndex((t) => t.id === id && t.userId === userId);
  if (index === -1) {
    throw new Error("Transação não encontrada ou acesso não autorizado.");
  }

  db.transactions[index] = {
    ...db.transactions[index],
    ...updates,
    id, // Keep original ID
    userId, // Force user ID ownership
  };

  saveDb(db);
  const { userId: _, ...result } = db.transactions[index];
  return result;
}

export function deleteTransaction(userId: string, id: string) {
  const db = initDb();
  const originalLength = db.transactions.length;
  db.transactions = db.transactions.filter((t) => !(t.id === id && t.userId === userId));
  
  if (db.transactions.length === originalLength) {
    throw new Error("Transação não encontrada ou acesso não autorizado.");
  }
  saveDb(db);
}

export function deleteTransactionsBatch(userId: string, ids: string[]) {
  if (!ids || ids.length === 0) return;
  const db = initDb();
  const idSet = new Set(ids);
  db.transactions = db.transactions.filter((t) => !(idSet.has(t.id) && t.userId === userId));
  saveDb(db);
}

// --- BUDGET OPERATIONS ---

export function getUserBudgets(userId: string): Record<string, number> {
  const db = initDb();
  const budgets: Record<string, number> = {};
  db.budgets
    .filter((b) => b.userId === userId)
    .forEach((b) => {
      budgets[b.month] = b.amount;
    });
  return budgets;
}

export function setUserBudget(userId: string, month: string, amount: number) {
  const db = initDb();
  const index = db.budgets.findIndex((b) => b.userId === userId && b.month === month);

  if (index !== -1) {
    db.budgets[index].amount = amount;
  } else {
    db.budgets.push({ userId, month, amount });
  }

  saveDb(db);
}

export function getUserDefaultSalary(userId: string): number {
  const db = initDb();
  const user = db.users.find((u) => u.id === userId);
  return user?.defaultSalary || 2500;
}

export function setUserDefaultSalary(userId: string, salary: number, applyFromMonth?: string): Record<string, number> {
  const db = initDb();
  const user = db.users.find((u) => u.id === userId);
  const cleanSalary = typeof salary === "number" && salary > 0 ? salary : 2500;

  if (user) {
    user.defaultSalary = cleanSalary;
  }

  const updatedBudgetsMap: Record<string, number> = {};

  if (applyFromMonth) {
    try {
      const [yearStr, monthStr] = applyFromMonth.split("-");
      const baseYear = parseInt(yearStr, 10);
      const baseMonth = parseInt(monthStr, 10);

      for (let i = 0; i <= 12; i++) {
        const d = new Date(baseYear, baseMonth - 1 + i, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        updatedBudgetsMap[mKey] = cleanSalary;
        
        const bIndex = db.budgets.findIndex((b) => b.userId === userId && b.month === mKey);
        if (bIndex !== -1) {
          db.budgets[bIndex].amount = cleanSalary;
        } else {
          db.budgets.push({ userId, month: mKey, amount: cleanSalary });
        }
      }
    } catch (e) {
      console.error("Erro ao aplicar orçamentos futuros no serverDb:", e);
    }
  }

  saveDb(db);
  return updatedBudgetsMap;
}

export function resetUserToDemoData(userId: string) {
  const db = initDb();
  db.transactions = db.transactions.filter((t) => t.userId !== userId);
  db.budgets = db.budgets.filter((b) => b.userId !== userId);

  const userTransactions = INITIAL_TRANSACTIONS.map((t) => ({
    ...t,
    id: `${t.id}-${crypto.randomUUID().substring(0, 8)}`,
    userId,
  }));
  db.transactions.push(...userTransactions);

  Object.entries(INITIAL_BUDGETS).forEach(([month, amount]) => {
    db.budgets.push({
      userId,
      month,
      amount,
    });
  });

  saveDb(db);
}


