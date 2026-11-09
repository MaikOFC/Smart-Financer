# Redesign Fintech Minimalista Premium (Estilo Apple & Nubank Ultravioleta)

Proposta de reformulação da tela inicial e dos cartões de métricas financeiras do SmartFinancer, elevando a identidade visual para um padrão refinado, minimalista e premium, inspirado na elegância de produtos como Apple Card e Nubank Ultravioleta.

### Decisões do Usuário & Alinhamento

> [!IMPORTANT]
> As seguintes escolhas foram alinhadas na etapa de questionamento interativo:
> - **Estilo Visual**: Fintech Minimalista Premium com estética escura sofisticada (tons de obsidiana, reflexos metálicos suaves e acabamentos em vidro fosco sutil).
> - **Foco de Reformulação**: Tela inicial, cartão mestre de saldo (Hero Card) e os 4 cartões de divisão financeira (Receitas, Despesas, Parcelas e Metas).

---

### 1. Visão Geral & Conceito Visual

Transformar o primeiro contato do usuário com o aplicativo em uma experiência executiva e tranquila. Em vez de blocos pesados ou excesso de cores chamativas, a interface passa a respirar com uma hierarquia tipográfica impecável, acabamentos metálicos discretos e foco total nos números que importam.

- **Público-Alvo**: Usuários que buscam clareza mental e controle financeiro diário com uma sensação de sofisticação e segurança.
- **Valor Principal**: Visualização instantânea da saúde financeira em menos de 3 segundos, sem ruído visual ou poluição gráfica.

---

### 2. Experiência do Usuário & Design System (Frontend Design)

#### A. O Novo Cartão Mestre de Saldo (Ultraviolet & Obsidian Card)
- **Superfície & Textura**:
  - Fundo em tom escuro profundo (`#0b0f17` a `#111726`) com uma borda superior ultrafina com brilho metálico (*hairline gradient* em tons de esmeralda e ultravioleta discreto).
  - Ausência de gradientes pesados ou neon brilhante: o luxo vem da precisão das margens e da pureza da tipografia.
- **Hierarquia de Números**:
  - Saldo livre apresentado em escala tipográfica grande com a fonte **Outfit** e alinhamento monoespaçado tabular (`font-mono tabular-nums`), evitando qualquer pulo de layout nas animações.
  - O seletor de privacidade (olhinho) e o botão de ajuste rápido integrados discretamente no canto superior direito como botões táteis elegantes.
- **Barra de Saúde Financeira**:
  - Substituição de barras grossas por uma barra de consumo ultrafina (4px de altura) com cantos perfeitamente arredondados e transições de cor sutis (indigo para comprometido e esmeralda para livre).

#### B. Grid Bento dos 4 Cartões de Apoio
1. **Receitas Previstas**:
   - Ícone geométrico sutil em verde esmeralda com fundo translúcido suave (`bg-emerald-500/8`).
   - Rótulo superior limpo, valor formatado e indicação sutil de edição.
2. **Despesas Diretas (Consumo & Essenciais)**:
   - Acento refinado em rosa queimado/carmesim suave (`bg-rose-500/8`).
   - Mostra o total de gastos do mês sem poluição.
3. **Parcelas do Mês (Cartões de Crédito)**:
   - Acento inspirado no Nubank Ultravioleta em roxo nobre translúcido (`bg-purple-500/8`).
   - Indica a quantidade de parcelas ativas no mês.
4. **Metas & Reservas Financeiras**:
   - Acento em dourado champanhe/âmbar discreto (`bg-amber-500/8`).
   - Exibe o progresso de metas e planos futuros.

#### C. Microinterações & Toque
- Efeito de profundidade com elevação tátil suave ao tocar ou passar o mouse (`active:scale-[0.98] transition-all`).
- Modo de privacidade uniforme: todos os 5 cartões ocultam valores com efeito de desfoque elegante (*blur*) instantâneo.

---

### 3. Decisões de Arquitetura & Implementação

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MetricCards Component                           │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  MASTER HERO CARD (Obsidian & Metal Finish)                      │  │
│  │  • Hairline metálico superior (1px)                              │  │
│  │  • Rótulo "Saldo Livre Disponível" + Status Pill Discreto        │  │
│  │  • R$ 443,00 (Outfit Tabular, tamanho destacado)                 │  │
│  │  • Barra de progresso minimalista (4px)                          │  │
│  │  • Botões discretos: [Privacidade] [Ajustar Orçamento]           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────── BENTO GRID (4 CARDS) ────────────────────────┐  │
│  │ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌───────┐ │  │
│  │ │ Receitas       │ │ Despesas       │ │ Parcelas (TWA) │ │ Metas │ │  │
│  │ │ R$ 1.000,00    │ │ R$ 195,00      │ │ R$ 362,00      │ │ R$ 1k │ │  │
│  │ │ Emerald Accent │ │ Rose Accent    │ │ Violet Accent  │ │ Amber │ │  │
│  │ └────────────────┘ └────────────────┘ └────────────────┘ └───────┘ │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Arquivos Impactados**:
  - `src/components/MetricCards.tsx`: Implementação da nova estrutura visual, cartões bento e animações de número.
  - `src/components/AnimatedNumber.tsx`: Ajustes de renderização suave sem recortes.
  - Preservação de todos os handlers de clique (ajuste de orçamento, abertura de gastos, abertura de parcelas e metas).

---

### 4. Plano de Execução (Após Aprovação)

1. **Refatoração do Master Hero Card em `MetricCards.tsx`**:
   - Aplicar a nova paleta escura obsidiana com hairline metálico superior.
   - Refinar a barra de consumo para o formato ultrafino minimalista.
   - Ajustar o tamanho e espaçamento do saldo principal e dos botões de controle.
2. **Atualização do Grid Bento dos 4 Cartões**:
   - Padronizar os fundos translúcidos e bordas em 1px suave (`border-slate-800/80 hover:border-slate-700`).
   - Aplicar as cores de acento sutis (Emerald, Rose, Ultraviolet, Amber).
3. **Verificação & Teste**:
   - Testar modos claro e escuro, modo de privacidade e responsividade no mobile.
   - Executar `lint_applet` e `compile_applet`.
