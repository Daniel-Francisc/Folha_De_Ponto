import { useState } from 'react'
import styles from '../components/emails/emails.module.css'
import EnviarPainel from '../components/emails/EnviarPainel.jsx'
import RecebidosPainel from '../components/emails/RecebidosPainel.jsx'
import HistoricoPainel from '../components/emails/HistoricoPainel.jsx'
import { ARQUIVOS_PENDENTES, HISTORICO, RECEBIDOS } from '../mocks/emails.js'

/**
 * Tela de Emails (Frontend/Agent.md, seção 5.4) — três abas:
 * - Enviar ....... composição do e-mail + arquivos não enviados + rotina
 * - Recebidos .... visualizador, notificações e registro com status
 * - Histórico .... e-mails enviados, filtros e faixa de arquivos
 *
 * Tudo em memória: nenhum envio real acontece ainda.
 */

const ABAS = [
  { id: 'enviar', rotulo: 'Enviar' },
  { id: 'recebidos', rotulo: 'Recebidos' },
  { id: 'historico', rotulo: 'Histórico' },
]

export default function Emails() {
  const [aba, setAba] = useState('enviar')

  // ---------- Enviar ----------
  const [arquivos, setArquivos] = useState(ARQUIVOS_PENDENTES)
  const [selecionados, setSelecionados] = useState([])
  const [assunto, setAssunto] = useState('')
  const [contexto, setContexto] = useState('')
  const [erro, setErro] = useState('')
  const [arrastando, setArrastando] = useState(false)

  // ---------- Recebidos ----------
  const [recebidos, setRecebidos] = useState(RECEBIDOS)
  const [recebidoId, setRecebidoId] = useState(RECEBIDOS[0]?.id ?? null)

  // ---------- Histórico ----------
  const [historico, setHistorico] = useState(HISTORICO)
  const [filtro, setFiltro] = useState('nominal')
  const [porPagina, setPorPagina] = useState(5)
  const [pagina, setPagina] = useState(0)
  const [historicoId, setHistoricoId] = useState(null)
  const [arquivoSel, setArquivoSel] = useState(null)

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
    setContexto('')
    setSelecionados([])
    setErro('')
  }

  function enviar() {
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

    const novo = {
      id: `h-${Date.now()}`,
      tipo: 'nominal',
      data: new Date().toISOString(),
      remetente: 'Secretaria Acadêmica',
      destinatario: destinatarios.join(', '),
      assunto: assunto.trim(),
      corpo: contexto.trim() || '(sem contexto)',
      arquivos: itens.map((item) => ({ id: item.id, nome: item.nome })),
      status: 'sucesso',
    }

    // Registra no histórico, limpa os arquivos enviados e vai para a aba.
    setHistorico((atuais) => [novo, ...atuais])
    setArquivos((atuais) => atuais.filter((item) => !selecionados.includes(item.id)))
    setSelecionados([])
    setAssunto('')
    setContexto('')
    setErro('')
    setFiltro('nominal')
    setPagina(0)
    setHistoricoId(novo.id)
    setArquivoSel(null)
    setAba('historico')
  }

  /* ---------- Recebidos ---------- */

  function mudarStatus(id, status) {
    setRecebidos((atuais) =>
      atuais.map((item) => (item.id === id ? { ...item, status } : item)),
    )
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
      <h1 id="titulo-emails">Emails</h1>

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
