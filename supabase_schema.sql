-- =====================================================================
-- SCRIPT SQL PARA SUPABASE (TABELAS, RLS E POLICIES DE SEGURANÇA)
-- =====================================================================
-- Este script foi projetado especificamente para o Supabase.
-- Ele integra o sistema diretamente com o `auth.users` gerenciado pelo Supabase.

-- 1. TABELA DE ORÇAMENTOS (budgets)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Formato: 'YYYY-MM' (ex: '2026-07')
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Impede a duplicidade de orçamentos para um mesmo mês do usuário
    CONSTRAINT unique_user_month_budget UNIQUE (user_id, month)
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Seguro (RLS Policies) para Budgets
CREATE POLICY "Usuários podem gerenciar seus próprios orçamentos" 
ON public.budgets
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- 2. TABELA DE TRANSAÇÕES (transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    date VARCHAR(10) NOT NULL, -- Formato: 'YYYY-MM-DD' (ex: '2026-07-15')
    type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
    table_section VARCHAR(20) NOT NULL CHECK (table_section IN ('left', 'right', 'bottom_left')),
    category VARCHAR(50) DEFAULT 'Outros',
    is_orange_highlight BOOLEAN NOT NULL DEFAULT FALSE,
    is_discount BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Seguro (RLS Policies) para Transações
CREATE POLICY "Usuários podem gerenciar suas próprias transações" 
ON public.transactions
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- 3. TABELA DE CONTROLE DE SEED (Idempotência para dados iniciais)
CREATE TABLE IF NOT EXISTS public.user_seeded (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    seeded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.user_seeded ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Seguro (RLS Policies) para User Seeded
CREATE POLICY "Usuários podem ver seu próprio status de seed" 
ON public.user_seeded
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem marcar seu próprio seed" 
ON public.user_seeded
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Índices adicionais para otimização extrema de performance no Supabase
CREATE INDEX IF NOT EXISTS idx_supabase_budgets_user ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_supabase_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_supabase_transactions_date ON public.transactions(user_id, date);
