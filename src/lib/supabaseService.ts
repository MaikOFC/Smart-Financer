import { supabase } from "./supabase";
import { IncomeConfig, Transaction } from "../types";
import { INITIAL_TRANSACTIONS, INITIAL_BUDGETS } from "../initialData";
import { sanitizeIncomeConfig } from "../utils/incomeUtils";

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

  const rawNote = row.note ?? row["observação"] ?? row.observacao ?? row.nota ?? "";
  let parsedStartDate: string | undefined = row.start_date ?? row.data_inicio ?? undefined;
  let parsedTotalInstallments: number | undefined = row.total_installments ?? row.total_parcelas ?? undefined;
  let cleanedNote = rawNote;

  if (rawNote) {
    const metaMatch = rawNote.match(/\[meta:start=([0-9]{4}-[0-9]{2}),total=([0-9]+)\]/i);
    if (metaMatch) {
      if (!parsedStartDate) parsedStartDate = metaMatch[1];
      if (!parsedTotalInstallments) parsedTotalInstallments = parseInt(metaMatch[2], 10);
      cleanedNote = rawNote.replace(/\[meta:[^\]]+\]\s*/g, "").trim();
    }
  }

  let parsedImageUrl: string | undefined = row.image_url ?? row.imageUrl ?? undefined;
  if (cleanedNote && cleanedNote.includes("[img:")) {
    const imgMatch = cleanedNote.match(/\[img:([^\]]+)\]/i);
    if (imgMatch) {
      if (!parsedImageUrl) parsedImageUrl = imgMatch[1];
      cleanedNote = cleanedNote.replace(/\[img:[^\]]+\]\s*/g, "").trim();
    }
  }

  let parsedIsRecurring = !!(row.is_recurring ?? row.recorrente);
  if (cleanedNote && /\[recorrente\]/i.test(cleanedNote)) {
    parsedIsRecurring = true;
    cleanedNote = cleanedNote.replace(/\[recorrente\]\s*/gi, "").trim();
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
    note: cleanedNote,
    startDate: parsedStartDate,
    totalInstallments: parsedTotalInstallments,
    imageUrl: parsedImageUrl,
    isRecurring: parsedIsRecurring,
  };
}

// Convert a React camelCase Transaction to Supabase snake_case
export function mapToSupabase(t: Omit<Transaction, "id"> & { id?: string }, userId: string): any {
  let noteToSave = t.note ? String(t.note).trim() : "";

  // Remove stale tags first so they don't duplicate
  noteToSave = noteToSave
    .replace(/\[img:[^\]]+\]\s*/gi, "")
    .replace(/\[recorrente\]\s*/gi, "")
    .trim();

  // Se tiver imageUrl, codifica no campo note de forma segura (compatível sem alterar schema do Supabase)
  if (t.imageUrl && String(t.imageUrl).trim()) {
    const imgTag = `[img:${String(t.imageUrl).trim()}]`;
    noteToSave = noteToSave ? `${imgTag} ${noteToSave}` : imgTag;
  }

  const validSection: "left" | "right" | "bottom_left" =
    t.tableSection === "right" || t.tableSection === "bottom_left" ? t.tableSection : "left";

  // Se for despesa recorrente na seção "left", codifica [recorrente] no campo note de forma segura
  if (t.isRecurring && validSection === "left" && !t.isDiscount) {
    noteToSave = noteToSave ? `[recorrente] ${noteToSave}` : "[recorrente]";
  }

  // Se for parcela (bottom_left) e tiver startDate/totalInstallments, codifica no campo note de forma segura
  if (validSection === "bottom_left") {
    const startM = t.startDate ? t.startDate.substring(0, 7) : "";
    const totalInst = t.totalInstallments && t.totalInstallments > 0 ? t.totalInstallments : undefined;

    if (startM && totalInst && !noteToSave.includes("[meta:")) {
      const metaTag = `[meta:start=${startM},total=${totalInst}]`;
      noteToSave = noteToSave ? `${metaTag} ${noteToSave}` : metaTag;
    }
  }
  const validType: "expense" | "income" = t.type === "income" ? "income" : "expense";
  const rawDate = t.date ? String(t.date).trim() : "";
  const validDate = (rawDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const validAmount = typeof t.amount === "number" && Number.isFinite(t.amount) ? t.amount : parseFloat(String(t.amount)) || 0;

  const mapped: any = {
    user_id: userId,
    description: String(t.description || "").trim().slice(0, 255),
    amount: validAmount,
    date: validDate,
    type: validType,
    table_section: validSection,
    category: String(t.category || "Outros").trim().slice(0, 100) || "Outros",
    is_orange_highlight: !!t.isOrangeHighlight,
    is_discount: !!t.isDiscount,
    note: noteToSave || null,
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

export async function deleteSupabaseAccount(passwordPlain: string) {
  if (!passwordPlain || !passwordPlain.trim()) {
    throw new Error("Digite sua senha para confirmar a exclusão da conta.");
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const currentUser = userData?.user;
  if (userErr || !currentUser || !currentUser.email) {
    throw new Error("Sessão expirada ou usuário não encontrado. Faça login novamente.");
  }

  // 1. Confirma a senha atual no Supabase Auth antes de apagar qualquer dado
  const { data: verifyData, error: verifyErr } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password: passwordPlain,
  });

  if (verifyErr) {
    const msg = verifyErr.message.toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
      throw new Error("Senha incorreta. Verifique sua senha e tente novamente.");
    }
    throw new Error(verifyErr.message || "Não foi possível validar sua senha.");
  }

  const activeUid = verifyData?.user?.id || currentUser.id;
  const activeAccessToken = verifyData?.session?.access_token;

  // 2. Remove todos os dados do usuário nas tabelas públicas (protegido por RLS)
  const deleteSteps = [
    supabase.from("transactions").delete().eq("user_id", activeUid),
    supabase.from("budgets").delete().eq("user_id", activeUid),
    supabase.from("categories").delete().eq("user_id", activeUid),
    supabase.from("users").delete().eq("id", activeUid),
  ];

  const results = await Promise.all(deleteSteps);
  for (const res of results) {
    if (res.error) {
      throw new Error("Erro ao remover seus dados financeiros: " + res.error.message);
    }
  }

  // Tenta limpar controle de seed (caso a policy DELETE exista)
  try {
    await supabase.from("user_seeded").delete().eq("user_id", activeUid);
  } catch {
    // ignorar se a policy não estiver habilitada
  }

  // 3. Tenta remover o registro de autenticação em auth.users (via RPC segura ou endpoint admin no servidor)
  let deletedAuthUser = false;
  try {
    const { error: rpcErr } = await supabase.rpc("delete_own_user");
    if (!rpcErr) {
      deletedAuthUser = true;
    }
  } catch {
    // RPC opcional pode não estar instalada neste projeto
  }

  if (!deletedAuthUser && activeAccessToken) {
    try {
      const serverRes = await fetch("/api/supabase/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeAccessToken}`,
        },
        body: JSON.stringify({ password: passwordPlain }),
      });
      if (serverRes.status === 403) {
        const errBody = await serverRes.json().catch(() => ({}));
        throw new Error(errBody.error || "Senha incorreta.");
      }
    } catch (e: any) {
      if (e?.message?.includes("Senha incorreta")) {
        throw e;
      }
      // Segue se endpoint admin não estiver configurado com service role
    }
  }

  // 4. Limpa cache local vinculado ao usuário e encerra sessão
  try {
    localStorage.removeItem(`user_default_salary_${activeUid}`);
    localStorage.removeItem(`user_income_config_${activeUid}`);
  } catch {}

  try {
    await supabase.auth.signOut();
  } catch {}
}

// Envia link de recuperação de senha por e-mail via Supabase Auth
export async function sendPasswordResetEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      throw new Error("Muitas solicitações seguidas. Aguarde um minuto antes de solicitar novamente.");
    }
    throw error;
  }

  return { success: true };
}

// Atualiza a senha do usuário após entrar pelo link de recuperação
export async function updateUserPassword(newPasswordPlain: string) {
  if (!newPasswordPlain || newPasswordPlain.length < 6) {
    throw new Error("A nova senha deve conter pelo menos 6 caracteres.");
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPasswordPlain,
  });

  if (error) {
    throw error;
  }

  return data;
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
  const { data: sessionData } = await supabase.auth.getSession();
  const activeUserId = sessionData?.session?.user?.id;
  if (!activeUserId) {
    throw new Error("Sessão expirada ou não autenticada no banco de dados. Saia e entre novamente na sua conta.");
  }

  const row = mapToSupabase(t, activeUserId || userId);
  const { data, error } = await supabase
    .from("transactions")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return mapFromSupabase(data);
}

export async function addSupabaseTransactionsBatch(userId: string, list: (Omit<Transaction, "id"> & { id?: string })[]): Promise<Transaction[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const activeUserId = sessionData?.session?.user?.id;
  if (!activeUserId) {
    throw new Error("Sessão expirada ou não autenticada no banco de dados. Saia e entre novamente na sua conta.");
  }

  const rows = list.map(t => mapToSupabase(t, activeUserId || userId));
  const { data, error } = await supabase
    .from("transactions")
    .insert(rows)
    .select();

  if (error) throw error;
  return (data || []).map(mapFromSupabase);
}

export async function updateSupabaseTransaction(userId: string, id: string, updates: Partial<Transaction>): Promise<Transaction> {
  const { data: sessionData } = await supabase.auth.getSession();
  const activeUserId = sessionData?.session?.user?.id || userId;

  // Convert updates fields to snake_case if they exist (never include non-existent columns like image_url)
  const rowUpdates: any = {};
  if (updates.description !== undefined) rowUpdates.description = String(updates.description).trim().slice(0, 255);
  if (updates.amount !== undefined) rowUpdates.amount = Number(updates.amount) || 0;
  if (updates.date !== undefined) rowUpdates.date = String(updates.date || "").slice(0, 10);
  if (updates.type !== undefined) rowUpdates.type = updates.type === "income" ? "income" : "expense";
  if (updates.tableSection !== undefined) rowUpdates.table_section = updates.tableSection;
  if (updates.category !== undefined) rowUpdates.category = String(updates.category || "Outros").trim().slice(0, 100);
  if (updates.isOrangeHighlight !== undefined) rowUpdates.is_orange_highlight = !!updates.isOrangeHighlight;
  if (updates.isDiscount !== undefined) rowUpdates.is_discount = !!updates.isDiscount;

  if (updates.note !== undefined || updates.imageUrl !== undefined || updates.isRecurring !== undefined) {
    let baseNote = updates.note !== undefined ? String(updates.note || "") : "";
    let existingImgTag = "";
    let existingMetaTag = "";
    let existingRecurring = false;

    // Fetch existing note if any tag-backed field wasn't explicitly provided so we don't wipe tags
    if (updates.note === undefined || updates.imageUrl === undefined || updates.isRecurring === undefined) {
      try {
        const { data: existingRow } = await supabase
          .from("transactions")
          .select("note")
          .eq("id", id)
          .eq("user_id", activeUserId)
          .maybeSingle();
        const oldNote = existingRow?.note ? String(existingRow.note) : "";
        if (updates.note === undefined) {
          baseNote = oldNote;
        }
        const imgMatch = oldNote.match(/\[img:[^\]]+\]/i);
        if (imgMatch) existingImgTag = imgMatch[0];
        const metaMatch = oldNote.match(/\[meta:[^\]]+\]/i);
        if (metaMatch) existingMetaTag = metaMatch[0];
        existingRecurring = /\[recorrente\]/i.test(oldNote);
      } catch {
        // ignore
      }
    }

    // Clean old [img:...] and [recorrente] tags from baseNote
    let cleaned = baseNote
      .replace(/\[img:[^\]]+\]\s*/gi, "")
      .replace(/\[recorrente\]\s*/gi, "")
      .trim();

    // Preserve [meta:...] if it was on oldNote and missing in updates.note
    if (existingMetaTag && !cleaned.includes("[meta:")) {
      cleaned = cleaned ? `${existingMetaTag} ${cleaned}` : existingMetaTag;
    }

    const shouldBeRecurring =
      updates.isDiscount === true
        ? false
        : updates.isRecurring !== undefined
        ? !!updates.isRecurring
        : existingRecurring;

    if (shouldBeRecurring) {
      cleaned = cleaned ? `[recorrente] ${cleaned}` : "[recorrente]";
    }

    if (updates.imageUrl !== undefined) {
      const newUrl = String(updates.imageUrl || "").trim();
      if (newUrl) {
        cleaned = cleaned ? `[img:${newUrl}] ${cleaned}` : `[img:${newUrl}]`;
      }
    } else if (existingImgTag) {
      cleaned = cleaned ? `${existingImgTag} ${cleaned}` : existingImgTag;
    }

    rowUpdates.note = cleaned || null;
  }

  const { data, error } = await supabase
    .from("transactions")
    .update(rowUpdates)
    .eq("id", id)
    .eq("user_id", activeUserId)
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

// --- INCOME CONFIG (MENSALISTA / HORISTA) ---

export async function getUserIncomeConfig(userId: string, fallbackSalary?: number): Promise<IncomeConfig> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.user_metadata?.income_config) {
      const sanitized = sanitizeIncomeConfig(data.user.user_metadata.income_config, fallbackSalary);
      try {
        localStorage.setItem(`user_income_config_${userId}`, JSON.stringify(sanitized));
      } catch {}
      return sanitized;
    }
  } catch (err) {
    console.warn("Could not fetch user metadata for income_config:", err);
  }

  try {
    const saved = localStorage.getItem(`user_income_config_${userId}`);
    if (saved) {
      return sanitizeIncomeConfig(JSON.parse(saved), fallbackSalary);
    }
  } catch {}

  return sanitizeIncomeConfig(null, fallbackSalary);
}

export async function saveUserIncomeConfig(
  userId: string,
  config: IncomeConfig,
  monthlyBudgetsMap: Record<string, number>,
  updatedDefaultSalary?: number
): Promise<void> {
  const sanitized = sanitizeIncomeConfig(config, updatedDefaultSalary);

  // 1. Save immediately in localStorage
  try {
    localStorage.setItem(`user_income_config_${userId}`, JSON.stringify(sanitized));
    if (typeof updatedDefaultSalary === "number" && !isNaN(updatedDefaultSalary) && updatedDefaultSalary >= 0) {
      localStorage.setItem(`user_default_salary_${userId}`, String(updatedDefaultSalary));
    }
  } catch {}

  // 2. Persist in Supabase auth user_metadata (no extra DB table migration required)
  try {
    const metadataPayload: Record<string, any> = {
      income_config: sanitized,
    };
    if (typeof updatedDefaultSalary === "number" && !isNaN(updatedDefaultSalary) && updatedDefaultSalary > 0) {
      metadataPayload.default_salary = updatedDefaultSalary;
    }
    await supabase.auth.updateUser({
      data: metadataPayload,
    });
  } catch (err) {
    console.warn("Aviso ao salvar income_config no user_metadata:", err);
  }

  // 3. Persist monthly budget amounts to Supabase budgets table
  const entries = Object.entries(monthlyBudgetsMap || {});
  if (entries.length > 0) {
    await Promise.all(
      entries.map(([month, amount]) =>
        setSupabaseBudget(userId, month, amount).catch((e) =>
          console.warn(`Aviso ao atualizar orçamento do mês ${month}:`, e)
        )
      )
    );
  }
}


