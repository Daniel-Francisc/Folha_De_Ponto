import { useEffect, useState } from 'react'
import styles from '../components/emails/emails.module.css'
import EnviarPainel from '../components/emails/EnviarPainel.jsx'
import RecebidosPainel from '../components/emails/RecebidosPainel.jsx'
import HistoricoPainel from '../components/emails/HistoricoPainel.jsx'
import {
  emails as apiEmails,
  historico as apiHistorico,
  mensagemDeErro,
  recebidos as apiRecebidos,
  rotinas as apiRotinas,
  servidores as apiServidores,
} from '../services/api.js'

/**
 * Tela de Emails (Frontend/Agent.md, seção 5.4) — três abas.
 *
 * Rotas usadas:
 * - GET  /emails/pendentes, POST /emails/enviar
 * - GET/PUT /rotinas
 * - GET  /recebidos, PATCH /recebidos/{id}
 * - GET  /historico (página de até 50; filtro e paginação locais)
 */

const ABAS = [
  { id: 'enviar', rotulo: 'Enviar' },
  { id: 'recebidos', rotulo: 'Recebidos' },
  { id: 'historico', rotulo: 'Histórico' },
]

/** Texto inicial do corpo do e-mail (editável). */
const MENSAGEM_PADRAO = `Prezado(a) servidor(a),

Segue, em anexo, a folha de ponto referente ao período informado.

Qualquer divergência, responda este e-mail para que possamos corrigir.

Atenciosamente,
Secretaria Acadêmica`

/** Folha pendente → formato do card de arquivos. */
function arquivoPendente(item, servidores) {
  const servidor =
    servidores.find((s) => s.id === item.servidorId) ??
    servidores.find((s) => s.matricula === item.servidorId) ??
    null

  return {
    id: item.id,
    nome: item.nome,
    servidor: item.servidor ?? servidor?.nome ?? '',
    email: item.email || servidor?.email || '',
    competencia: item.competencia ?? '',
    score: item.score ?? null,
  }
}

export default function Emails() {
  const [aba, setAba] = useState('enviar')

  // Enviar
  const [arquivos, setArquivos] = useState([])
  const [selecionados, setSelecionados] = useState([])
  const [assunto, setAssunto] = useState('')
  const [contexto, setContexto] = useState(MENSAGEM_PADRAO)
  const [erro, setErro] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Recebidos
  const [recebidos, setRecebidos] = useState([])
  const [recebidoId, setRecebidoId] = useState(null)

  // Histórico
  const [historico, setHistorico] = useState([])
  const [filtro, setFiltro] = useState('nominal')
  const [porPagina, setPorPagina] = useState(5)
  const [pagina, setPagina] = useState(0)
  const [historicoId, setHistoricoId] = useState(null)
  const [arquivoSel, setArquivoSel] = useState(null)

  // Rotinas
  const [rotinas, setRotinas] = useState([])

  const [carregando, setCarregando] = useState(true)

  /* ---------- Carga inicial ---------- */

  useEffect(() => {
    let ativo = true

    Promise.all([
      apiEmails.pendentes(),
      apiServidores.listar(),
      apiRotinas.listar(),
      apiRecebidos.listar(),
      apiHistorico.listar({ porPagina: 50 }),
    ])
      .then(([pendentes, servidores, listaRotinas, listaRecebidos, listaHistorico]) => {
        if (!ativo) return

        setArquivos(pendentes.map((item) => arquivoPendente(item, servidores)))
        setRotinas(listaRotinas)
        setRecebidos(listaRecebidos)
        setRecebidoId(listaRecebidos[0]?.id ?? null)
        setHistorico(listaHistorico)
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

  /* ---------- Arrastar e soltar ---------- */

  function aoArrastarSobre(evento) {
    evento.preventDefault()
    if (!arrastando) setArrastando(true)
  }

  function aoSairDoArraste(evento) {
    if (!evento.currentTarget.contains(evento.relatedTarget)) setArrastando(false)
  }

  function aoSoltar(evento) {
    evento.preventDefault()
    setArrastando(false)

    const arquivo = evento.dataTransfer.files?.[0]
    if (!arquivo) return

    const novo = {
      id: `local-${Date.now()}`,
      nome: arquivo.name,
      servidor: 'Arquivo local',
      email: '',
      competencia: '—',
      score: null,
    }

    setArquivos((atuais) => [novo, ...atuais])
    setSelecionados((atuais) => [...atuais, novo.id])
  }

  /* ---------- Enviar ---------- */

  function alternarArquivo(id) {
    setSelecionados((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id],
    )
  }

  function cancelar() {
    setAssunto('')
    setContexto(MENSAGEM_PADRAO)
    setSelecionados([])
    setErro('')
  }

  async function enviar() {
    if (!assunto.trim()) {
      setErro('Informe o assunto do e-mail.')
      return
    }

    if (selecionados.length === 0) {
      setErro('Selecione ao menos um arquivo para enviar.')
      return
    }

    const itens = arquivos.filter((item) => selecionados.includes(item.id))
    const destinatarios = [...new Set(itens.map((item) => item.email).filter(Boolean))]

    if (destinatarios.length === 0) {
      setErro('Os arquivos selecionados não possuem e-mail cadastrado.')
      return
    }

    setEnviando(true)
    setErro('')

    try {
      const registro = await apiEmails.enviar({
        servidorId: itens[0].servidorId ?? null,
        destinatario: destinatarios.join(', '),
        assunto: assunto.trim(),
        mensagem: contexto.trim() || '(sem contexto)',
        arquivos: selecionados,
      })

      setHistorico((atuais) => [registro, ...atuais])
      setArquivos((atuais) => atuais.filter((item) => !selecionados.includes(item.id)))
      setSelecionados([])
      setAssunto('')
      setContexto(MENSAGEM_PADRAO)
      setFiltro('nominal')
      setPagina(0)
      setHistoricoId(registro.id)
      setArquivoSel(null)
      setAba('historico')
    } catch (falha) {
      // O backend registra a tentativa com status "erro" mesmo quando falha.
      setErro(mensagemDeErro(falha))
      apiHistorico
        .listar({ porPagina: 50 })
        .then(setHistorico)
        .catch(() => {})
    } finally {
      setEnviando(false)
    }
  }

  /* ---------- Recebidos ---------- */

  async function mudarStatus(id, status) {
    try {
      const atualizado = await apiRecebidos.definirStatus(id, status)
      setRecebidos((atuais) =>
        atuais.map((item) => (item.id === id ? { ...item, ...atualizado } : item)),
      )
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    }
  }

  /* ---------- Rotinas ---------- */

  async function mudarDataRotina(rotina, novaData) {
    try {
      const atualizada = await apiRotinas.atualizar(rotina.id, {
        data: novaData,
        destinatarios: rotina.destinatarios,
        descricao: rotina.descricao,
      })
      setRotinas((atuais) =>
        atuais.map((item) => (item.id === rotina.id ? atualizada : item)),
      )
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    }
  }

  /* ---------- Histórico ---------- */

  function selecionarRegistro(item) {
    setHistoricoId(item.id)
    setArquivoSel(null)
    setFiltro(item.tipo)
    setPagina(0)
  }

  function mudarFiltro(tipo) {
    setFiltro(tipo)
    setPagina(0)
  }

  return (
    <section
      className={styles.pagina}
      aria-labelledby="titulo-emails"
      onDragOver={aoArrastarSobre}
      onDragLeave={aoSairDoArraste}
      onDrop={aoSoltar}
    >
      {/* <h1 id="titulo-emails">Emails</h1> */}

      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}

      {carregando && <p className={styles.dica}>Carregando dados da API…</p>}

      <div className={styles.abas} role="tablist" aria-label="Áreas de e-mail">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={aba === item.id}
            className={`${styles.aba} ${aba === item.id ? styles.abaAtiva : ''}`}
            onClick={() => setAba(item.id)}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {aba === 'enviar' && (
        <EnviarPainel
          arquivos={arquivos}
          selecionados={selecionados}
          onToggleArquivo={alternarArquivo}
          assunto={assunto}
          onAssunto={setAssunto}
          contexto={contexto}
          onContexto={setContexto}
          arrastando={arrastando}
          onEnviar={enviar}
          onCancelar={cancelar}
          erro={erro}
          enviando={enviando}
          rotinas={rotinas}
          onRotinaChange={mudarDataRotina}
        />
      )}

      {aba === 'recebidos' && (
        <RecebidosPainel
          recebidos={recebidos}
          selecionadoId={recebidoId}
          onSelecionar={setRecebidoId}
          onStatus={mudarStatus}
        />
      )}

      {aba === 'historico' && (
        <HistoricoPainel
          historico={historico}
          filtro={filtro}
          onFiltro={mudarFiltro}
          porPagina={porPagina}
          onPorPagina={(valor) => {
            setPorPagina(valor)
            setPagina(0)
          }}
          pagina={pagina}
          onPagina={setPagina}
          selecionadoId={historicoId}
          onSelecionar={selecionarRegistro}
          arquivoSelecionado={arquivoSel}
          onArquivo={setArquivoSel}
        />
      )}
    </section>
  )
}
