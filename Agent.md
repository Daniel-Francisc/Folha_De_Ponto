# Agent — Folha de Ponto

> **Leia este documento primeiro.** Ele resume o objetivo e as decisões compartilhadas do projeto. Para orientações detalhadas, leia também o [Agent.md do frontend](Frontend/Agent.md) e o [Agent.md do backend](backend/Agent.md). O documento do frontend é a fonte de verdade para a interface; confirme o código real antes de assumir que uma funcionalidade está implementada.

## 1. Objetivo do projeto

O **Folha de Ponto** é uma aplicação de apoio ao processamento de folhas de ponto físicas assinadas, digitalizadas em PDF, no contexto administrativo/acadêmico da Universidade do Distrito Federal Professor Jorge Amaury Maia Nunes.

O objetivo é reduzir o trabalho manual de identificar folhas, associá-las ao servidor e à competência (mês/ano), renomear e organizar PDFs e encaminhá-los por e-mail. O frontend também deve permitir que o usuário revise e corrija os dados extraídos antes de concluir o processamento.

## 2. Fluxo funcional esperado

1. Importar planilhas Excel de referência: cadastro de servidores e calendário acadêmico.
2. Receber um ou mais PDFs digitalizados de folhas de ponto.
3. Aplicar OCR para extrair informações relevantes e, quando disponível, estimar a confiança da extração.
4. Cruzar os dados extraídos com as referências para identificar servidor e competência.
5. Apresentar os resultados para revisão e correção pelo usuário.
6. Organizar os documentos por competência, por exemplo `Folhas_YYYY-MM/`, usando nomes seguros, por exemplo `Nome_do_servidor-YYYY-MM.pdf`.
7. Enviar os documentos por e-mail via SMTP e mostrar o resultado de cada envio.

## 3. Arquitetura

- **Frontend:** React + Vite, JavaScript/JSX, aplicação de página única com React Router. Local: `Frontend/FolhaDePonto/`.
- **Backend:** Python + FastAPI. O código atual está no diretório `Backend/` (B maiúsculo); consulte os arquivos reais antes de alterar rotas ou imports.
- **Comunicação:** HTTP entre navegador e API, usando JSON para dados e multipart/form-data para uploads.
- **Arquivos e e-mail:** processamento e organização de PDFs no ambiente institucional e envio por SMTP configurado por variáveis de ambiente.

## 4. Escopo e restrições compartilhadas

- O foco é uso **local/interno da instituição**. Não adicionar armazenamento externo, serviços de terceiros ou banco de dados em nuvem sem discussão explícita.
- **Não criar tela de login nem autenticação** nesta fase.
- Folhas de ponto aceitam **somente PDF**. Os arquivos `.xls` e `.xlsx` são planilhas de referência, usadas principalmente na tela Calendário; não são folhas de ponto.
- Validar arquivos tanto no frontend quanto no backend. A extensão sozinha não garante que o conteúdo seja válido.
- Nunca colocar credenciais SMTP, tokens ou segredos no frontend ou no repositório. Usar configuração de ambiente no backend.
- Não inventar endpoints, campos ou formatos de resposta. Alinhar o contrato com as rotas reais do backend antes de conectar a interface.

## 5. Frontend — resumo

A especificação completa está em [Frontend/Agent.md](Frontend/Agent.md). A interface usa tema claro, tons de azul claro e escuro, Bootstrap Icons (sem emojis), CSS Modules e tokens de estilo centralizados.

A navegação prevista contém quatro telas:

- **Início (`/`):** calendário acadêmico, indicadores de folhas e resumo de solicitações de e-mail.
- **Servidor (`/servidores`):** busca de servidores, cache para consulta rápida, upload de PDFs e revisão dos dados extraídos.
- **Calendário (`/calendario`):** importação de planilhas `.xls`/`.xlsx`, visualização e edição de eventos acadêmicos.
- **Emails (`/emails`):** preparação, revisão e acompanhamento de e-mails, itens recebidos e histórico.

O documento do frontend registra a interface das quatro telas como construída com dados de exemplo/mocks. A integração com a API, o estado global/cliente HTTP e a persistência real ainda são pendências; consulte o agente do frontend para o estado detalhado e atualizado.

## 6. Backend — resumo e foco atual

O backend deve manter as rotas como camada HTTP e delegar processamento para módulos especializados. O contexto detalhado está em [backend/Agent.md](backend/Agent.md); o código efetivo vive atualmente em `Backend/`.

Prioridades principais:

1. Confirmar e corrigir a inicialização da API e os imports.
2. Implementar o fluxo de recepção de PDFs e OCR.
3. Definir o formato dos dados extraídos, incluindo tratamento de incerteza e correções do usuário.
4. Integrar os dados com as planilhas de referência e a organização dos documentos.
5. Conectar o envio SMTP e retornar estados claros por arquivo/destinatário.
6. Configurar CORS para a origem de desenvolvimento do Vite e respostas de erro consistentes.

**Não considere o fluxo ponta a ponta pronto:** a especificação do frontend registra que o backend ainda precisa de correções e que a rota de PDFs/OCR e a integração real permanecem pendentes. Verifique o código antes de afirmar o estado atual.

## 7. Regras de trabalho para agentes

- Leia este arquivo e, conforme a tarefa, o `Frontend/Agent.md` ou o `backend/Agent.md` antes de trabalhar.
- Explique a abordagem e os impactos esperados antes de modificar código; depois, informe o que foi alterado e o que foi realmente testado.
- Diferencie claramente código implementado, em desenvolvimento e planejado.
- Antes de sobrescrever um arquivo, leia sua versão atual.
- Não adicione dependências, serviços, autenticação ou novas decisões arquiteturais sem alinhar a necessidade.
- Preserve textos da interface em português do Brasil, acessibilidade e as regras visuais descritas no agente do frontend.
- Mantenha a documentação dos agentes atualizada quando decisões, rotas ou o estado real do projeto mudarem.
