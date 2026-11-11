# Metas com Imagens (Busca Web e Upload) e Total Geral de Gastos na Tela Inicial

Implementação de recurso completo de fotos nos itens de **Metas & Planejamento** (permitindo buscar imagens reais na internet estilo WhatsApp ou fazer upload de fotos da galeria/câmera, exibidas como miniaturas elegantes à esquerda do título) e consolidação do card de gastos da tela inicial para exibir a soma real de todas as despesas do mês (contas diretas + parcelas ativas) sem qualquer interferência de ganhos extras.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisões confirmadas pelo usuário na Fase 1:
> - **Busca de Fotos**: Busca de fotos reais na internet com integração web de alta qualidade via endpoint seguro no servidor (`/api/images/search`).
> - **Posicionamento**: Miniatura quadrada arredondada (squircle) à esquerda do título do item nos cards de Metas & Planejamento.
> - **Opções de Imagem**: Escolha flexível no modal de adicionar/editar: buscar na internet por termo digitado ou fazer upload direto de arquivo do celular/computador.
> - **Card de Despesas da Tela Inicial**: O Card 2 da tela inicial passa a exibir o **Total de Gastos do Mês** somando contas de consumo + parcelas ativas devidas no mês (ex: R$ 1,00 de conta + R$ 230,00 de parcela = R$ 231,00), sem ser reduzido pelos ganhos extras.

---

## 1. Overview & Core Concept

- **Imagens em Metas e Planejamento**: Metas financeiras (como comprar um carro, videogame, viagem, celular, notebook ou reforma) ganham um forte apelo visual motivacional. Ao cadastrar ou editar um item na seção de metas, o usuário pode digitar o nome e clicar em *"Buscar Foto na Web"* (abrindo uma grade de resultados com um toque para selecionar) ou enviar uma foto própria da sua galeria.
- **Card de Gastos do Mês Consistente**: Corrige o valor da tela inicial para que o usuário veja imediatamente quanto gastou no mês inteiro (contas diretas + parcelas), mantendo os ganhos extras restritos ao seu papel correto: somar às receitas e aumentar o saldo livre (sobra).

---

## 2. User Experience & Visual Design

### 1. Seletor de Imagem no Modal de Adicionar e Editar Meta
- No `AddTransactionModal` e `TransactionDetailModal` (quando a seção for Planejamento/Metas ou itens gerais):
  - Botão de ação visual: *"Adicionar Imagem"* com pré-visualização quando selecionada.
  - Duas abas ou opções táteis:
    1. **Pesquisar na Web**: Campo de busca inteligente pré-preenchido com a descrição da meta (ex: `"iPhone 16"`, `"PlayStation 5"`, `"Viagem Paris"`). Grade limpa de 3 colunas com miniaturas de fotos reais em alta definição. Toque em uma foto para selecionar com animação de checkmark verde esmeralda.
    2. **Fazer Upload**: Botão para selecionar imagem local do aparelho com compressão automática em formato otimizado e pré-visualização instantânea.
  - Opção de **Remover Foto** a qualquer momento.

### 2. Exibição da Miniatura nos Cards de Metas
- **Na aba Metas & Planejamento (`HomeSectionTabs.tsx`)**:
  - Cada item de meta exibe uma miniatura de 48×48px com cantos arredondados (`rounded-xl border border-slate-700/70 shadow-sm`), encaixada harmoniosamente à esquerda do título e categoria.
  - Se o item não tiver imagem personalizada, exibe um ícone temático limpo (ex: `Target` ou ícone de categoria).
- **No Modal de Foco de Metas (`FocusedSectionModal.tsx`)**:
  - Miniatura idêntica de 48×48px à esquerda do título para máxima consistência visual.
- **Na Tabela Completa (`TransactionTable.tsx`)**:
  - Miniatura de 36×36px ao lado do nome do item no planejamento.
- **No Modal de Detalhes (`TransactionDetailModal.tsx`)**:
  - Banner/imagem expandida em destaque para visualização completa da meta com opção de trocar ou remover.

### 3. Card 2 da Tela Inicial (`MetricCards.tsx`)
- Título: **"Despesas do Mês"** (com ícone `TrendingDown` em tom rubi/rosa).
- Valor Principal: Soma total de gastos reais do mês (`directExpensesTotal + monthlyInstallmentsTotal`).
- Subtítulo Dinâmico:
  - Se houver parcelas ativas: `"R$ X em contas + R$ Y em parcelas"`
  - Se houver apenas contas: `"Contas de consumo do mês"`
- Garante que mesmo adicionando ganhos de R$ 230,00, uma parcela de R$ 230,00 e uma conta de R$ 1,00, o card mostre **R$ 231,00** reais gastos no mês.

---

## 3. Key Product Decisions & Trade-Offs

- **Persistência Universal de Imagens (`imageUrl`)**:
  - *Decisão*: Salvar a URL da imagem no campo `imageUrl` do tipo `Transaction` e serializar como metadado seguro no campo `note` (`[img:URL]`) no Supabase/SQLite.
  - *Vantagem*: Garante que a foto do item funcione imediatamente e persista entre recarregamentos e dispositivos, mesmo se o banco remoto do usuário ainda não tiver a coluna `image_url` criada.
- **Serviço de Busca de Imagens no Servidor (`/api/images/search`)**:
  - *Decisão*: Criar uma rota proxy em `server.ts` que consulta fontes de fotos reais na web com imagens de alta resolução, filtrando fotos apropriadas e retornando miniaturas limpas sem exigir configuração de chaves de API pelo usuário.
  - *Vantagem*: Funcionamento instantâneo e zero-config para o usuário, idêntico ao seletor de fotos do WhatsApp.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│             Modal de Adição / Edição de Meta           │
│    (AddTransactionModal / TransactionDetailModal)      │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│   Pesquisa Web de Fotos   │   │  Upload de Foto Local    │
│  (GET /api/images/search) │   │  (Leitor File -> WebP)   │
└─────────────┬─────────────┘   └─────────────┬────────────┘
              │                               │
              └─────────────┬─────────────────┘
                            │ imageUrl
                            ▼
┌────────────────────────────────────────────────────────┐
│                Persistência de Dados                   │
│   (Transaction.imageUrl + fallback [img:URL] em note)  │
└───────────────────────────┬────────────────────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│HomeSectionTab│    │FocusedSection│     │TransactionTab│
│ (Miniatura)  │    │  (Miniatura) │     │  (Miniatura) │
└──────────────┘    └──────────────┘     └──────────────┘
```

### Component & File Mapping
- `src/types.ts`: Adição de `imageUrl?: string` na interface `Transaction`.
- `server.ts`: Rota `GET /api/images/search?q=termo` para consulta de fotos reais na internet.
- `src/lib/supabaseService.ts`: Mapeamento de `imageUrl` com fallback de persistência em `note` (`[img:URL]`).
- `src/components/AddTransactionModal.tsx`: Interface de escolha entre pesquisa web e upload com preview.
- `src/components/TransactionDetailModal.tsx`: Visualização e edição da foto da meta.
- `src/components/HomeSectionTabs.tsx` & `src/components/FocusedSectionModal.tsx`: Renderização da miniatura quadrada arredondada à esquerda do título.
- `src/components/MetricCards.tsx`: Ajuste do Card 2 para exibir `safeLeft` (total geral de gastos: contas + parcelas) com subtítulo descritivo.
