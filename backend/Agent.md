# Agent — Backend do Folha de Ponto

> Este arquivo complementa o contexto geral em [../Agent.md](../Agent.md). Leia o arquivo da raiz primeiro para entender o objetivo e o fluxo completo do sistema.

## Responsabilidade

O backend é responsável por receber arquivos e dados do frontend, validar as entradas, executar a extração e o processamento, organizar os resultados e encaminhar e-mails. A API está sendo desenvolvida com **FastAPI/Python**.

## Rotas e responsabilidades

As rotas são a camada HTTP de entrada: devem receber os dados, validar o formato e delegar o trabalho para funções/classes responsáveis pelo processamento. Evite concentrar OCR, manipulação de planilhas, organização de arquivos e SMTP diretamente nos handlers.

### Importação de planilhas Excel

- Receber arquivos .xls/.xlsx destinados às planilhas de referência, como cadastro de servidores e calendário acadêmico.
- Verificar a extensão/formato permitido e tratar erros de leitura.
- Encaminhar o conteúdo ao extrator de Excel (há trabalho anterior usando UploadFile, BytesIO e pandas.read_excel).
- Converter os dados extraídos para estruturas utilizáveis pela aplicação, como dicionários/listas e JSON quando necessário.
- Não confundir essa importação de planilhas de referência com o fluxo de folhas de ponto: **as folhas de ponto devem aceitar apenas PDF**.

### Recepção de folhas de ponto

- Receber um ou mais PDFs.
- Rejeitar arquivos que não sejam PDFs e retornar erros claros ao frontend.
- Encaminhar os documentos para o pipeline de processamento; a validação real deve considerar o conteúdo do arquivo, não apenas o nome.

### OCR e integração do fluxo

- O OCR é o principal foco de desenvolvimento atual.
- Extrair das folhas os campos necessários para identificar competência (mês/ano) e servidor.
- Integrar a saída do OCR com os dados de referência importados, a organização dos arquivos e o envio de e-mail.
- Tratar casos de baixa confiança, campos ausentes e documentos que não possam ser identificados, sem inventar dados nem salvar silenciosamente resultados incorretos.

### Envio de e-mail

- Utilizar SMTP por meio da configuração do ambiente (o desenvolvimento já considerou o servidor local Mercury SMTP).
- Manter o envio desacoplado das rotas para facilitar testes e tratamento de falhas.
- Não codificar host, credenciais ou outros segredos diretamente no código.

## Mapa real de rotas (20/10/2026)

- `GET /health` — verificação simples de disponibilidade.
- `GET /servidores` — lista `[{id, matricula, nome, email}]` lida de `.xlsx` em armazenamento temporário.
- `POST /calendario` — multipart `arquivo`; `.xlsx` até 10 MB; retorna `{eventos: [...]}` e guarda a planilha local. `.xls` binário ainda não é suportado.
- `POST /folhas` — multipart repetido `arquivos`; PDF até 25 MB; valida assinatura e extensão, retorna `{documentos: [...]}` com campos vazios, `nao_escaneado` e mensagem de OCR pendente.

### Rotas scaffold em `routes/Integracao.py`

Essas rotas já existem no OpenAPI e têm modelos de entrada para orientar o front. Elas não persistem nem enviam dados: GET de coleção retorna `[]`, GET de objeto/operações de gravação retornam `{}`. Leia a docstring da função antes de implementar. Não trate retorno vazio como sucesso persistido.

| Método e rota | Entrada esperada | Retorno scaffold | Próximo trabalho |
|---|---|---|---|
| `GET /notas?inicio=&fim=` | datas opcionais | `[]` | ler notas e filtrar por sobreposição |
| `POST /notas` | `titulo`, `inicio`, `fim`, `contexto` | `{}` | validar intervalo, gerar ID, persistir |
| `PUT /notas/{nota_id}` | mesmo corpo do POST | `{}` | atualizar ou 404 |
| `GET /marcacoes?inicio=&fim=` | datas opcionais | `[]` | ler marcações do período |
| `PUT /marcacoes` | lista de intervalos e tipo | `[]` | expandir intervalos e persistir |
| `GET /emails/pendentes` | — | `[]` | listar folhas elegíveis ainda não enviadas |
| `POST /emails/enviar` | `servidorId`, `destinatario`, `assunto`, `mensagem`, `arquivos` | `{}` | validar anexos persistidos, chamar SMTP, registrar resultado |
| `GET /rotinas` | — | `[]` | ler agendamentos |
| `POST /rotinas` | `data`, `destinatarios`, `descricao` | `{}` | validar data, persistir e integrar scheduler |
| `PUT /rotinas/{rotina_id}` | mesmo corpo do POST | `{}` | atualizar rotina e scheduler ou 404 |
| `GET /recebidos` | — | `[]` | conectar à caixa institucional com decisão aprovada |
| `PATCH /recebidos/{recebido_id}` | `status`: `pendente`, `concluida` ou `negada` | `{}` | persistir alteração ou 404 |
| `GET /historico?tipo=&pagina=&porPagina=` | filtro e paginação | `[]` | consultar histórico persistido |
| `GET /inicio` | — | `{}` | calcular indicadores sem inventar valores |
| `GET /notificacoes` | — | `[]` | listar estados recentes de envio |
| `GET /processamentos/{processamento_id}` | ID do lote | `{}` | criar persistência e devolver estado do OCR |

CORS libera `http://localhost:5173` e `http://127.0.0.1:5173`. As rotas scaffold não têm persistência nem chamam SMTP, IMAP ou scheduler. O front ainda precisa alinhar upload de folhas para ler `documentos` do envelope e usar os nomes dos campos multipart documentados.

## Como continuar o código

- Leia as docstrings do endpoint e do modelo de entrada no próprio arquivo; aparecem também em `/docs`.
- Mantenha a rota responsável por HTTP e mova leitura/gravação, SMTP, OCR e parsing para `services/` ou extratores próprios.
- Comece com armazenamento local institucional definido pelo projeto; não use variáveis globais para guardar estado de execução.
- Só responda sucesso depois de concluir a gravação ou operação externa. Valide IDs e devolva `404` quando o registro não existir.
- Use respostas com os mesmos campos dos exemplos em `Integracao_Backend.md`; datas ISO 8601 e statuses minúsculos sem acento.
- Não inclua dados pessoais ou segredos em logs. Não adicione login, banco de nuvem ou serviços de terceiros nesta fase.

## Foco de trabalho atual

1. Implementar e testar a extração OCR dos PDFs.
2. Definir um contrato consistente para os dados extraídos.
3. Integrar OCR, cadastro/calendário de referência, organização dos PDFs e envio de e-mail.
4. Melhorar validação, mensagens de erro e testes de cada etapa.

## Diretrizes de implementação

- Preferir rotas pequenas e específicas, com lógica de negócio em módulos de serviço/extratores.
- Usar UploadFile para uploads FastAPI e fechar/liberar recursos adequadamente.
- Tratar separadamente erros de arquivo inválido, falha de leitura, falha de OCR e falha de SMTP.
- Evitar ler ou manter arquivos inteiros em memória sem necessidade; considerar volume e tamanho dos PDFs.
- Manter caminhos de saída e nomes de arquivo seguros, removendo caracteres inadequados dos nomes.
- Não adicionar banco de dados, autenticação ou armazenamento em nuvem sem alinhar a decisão ao escopo do projeto.
- Ao alterar uma rota, explicar a responsabilidade dela, os dados de entrada/saída e como testar.

