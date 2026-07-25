import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Transaction } from "./types";
import { INITIAL_TRANSACTIONS, INITIAL_BUDGETS } from "./initialData";

const DB_FILE = path.join(process.cwd(), "database.json");

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
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
  if (!fs.existsSync(DB_FILE)) {
    const defaultData: DbSchema = {
      users: [],
      sessions: [],
      transactions: [],
      budgets: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    console.error("Erro ao ler banco de dados JSON. Criando um novo...", e);
    const defaultData: DbSchema = {
      users: [],
      sessions: [],
      transactions: [],
      budgets: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
}

// Save database
function saveDb(data: DbSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
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

export function registerUser(name: string, email: string, passwordPlain: string) {
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

  const newUser: User = {
    id: userId,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(passwordPlain),
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

  Object.entries(INITIAL_BUDGETS).forEach(([month, amount]) => {
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
