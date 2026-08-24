import { supabase } from "./supabase";
import { Transaction } from "../types";
import { INITIAL_TRANSACTIONS, INITIAL_BUDGETS } from "../initialData";

// Helper to check if Supabase is properly configured in the environment
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem("VITE_SUPABASE_URL");
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY || localStorage.getItem("VITE_SUPABASE_ANON_KEY");
  return !!url && !!key;
}

// Convert a Supabase row to React camelCase Transaction with support for both EN and PT column names
export function mapFromSupabase(row: any): Transaction {
  // Description fallback
  const description =
    row.description ??
    row["descrição"] ??
    row.descricao ??
    row.name ??
    row.nome ??
    row.produto ??
    "";

  // Amount parsing (handles commas, numbers, strings)
  const rawAmount =
    row.amount ??
    row.quantidade ??
    row.valor ??
    row.preco ??
    row["preço"] ??
    0;
  const parsedAmount =
    typeof rawAmount === "string"
      ? parseFloat(rawAmount.replace(",", "."))
      : parseFloat(rawAmount) || 0;

  // Date parsing (YYYY-MM-DD or DD/MM/YYYY)
  let date = String(row.date ?? row.data ?? "").trim();
  if (date.includes("/")) {
    const parts = date.split("/");
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY
        date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
  }

  // Type
  const rawType = String(row.type ?? row.tipo ?? "expense").toLowerCase();
  const type: "income" | "expense" =
    rawType === "income" || rawType === "receita" ? "income" : "expense";

  // Section normalizer (maps 'esquerda' -> 'left', 'direito' -> 'right', 'bottom_left' -> 'bottom_left')
  const rawSec = String(
    row.table_section ??
      row["tabela_seção"] ??
      row.tabela_secao ??
      row.section ??
      row.secao ??
      row["seção"] ??
      ""
  )
    .toLowerCase()
    .trim();

  let tableSection: "left" | "right" | "bottom_left" = "left";
  if (
    rawSec === "right" ||
    rawSec === "direito" ||
    rawSec === "direita" ||
    rawSec === "planejamento"
  ) {
    tableSection = "right";
  } else if (
    rawSec === "bottom_left" ||
    rawSec === "bottom" ||
    rawSec === "baixo" ||
    rawSec === "parcelas" ||
    rawSec === "devedores" ||
    rawSec === "recebiveis" ||
    rawSec === "reembolsos"
  ) {
    tableSection = "bottom_left";
  } else {
    tableSection = "left";
  }

  return {
    id: String(row.id),
    description,
    amount: parsedAmount,
    date,
    type,
    tableSection,
    category: row.category ?? row.categoria ?? "Outros",
    isOrangeHighlight: !!(row.is_orange_highlight ?? row.destaque ?? row.highlight),
    isDiscount: !!(row.is_discount ?? row.desconto),
    note: row.note ?? row["observação"] ?? row.observacao ?? row.nota ?? "",
  };
}

// Convert a React camelCase Transaction to Supabase snake_case
export function mapToSupabase(t: Omit<Transaction, "id"> & { id?: string }, userId: string): any {
  const mapped: any = {
    user_id: userId,
    description: t.description,
    amount: t.amount,
    date: t.date,
    type: t.type,
    table_section: t.tableSection,
    category: t.category || "Outros",
    is_orange_highlight: !!t.isOrangeHighlight,
    is_discount: !!t.isDiscount,
    note: t.note || null,
  };
  if (t.id && !t.id.startsWith("manual-")) {
    mapped.id = t.id;
  }
  return mapped;
}

// --- AUTHENTICATION ---

export async function signUpSupabase(
  name: string,
  email: string,
  passwordPlain: string,
  initialSalary: number = 2500
) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanSalary = typeof initialSalary === "number" && !isNaN(initialSalary) && initialSalary > 0 ? initialSalary : 2500;

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: passwordPlain,
    options: {
      data: {
        name: cleanName,
        default_salary: cleanSalary,
      },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists")) {
      throw new Error("Este endereço de e-mail já está cadastrado. Tente entrar na sua conta.");
    }
    throw error;
  }

  if (!data.user) {
    throw new Error("Não foi possível criar o usuário no Supabase.");
  }

  // Tenta salvar o perfil público do usuário na tabela 'users'
  try {
    await supabase.from("users").upsert({
      id: data.user.id,
      name: cleanName,
      email: cleanEmail,
    });
  } catch (err) {
    console.warn("Aviso ao salvar perfil na tabela 'users' pública:", err);
  }

  // Salva no localStorage como fallback rápido
  localStorage.setItem(`user_default_salary_${data.user.id}`, String(cleanSalary));

  // Se o usuário foi criado, rodamos o seed para criar os dados iniciais na conta dele com o salário escolhido
  try {
    await seedUserIfNeeded(data.user.id, cleanSalary);
  } catch (err) {
    console.error("Erro ao rodar seed inicial do usuário:", err);
  }

  // Se a sessão não estiver ativa imediatamente no retorno do signUp, tenta autenticar automaticamente
  let token = data.session?.access_token;
  if (!token) {
    try {
      const signInRes = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: passwordPlain,
      });
      if (signInRes.data?.session?.access_token) {
        token = signInRes.data.session.access_token;
      }
    } catch {
      // Usar identificador de sessão ativo
    }
  }

  return {
    token: token || `supabase-session-${data.user.id}`,
    user: {
      id: data.user.id,
      name: data.user.user_metadata?.name || cleanName,
      email: data.user.email || cleanEmail,
      defaultSalary: cleanSalary,
    },
  };
}

export async function signInSupabase(email: string, passwordPlain: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: passwordPlain,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
      throw new Error("E-mail ou senha incorretos.");
    }
    if (msg.includes("email not confirmed")) {
      throw new Error("E-mail ainda não confirmado no Supabase. Verifique seu e-mail ou desative a exigência de confirmação no painel.");
    }
    throw error;
  }

  if (!data.user) {
    throw new Error("E-mail ou senha incorretos no Supabase.");
  }

  // Garante o perfil público do usuário na tabela 'users'
  try {
    await supabase.from("users").upsert({
      id: data.user.id,
      name: data.user.user_metadata?.name || email.split("@")[0],
      email: data.user.email || email,
    });
  } catch (err) {
    console.warn("Aviso ao salvar perfil no login na tabela 'users' pública:", err);
  }

  const userSalaryMeta = data.user.user_metadata?.default_salary;
  const savedLocalSalary = localStorage.getItem(`user_default_salary_${data.user.id}`);
  const userSalary = userSalaryMeta ? Number(userSalaryMeta) : savedLocalSalary ? Number(savedLocalSalary) : 2500;

  // Se o usuário fez login com sucesso, tentamos rodar o seed inicial caso seja a primeira vez dele
  try {
    await seedUserIfNeeded(data.user.id, userSalary);
  } catch (err) {
    console.error("Erro ao verificar/rodar seed do usuário:", err);
  }

  return {
    token: data.session?.access_token || `supabase-session-${data.user.id}`,
    user: {
      id: data.user.id,
      name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || email.split("@")[0],
      email: data.user.email || email,
      defaultSalary: userSalary,
    },
  };
}

export async function signOutSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// --- DATA SEEDING (Idempotent initial data for new user accounts) ---

export async function seedUserIfNeeded(userId: string, initialSalary?: number) {
  // 1. Check if the user is already seeded in 'user_seeded' table
  const { data: seedCheck, error: checkError } = await supabase
    .from("user_seeded")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (checkError) {
    console.warn("Aviso ao checar user_seeded (tabela pode não existir):", checkError);
    return;
  }

  if (seedCheck) {
    // Already seeded, do nothing
    return;
  }

  console.log(`Iniciando seed de dados iniciais para o usuário Supabase: ${userId}`);

  // 1.5. Inserir CATEGORIAS padrão para este usuário
  const defaultCategories = [
    "Moradia",
    "Alimentação",
    "Transporte",
    "Lazer",
    "Tecnologia",
    "Saúde",
    "Família",
    "Outros"
  ];
  const categoryRows = defaultCategories.map((name) => ({
    user_id: userId,
    name,
  }));

  try {
    const { error: catErr } = await supabase
      .from("categories")
      .insert(categoryRows);
    if (catErr) {
      console.error("Erro ao inserir categorias de seed no Supabase:", catErr);
    }
  } catch (err) {
    console.error("Falha ao semear categorias:", err);
  }

  // 2. Insert INITIAL_BUDGETS for this user (customized with chosen initial salary if given)
  const salaryToUse = typeof initialSalary === "number" && initialSalary > 0 ? initialSalary : 2500;
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const budgetEntries: Record<string, number> = {
    ...INITIAL_BUDGETS,
    [currentMonthStr]: salaryToUse,
  };

  // Pre-seed also next 6 months with the base salary
  for (let i = 0; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    budgetEntries[mStr] = salaryToUse;
  }

  const budgetRows = Object.entries(budgetEntries).map(([month, amount]) => ({
    user_id: userId,
    month,
    amount,
  }));

  if (budgetRows.length > 0) {
    const { error: budgetErr } = await supabase
      .from("budgets")
      .insert(budgetRows);
    if (budgetErr) {
      console.error("Erro ao inserir orçamentos de seed no Supabase:", budgetErr);
    }
  }

  // 3. Insert INITIAL_TRANSACTIONS for this user
  const transactionRows = INITIAL_TRANSACTIONS.map((t) => {
    const row = mapToSupabase(t, userId);
    row.seed_key = t.id; // Chave única para evitar duplicados caso o script rode de novo
    return row;
  });

  if (transactionRows.length > 0) {
    const { error: transErr } = await supabase
      .from("transactions")
      .insert(transactionRows);
    if (transErr) {
      console.error("Erro ao inserir transações de seed no Supabase:", transErr);
    }
  }

  // 4. Mark user as seeded to prevent doing it again
  const { error: markErr } = await supabase
    .from("user_seeded")
    .insert({ user_id: userId });

  if (markErr) {
    console.error("Erro ao marcar usuário como seeded no Supabase:", markErr);
  }

  console.log("Seed concluído com sucesso para o usuário!");
}

// --- CATEGORY OPERATIONS ---

export async function getSupabaseCategories(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    console.warn("Erro ao buscar categorias do Supabase:", error);
    return [];
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map((c: any) => c.name);
}

export async function addSupabaseCategory(userId: string, name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("O nome da categoria não pode ser vazio.");
  
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: trimmed })
    .select()
    .single();

  if (error) throw error;
  return data.name;
}

export async function deleteSupabaseCategory(userId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("user_id", userId)
    .eq("name", name);

  if (error) throw error;
}

// --- TRANSACTION OPERATIONS ---

export async function getSupabaseTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  const mapped = (data || []).map(mapFromSupabase);
  return mapped.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

export async function addSupabaseTransaction(userId: string, t: Omit<Transaction, "id"> & { id?: string }): Promise<Transaction> {
  const row = mapToSupabase(t, userId);
  const { data, error } = await supabase
    .from("transactions")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapFromSupabase(data);
}

export async function addSupabaseTransactionsBatch(userId: string, list: (Omit<Transaction, "id"> & { id?: string })[]): Promise<Transaction[]> {
  const rows = list.map(t => mapToSupabase(t, userId));
  const { data, error } = await supabase
    .from("transactions")
    .insert(rows)
    .select();

  if (error) throw error;
  return (data || []).map(mapFromSupabase);
}

export async function updateSupabaseTransaction(userId: string, id: string, updates: Partial<Transaction>): Promise<Transaction> {
  // Convert updates fields to snake_case if they exist
  const rowUpdates: any = {};
  if (updates.description !== undefined) rowUpdates.description = updates.description;
  if (updates.amount !== undefined) rowUpdates.amount = updates.amount;
  if (updates.date !== undefined) rowUpdates.date = updates.date;
  if (updates.type !== undefined) rowUpdates.type = updates.type;
  if (updates.tableSection !== undefined) rowUpdates.table_section = updates.tableSection;
  if (updates.category !== undefined) rowUpdates.category = updates.category;
  if (updates.isOrangeHighlight !== undefined) rowUpdates.is_orange_highlight = updates.isOrangeHighlight;
  if (updates.isDiscount !== undefined) rowUpdates.is_discount = updates.isDiscount;
  if (updates.note !== undefined) rowUpdates.note = updates.note;

  const { data, error } = await supabase
    .from("transactions")
    .update(rowUpdates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return mapFromSupabase(data);
}

export async function deleteSupabaseTransaction(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteSupabaseTransactionsBatch(userId: string, ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", ids)
    .eq("user_id", userId);

  if (error) throw error;
}

// --- BUDGET OPERATIONS ---

export async function getSupabaseBudgets(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("budgets")
    .select("month, amount")
    .eq("user_id", userId);

  if (error) throw error;

  const budgets: Record<string, number> = {};
  (data || []).forEach((b: any) => {
    budgets[b.month] = parseFloat(b.amount) || 0;
  });
  return budgets;
}

export async function setSupabaseBudget(userId: string, month: string, amount: number): Promise<void> {
  // Check if budget exists to either update or insert
  const { data: existing, error: fetchErr } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing) {
    const { error: updateErr } = await supabase
      .from("budgets")
      .update({ amount })
      .eq("id", existing.id);
    if (updateErr) throw updateErr;
  } else {
    const { error: insertErr } = await supabase
      .from("budgets")
      .insert({
        user_id: userId,
        month,
        amount,
      });
    if (insertErr) throw insertErr;
  }
}

// --- SALARY / DEFAULT BUDGET SETTINGS ---

export async function getUserDefaultSalary(userId: string): Promise<number> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.user_metadata?.default_salary) {
      return Number(data.user.user_metadata.default_salary);
    }
  } catch (err) {
    console.warn("Could not fetch user metadata for salary:", err);
  }

  const saved = localStorage.getItem(`user_default_salary_${userId}`);
  if (saved) {
    return Number(saved) || 2500;
  }
  return 2500;
}

export async function updateUserDefaultSalary(
  userId: string,
  newSalary: number,
  applyFromMonth?: string
): Promise<Record<string, number>> {
  const cleanSalary = typeof newSalary === "number" && !isNaN(newSalary) && newSalary > 0 ? newSalary : 2500;
  
  // 1. Save in user_metadata
  try {
    await supabase.auth.updateUser({
      data: {
        default_salary: cleanSalary,
      },
    });
  } catch (err) {
    console.warn("Aviso ao atualizar user_metadata:", err);
  }

  // 2. Save in localStorage
  localStorage.setItem(`user_default_salary_${userId}`, String(cleanSalary));

  // 3. If applyFromMonth is passed, update/insert budgets for this month and next 12 months
  const updatedBudgetsMap: Record<string, number> = {};
  if (applyFromMonth) {
    try {
      const [yearStr, monthStr] = applyFromMonth.split("-");
      const baseYear = parseInt(yearStr, 10);
      const baseMonth = parseInt(monthStr, 10);

      const budgetPromises = [];
      for (let i = 0; i <= 12; i++) {
        const d = new Date(baseYear, baseMonth - 1 + i, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        updatedBudgetsMap[mKey] = cleanSalary;
        budgetPromises.push(
          setSupabaseBudget(userId, mKey, cleanSalary).catch((e) =>
            console.warn(`Aviso ao atualizar orçamento do mês ${mKey}:`, e)
          )
        );
      }
      await Promise.all(budgetPromises);
    } catch (err) {
      console.error("Erro ao propagar orçamento para meses futuros no Supabase:", err);
    }
  }

  return updatedBudgetsMap;
}

