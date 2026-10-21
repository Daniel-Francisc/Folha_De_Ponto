import axios from 'axios'

/**
 * Camada única de acesso à API (Frontend/Agent.md, seção 8).
 *
 * Todas as telas devem falar com o backend por aqui — nunca com `fetch` ou
 * `axios` direto no componente. Assim a URL base e o tratamento de erro ficam
 * em um lugar só.
 *
 * A URL vem de `VITE_API_URL` (arquivo .env) e cai para o backend local.
 */

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export const http = axios.create({
  baseURL: BASE_URL,
  // Tempo padrão curto; uploads de OCR usam timeout próprio (mais longo).
  timeout: 30000,
})

/**
 * Transforma qualquer falha em uma mensagem pronta para a tela.
 * O backend responde erros como `{ "detail": "..." }` (às vezes uma lista de
 * validação do FastAPI).
 */
export function mensagemDeErro(erro) {
  if (erro?.code === 'ECONNABORTED') return 'O servidor demorou para responder. Tente novamente.'
  if (!erro?.response) return 'Não foi possível falar com o servidor. Ele está rodando?'

  const detalhe = erro.response.data?.detail

  if (Array.isArray(detalhe)) {
    const primeiro = detalhe[0]
    return primeiro?.msg ?? 'Dados inválidos.'
  }

  return detalhe || `Falha na comunicação (HTTP ${erro.response.status}).`
}

const pegar = (url, config) => http.get(url, config).then((resposta) => resposta.data)
const enviar = (url, dados, config) => http.post(url, dados, config).then((resposta) => resposta.data)
const atualizar = (url, dados) => http.put(url, dados).then((resposta) => resposta.data)
const corrigir = (url, dados) => http.patch(url, dados).then((resposta) => resposta.data)

/** Monta multipart e envia com timeout longo (OCR pode levar ~40 s por PDF). */
function enviarFormulario(url, campos) {
  const formulario = new FormData()

  Object.entries(campos).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null) return

    if (Array.isArray(valor)) {
      valor.forEach((item) => formulario.append(chave, item))
    } else {
      formulario.append(chave, valor)
    }
  })

  return enviar(url, formulario, {
    // Deixe o navegador/Axios gerar o boundary do multipart automaticamente.
    timeout: 300000,
  })
}

/** Envia campos multipart por PUT para edição de uma folha revisada. */
function atualizarFormulario(url, campos) {
  const formulario = new FormData()
  Object.entries(campos).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null) return
    formulario.append(chave, valor)
  })
  return http.put(url, formulario, { timeout: 300000 }).then((resposta) => resposta.data)
}

/* -------------------------------------------------------------------------
   Servidores
   ------------------------------------------------------------------------- */

export const servidores = {
  /** GET /servidores → [{ id, matricula, nome, email }] */
  listar: () => pegar('/servidores'),
}

/* -------------------------------------------------------------------------
   Calendário (planilha), notas e marcações
   ------------------------------------------------------------------------- */

export const calendario = {
  /** GET /calendario → { eventos: [{ data, titulo, tipo }] } */
  listarEventos: () => pegar('/calendario'),

  /**
   * POST /calendario (multipart: arquivo + categoria)
   * categoria: 'calendario' (padrão) ou 'servidores'
   */
  importar: (arquivo, categoria = 'calendario') =>
    enviarFormulario('/calendario', { arquivo, categoria }),
}

export const notas = {
  /** GET /notas?inicio=AAAA-MM-DD&fim=AAAA-MM-DD */
  listar: ({ inicio, fim } = {}) => pegar('/notas', { params: { inicio, fim } }),

  /** POST /notas → nota criada (com id) */
  criar: (nota) => enviar('/notas', nota),

  /** PUT /notas/{id} */
  atualizar: (id, nota) => atualizar(`/notas/${id}`, nota),
}

export const marcacoes = {
  /** GET /marcacoes?inicio=&fim= → [{ dia, tipos }] */
  listar: ({ inicio, fim } = {}) => pegar('/marcacoes', { params: { inicio, fim } }),

  /** PUT /marcacoes → [{ inicio, fim, tipo }] */
  salvar: (intervalos) => atualizar('/marcacoes', intervalos),
}

/* -------------------------------------------------------------------------
   Folhas de ponto (PDF + OCR)
   ------------------------------------------------------------------------- */

export const folhas = {
  /**
   * POST /folhas (multipart: arquivos[])
   * Sem os campos de servidor o PDF só é analisado (não é armazenado).
   * Para armazenar: servidorId, servidorNome e competencia (AAAA-MM) juntos.
   */
  processar: (
    arquivos,
    { servidorId, servidorNome, competencia, substituir = false } = {},
  ) =>
    enviarFormulario('/folhas', {
      arquivos,
      servidor_id: servidorId,
      servidor_nome: servidorNome,
      competencia,
      substituir: substituir ? 'true' : undefined,
    }),

  /**
   * PUT /folhas/{id}/editar (multipart): salva dados corrigidos e reorganiza o PDF.
   * Para um OCR ainda não salvo, envie arquivoOriginal e pagina (1-based).
   */
  editar: (id, {
    arquivoOriginal,
    pagina,
    servidorId,
    servidorNome,
    email,
    competencia,
    horarios = '',
    substituir = false,
  }) => atualizarFormulario(`/folhas/${id}/editar`, {
    arquivo: arquivoOriginal,
    pagina,
    servidor_id: servidorId,
    servidor_nome: servidorNome,
    email,
    competencia,
    horarios,
    substituir: substituir ? 'true' : 'false',
  }),

  /** GET /processamentos/{id} */
  processamento: (id) => pegar(`/processamentos/${id}`),
}

/* -------------------------------------------------------------------------
   E-mails
   ------------------------------------------------------------------------- */

export const emails = {
  /** GET /emails/pendentes → documentos aguardando envio */
  pendentes: () => pegar('/emails/pendentes'),

  /**
   * POST /emails/enviar
   * { servidorId, destinatario, assunto, mensagem, arquivos: [id] }
   */
  enviar: (dados) => enviar('/emails/enviar', dados),
}

export const rotinas = {
  /** GET /rotinas → [{ id, data, destinatarios, descricao, status }] */
  listar: () => pegar('/rotinas'),

  /** POST /rotinas */
  criar: (rotina) => enviar('/rotinas', rotina),

  /** PUT /rotinas/{id} */
  atualizar: (id, rotina) => atualizar(`/rotinas/${id}`, rotina),
}

export const recebidos = {
  /** GET /recebidos */
  listar: () => pegar('/recebidos'),

  /** PATCH /recebidos/{id} com { status: 'pendente' | 'concluida' | 'negada' } */
  definirStatus: (id, status) => corrigir(`/recebidos/${id}`, { status }),
}

export const historico = {
  /**
   * GET /historico?tipo=nominal|automatico&pagina=1&porPagina=5..50
   * Devolve apenas a página (sem total).
   */
  listar: ({ tipo, pagina = 1, porPagina = 10 } = {}) =>
    pegar('/historico', { params: { tipo, pagina, porPagina } }),
}

/* -------------------------------------------------------------------------
   Painel inicial e notificações
   ------------------------------------------------------------------------- */

export const painel = {
  /** GET /inicio → { totalFolhasMes, ultimaFolha, solicitacoesPendentes, ultimosEnvios } */
  inicio: () => pegar('/inicio'),

  /** GET /notificacoes */
  notificacoes: () => pegar('/notificacoes'),
}

/** GET /health — útil para mostrar "API offline" no cabeçalho. */
export const health = () => pegar('/health', { timeout: 5000 })

export default {
  http,
  mensagemDeErro,
  servidores,
  calendario,
  notas,
  marcacoes,
  folhas,
  emails,
  rotinas,
  recebidos,
  historico,
  painel,
  health,
}
