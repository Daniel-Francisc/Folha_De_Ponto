import { useEffect, useRef, useState } from 'react'
import styles from './Servidor.module.css'
import BuscaServidor from '../components/BuscaServidor.jsx'
import AreaFolhaDePonto from '../components/AreaFolhaDePonto.jsx'
import PainelDocumentos from '../components/PainelDocumentos.jsx'
import { emails, folhas, mensagemDeErro, servidores as apiServidores } from '../services/api.js'

/**
 * Tela de Servidor (Frontend/Agent.md, seção 5.2).
 *
 * Dados reais:
 * - GET /servidores ...... busca e cache
 * - GET /emails/pendentes  folhas já armazenadas aguardando envio
 * - POST /folhas .......... OCR do PDF (30–40 s por arquivo)
 */

/** Converte o score do OCR no status visual do painel. */
function statusPorScore(score) {
  if (score === null || score === undefined) return 'nao_escaneado'
  return score < 0.95 ? 'baixo' : 'ok'
}

/** Documento vindo de /emails/pendentes (já armazenado). */
function documentoPendente(item) {
  return {
    id: item.id,
    nome: item.nome,
    status: statusPorScore(item.score),
    score: item.score ?? null,
    competencia: item.competencia ?? '',
    servidorId: item.servidorId ?? null,
    campos: {
      servidor: item.servidor ?? '',
      matricula: item.servidorId ?? '',
      email: item.email ?? '',
      competencia: item.competencia ?? '',
      horarios: item.horarios ?? [],
    },
  }
}

/** Documento devolvido por POST /folhas (OCR recém-processado). */
function documentoProcessado(doc, urlPdf, arquivoOriginal) {
  return {
    id: doc.id,
    nome: doc.nome,
    status: doc.status,
    score: doc.score ?? null,
    competencia: doc.competencia ?? '',
    servidorId: doc.servidorId ?? null,
    campos: doc.campos ?? {},
    armazenado: doc.armazenado,
    mensagem: doc.mensagem,
    urlPdf,
    arquivoOriginal,
    paginaOrigem: doc.paginaOrigem,
  }
}

/** Campos do formulário lateral. */
function camposIniciais(documento, servidor) {
  const campos = documento?.campos ?? {}

  return [
    { id: 'servidor', rotulo: 'Servidor', valor: campos.servidor ?? servidor?.nome ?? '' },
    { id: 'matricula', rotulo: 'Matrícula', valor: campos.matricula ?? servidor?.matricula ?? '' },
    { id: 'email', rotulo: 'E-mail', valor: campos.email ?? servidor?.email ?? '' },
    {
      id: 'competencia',
      rotulo: 'Competência',
      valor: campos.competencia ?? documento?.competencia ?? '',
    },
    {
      id: 'horarios',
      rotulo: 'Horários lidos',
      valor: Array.isArray(campos.horarios) ? campos.horarios.join(', ') : (campos.horarios ?? ''),
    },
  ]
}

export default function Servidor() {
  const [busca, setBusca] = useState('')
  const [listaServidores, setListaServidores] = useState([])
  const [servidorSelecionado, setServidorSelecionado] = useState(null)

  const [documentos, setDocumentos] = useState([])
  const [documentoAtivoId, setDocumentoAtivoId] = useState(null)

  const [lado, setLado] = useState('direita')
  const [aba, setAba] = useState('documentos')
  const [mostrarOutros, setMostrarOutros] = useState(false)
  const [campos, setCampos] = useState([])

  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // URLs de blob dos PDFs enviados nesta sessão (liberadas ao sair da tela).
  const urlsPdf = useRef([])

  useEffect(
    () => () => {
      urlsPdf.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  const documentoAtivo = documentos.find((doc) => doc.id === documentoAtivoId) ?? null

  // Busca servidores e folhas pendentes ao abrir a tela.
  useEffect(() => {
    let ativo = true

    Promise.all([apiServidores.listar(), emails.pendentes()])
      .then(([lista, pendentes]) => {
        if (!ativo) return
        setListaServidores(lista)
        setDocumentos(pendentes.map(documentoPendente))
        setErro('')
      })
      .catch((falha) => {
        if (ativo) setErro(mensagemDeErro(falha))
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [])

  function abrirDocumento(documento) {
    const servidor =
      listaServidores.find((item) => item.id === documento.servidorId) ??
      listaServidores.find((item) => item.matricula === documento.servidorId) ??
      null

    setDocumentoAtivoId(documento.id)
    setServidorSelecionado(servidor)
    setCampos(camposIniciais(documento, servidor))
    setAba('dados')
  }

  function escolherServidor(servidor) {
    setServidorSelecionado(servidor)
    setBusca(servidor.matricula)
    setCampos(camposIniciais(documentoAtivo, servidor))
  }

  /** Envia o PDF para OCR e adiciona o resultado ao painel. */
  async function enviarArquivo(arquivo) {
    setProcessando(true)
    setErro('')

    try {
      const resposta = await folhas.processar([arquivo])
      const urlPdf = URL.createObjectURL(arquivo)
      urlsPdf.current.push(urlPdf)

      const novos = resposta.documentos.map((doc) => documentoProcessado(doc, urlPdf, arquivo))

      setDocumentos((atuais) => [...novos, ...atuais])
      if (novos[0]) abrirDocumento(novos[0])
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    } finally {
      setProcessando(false)
    }
  }

  function editarCampo(id, valor) {
    setCampos((atuais) =>
      atuais.map((campo) => (campo.id === id ? { ...campo, valor } : campo)),
    )
  }

  /** Persiste as correções e deixa o backend definir o caminho final do PDF. */
  async function salvarDados() {
    if (!documentoAtivo) return
    const valor = (id) => campos.find((campo) => campo.id === id)?.valor?.trim() ?? ''
    const competenciaTela = valor('competencia')
    const competenciaApi = /^\d{4}-(0[1-9]|1[0-2])$/.test(competenciaTela)
      ? competenciaTela
      : competenciaTela.replace(/^(\d{1,2})\/(\d{4})$/, (_, mes, ano) => `${ano}-${mes.padStart(2, '0')}`)

    setSalvando(true)
    setErro('')
    try {
      const salvo = await folhas.editar(documentoAtivo.id, {
        arquivoOriginal: documentoAtivo.armazenado ? undefined : documentoAtivo.arquivoOriginal,
        pagina: documentoAtivo.paginaOrigem,
        servidorId: valor('matricula'),
        servidorNome: valor('servidor'),
        email: valor('email'),
        competencia: competenciaApi,
        horarios: valor('horarios'),
      })
      setDocumentos((atuais) => atuais.map((doc) => (
        doc.id === documentoAtivo.id
          ? {
              ...doc,
              ...salvo,
              status: 'corrigido',
              competencia: salvo.competencia,
              servidorId: salvo.servidorId,
              armazenado: true,
              campos: {
                ...doc.campos,
                servidor: salvo.servidor,
                matricula: salvo.servidorId,
                email: salvo.email ?? doc.campos.email ?? '',
                competencia: salvo.competencia,
                horarios: salvo.horarios ?? [],
              },
            }
          : doc
      )))
      setErro('')
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className={styles.pagina} aria-labelledby="titulo-servidor">
      <h1 id="titulo-servidor">Servidor</h1>

      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}

      <BuscaServidor
        servidores={listaServidores}
        valor={busca}
        onValorChange={setBusca}
        onSelecionar={escolherServidor}
        servidorSelecionado={servidorSelecionado}
        carregando={carregando}
      />

      <div className={styles.conteudo} data-lado={lado}>
        <div className={styles.central}>
          <AreaFolhaDePonto
            documentoAtivo={documentoAtivo}
            documentos={documentos}
            onEnviarArquivo={enviarArquivo}
            enviando={processando}
            mostrarOutros={mostrarOutros}
            onAlternarOutros={() => setMostrarOutros((atual) => !atual)}
            onSelecionar={abrirDocumento}
          />
        </div>

        <PainelDocumentos
          documentos={documentos}
          docAtivoId={documentoAtivoId}
          onSelecionar={abrirDocumento}
          campos={campos}
          onCampoChange={editarCampo}
          onSalvar={salvarDados}
          salvando={salvando}
          aba={aba}
          onAba={setAba}
          lado={lado}
          onAlternarLado={() => setLado((atual) => (atual === 'direita' ? 'esquerda' : 'direita'))}
        />
      </div>
    </section>
  )
}
