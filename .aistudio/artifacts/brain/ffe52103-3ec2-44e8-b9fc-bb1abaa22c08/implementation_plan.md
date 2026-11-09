# Recuperação de Senha por E-mail (SmartFinancer)

Implementação do fluxo seguro de recuperação de senha por e-mail diretamente na tela de autenticação, permitindo que os usuários redefinam sua senha através de um link de confirmação enviado para a sua caixa de entrada.

### Decisões do Usuário & Alinhamento

> [!IMPORTANT]
> As escolhas a seguir foram confirmadas na etapa de alinhamento interativo:
> - **Fluxo Escolhido**: Link por e-mail (*Magic Link / Password Reset Link*) para cadastrar uma nova senha com segurança.
> - **Posicionamento na UI**: Botão *"Esqueceu a senha?"* posicionado logo abaixo do campo de senha, alinhado à direita.

---

### 1. Visão Geral & Experiência do Usuário

O objetivo é proporcionar um processo de recuperação de acesso sem atritos, seguro e visualmente integrado ao design dark moderno do SmartFinancer.

- **Fluxo do Usuário**:
  1. O usuário está na tela de login e clica em **"Esqueceu a senha?"** abaixo do campo de senha.
  2. A tela transiciona suavemente para o modo **Recuperar Acesso**, solicitando o e-mail cadastrado (já pré-preenchido se o usuário começou a digitar).
  3. Ao clicar em **"Enviar Link de Recuperação"**, o sistema dispara o e-mail através do Supabase Auth (`resetPasswordForEmail`).
  4. Uma mensagem de confirmação clara é exibida, informando que as instruções foram enviadas e orientando a checar a caixa de entrada e a pasta de spam.
  5. Ao clicar no link recebido no e-mail, o app abre automaticamente no estado **"Redefinir Senha"**, permitindo definir a nova senha e confirmá-la.
  6. Ao salvar, a senha é atualizada no Supabase (`updateUser({ password })`), e o usuário é autenticado diretamente no painel.

---

### 2. Design Visual & Interface (Frontend Design)

- **Estilo & Consistência**:
  - Segue a paleta padrão do aplicativo: fundo em `slate-950` / `slate-900`, bordas suaves em `slate-800` e acentos em `indigo-500` / `emerald-500`.
  - Zero poluição visual: tipografia limpa, sem tags ou badges chamativas desnecessárias.
- **Micro-interações & Estados de Feedback**:
  - Feedback visual de envio com indicador de carregamento (`Loader2`).
  - Alerta de sucesso com botão para reenviar caso o e-mail demore a chegar.
  - Botão de retorno fácil **"Voltar ao Login"** em qualquer etapa.
  - Validação de senha mínima (mínimo de 6 caracteres) com comparação de confirmação em tempo real.

---

### 3. Decisões Técnicas & Arquitetura

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AuthScreen Component                            │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │   Modo: 'login'       │  "Esqueceu  │  Modo: 'forgot-password'   │  │
│  │   • E-mail            │  a senha?"  │  • E-mail para envio       │  │
│  │   • Senha             ├────────────►│  • Disparo via Supabase    │  │
│  │   • [Entrar]          │             │  • Confirmação em tela     │  │
│  └───────────────────────┘             └────────────────────────────┘  │
│             ▲                                        │                 │
│             │ "Voltar ao Login"                      │ Envio de e-mail │
│             │                                        ▼                 │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │  Modo: 'reset-password'│◄────────────┤  Link no E-mail (URL Hash) │  │
│  │  • Nova Senha         │  Clique no  │  #access_token=...         │  │
│  │  • Confirmar Senha    │  link de    │  &type=recovery            │  │
│  │  • [Salvar e Entrar]  │  recuperação│                            │  │
│  └───────────────────────┘             └────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Integração com Supabase Auth**:
  - Função `sendPasswordResetEmail(email: string)` utilizando `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })`.
  - Função `updateUserPassword(newPassword: string)` utilizando `supabase.auth.updateUser({ password: newPassword })`.
- **Detecção do Hash de Recuperação**:
  - Monitoramento de eventos de autenticação via `supabase.auth.onAuthStateChange((event) => ...)` para identificar o evento `PASSWORD_RECOVERY`, ou leitura direta do fragmento `#type=recovery` na URL ao inicializar.
- **Suporte ao Modo Servidor Local / Demo**:
  - Fallback suave caso o usuário esteja em ambiente local ou de demonstração, exibindo simulação amigável para que o fluxo funcione perfeitamente em qualquer cenário.

---

### 4. Próximos Passos de Execução (Após Aprovação)

1. **Serviço de Autenticação (`src/lib/supabaseService.ts`)**: Adicionar as funções auxiliares `sendPasswordResetEmail` e `updateUserPassword`.
2. **Componente de Login (`src/components/AuthScreen.tsx`)**:
   - Incluir o botão *"Esqueceu a senha?"* logo abaixo do campo de senha (alinhado à direita).
   - Adicionar as visões dinâmicas para `forgot-password` (solicitação) e `reset-password` (cadastro da nova senha).
   - Implementar escuta de eventos para URLs com token de recuperação.
3. **Validação & Teste de Compilação**: Executar `lint_applet` e `compile_applet` para assegurar integridade total do código.
