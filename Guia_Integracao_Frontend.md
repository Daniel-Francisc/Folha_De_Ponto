# Guia de integração do frontend com a API

Este guia descreve como conectar as telas React à API FastAPI existente. Foi conferido com os arquivos atuais de `Backend/routes/` e `Backend/Main.py`. Os contratos podem mudar; antes de implementar, confirme o handler correspondente e mantenha este documento alinhado com `Backend/Agent.md`.

## Situação atual

As telas do frontend ainda usam dados de exemplo em `Frontend/FolhaDePonto/src/mocks/`; não trate esses dados como respostas da API. O backend disponibiliza as rotas listadas neste guia, mas alguns fluxos ainda têm limitações importantes:

- OCR é executado de forma síncrona com Tesseract. Para a API funcionar, o servidor precisa ter o executável e o idioma configurados.
- O OCR apenas sugere valores. A primeira chamada sem dados confirmados não armazena o PDF. Para gravar depois da revisão, o contrato atual exige enviar novamente o PDF junto com os metadados confirmados; ainda não existe um endpoint separado para confirmar um processamento existente.
- Não há rota para baixar/visualizar o PDF armazenado. A resposta não expõe caminhos absolutos do disco e o frontend não deve tentar usá-los como URL.
- Rotinas são salvas com status `aguardando_configuracao`, mas não disparam e-mails automaticamente.
- A lista de recebidos só retorna mensagens já persistidas; não há importação de caixa de e-mail por IMAP.
- Marcações são aditivas: não há remoção nem substituição total.

## Endereço e cliente HTTP

Durante desenvolvimento, inicie a API na raiz do repositório com `uvicorn Backend.Main:app --reload`. A documentação interativa fica em `http://127.0.0.1:8000/docs`. CORS está liberado para `http://localhost:5173` e `http://127.0.0.1:5173`.

Crie um único módulo de acesso HTTP no frontend (por exemplo, `src/services/api.js`) e concentre nele a URL base, serialização JSON, respostas de erro e uploads multipart. Não espalhe URLs completas e lógica de `fetch` pelas telas. Se usar variável Vite, mantenha apenas a URL pública da API em `VITE_API_BASE_URL`; nunca coloque credenciais SMTP ou segredos no frontend. A ausência da variável pode usar `http://127.0.0.1:8000` como padrão de desenvolvimento.

Exemplo de funções utilitárias sem dependências adicionais:

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function apiJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail ?? `A API respondeu com erro ${response.status}.`);
  }
  return payload;
}
```

Para `FormData`, **não** defina manualmente `Content-Type`: o navegador precisa incluir o boundary multipart. Reutilize também o tratamento de status e `detail` mostrado acima. Cada tela deve apresentar estados de carregamento, erro, vazio e sucesso; em falha de rede, mantenha as alterações do usuário quando possível e ofereça nova tentativa.

## Mapa de chamadas por tela

| Tela/uso | Chamada | Formato e resultado |
|---|---|---|
| Inicialização/diagnóstico | `GET /health` | `{ "status": "ok" }` |
| Busca de servidores | `GET /servidores` | Lista direta de `{id, matricula, nome, email}`; pode ser `[]`. Carregue e atualize o cache a partir desta resposta. |
| Importar calendário ou cadastro | `POST /calendario` | `multipart/form-data`: `arquivo` e `categoria` (`calendario` ou `servidores`). XLS/XLSX até 10 MB. Retorna `{eventos, categoria, arquivo}`. |
| Mostrar eventos importados | `GET /calendario` | `{ eventos: [{data: "YYYY-MM-DD", titulo, tipo}] }`. |
| Processar PDF para revisão | `POST /folhas` | Multipart com um ou mais campos repetidos `arquivos`; sem metadados roda OCR, mas não salva. Limite de 25 MB por PDF. |
| Consultar lote OCR | `GET /processamentos/{processamentoId}` | Registro `{id,status,criadoEm,documentos}` ou `404`. A chamada OCR atual é síncrona, então é consulta posterior, não polling obrigatório. |
| Salvar nota no calendário | `POST /notas`; editar: `PUT /notas/{id}` | JSON `{titulo,inicio,fim,contexto}` com datas `YYYY-MM-DD`; resposta contém `id` e timestamps. |
| Consultar notas | `GET /notas?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` | Lista direta. Os filtros são opcionais e incluem notas que cruzem o período. |
| Consultar marcações | `GET /marcacoes?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` | Lista direta `{dia,tipos}`; tipos aceitos: `semAula`, `planejamento`. |
| Adicionar marcações | `PUT /marcacoes` | JSON: lista de intervalos `{inicio,fim,tipo}`. A resposta é a lista completa atualizada. Não envia `[]` esperando limpar dados. |
| Listar folhas para envio | `GET /emails/pendentes` | Lista direta de documentos confirmados com `statusEnvio: "pendente"`. |
| Enviar e-mail | `POST /emails/enviar` | JSON documentado abaixo. Retorna registro de histórico; erro SMTP: `502`, configuração ausente: `503`. |
| Consultar/criar/editar rotina | `GET/POST /rotinas`, `PUT /rotinas/{id}` | JSON abaixo; persistência não significa que haverá envio automático. |
| Listar/atualizar recebidos | `GET /recebidos`, `PATCH /recebidos/{id}` | Lista direta; alteração `{status:"pendente"|"concluida"|"negada"}`. Pode estar vazia até existir importação externa. |
| Histórico | `GET /historico?tipo=nominal&pagina=1&porPagina=10` | Lista direta da página; `tipo` opcional (`nominal`/`automatico`), `porPagina` entre 5 e 50. Não há total de páginas na resposta. |
| Indicadores da tela inicial | `GET /inicio` | Objeto descrito adiante; `ultimosEnvios` contém até 3 itens. |
| Sino de notificações | `GET /notificacoes` | Lista direta com até 50 tentativas reais de envio. |

## Upload de planilhas

Exemplo para calendário; para a lista de servidores, use `categoria = "servidores"`:

```js
export async function importarPlanilha(arquivo, categoria) {
  const form = new FormData();
  form.append("arquivo", arquivo);
  form.append("categoria", categoria);

  const response = await fetch(`${API_BASE}/calendario`, { method: "POST", body: form });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.detail ?? "Não foi possível importar a planilha.");
  return payload;
}
```

Ao importar cadastro, atualize a lista em memória chamando `GET /servidores` após o sucesso. Ao importar calendário, use os `eventos` da resposta e/ou recarregue `GET /calendario`. Não transforme um retorno vazio em erro: planilha de servidores não retorna eventos.

## Upload e confirmação de folhas PDF

Envie cada lote sem metadados para apresentar as sugestões do OCR:

```js
const form = new FormData();
arquivos.forEach((arquivo) => form.append("arquivos", arquivo));
const resultado = await fetch(`${API_BASE}/folhas`, { method: "POST", body: form });
```

O contrato de resposta é `{processamentoId, documentos}`. Um documento contém `id`, `nome`, `status`, `score`, `competencia`, `servidorId`, `armazenado`, `caminho` relativo ou `null`, `campos`, `paginasLidas` e `mensagem`. `campos` inclui sugestões como servidor, matrícula, e-mail e competência. O score é confiança média do reconhecimento de texto, não probabilidade de identificação correta; sempre permita revisão humana.

**Passo para persistir após revisão:** a rota exige um único PDF por requisição quando há metadados. O formulário deve conservar o `File` original selecionado; após a pessoa confirmar servidor e competência, enviar esse mesmo arquivo de novo em `arquivos`, com `servidor_id`, `servidor_nome`, `competencia` no formato `AAAA-MM` e, se a pessoa autorizou substituir uma folha existente, `substituir=true`. A resposta então deve indicar `armazenado: true`. Como ainda não há endpoint que aceite apenas `processamentoId + metadados`, documente essa nova transmissão para o usuário em vez de afirmar que o primeiro upload já ficou salvo.

## Contratos JSON usados nas telas

### Notas

```json
{
  "titulo": "Semana de avaliações",
  "inicio": "2026-10-19",
  "fim": "2026-10-23",
  "contexto": "Aplicação das provas."
}
```

`POST` cria e devolve o registro com `id`; `PUT /notas/{id}` edita um existente. O backend não tem rota de exclusão. Datas invertidas retornam `422`.

### Marcações

```json
[
  { "inicio": "2026-10-12", "fim": "2026-10-13", "tipo": "semAula" },
  { "inicio": "2026-10-26", "fim": "2026-10-26", "tipo": "planejamento" }
]
```

`PUT` combina os intervalos recebidos com a lista salva; tipos já existentes são preservados. Não há remoção de marcação no contrato atual.

### Envio nominal

```json
{
  "servidorId": "1234567",
  "destinatario": "maria.silva@undf.edu.br",
  "assunto": "Folha de ponto — 09/2026",
  "mensagem": "Prezada Maria, segue sua folha de ponto.",
  "arquivos": ["id-persistido-do-documento"]
}
```

`arquivos` aceita IDs como strings ou objetos `{ "id", "nome" }`. Prefira IDs. `destinatario` é uma única string, com vários e-mails separados por vírgula, se necessário. O valor usado no frontend para corpo/contexto deve ser enviado como `mensagem`. Somente arquivos já salvos e ainda pendentes podem ser anexados. O envio chama SMTP de verdade; não simule sucesso localmente. Após resposta positiva, recarregue pendentes, histórico, início e notificações.

### Rotinas

```json
{
  "data": "2026-10-25T09:00",
  "destinatarios": ["maria.silva@undf.edu.br"],
  "descricao": "Envio mensal das folhas"
}
```

A resposta inclui `status: "aguardando_configuracao"`. O frontend deve rotular como rotina cadastrada/aguardando configuração, nunca como e-mail enviado ou agendamento executável.

### Tela inicial e notificações

`GET /inicio` responde, por exemplo:

```json
{
  "totalFolhasMes": 0,
  "ultimaFolha": null,
  "solicitacoesPendentes": 0,
  "ultimosEnvios": []
}
```

Os nomes dos campos são `totalFolhasMes`, `ultimaFolha`, `solicitacoesPendentes` e **`ultimosEnvios`**. Não usar o nome de mock `enviosRecentes`. `GET /notificacoes` retorna itens `{id,arquivo,data,status}`; `status` reflete tentativa real de SMTP (`sucesso`/`erro`), não processamento em andamento.

### Histórico, recebidos e paginação

Histórico e recebidos retornam arrays diretos, não `{items,total}`. Histórico oferece fatias por página sem total; o frontend pode indicar página atual e desabilitar “próxima” quando a página vier incompleta (ou vier vazia), mas não pode calcular um total exato sem nova rota. Recebidos pode retornar `[]`, pois a integração IMAP ainda não existe. O modelo visual de mock com campos adicionais só deve ser usado quando esses campos existirem no JSON real.

## Tratamento de erro e estados de interface

Respostas FastAPI com falha geralmente usam `{ "detail": "mensagem" }`. Trate pelo menos:

| HTTP | Significado típico | Ação sugerida na tela |
|---|---|---|
| `400` | Entrada/categoria/formato inválido | Explicar o formato ou valor aceito e permitir corrigir. |
| `404` | ID inexistente ou folha não disponível | Atualizar a lista e avisar que o registro não está mais disponível. |
| `409` | Arquivo duplicado ou operação concorrente | Não repetir automaticamente; pedir decisão/aguardar e tentar novamente. |
| `413` | Upload acima de 10 MB (planilha) ou 25 MB (PDF) | Mostrar limite específico. |
| `415` | Arquivo de folha não é PDF válido | Pedir um PDF válido. |
| `422` | Campo ausente/inválido, PDF não processável, destinatário inválido | Mostrar `detail` de forma compreensível junto à ação/formulário. |
| `502` | Falha real ao enviar por SMTP | Indicar falha e manter opção de nova tentativa. |
| `503` | Serviço necessário não configurado (SMTP/OCR/leitura) | Explicar que o serviço está indisponível e orientar contato com responsável. |

Não registre PDFs, dados pessoais, caminhos locais ou segredos no console. Não apague ou limpe formulário/cache se a chamada falhar. Valide também no cliente, mas considere o backend como fonte final da validação.

## Sequência sugerida de integração

1. Criar o cliente HTTP compartilhado e centralizar base URL e erros.
2. Trocar a busca de servidores por `GET /servidores`; manter cache apenas como acelerador e oferecer atualização.
3. Ligar importação de planilha e eventos às duas rotas de `/calendario`.
4. Integrar o envio de PDF em duas etapas (OCR e reenvio após confirmação), mostrando claramente quando `armazenado` é falso.
5. Ligar notas e marcações, respeitando ausência de exclusão e caráter aditivo das marcações.
6. Conectar envio, rotina, recebidos, histórico, início e notificações aos contratos acima.
7. Remover mocks por tela somente quando os estados de carregamento, vazio, erro e sucesso estiverem cobertos; atualizar `Frontend/Agent.md` e este guia quando a integração mudar.

## Verificação local

- API: abra `http://127.0.0.1:8000/docs` e confira o contrato ativo.
- Frontend: use a origem local autorizada pelo CORS (`http://localhost:5173` ou `http://127.0.0.1:5173`).
- Nunca instale dependências Python para integrar o frontend. Não adicione biblioteca HTTP: o navegador já oferece `fetch`, e qualquer nova dependência do frontend precisa seguir as instruções de `Frontend/Agent.md`.
- Faça testes manuais com dados não sensíveis. O teste real de SMTP exige configuração do backend; OCR exige Tesseract e idioma português no host da API.
