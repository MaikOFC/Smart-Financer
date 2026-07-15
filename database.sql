-- ==========================================
-- SCRIPT SQL PARA CRIAÇÃO DO BANCO DE DADOS
-- ==========================================
-- Este script foi projetado para PostgreSQL (compatível com Supabase, Neon, etc.)
-- Ele cria a estrutura de tabelas necessárias para gerenciar múltiplos usuários,
-- suas respectivas transações financeiras e orçamentos mensais.

-- 1. TABELA DE USUÁRIOS (Sistema de Login e Registro)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização de busca de usuários por e-mail
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. TABELA DE ORÇAMENTOS (Budgets por Usuário e Mês)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Formato: 'YYYY-MM' (ex: '2026-07')
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Garante que cada usuário tenha apenas um orçamento registrado por mês
    CONSTRAINT unique_user_month_budget UNIQUE (user_id, month)
);

-- Índice para carregamento rápido dos orçamentos do usuário logado
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);

-- 3. TABELA DE TRANSAÇÕES (Gastos Mensais, Compras Especiais e Parcelas)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Índices para otimizar a filtragem por usuário, seção de tabela e data
CREATE INDEX IF NOT EXISTS idx_transactions_user_section ON transactions(user_id, table_section);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);

-- ==========================================
-- EXEMPLOS DE CONSULTAS ÚTEIS (DQL)
-- ==========================================

-- A. Selecionar todas as transações de Julho/2026 para o usuário 'X'
-- SELECT * FROM transactions 
-- WHERE user_id = 'USER_UUID_HERE' 
--   AND date LIKE '2026-07%' 
--   AND table_section != 'bottom_left';

-- B. Calcular soma de despesas da Tabela Esquerda (descontando deduções) para o usuário 'X' em Julho/2026
-- SELECT COALESCE(SUM(CASE WHEN is_discount THEN -amount ELSE amount END), 0) AS total_esquerda
-- FROM transactions
-- WHERE user_id = 'USER_UUID_HERE'
--   AND date LIKE '2026-07%'
--   AND table_section = 'left';

-- C. Calcular total restante de parcelas (Tabela Inferior) para o usuário 'X' a partir de Julho/2026
-- SELECT COALESCE(SUM(amount), 0) AS total_parcelas
-- FROM transactions
-- WHERE user_id = 'USER_UUID_HERE'
--   AND table_section = 'bottom_left';
