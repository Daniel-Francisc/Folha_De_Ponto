# Integração Frontend ↔ Backend

Documento de apoio: lista **todos os pontos do frontend que vão receber dados do backend** e explica, de forma simples, como cada um é usado na tela.

> Situação revalidada em 21/10/2026: as rotas do backend estão implementadas e os dados operacionais são persistidos localmente em JSON. O frontend ainda não faz chamadas HTTP e as telas continuam usando dados de exemplo em `Frontend/FolhaDePonto/src/mocks/`.

---

## 1. Visão geral dos pontos de integração

| # | Área | Onde aparece | O que o front precisa | Mock atual |
|---|---|---|---|---|
| 1 | Servidores | Servidor (busca), Emails | lista de servidores (nome, matrícula, e-mail) | `mocks/servidores.js` |
| 2 | Upload de folha | Servidor (área central) | dados extraídos do PDF + score | `mocks/servidores.js` |
| 3 | Documentos do lote | Servidor (painel lateral) | lista de documentos com status | `mocks/servidores.js` |
| 4 | Calendário acadêmico | Calendário (importação) | eventos/feriados em JSON | — (ainda não renderiza) |
| 5 | Notas | Calendário (painel) | notas por período | `mocks/calendario.js` |
| 6 | Marcações | Calendário (grade) | dias marcados (sem aula / planejamento) | `mocks/calendario.js` |
| 7 | Arquivos pendentes | Emails › Enviar | folhas processadas ainda não enviadas | `mocks/emails.js` |
| 8 | Envio de e-mail | Emails › Enviar | confirmação/erro do SMTP | — |
| 9 | E-mails de rotina | Emails › Enviar | rotinas agendadas | `mocks/emails.js` |
| 10 | Recebidos | Emails › Recebidos | e-mails recebidos + status | `mocks/emails.js` |
| 11 | Histórico | Emails › Histórico | registros nominais/automáticos | `mocks/emails.js` |
| 12 | Início | Tela inicial | totais, última folha, pendências | `mocks/inicio.js` |
| 13 | Notificações | Sino do cabeçalho | últimos envios | — (vazio) |

---

## 2. Servidores

**Onde:** busca da tela Servidor e dados do painel lateral.

```json
[
  {
    "id": "s1",
    "matricula": "1234567",
    "nome": "Maria Silva",
    "email": "maria.silva@undf.edu.br"
  }
]
```

**Como o front usa**

- Guarda a lista em cache e filtra localmente enquanto o usuário digita.
- A busca aceita `1234567`, `Maria Silva` ou `1234567|Maria Silva` (o `|` combina número + nome).
- Ao escolher um servidor, preenche os campos do documento aberto e o destinatário do e-mail.

---

## 3. Upload de folha de ponto (PDF)

Onde: área central da tela Servidor.

Request: multipart/form-data com um ou mais PDFs enviados no campo repetido arquivos. Limite de 25 MB por PDF.

Resposta: o backend executa Tesseract e devolve sugestões para revisão humana no envelope documentos. A identificação do OCR não é confirmação nem salva o arquivo automaticamente.

Exemplo de item:

~~~json
{
  "id": "d1",
  "nome": "folha_digitalizada.pdf",
  "status": "baixo",
  "score": 0.92,
  "competencia": "09/2026",
  "servidorId": "1234567",
  "paginasLidas": 1,
  "armazenado": false,
  "caminho": null,
  "campos": {
    "servidor": "Maria Silva",
    "matricula": "1234567",
    "email": "",
    "competencia": "09/2026"
  },
  "mensagem": "Revise os campos extraídos antes de salvar a folha."
}
~~~

Como o front usa

- status define a cor do documento: corrigido (azul), ok (ciano), baixo (amarelo), nao_escaneado (neutro).
- score é a média das confianças de palavras do Tesseract no intervalo 0–1; não representa a probabilidade de o servidor ter sido identificado.
- campos preenche a aba Dados para revisão e correção.
- paginasLidas informa quantas páginas foram processadas.
- armazenado e caminho mostram se o PDF foi gravado. O upload sem servidor e competência confirmados apenas processa e devolve os dados.
- Status: nao_escaneado quando nenhum texto foi reconhecido; baixo quando a confiança está abaixo de 0,95 ou faltam matrícula/competência; ok quando os campos mínimos foram localizados e a confiança é pelo menos 0,95. corrigido fica reservado para revisão humana.

O executável Tesseract e o idioma português por.traineddata são requisitos do sistema que hospeda a API. Configure TESSERACT_CMD se tesseract.exe não estiver no PATH e TESSERACT_LANG para selecionar o idioma.

---
## 4. Calendário acadêmico (importação de planilha)

**Onde:** tela Calendário, ao soltar um `.xls/.xlsx` ou usar o botão flutuante.

**Resposta atual para `.xlsx`:**

```json
{
  "eventos": [
    { "data": "2026-10-12", "titulo": "Recesso", "tipo": "recesso" },
    { "data": "2026-10-15", "titulo": "Feriado", "tipo": "feriado" }
  ]
}
```

**Como o front usa**

- Cada evento vira uma marca visual no dia correspondente (já existe o espaço reservado na célula).
- ⚠️ Hoje a importação apenas registra o nome do arquivo; a renderização dos eventos ainda não foi implementada.

O backend aceita `.xlsx` e `.xls` de até 10 MB. Para `.xls`, `xlrd==2.0.2` lê o formato binário. A primeira aba precisa ter uma coluna `Data`; colunas reconhecidas para título: `Título`, `Evento`, `Descrição` ou `Feriado`; para tipo: `Tipo` ou `Categoria`. Planilhas sem coluna `Data` podem ser importadas como cadastro. O `GET /servidores` lê arquivos importados se encontrar colunas `Matrícula`/`SIAPE` e `Nome`/`Servidor`.

---

## 5. Notas do calendário

**Onde:** painel da tela Calendário.

```json
{
  "id": "n1",
  "titulo": "Semana de avaliações",
  "inicio": "2026-10-19",
  "fim": "2026-10-23",
  "contexto": "Aplicação das provas do 2º bimestre."
}
```

**Como o front usa**

- Todo dia entre `inicio` e `fim` recebe **fundo azul claro** no calendário.
- Ao clicar em um dia coberto, o painel mostra título, período e contexto.
- O botão **Editar** abre o formulário preenchido; salvar faz `PUT` da nota.

**Endpoints sugeridos:** `GET /notas?inicio=&fim=`, `POST /notas`, `PUT /notas/{id}`.

---

## 6. Marcações de dias

**Onde:** grade do calendário (esferas e linhas).

```json
[
  { "dia": "2026-10-12", "tipos": ["semAula"] },
  { "dia": "2026-10-13", "tipos": ["semAula"] },
  { "dia": "2026-10-26", "tipos": ["planejamento"] }
]
```

**Como o front usa**

- `semAula` = esfera vermelha; `planejamento` = esfera roxa.
- Dias consecutivos do mesmo tipo são **conectados por uma linha** automaticamente.
- O menu de contexto (botão direito) adiciona/remove marcações de um dia ou de um intervalo.

---

## 7. Arquivos não enviados (aba Enviar)

```json
[
  {
    "id": "a1",
    "nome": "Folha_2026-09_Maria_Silva.pdf",
    "servidor": "Maria Silva",
    "email": "maria.silva@undf.edu.br",
    "competencia": "09/2026",
    "score": 0.97
  }
]
```

**Como o front usa**

- Lista no card lateral; o usuário marca quais entram no e-mail.
- Os e-mails dos arquivos marcados viram os destinatários.
- Depois de enviar, os arquivos saem da lista.

---

## 8. Envio de e-mail

**Request:**

```json
{
  "servidorId": "s1",
  "destinatario": "maria.silva@undf.edu.br",
  "assunto": "Folha de ponto — 09/2026",
  "mensagem": "Prezado(a)...",
  "arquivos": ["a1"]
}
```

**Response:**

```json
{ "id": "h1", "status": "sucesso" }
```

**Como o front usa**

- Enquanto envia, mostra estado de carregamento.
- Em caso de erro, exibe a mensagem em linguagem simples (sem stack trace).
- Em sucesso, o registro entra no Histórico e os arquivos saem da lista de pendentes.

---

## 9. E-mails de rotina

```json
[
  {
    "id": "r1",
    "data": "2026-10-25T09:00",
    "destinatarios": ["maria.silva@undf.edu.br"],
    "descricao": "Envio mensal das folhas"
  }
]
```

**Como o front usa**

- Tabela abaixo do e-mail; a data/hora é editável com `datetime-local` e `min` = agora (não permite passado).
- Alterar a data deve disparar `PUT /rotinas/{id}`.

---

## 10. Recebidos

```json
{
  "id": "rc1",
  "remetente": "Maria Silva",
  "email": "maria.silva@undf.edu.br",
  "assunto": "Dúvida sobre a folha de 09/2026",
  "corpo": "Boa tarde...",
  "data": "2026-10-20T10:12:00",
  "status": "pendente"
}
```

**Como o front usa**

- O primeiro da lista abre no visualizador; os demais aparecem em "Outras notificações".
- `status`: `pendente` (amarelo), `concluida` (verde) ou `negada` (vermelho).
- Os botões **Concluir** / **Negar** alteram o status (`PATCH /recebidos/{id}`).

---

## 11. Histórico de envios

```json
{
  "id": "h1",
  "tipo": "nominal",
  "data": "2026-10-19T14:32:00",
  "destinatario": "maria.silva@undf.edu.br",
  "assunto": "Folha de ponto — 09/2026",
  "corpo": "Prezado(a) Maria...",
  "arquivos": [
    { "id": "f1", "nome": "Folha_2026-09_Maria_Silva.pdf" },
    { "id": "f2", "nome": "Comprovante_09-2026_Maria_Silva.pdf" }
  ]
}
```

**Como o front usa**

- `tipo`: `nominal` (envio para uma pessoa, com arquivos) ou `automatico` (rotina do sistema).
- O filtro da tabela separa os dois tipos.
- A paginação hoje é local (5 a 50 por página). Se o volume crescer, o backend pode paginar via `?pagina=&porPagina=`.
- Ao abrir um registro nominal, os `arquivos` aparecem na faixa lateral; clicar em um deles troca o visualizador de e-mail pelo de arquivo.

---

## 12. Tela Início

```json
{
  "totalFolhasMes": 128,
  "ultimaFolha": { "nome": "Folha_2026-09_Maria_Silva.pdf", "data": "2026-10-19T14:32:00" },
  "solicitacoesPendentes": 3,
  "ultimosEnvios": [
    { "id": "e1", "arquivo": "Folha_2026-09_Maria_Silva.pdf", "destinatario": "maria.silva@undf.edu.br", "data": "2026-10-19T14:32:00", "status": "sucesso" }
  ]
}
```

**Como o front usa**

- `totalFolhasMes` → número grande do card "Funcionários".
- `ultimosEnvios` → carrossel do card "Emails" (até 3).
- `ultimaFolha` e `solicitacoesPendentes` → bloco de resumo (ainda vazio na UI).

---

## 13. Central de notificações (sino)

```json
[
  { "id": "n1", "arquivo": "Folha_2026-09_Maria_Silva.pdf", "data": "2026-10-19T14:32:00", "status": "sucesso" }
]
```

**Como o front usa**

- Painel do sino no cabeçalho; `status` também define a cor/ícone.
- Hoje o painel está vazio e fixo (placeholder).

---

## 14. Regras gerais combinadas

### Mapa de rotas (20/10/2026)

| Método e rota | Entrada | Estado/saída |
|---|---|---|
| `GET /health` | — | `{ "status": "ok" }` |
| `GET /servidores` | — | Lista `[{id, matricula, nome, email}]` ou `[]` |
| `GET /calendario` | — | `{ "eventos": [...] }` lidos das planilhas de calendário |
| `POST /calendario` | Multipart `arquivo` (`.xls`/`.xlsx`, até 10 MB) e `categoria` (`calendario` ou `servidores`) | `{ "eventos": [...], "categoria": "...", "arquivo": "..." }`; grava em `Excel/Calendario_Academico` ou `Excel/Lista_de_Servidores` |
| POST /folhas | Multipart arquivos repetido (PDF, até 25 MB cada); opcionalmente recebe servidor_id, servidor_nome, competencia (AAAA-MM) e substituir=true | Executa OCR Tesseract, devolve `processamentoId` e documentos; grava PDFs somente após receber metadados confirmados |
| `GET /processamentos/{id}` | ID do lote | Resultado persistido do OCR ou 404 |
| `GET /notas?inicio=&fim=` | datas ISO opcionais | Notas persistidas que cruzam o período |
| `POST /notas` | título, início, fim, contexto | Nota criada com ID |
| `PUT /notas/{id}` | dados completos da nota | Nota atualizada ou 404 |
| `GET /marcacoes?inicio=&fim=` | datas ISO opcionais | Lista `{dia, tipos}` |
| `PUT /marcacoes` | lista de início/fim/tipo | Dias expandidos e persistidos; operação aditiva |
| `GET /emails/pendentes` | — | PDFs confirmados ainda não enviados |
| `POST /emails/enviar` | servidor, destinatário(s), assunto, mensagem e IDs/objetos de arquivos | Envio SMTP e registro do resultado |
| `GET /rotinas` | — | Agendamentos locais persistidos |
| `POST /rotinas` | data, destinatários, descrição | Rotina validada em `aguardando_configuracao` |
| `PUT /rotinas/{id}` | dados da rotina | Rotina atualizada ou 404 |
| `GET /recebidos` | — | Mensagens já importadas; não acessa IMAP |
| `PATCH /recebidos/{id}` | status `pendente`, `concluida` ou `negada` | Estado atualizado ou 404 |
| `GET /historico?tipo=&pagina=&porPagina=` | filtro e paginação | Registros reais de tentativas/envios |
| `GET /inicio` | — | Indicadores calculados de dados persistidos |
| `GET /notificacoes` | — | Estados recentes de envio |

O backend habilita CORS para `localhost:5173` e `127.0.0.1:5173`. A classe `Backend/services/ArmazenamentoArquivos.py` grava referências e PDFs em `Backend/arquivos/recebidos` (ou em `FOLHA_STORAGE_DIR`); `Backend/services/RepositorioLocal.py` persiste os metadados na subpasta `Dados`. PDFs só são armazenados depois que servidor e competência forem informados. O OCR retorna sugestões; os metadados confirmados são necessários para salvar.

Ao substituir um PDF existente com `substituir=true`, o anterior permanece na mesma pasta com nome `{nome}-{AAAA-MM}_OLD_[AAAAMMDD-HHMMSS].pdf`. Sem a flag, a API retorna conflito e mantém o original.

## OCR Tesseract

Backend/requirements.txt registra pytesseract, PyMuPDF e Pillow. O executável Tesseract OCR e o modelo de idioma por.traineddata são pré-requisitos externos ao pip. Se tesseract.exe não estiver no PATH do processo da API, configure TESSERACT_CMD; o idioma pode ser trocado por TESSERACT_LANG.

Backend/services/TesseractOCR.py converte cada página do PDF em imagem e extrai texto/confiança. Backend/services/ProcessadorFolhas.py reconhece rótulos de servidor, matrícula, e-mail e competência. POST /folhas persiste cada lote para consulta em GET /processamentos/{id}; o processamento OCR é síncrono.
- **Datas**: enviar em ISO 8601 (`2026-10-19`, `2026-10-19T14:32:00`). O front converte para o formato brasileiro na exibição.
- **Status**: usar exatamente os valores dos enums acima (minúsculos, sem acento).
- **Erros**: responder com status HTTP correto e corpo `{ "detail": "mensagem" }`, para o front exibir a mensagem.
- **CORS**: o backend libera `localhost:5173` e `127.0.0.1:5173` para o Vite.
- **Uploads**: PDFs digitalizados podem ser grandes; definir limite e devolver erro claro ao exceder.
- **Sem autenticação** nesta fase.

---

## 15. Arquivos de mock que serão removidos

`Frontend/FolhaDePonto/src/mocks/`

| Arquivo | Alimenta |
|---|---|
| `inicio.js` | tela Início |
| `servidores.js` | Servidor (busca, documentos) e Emails (arquivos) |
| `calendario.js` | Calendário (notas e marcações) |
| `emails.js` | Emails (pendentes, rotinas, recebidos, histórico) |

Cada arquivo tem um `TODO(dados)` no topo indicando a substituição.

