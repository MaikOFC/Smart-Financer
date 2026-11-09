# Correção da Lógica Financeira: Separação de Ganhos Extras e Despesas Reais

Ajuste estrutural da modelagem financeira e exibição no **SmartFinancer**, corrigindo o cálculo que causava despesas negativas ao registrar um ganho extra. As despesas diretas passam a contabilizar exclusivamente gastos reais (sempre $\ge 0$), enquanto os ganhos extras são somados à receita total do mês, aumentando o saldo livre disponível (sobra) e aparecendo em uma seção visual própria com destaque positivo em verde.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisões confirmadas pelo usuário na Fase 1:
> - **Card de Receitas**: Somar os ganhos extras ao orçamento base, exibindo a receita total líquida do mês (com detalhamento no subtítulo: `Orçamento + R$ X em ganhos extras`).
> - **Exibição de Ganhos nas Listas**: Apresentar os itens de ganho em destaque visual positivo verde, separados das despesas de consumo, com valor precedido por `+ R$` e totalizador próprio.

---

## 1. Overview & Core Concept

- **Problema resolvido**: Anteriormente, ao cadastrar um ganho (marcado com `isDiscount`), a fórmula de despesas subtraía o valor das despesas diretas (`directLeftExpensesTotal`), fazendo com que o card exibisse valores negativos como `R$ -230,00` quando os ganhos superavam as despesas do mês.
- **Comportamento correto**:
  1. **Despesas Diretas**: Somam estritamente gastos e contas de consumo reais (`!t.isDiscount`). Nunca ficam negativas.
  2. **Ganhos Extras**: Somam todas as entradas e bonificações adicionais do mês (`t.isDiscount`).
  3. **Receita Total do Mês**: `Orçamento Base + Ganhos Extras`.
  4. **Saldo Livre (Sobra)**: `Receita Total - (Despesas Diretas + Parcelas Ativas)`. O ganho extra cumpre seu papel exato: aumenta a sobra disponível sem adulterar o total real gasto no mês.

---

## 2. User Experience & Visual Design

### 1. Dashboard e Cards de Métricas (`MetricCards.tsx`)
- **Card "Despesas Diretas"**: Exibe estritamente o valor somado das contas de consumo (positivo). No cenário atual do usuário (sem contas diretas e ganho de R$ 230), exibirá `R$ 0,00` em vez de `R$ -230,00`.
- **Card "Receitas"**: Exibe a soma total do orçamento previsto com os ganhos extras do mês (`activeBudget + currentMonthGainsTotal`). Subtítulo dinâmico:
  - Se houver ganhos: `"Orçamento + R$ 230,00 em ganhos"`
  - Sem ganhos: `"Orçamento previsto"`
- **Card Principal "Saldo Livre Disponível"**:
  - A sobra reflete exatamente: `Receitas Totais - Gastos Totais`.
  - A barra de progresso de consumo calcula `% comprometida = Gastos Totais / Receita Total`, refletindo com precisão a ampliação da margem de sobra graças aos ganhos adicionados.

### 2. Modais e Listas de Gastos do Mês (`HomeSectionTabs.tsx` e `FocusedSectionModal.tsx`)
- Criação de uma seção destacada no topo ou rodapé da listagem: **"Ganhos Extras do Mês"**.
- Estilização com card verde esmeralda translúcido (`bg-emerald-500/10 border-emerald-500/25`), ícone `TrendingUp`, valor em `+ R$ 230,00` e totalizador próprio.
- As despesas diretas permanecem em sua lista habitual com valores em vermelho/rosa e totais limpos.

---

## 3. Key Product Decisions & Trade-Offs

- **Não Abater os Ganhos das Despesas**:
  - *Decisão*: Ganhos extras pertencem ao fluxo de entradas (Receitas), não de saídas (Despesas). Abater ganhos dentro de despesas distorcia relatórios, gráficos de categorias e índices de consumo.
  - *Vantagem*: Clareza contábil idêntica a aplicativos bancários modernos (Nubank, Guiabolso, Mobills).
- **Retrocompatibilidade com a base existente**:
  - *Decisão*: Manter o campo `isDiscount` no banco de dados e tipos para representar itens de ganho/desconto na tabela, apenas alterando as funções redutoras e agregadoras para somar receitas e manter despesas estritas.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Transações do Mês                    │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│  Despesas Reais (!isDiscount)││   Ganhos Extras (isDiscount) │
│      (Contas de consumo)     ││   (Bonificações / Entradas)  │
└───────────────┬──────────────┘└──────────────┬───────────────┘
                │                              │
                │ (soma)                       │ (soma)
                ▼                              ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│ directLeftExpensesTotal      ││   currentMonthGainsTotal     │
│ (Sem valores negativos: ≥ 0) ││                              │
└───────────────┬──────────────┘└──────────────┬───────────────┘
                │                              │
                │ + Parcelas do mês            │ + Orçamento Base
                ▼                              ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│ leftExpensesTotal (Gastos)   ││ totalMonthlyIncomes (Receita)│
└───────────────┬──────────────┘└──────────────┬───────────────┘
                │                              │
                └──────────────┬───────────────┘
                               │ Receita - Gastos
                               ▼
                ┌──────────────────────────────┐
                │   Saldo Livre / Sobra Real   │
                │  (Aumenta com os ganhos)     │
                └──────────────────────────────┘
```

### Arquivos e Componentes Afetados
- `src/App.tsx`:
  - Cálculo de `directLeftExpensesTotal`, `currentMonthGainsTotal`, `totalMonthlyIncomes` e `sobra`.
  - Passagem das novas propriedades para `MetricCards`.
- `src/components/MetricCards.tsx`:
  - Exibição de `totalMonthlyIncomes` no Card 1 com subtítulo indicativo dos ganhos adicionados.
  - Exibição de `directExpensesTotal` no Card 2 garantindo valor $\ge 0$.
- `src/components/HomeSectionTabs.tsx` e `src/components/FocusedSectionModal.tsx`:
  - Separação da lista de Despesas e da seção de Ganhos Extras do Mês com estilo esmeralda positivo.
- `src/components/TransactionTable.tsx`:
  - Ajuste na tabela de despesas para exibir o total de despesas reais e total de ganhos destacados.
- `src/components/FinanceCharts.tsx`:
  - Ajuste no cálculo de superávit e despesas do mês nos gráficos.
