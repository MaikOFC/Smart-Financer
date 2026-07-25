-- =========================================================================
-- ESQUEMA COMPLETO E UNIFICADO PARA O SUPABASE (3 TABELAS SEPARADAS + EXTRAS)
-- =========================================================================
-- Este script limpa o banco de dados antigo e cria a estrutura profissional
-- com tabelas dedicadas para Usuários, Categorias, Lançamentos e Orçamentos.
-- Ele implementa políticas seguras de Row Level Security (RLS) e sincroniza
-- automaticamente novos cadastros com o Supabase Auth.

-- 1. LIMPEZA SEGURA DE TABELAS EXISTENTES (Evita conflitos)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.user_seeded CASCADE;

-- =========================================================================
-- TABELA 1: USUÁRIOS PÚBLICOS (users)
-- =========================================================================
-- Armazena os dados públicos dos usuários vinculados ao auth.users do Supabase
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Qualquer um autenticado pode ler os perfis de usuários"
ON public.users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem gerenciar seu próprio perfil"
ON public.users FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Trigger para automatizar a criação do perfil público ao se registrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================================
-- TABELA 2: CATEGORIAS PERSONALIZADAS (categories)
-- =========================================================================
-- Armazena as categorias de cada usuário, permitindo criação dinâmica de novos itens
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_category_name UNIQUE (user_id, name)
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários podem gerenciar suas próprias categorias"
ON public.categories FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- =========================================================================
-- TABELA 3: LANÇAMENTOS / TRANSAÇÕES (transactions)
-- =========================================================================
-- Armazena as receitas e despesas de forma detalhada
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    date VARCHAR(10) NOT NULL, -- Formato: 'YYYY-MM-DD'
    type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
    table_section VARCHAR(20) NOT NULL CHECK (table_section IN ('left', 'right', 'bottom_left')),
    category VARCHAR(100) NOT NULL DEFAULT 'Outros', -- Nome da categoria (sincronizada com tabela categories)
    is_orange_highlight BOOLEAN NOT NULL DEFAULT FALSE,
    is_discount BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT DEFAULT NULL,
    seed_key VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_seed_key UNIQUE (user_id, seed_key)
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários podem gerenciar suas próprias transações"
ON public.transactions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- =========================================================================
-- TABELA ADICIONAL: ORÇAMENTOS MENSAIS (budgets)
-- =========================================================================
-- Armazena o teto de gastos/planejamento de cada mês
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Formato: 'YYYY-MM'
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_month_budget UNIQUE (user_id, month)
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários podem gerenciar seus próprios orçamentos"
ON public.budgets FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- =========================================================================
-- TABELA ADICIONAL: CONTROLE DE SEED (user_seeded)
-- =========================================================================
-- Evita a duplicação de dados de exemplo no primeiro login do usuário
CREATE TABLE public.user_seeded (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    seeded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.user_seeded ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários podem ver seu próprio status de seed"
ON public.user_seeded FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Usuários podem marcar seu próprio seed"
ON public.user_seeded FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());


-- =========================================================================
-- ÍNDICES DE PERFORMANCE (Acelera as buscas do app)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_supabase_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_supabase_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_supabase_budgets_user ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_supabase_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_supabase_transactions_date ON public.transactions(user_id, date);
