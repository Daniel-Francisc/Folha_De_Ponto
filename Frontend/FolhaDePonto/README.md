# Folha de Ponto — Frontend

Interface web do sistema **Folha de Ponto**, da **Universidade do Distrito Federal Jorge Amaury Maia Nunes**.

O sistema apoia o processamento de folhas de ponto físicas assinadas: recebe PDFs digitalizados, extrai os dados por OCR no backend, cruza com planilhas de referência (cadastro de servidores e calendário acadêmico), organiza os arquivos por competência e apoia o envio por e-mail.

> **Contexto para IA/desenvolvedores:** leia o [Agent.md](../Agent.md) da pasta `Frontend/` antes de qualquer alteração. Ele contém a especificação completa, as regras de trabalho e as decisões pendentes.

---

## Status

Projeto **em fase inicial**: template limpo, navegação com React Router, design tokens e o shell global (header com logo, NavBar e sino de notificações) já estilizados. As **páginas ainda não têm UI**.

O backend também está em desenvolvimento e, no momento, não sobe (ver `Backend/Agent.md`). Ou seja: ainda **não existe contrato de API estável**.

---

## O que o sistema terá

Quatro telas, **sem login**:

| Tela | Função |
|---|---|
| **Início** | Calendário acadêmico, indicadores de folhas lidas e últimas solicitações de e-mail |
| **Servidor** | Busca de servidores (cache local), envio de PDFs e validação dos dados lidos |
| **Calendário** | Importação de `.xls/.xlsx`, edição e salvamento do calendário acadêmico |
| **Emails** | Montagem e envio de e-mails com os arquivos dos servidores |

Presentes em **todas** as telas: logo da universidade centralizada, NavBar com a navegação e central de notificações dos últimos envios.

---

## Diretrizes de interface

- Tema **claro**, com tons de **azul claro em contraste com azuis escuros**.
- **Sem emojis**. Ícones somente de **Bootstrap Icons** ou **Vector Icons**.
- Botões, links e inputs seguem o mesmo padrão de sombra, hover e estados — variando apenas por tamanho, cor e função.
- Notificações temporárias (toasts) no **canto inferior direito**: amarelo com carregamento, vermelho com X em erro, verde em sucesso.
- Arquivos aceitos: **`.pdf`**, **`.xls`** e **`.xlsx`** — nenhum outro formato.
- Consulta de servidores com **cache local**.
- Interface responsiva (desktop, tablet e mobile) e acessível (labels, foco visível, contraste, teclado).

---

## Stack

| Item | Versão |
|---|---|
| React | 19.3 |
| React Router | 7.18 |
| Bootstrap Icons | 1.13 |
| Vite | 8.3 |
| ESLint | 10 (flat config) |
| JavaScript/JSX | sem TypeScript |

React Compiler está habilitado via plugin Babel em `vite.config.js`.

---

## Como rodar

Requisitos: Node.js compatível com o Vite 8.

```bash
npm install      # instalar dependências
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run preview  # pré-visualizar o build
npm run lint     # análise estática
```

---

## Estrutura

```
FolhaDePonto/
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
└── src/
    ├── main.jsx          # bootstrap + BrowserRouter
    ├── App.jsx           # mapa de rotas
    ├── styles/           # tokens.css + base.css
    ├── layouts/          # AppLayout
    ├── components/       # componentes (CSS Modules)
    └── pages/
        ├── Inicio.jsx
        ├── Servidor.jsx
        ├── Calendario.jsx
        └── Emails.jsx
```

---

## Documentação relacionada

- [Agent.md do frontend](../Agent.md) — especificação completa, regras e pendências
- [Agent.md da raiz](../../Agent.md) — contexto geral do projeto
- [Agent.md do backend](../../Backend/Agent.md) — detalhes da API, OCR, Excel e SMTP
