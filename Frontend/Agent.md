# Agent — Frontend do Folha de Ponto

> **Para qualquer IA que for atuar aqui:** este documento é autocontido de propósito. Leia-o por completo antes de tocar em qualquer arquivo. Ele complementa o contexto geral em [../Agent.md](../Agent.md) e os detalhes de backend em [../Backend/Agent.md](../Backend/Agent.md) — leia os dois também, mas **este arquivo é a fonte da verdade sobre o frontend**.

Última atualização desta especificação: **19/10/2026**.

---

## 1. Objetivo do sistema (visão de produto)

O **Folha de Ponto** é uma aplicação de apoio ao processamento de **folhas de ponto físicas assinadas**, digitalizadas em PDF, no contexto administrativo/acadêmico da **Universidade do Distrito Federal Professor Jorge Amaury Maia Nunes**.

O problema: todos os meses chegam dezenas/centenas de PDFs digitalizados, misturados, com nomes inconsistentes, e alguém precisa identificar de quem é cada folha, a qual mês/ano (competência) ela pertence, renomear, organizar em pastas e enviar por e-mail. Isso é manual, repetitivo e sujeito a erro.

O sistema automatiza esse ciclo:

1. O usuário envia **planilhas Excel de referência** (cadastro de servidores e calendário acadêmico).
2. O usuário envia **um ou mais PDFs** de folhas de ponto digitalizadas.
3. O backend aplica **OCR** e extrai os campos necessários.
4. Cruza os dados extraídos com as planilhas de referência para identificar **servidor** e **competência (mês/ano)**.
5. Organiza os arquivos em diretórios por competência (ex.: `Folhas_YYYY-MM/`), com nome seguro (ex.: `Nome_do_servidor-YYYY-MM.pdf`).
6. **Envia os documentos por e-mail** via SMTP.
7. O usuário **valida no frontend** os dados lidos antes de concluir, corrige o que estiver errado e acompanha o resultado.

### Restrições de escopo (valem para o projeto inteiro)

- Processamento **local/interno da instituição**. **Sem** banco de dados em nuvem, **sem** armazenamento externo, **sem** serviços de terceiros.
- **Sem tela de login e sem autenticação** nesta fase. Não crie login, cadastro, sessão ou controle de acesso.
- As folhas de ponto são **exclusivamente PDF**. Planilhas Excel são apenas **dados de referência** (calendário/cadastro), nunca folhas de ponto.
- Segredos (SMTP etc.) ficam em variáveis de ambiente. **Nunca** no repositório, nunca no frontend.

---

## 2. Arquitetura

```
Navegador (React + Vite)  ──HTTP/JSON──▶  FastAPI (Python)  ──▶  OCR
        │                                      │
        │                                      ├─▶ planilhas Excel (referência)
        │                                      ├─▶ sistema de arquivos (PDFs organizados)
        │                                      └─▶ SMTP (e-mail)
        └── usuário faz upload / valida / acompanha
```

### Backend (FastAPI/Python) — o que existe hoje

| Área | Arquivo | Situação |
|---|---|---|
| Inicialização | `Backend/Main.py` | Registra routers; **atualmente quebrado** (importa `Backend.lib.*`, que não existe) |
| Servidores | `Backend/routes/Servidores.py` | `GET/POST/PUT /servidores` — stubs que retornam mensagem fixa |
| Excel | `Backend/routes/Excel.py` | `POST /` recebe `.xls/.xlsx`, valida extensão, delega ao extrator |
| PDFs/OCR | `Backend/routes/Arquivo.py` | **vazio** — placeholder do fluxo principal |
| Modelo | `Backend/model/servidor.py` | **vazio** |
| E-mail | `Backend/services/EmailServices.py` + `Backend/config/EmailConnection.py` | Envio SMTP implementado (host/porta via env, anexo PDF, sem autenticação) |

**Estado real confirmado:** o app não sobe (`ModuleNotFoundError: No module named 'Backend.lib'`), não há rota de PDF/OCR, e não há bibliotecas de OCR nem `pandas`/`openpyxl` instaladas. **A maior parte do fluxo é planejada, não implementada.** Confirme sempre o código antes de codar contra ele.

### Frontend (React + Vite) — onde você atua

SPA em JavaScript/JSX servida pelo Vite. É a única interface do usuário: upload, validação dos dados lidos, edição do calendário, envio de e-mails, notificações e mensagens de erro.

**Estado atual: Início, Servidor e Calendário com UI.** Tokens, base, shell global e as três telas estilizadas; tudo com dados de exemplo em `src/mocks/`. Falta a tela **Emails**.

---

## 3. Identidade visual e diretrizes de UI

### 3.1 Tema e paleta

- **Tema claro obrigatório**: fundos claros, superfícies brancas, texto escuro. Não implementar dark mode.
- **Paleta**: tons de **azul claro em contraste com azuis escuros**. Use os nomes semânticos do Bootstrap (`info`, `warning`, `danger`, `success`) como referência de cor/função.
- Nunca use cor como único indicador de estado — sempre acompanhe de ícone e/ou texto (acessibilidade e daltonismo).

Tokens propostos — **ponto de partida, ainda não validados** (centralizar em um único arquivo de tema quando a implementação começar):

| Token | Valor sugerido | Uso |
|---|---|---|
| `--bg-app` | `#F4F8FC` | fundo geral da aplicação |
| `--surface` | `#FFFFFF` | cards e painéis claros |
| `--azul-escuro` | `#0B2B4C` | cards de destaque, textos sobre fundo claro |
| `--azul-medio` | `#1E6FBF` | ações primárias, links |
| `--azul-claro` | `#DCEEFF` | cards claros, fundos suaves |
| `--azul-icone` | `#7FC4FF` | ícones sobre fundo azul escuro |
| `--info` | `#0DCAF0` | documento escaneado e corrigido |
| `--success` | `#198754` | sucesso |
| `--warning` | `#FFC107` | atenção / score baixo / salvando |
| `--danger` | `#DC3545` | erro |
| `--texto` | `#10243A` | texto principal |
| `--texto-suave` | `#5A6B7D` | texto secundário |

### 3.2 Ícones

- **Bootstrap Icons** ou **Vector Icons** — escolher **uma** biblioteca e manter a consistência.
- **Proibido emoji** em qualquer lugar da interface (textos, botões, mensagens, títulos, toasts).
- Ícone decorativo: `aria-hidden="true"`. Ícone que carrega significado/ação: `aria-label` ou texto acessível.
- Tamanho padrão dos ícones de ação: 20 px (16 px em contextos compactos), com área de clique mínima de 44×44 px.

### 3.3 Componentes padrão

Botões, links e inputs **não precisam existir em todas as telas**, mas quando existirem devem seguir o **mesmo padrão**:

- **Mesma sombra** em todos os botões (uma única sombra base, ex.: `0 2px 6px rgba(11,43,76,.12)`).
- **Mesmo comportamento de hover** (elevação leve + escurecimento de ~8%), aplicado igualmente a botões, links e cards clicáveis.
- Variação **apenas por tamanho** (sm / md / lg) e **por cor/função** (primário, secundário, perigo, ghost).
- Estados obrigatórios e visualmente distintos: `default`, `hover`, `active`, `focus-visible`, `disabled`, `loading`.
- Inputs: mesma altura, mesmo raio, mesmo espaçamento interno, `label` sempre visível (não usar apenas placeholder), mensagem de erro associada ao campo.
- Foco sempre visível (nunca `outline: none` sem substituto).

### 3.4 Layout global — presente em **todas** as telas

1. **Logo do sistema**: logo da **Universidade do Distrito Federal Professor Jorge Amaury Maia Nunes**, **centralizada acima da NavBar**, em todas as telas.
   - Arquivo: `src/assets/logo-undf.png`, importado por `LogoUniversidade` e exibido com altura fluida (`clamp(56px, 7vw, 84px)`).
   - O arquivo original tinha margens brancas grandes; foi recortado para 357×329 px.
2. **NavBar** com **todas as telas navegáveis**: Início, Servidor, Calendário, Emails. Item ativo destacado; navegação por teclado; versão colapsada (menu) em telas pequenas.
3. **Central de notificações**: lista dos **últimos envios de arquivos**, com estado **sucesso**, **erro** ou **em andamento**. Deve estar acessível em todas as telas (ex.: ícone de sino na NavBar com painel/dropdown). Cada item: ícone + cor do estado, nome do arquivo, data/hora e mensagem curta. Deve persistir ao navegar entre telas.

### 3.5 Toasts (notificações temporárias)

- Posição: **canto inferior direito**.
- Estados (cores do Bootstrap):
  - **Em andamento**: `warning` (amarelo) + ícone de **carregamento** (spinner).
  - **Erro**: `danger` (vermelho) + ícone **X**.
  - **Sucesso**: `success` (verde) + ícone de **sucesso** (check).
- Empilháveis, com limite (ex.: 3 simultâneos), fecháveis manualmente, sem bloquear a interação.
- Usar `role="status"`/`aria-live="polite"` (e `assertive` para erro).
- Não usar toast para erro de validação de campo (isso é mensagem inline no formulário).

### 3.6 Responsividade

| Faixa | Referência |
|---|---|
| Desktop | ≥ 1200 px |
| Tablet | 768–1199 px |
| Mobile | < 768 px |

Breakpoints são proposta inicial; ajustar aos componentes reais. Os comportamentos por tela estão detalhados na seção 5.

---

## 4. Mapa de telas e navegação

| # | Tela | Rota sugerida | Objetivo |
|---|---|---|---|
| 1 | **Início** | `/` | Primeira tela visível. Informações úteis: calendário acadêmico, última folha enviada, solicitações pendentes, indicadores. |
| 2 | **Servidor** | `/servidores` | Receber PDFs dos servidores, buscar servidor no cache, validar/corrigir os dados lidos. |
| 3 | **Calendário** | `/calendario` | Importar `.xls/.xlsx`, gerar e editar o calendário acadêmico. |
| 4 | **Emails** | `/emails` | Montar e enviar e-mails com os arquivos dos servidores. |

- **Sem tela de login.** A aplicação abre direto em **Início**.
- A NavBar lista exatamente essas quatro telas.

---

## 5. Especificação detalhada das telas

### 5.1 Início (tela principal)

**Deve ser a primeira tela visível.** Conteúdo:

- **Calendário acadêmico** (visão de mês/semana).
- **Card "Funcionários"**: quantidade de folhas de servidores lidas.
- **Card "Emails"**: últimas solicitações de envio.
- Informações úteis: última folha enviada e notificação de solicitação pendente.

**Layout por breakpoint:**

| Breakpoint | Comportamento |
|---|---|
| Desktop | Calendário ocupa **⅔** da largura, ao lado do card **Funcionários** (⅓). O card **Emails** ocupa a **linha inteira** abaixo. |
| Tablet | Calendário em largura **completa**; abaixo, **Funcionários (½)** ao lado de **Emails (½)**. |
| Mobile | Calendário em modo **semana acadêmica**; cards em **linha inteira** (row). |

**Card Funcionários:**

- Fundo **azul escuro** (contraste com o restante da tela).
- Ícone grande em **azul claro**, centralizado, à esquerda ou **atrás** do texto principal.
- Título **"Funcionários"** no **mesmo azul do ícone** (azul claro).
- Abaixo do título: número de **folhas lidas no mês** (por funcionário/servidor).
- No desktop: ícone **abaixo** do texto. No mobile: card em linha inteira.

**Card Emails:**

- Cores **inversas** ao card Funcionários: onde um é azul claro, o outro é azul escuro e vice-versa (fundo **azul claro**, título e ícone em **azul escuro**).
- Ocupa a **linha inteira** e lista as **notificações dos pedidos de e-mail mais recentes**.
- Ícone: SVG de **carta rotacionada em 60°**.
- Desktop: ícone à **esquerda**, alinhado ao meio vertical; título **"Emails"**; comportamento de **carrossel** com as **três últimas** solicitações de envio.
- Tablet: **½**, ao lado do card Funcionários.
- Mobile: **linha inteira**, com o ícone **atrás** do texto.

### 5.2 Servidor

Dividida em **três regiões**.

**A) Superior — busca**

- Campo de busca de servidores.
- **Ao ser selecionada, abre um painel flutuante (overlay)** com a lista de servidores do **cache**, sem empurrar o conteúdo abaixo.
- Altura máxima fixa (~280 px) com rolagem interna — a lista nunca "cresce infinito".
- Fecha ao clicar fora, ao pressionar `Esc` ou ao escolher um servidor.
- Formato da consulta: **somente número**, **somente nome**, ou **combinação dos dois separada por pipe `|`**.
  - `12345` → busca por número.
  - `Maria Silva` → busca por nome.
  - `12345|Maria Silva` → ambos (refinar resultado: interseção).
- Normalizar espaços, ignorar partes vazias (`12345|`), busca **case-insensitive** e **sem acento**.
- Exibir resultado vazio de forma explícita ("Nenhum servidor encontrado") e permitir limpar a busca.

**B) Lateral — documentos**

- Lista de documentos **escaneados e não escaneados**.
- Cores por estado:
  - **Escaneado e corrigido**: `info` (azul).
  - **Escaneado com bom score**: **verde claro/ciano**.
  - **Escaneado com score inferior a 0.95**: `warning` (amarelo).
  - **Não escaneado**: neutro (superfície clara/cinza).
- O usuário **pode mover** o painel; **por padrão fica à direita**.

**C) Central — envio e validação**

- Área de **upload de arquivos `.pdf`**.
- Ao enviar um **arquivo válido**, ele entra em **modo de visualização** nessa aba.
- A **aba lateral** passa a mostrar os **dados extraídos**, que podem ser **alterados** pelo usuário.
- No **topo do formulário**, botão para **mostrar os outros arquivos**.
- A parte central também é um **carrossel** com os arquivos escaneados **já separados**, de modo que os **dados das páginas acompanhem suas respectivas fontes** (cada página/pessoa com seu bloco de dados).

### 5.3 Calendário

**Layout**

- Desktop: calendário em **⅔** + painel em **⅓**.
- Tablet/mobile: calendário na **linha inteira**, painel **abaixo**, com **FAB** azul escuro (`+ Enviar arquivo`).

**Interações implementadas**

- **Clique no dia**:
  - se o dia já está coberto por uma nota → o painel mostra **título, período e contexto**;
  - se não há nota → abre o **formulário** (nome, data de início, data de fim, contexto) já preenchido com o dia clicado.
- **Dias com nota** recebem **fundo azul claro** no calendário (dias consecutivos formam uma faixa contínua).
- **Botão Editar**: no topo à direita da nota aberta, azul escuro com ícone de lápis branco. Abre o formulário preenchido com os dados atuais e oferece "Salvar alterações" / "Cancelar".
- **Botão direito no dia**: abre um **menu de contexto** com
  - “Marcar como sem aula” (esfera **vermelha**),
  - “Marcar como planejamento” (esfera **roxa**),
  - “Marcar intervalo…” → painel com tipo + início + fim.
- **Sequência**: dias consecutivos do mesmo tipo têm os pontos **conectados por uma linha**.
- **Arrastar arquivo sobre a página**: o painel vira **área de recebimento** de `.xls/.xlsx` (também acessível pelo FAB ou clique).
- Todo o estado é **local** (memória): nada é enviado ao backend ainda.

**Pendente (quando houver backend)**

- Enviar a planilha e converter o JSON retornado em eventos do calendário.
- Salvamento **otimista em cache** com toasts:
  1. aplica a alteração no cache;
  2. dispara toast `warning` + carregamento enquanto envia;
  3. `danger` + X em erro (revertendo a alteração) ou `success` + check ao confirmar.
- Nunca descartar a edição do usuário sem aviso: se o envio falhar, manter o dado e oferecer "tentar novamente".
- Visão **semanal** no mobile.

### 5.4 Emails

- Responsável por **receber e enviar e-mails** contendo os arquivos dos servidores.
- Envia um **JSON** ao backend contendo:
  - **mensagem automática salva** (template padrão),
  - o **servidor**,
  - o **e-mail cadastrado** dele,
  - o **arquivo do backend** que será enviado.
- Formulário deve permitir revisar destinatário, assunto, corpo e anexos antes do envio.
- Estado de envio por item (`em andamento` / `sucesso` / `erro`), refletido também na central de notificações.
- Erros de SMTP devem ser exibidos em linguagem simples, sem detalhe técnico bruto.

---

## 6. Arquivos aceitos e validação

| Extensão | Onde é aceita | Observação |
|---|---|---|
| `.pdf` | Tela **Servidor** (folhas de ponto) | Único formato de folha de ponto |
| `.xls` | Tela **Calendário** (e referências) | Planilha de referência |
| `.xlsx` | Tela **Calendário** (e referências) | Planilha de referência |

- **Nenhum outro formato é aceito.** Bloquear no `accept` do input, na validação client-side **e** no backend (o backend é a fonte da verdade).
- Validar também: arquivo vazio (0 bytes), extensão falsa (conteúdo incompatível quando possível), tamanho máximo (a definir com o backend).
- Mensagens de erro devem dizer o formato aceito e o que fazer.

---

## 7. Cache e estado

- **Consulta de servidores usa memória cache**: a lista de servidores cadastrados deve ficar disponível localmente para busca instantânea e para funcionar com a API lenta/indisponível.
  - Definir a tecnologia (ex.: `localStorage`/IndexedDB) **junto com o responsável**.
  - Definir **invalidação/expiração** e uma ação manual de "atualizar lista".
  - O cache é **acelerador**, não fonte da verdade: nunca envie dados críticos baseando-se só nele sem confirmação do backend.
- **Edição do calendário**: atualização **otimista em cache** antes da confirmação do servidor (ver 5.3), com rollback em caso de erro.
- **Notificações**: manter histórico recente (últimos envios) em memória/estado global, sobrevivendo à navegação entre telas.

---

## 8. O que o frontend precisa do backend (contrato a confirmar)

O `Backend/Agent.md` avisa que os endpoints **não estão confirmados**. **Não invente rotas**: verifique `Backend/routes/` e alinhe antes de codar.

| Necessidade | Entrada | Saída esperada |
|---|---|---|
| Enviar planilha de calendário | `.xls/.xlsx` (multipart) | JSON do calendário |
| Salvar calendário editado | JSON do calendário | confirmação |
| Listar/buscar servidores | — (ou cache local) | lista de servidores |
| Enviar folhas de ponto | 1+ PDFs (multipart) | dados extraídos + score por página |
| Consultar resultado do processamento | id/lote | status, servidor, competência, confiança |
| Enviar e-mails | JSON (mensagem, servidor, e-mail, arquivo) | sucesso/falha por destinatário |

Requisitos técnicos que **precisam** existir no backend:

- **CORS habilitado** para a origem do Vite (hoje não há `CORSMiddleware` no `Main.py`).
- **Limite de tamanho de upload** coerente com PDFs digitalizados (podem ser grandes).
- Erros com **status HTTP correto** e corpo `{"detail": "..."}` legível (hoje um `except Exception` genérico transforma tudo em 400).

> Proposta de contrato, **apenas para discussão**: `POST /api/calendario`, `PUT /api/calendario`, `GET /api/servidores`, `POST /api/folhas`, `GET /api/processamentos/{id}`, `POST /api/emails`. Qualquer versão final deve ser registrada aqui ou no `Backend/Agent.md`.

---

## 9. Estrutura de pastas atual

```
Frontend/
├── Agent.md                  ← este arquivo
└── FolhaDePonto/             ← projeto Vite (pacote "folhadeponto")
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── eslint.config.js
    ├── README.md             ← visão geral do app
    └── src/
        ├── main.jsx          ← bootstrap + BrowserRouter + CSS global
        ├── App.jsx           ← mapa de rotas
        ├── assets/
        │   └── logo-undf.png ← logo oficial da universidade
        ├── utils/
        │   ├── calendario.js ← matriz do mês, datas e rótulos (sem UI)
        │   ├── marcas.js     ← alternar marca, intervalo e nota do dia
        │   └── busca.js      ← normalização e filtro "número|nome"
        ├── mocks/
        │   ├── inicio.js     ← dados de exemplo (remover quando houver API)
        │   ├── servidores.js ← servidores e documentos de exemplo
        │   └── calendario.js ← notas e marcações de exemplo
        ├── styles/
        │   ├── tokens.css    ← design tokens (fonte única de verdade)
        │   └── base.css      ← reset, tipografia e acessibilidade
        ├── layouts/
        │   ├── AppLayout.jsx
        │   └── AppLayout.module.css
        ├── components/
        │   ├── LogoUniversidade.jsx (+ .module.css)
        │   ├── NavBar.jsx (+ .module.css)
        │   ├── CentralNotificacoes.jsx (+ .module.css)
        │   ├── Toasts.jsx (+ .module.css)
        │   ├── CalendarioAcademico.jsx
        │   ├── CardFuncionarios.jsx
        │   ├── CardEmails.jsx
        │   ├── ResumoRapido.jsx
        │   ├── BuscaServidor.jsx
        │   ├── PainelDocumentos.jsx
        │   ├── AreaFolhaDePonto.jsx (+ .module.css)
        │   ├── PainelCalendario.jsx (+ .module.css)
        │   ├── FormularioEmail.jsx
        │   └── ListaEnvios.jsx
        └── pages/
            ├── Inicio.jsx
            ├── Inicio.module.css ← grid ⅔+⅓ (desktop) / ½+½ (tablet)
            ├── Servidor.jsx
            ├── Servidor.module.css
            ├── Calendario.jsx
            ├── Calendario.module.css
            └── Emails.jsx
```

- `node_modules/` já instalado e ignorado pelo `.gitignore` local.
- A pasta `Frontend/` **ainda não está versionada** no Git (untracked). Não commite sem o responsável pedir.
- Router: `react-router-dom`. Não há estado global, cliente HTTP nem testes.
- **Estilos**: CSS Modules (`Componente.module.css`) — sem dependência extra, escopo local. Cores/espaços/sombras **somente** via tokens de `styles/tokens.css`; nunca valores literais.
- **Ícones**: Bootstrap Icons (`<i className="bi bi-…" aria-hidden="true" />`), importado uma vez em `main.jsx`.
- **Busca**: o painel do cache é um overlay com altura limitada; nunca empurra o layout.
- **Carrossel** (Início e Servidor): sempre dentro de um contêiner com `overflow-x: auto`; os grids das páginas usam `minmax(0, 1fr)` para que conteúdo largo não estoure a viewport.
- Componentes ainda sem UI: `ResumoRapido`, `FormularioEmail`, `ListaEnvios`.

---

## 10. Stack e comandos

| Item | Versão/observação |
|---|---|
| React | 19.3 (com React Compiler via Babel) |
| Vite | 8.3 |
| ESLint | 10 (flat config) |
| React Router | 7.18 (`react-router-dom`) |
| Ícones | Bootstrap Icons 1.13 |
| Estilos | CSS puro com **CSS Modules** + tokens em `src/styles/` |
| Linguagem | JavaScript/JSX (sem TypeScript no momento) |

Comandos (dentro de `Frontend/FolhaDePonto/`):

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run lint     # ESLint
npm run preview  # pré-visualizar o build
```

---

## 11. Regras de trabalho (obrigatórias)

1. **Explique antes de agir.** Descreva a abordagem e os impactos antes de modificar arquivos; depois, diga o que foi feito e o que foi testado.
2. **Diferencie** o que está implementado, em desenvolvimento e apenas planejado. Não declare pronto o que não foi testado.
3. **Não invente endpoints, campos ou formatos de resposta.** Confirme no backend.
4. **Não adicione dependências** (router, estado global, UI kit, axios, TypeScript…) sem alinhar antes.
5. **Não introduza** login/autenticação, banco de dados, telemetria ou serviços externos.
6. **Nunca** coloque credenciais, tokens ou URLs privadas no frontend.
7. **Nunca** presuma que um recurso do backend existe: o app está em construção e pode estar quebrado.
8. **Textos em português do Brasil**, linguagem simples, sem jargão técnico. Erros dizem o que aconteceu e o que fazer.
9. **Sem emojis.** Ícones apenas de Bootstrap Icons ou Vector Icons.
10. **Acessibilidade**: `label` em todo input, foco visível, contraste, erro associado ao campo, navegação por teclado, `alt` em imagens, `aria-*` em componentes dinâmicos.
11. **Arquivos grandes**: PDFs digitalizados podem ter dezenas de MB. Mostre progresso, trate timeout e não carregue tudo em memória sem necessidade.
12. **Não mexa** em `Backend/`, `Agent.md` da raiz ou `Backend/Agent.md`.
13. Antes de sobrescrever um arquivo existente, **leia-o**.
14. Ao concluir uma etapa, **atualize este arquivo** (telas criadas, decisões tomadas, endpoints confirmados).

---

## 12. Dúvidas em aberto (confirmar antes de implementar)

1. ~~**Logo oficial**~~ — **resolvido**: `src/assets/logo-undf.png` (PNG 357×329, margens brancas recortadas). Melhoria futura desejável: versão vetorial (SVG) para telas de alta densidade.
2. ~~**Biblioteca de ícones**~~ — **decidido**: **Bootstrap Icons** (`bootstrap-icons`, via npm), usada como fonte de ícones `<i className="bi bi-…">`.
3. **Tecnologia de cache** dos servidores: `localStorage` ou IndexedDB? Qual a política de expiração?
4. ~~**Router**~~ — **decidido**: React Router (`react-router-dom`). Rotas: `/`, `/servidores`, `/calendario`, `/emails`; rota desconhecida redireciona para `/`.
5. **"Quantidade de folhas lidas"** no card Funcionários: total do mês, por servidor, ou ambos?
6. **Carrossel** do card Emails e do painel central: autoplay? navegação por setas/pontos? apenas manual?
7. **Calendário editável**: biblioteca de calendário ou componente próprio?
8. Na tela Calendário, o texto original diz que o calendário editado "deve ser enviado para o frontend" — interpretado aqui como **enviado ao backend**. Confirmar.
9. **Limite máximo** de upload e quantidade de PDFs por lote.
10. **Score**: a origem do valor (0–1) e se o frontend deve exibir a confiança por página.

---

## 13. Pendências e próximos passos

- [ ] Confirmar decisões da seção 12.
- [x] Router definido (React Router) e estrutura de navegação criada.
- [x] Esqueletos dos elementos gráficos criados (sem UI).
- [x] Design tokens e base global (`src/styles/tokens.css` e `base.css`).
- [x] UI do shell global (header, NavBar, logo placeholder, sino de notificações).
- [x] Esqueleto funcional do calendário (matriz do mês + navegação), sem estilos.
- [x] UI do calendário (cartão, cabeçalho, grade, destaque de hoje, responsivo).
- [x] Cards Funcionários e Emails + grid responsivo da tela Início.
- [x] UI da tela Servidor (busca com cache, upload, painel lateral com abas e carrossel).
- [x] UI da tela Calendário (notas, marcações em série, menu de contexto e recebimento de planilha).
- [ ] Substituir os dados de exemplo (`src/mocks/*`) pela API real.
- [ ] Visão semanal do calendário no mobile.
- [ ] Eventos/feriados no calendário e modo de edição com salvamento otimista.
- [ ] Definir estado global, cliente HTTP e UI kit.
- [ ] Corrigir o backend para que a API suba e definir o contrato real.
- [ ] Criar layout base: logo, NavBar, central de notificações, sistema de toasts.
- [ ] Criar design tokens (cores, sombras, espaçamentos, tipografia) e componentes base (Button, Input, Card, Toast).
- [ ] Tela **Início** (calendário + cards).
- [ ] Tela **Servidor** (busca com pipe, cache, upload, validação, carrossel).
- [ ] Tela **Emails** (formulário, envio, estados).
- [ ] Configurar CORS e variável de ambiente com a URL da API.
- [ ] Definir estratégia de testes.

---

## 14. Como a próxima IA deve começar

1. Leia este arquivo inteiro, depois `../Agent.md` e `../Backend/Agent.md`.
2. Rode `npm run lint` e `npm run build` em `Frontend/FolhaDePonto/` para confirmar que o template está saudável.
3. Confirme o estado do backend (rotas reais, CORS, se o app sobe) **antes** de escrever qualquer chamada de API.
4. Resolva as dúvidas da seção 12 com o responsável; não decida arquitetura sozinho.
5. Pergunte o que fazer agora; não presuma prioridades.
6. Ao terminar, atualize este arquivo.
