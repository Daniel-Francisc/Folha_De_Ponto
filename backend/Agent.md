# Agent — Backend do Folha de Ponto

> Leia primeiro o contexto geral em [../Agent.md](../Agent.md). Este arquivo descreve as responsabilidades, os padrões de implementação e o estado observado do backend. **Confira o código antes de assumir que uma rota ou integração continua igual.**

## Objetivo e responsabilidade

O backend, construído com FastAPI, fornece ao frontend HTTP para importar planilhas, receber e processar folhas de ponto em PDF, consultar e organizar dados locais e enviar e-mails. Ele também valida entradas e traduz falhas de serviços para respostas HTTP compreensíveis.

Mantenha os handlers focados no protocolo HTTP: validar e interpretar a entrada, chamar serviços e montar a resposta. OCR, SMTP, persistência e manipulação de arquivos pertencem a módulos especializados em `services/` ou a extratores próprios.

## Estrutura atual

- `Main.py`: cria a aplicação FastAPI, configura CORS, registra os routers e expõe `GET /health`.
- `routes/`: um arquivo por área/rota, com entrada, validação HTTP e resposta daquela área.
- `services/`: armazenamento de arquivos, repositório JSON local, OCR e envio SMTP.
- `model/`: modelos compartilhados, quando necessário.
- `arquivos/recebidos/`: armazenamento local padrão de arquivos e dados; pode ser substituído por `FOLHA_STORAGE_DIR`.
- `Agent.md`: estas instruções.

Não mova rotas para um único arquivo agregador. O padrão estabelecido é manter cada área de API em seu próprio arquivo dentro de `routes/`, como `routes/Emails.py` e `routes/Marcacoes.py`, e registrar cada router em `Main.py`.

## Contratos das rotas existentes

Os prefixos completos estão definidos no `prefix` de cada router em `Main.py`. A lista abaixo corresponde aos prefixos registrados atualmente; confirme-os no código antes de alterar ou documentar contratos.

| Método e caminho | Arquivo | Responsabilidade e contrato observado |
|---|---|---|
| `GET /health` | `Main.py` | Retorna o estado simples da API. |
| `GET /servidores` | `routes/Servidores.py` | Lista servidores lidos da planilha de referência em `Excel/Lista_de_Servidores/`. |
| `GET /calendario` | `routes/Excel.py` | Lista eventos acadêmicos extraídos das planilhas importadas. |
| `POST /calendario` | `routes/Excel.py` | Recebe multipart com `arquivo` (`.xls`/`.xlsx`) e `categoria` (`calendario` ou `servidores`); planilha limitada a 10 MB. Retorna eventos, categoria e nome do arquivo. |
| `POST /folhas` | `routes/Arquivo.py` | Recebe um ou mais PDFs no campo multipart repetido `arquivos`; limite de 25 MB por arquivo. Executa OCR e devolve campos sugeridos. Só persiste o PDF quando também são enviados `servidor_id`, `servidor_nome` e `competencia` (`AAAA-MM`); `substituir` autoriza substituir uma versão existente. |
| `GET /processamentos/{processamento_id}` | `routes/Processamentos.py` | Consulta um lote de PDFs já processado; retorna `404` se não existir. |
| `GET /notas` | `routes/CalendarioNotas.py` | Lista notas; aceita filtros de data `inicio` e `fim`. |
| `POST /notas` | `routes/CalendarioNotas.py` | Cria uma nota do calendário. |
| `PUT /notas/{nota_id}` | `routes/CalendarioNotas.py` | Substitui os dados de uma nota existente; retorna `404` se não existir. |
| `GET /marcacoes` | `routes/Marcacoes.py` | Lista marcações, opcionalmente filtradas por `inicio` e `fim`. |
| `PUT /marcacoes` | `routes/Marcacoes.py` | Adiciona/combina os intervalos recebidos com as marcações existentes. **Não apaga marcações**; não interpretar `[]` como limpeza. Ainda não existe rota de remoção. |
| `GET /emails/pendentes` | `routes/Emails.py` | Lista documentos persistidos elegíveis para envio. |
| `POST /emails/enviar` | `routes/Emails.py` | Envia e-mail nominal com documentos persistidos. Registra sucesso/falha no histórico; exige configuração SMTP e pode retornar `502` em falha de envio. |
| `GET /rotinas` | `routes/Rotinas.py` | Lista e-mails de rotina persistidos. |
| `POST /rotinas` | `routes/Rotinas.py` | Valida e registra rotina futura; status atual `aguardando_configuracao`. |
| `PUT /rotinas/{rotina_id}` | `routes/Rotinas.py` | Atualiza rotina existente; retorna `404` se não existir. |
| `GET /recebidos` | `routes/Recebidos.py` | Lista mensagens recebidas que já estejam registradas localmente. Não consulta IMAP atualmente. |
| `PATCH /recebidos/{recebido_id}` | `routes/Recebidos.py` | Atualiza o status de uma mensagem registrada; retorna `404` se não existir. |
| `GET /historico` | `routes/Historico.py` | Lista histórico; aceita `tipo` (`nominal` ou `automatico`), `pagina` e `porPagina` (5–50). |
| `GET /inicio` | `routes/Inicio.py` | Retorna indicadores e envios recentes para a tela inicial. |
| `GET /notificacoes` | `routes/Notificacoes.py` | Lista até 50 notificações recentes de tentativas de envio. |

Para exemplos detalhados dos payloads usados pela interface, consulte [../Integracao_Backend.md](../Integracao_Backend.md) e compare-os com os modelos e handlers atuais. Ao mudar qualquer contrato, atualize a documentação de integração na mesma alteração.

## Arquivos, persistência e convenções

- Serviço de arquivos: `services/ArmazenamentoArquivos.py`.
- Raiz padrão: `Backend/arquivos/recebidos`; a variável `FOLHA_STORAGE_DIR` permite apontar outra raiz.
- Planilhas ficam organizadas sob `Excel/Calendario_Academico/` e `Excel/Lista_de_Servidores/`.
- PDFs confirmados ficam em pastas por servidor e competência, sob `PDFs/`; o nome final segue `Nome_do_servidor-AAAA-MM.pdf`.
- Substituição autorizada arquiva a versão anterior usando o sufixo `_OLD_[AAAAMMDD-HHMMSS]` antes de gravar a nova versão.
- Notas, marcações, processamentos, documentos, rotinas, histórico e notificações usam JSON em `Dados/`, por meio de `services/RepositorioLocal.py`.
- A persistência JSON é para uso local em uma instância. Não a trate como segura para vários processos concorrentes ou implantação distribuída.
- Valide caminhos e nomes fornecidos pelo usuário para impedir traversal e nomes de arquivo inválidos. Nunca confie apenas na extensão: valide conteúdo e limites.

## OCR e dependências do sistema

O OCR atual usa Tesseract, não PaddleOCR/PaddlePaddle:

- `services/TesseractOCR.py`: integração com Tesseract e leitura/renderização das páginas PDF.
- `services/ProcessadorFolhas.py`: interpretação do texto e construção de campos sugeridos para a API.
- Dependências Python do projeto ficam declaradas em `requirements.txt`. O executável Tesseract e os dados de idioma são dependências externas do sistema, não instaladas por este código.
- O idioma padrão configurado é português (`por`). Se o executável não estiver no `PATH`, a configuração pode usar `TESSERACT_CMD`; `TESSERACT_LANG` altera o idioma.
- Falta de binário, idioma ou dependência deve resultar em erro claro (atualmente a rota de folhas trata indisponibilidade como `503`), sem indicar falsamente que o OCR foi bem-sucedido.

**Não altere, ative, recrie ou instale pacotes no Python, pip ou `.venv` sem solicitação explícita.** Não execute instalação de dependências durante tarefas de código. Se uma dependência mudar, edite apenas `requirements.txt` e informe ao usuário o comando a executar no ambiente dele.

## Integrações e limitações atuais

- CORS permite as origens locais `http://localhost:5173` e `http://127.0.0.1:5173`; confirme `Main.py` antes de alterar.
- O frontend ainda possui telas/mocks sem integração HTTP completa. Não documente uma tela como conectada até confirmar chamadas reais no código do frontend.
- O envio nominal usa SMTP. A configuração vem do ambiente (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` ou `SMTP_USER`; quando aplicável `SMTP_STARTTLS`, `SMTP_USER` e `SMTP_PASSWORD`). Nunca grave credenciais no código, frontend, logs ou Git.
- Rotinas são validadas e persistidas como `aguardando_configuracao`; não há envio automático funcional até definir e implementar seleção de folhas, assunto, mensagem, anexos e execução do scheduler.
- Mensagens recebidas não são importadas por IMAP. `GET /recebidos` só retorna registros locais existentes; não há fluxo de ingestão de e-mail recebido implementado.
- `PUT /marcacoes` é aditivo. Antes de implementar remoção/substituição, defina explicitamente o contrato e atualize frontend e backend.

## Padrão obrigatório de documentação e implementação

O código deve ser acessível a quem não tem Python como linguagem principal:

1. **Uma rota/área por arquivo** em `routes/`, conforme o padrão atual. Não junte endpoints de áreas distintas em um arquivo genérico.
2. Escreva docstrings em português claro para routers, funções de endpoint, serviços e modelos não óbvios. Explique o propósito, os argumentos, o retorno, efeitos colaterais e exceções relevantes.
3. Adicione comentários inline somente para explicar decisões ou trechos que não sejam óbvios; prefira explicar o motivo e o contrato, não repetir o código.
4. Para cada endpoint, documente método/caminho, formato de entrada (JSON, query ou multipart), campos obrigatórios/opcionais, resposta de sucesso, efeitos de persistência e códigos de erro esperados. Use `summary`/descrições FastAPI para refletir esse contrato em `/docs`.
5. Use nomes explícitos em português alinhados ao vocabulário do projeto e tipos claros. Não esconda conversões de datas, nomes de arquivos ou statuses.
6. Rotas devem validar a entrada, delegar processamento e transformar falhas conhecidas em `HTTPException` com mensagem útil. Não retornar sucesso se a gravação ou operação externa falhou.
7. Preserve o contrato da API consumido pelo frontend. Se precisar alterá-lo, atualize o modelo, o endpoint e `Integracao_Backend.md` juntos e explique a migração.
8. Separe erros de formato, leitura da planilha, OCR, persistência e SMTP. Não engula exceções nem exponha stack traces, caminhos locais, credenciais ou conteúdo pessoal ao cliente.
9. Ao criar uma rota ainda sem implementação de negócio, faça um arquivo próprio para a área, devolva apenas uma resposta vazia/sem registros no formato definido e deixe instruções claras para a próxima pessoa implementar. Não simule sucesso de uma operação que não aconteceu.
10. Ao concluir mudanças, relate arquivos alterados e verificações realizadas. Não instale dependências nem rode comandos de ambiente sem autorização explícita.

## Como executar e verificar manualmente

- Inicialização de desenvolvimento documentada: `uvicorn Backend.Main:app --reload`, a partir da raiz do repositório e com o ambiente já configurado pelo usuário.
- Documentação HTTP interativa: `/docs`.
- Disponibilidade: `GET /health`.
- Não execute testes, comandos Python ou instalação de pacotes sem solicitação do usuário. Se o usuário pedir verificação, prefira inicialmente revisão estática e explique com precisão o que foi ou não executado.

## Próximos itens conhecidos

1. Integrar as telas do frontend às rotas reais e substituir mocks gradualmente.
2. Definir, com a instituição, a origem autorizada e a configuração de IMAP para mensagens recebidas.
3. Definir contrato e regras de negócio para execução de rotinas automáticas.
4. Validar OCR e SMTP em ambiente local configurado, sem alterar o ambiente Python do usuário.
5. Projetar uma persistência adequada antes de suportar múltiplas instâncias concorrentes.
