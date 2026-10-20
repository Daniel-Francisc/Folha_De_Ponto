import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './Calendario.module.css'
import CalendarioAcademico from '../components/CalendarioAcademico.jsx'
import PainelCalendario from '../components/PainelCalendario.jsx'
import { MARCAS_INICIAIS, NOTAS_INICIAIS } from '../mocks/calendario.js'
import { alternarMarca, aplicarIntervalo, diasDoIntervalo, notaDoDia } from '../utils/marcas.js'

/**
 * Tela de Calendário (Frontend/Agent.md, seção 5.3).
 *
 * Desktop: calendário ⅔ + painel ⅓.
 * Tablet/mobile: calendário na linha inteira e painel abaixo, com FAB para enviar planilha.
 *
 * Interações:
 * - Clique no dia ........ abre a nota do período ou o formulário de nova nota.
 * - Botão direito ........ menu para marcar "sem aula" / "planejamento".
 * - Arrastar arquivo ..... o painel vira área de recebimento de .xls/.xlsx.
 *
 * Tudo em memória: nenhum dado é enviado ao backend ainda.
 */
export default function Calendario() {
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [notas, setNotas] = useState(NOTAS_INICIAIS)
  const [marcas, setMarcas] = useState(MARCAS_INICIAIS)
  const [modo, setModo] = useState('nota')
  const [editando, setEditando] = useState(false)

  const [arrastando, setArrastando] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [menu, setMenu] = useState(null)

  const inputArquivoRef = useRef(null)

  const nota = notaDoDia(notas, diaSelecionado)

  // Conjunto de dias cobertos por alguma nota (usado para pintar a célula).
  const diasComNota = useMemo(
    () => new Set(notas.flatMap((item) => diasDoIntervalo(item.inicio, item.fim))),
    [notas],
  )

  // Dia do menu de contexto em uma variável simples: o React Compiler
  // memoiza as dependências dos callbacks e não pode ler `menu.dia` quando
  // `menu` é null.
  const diaDoMenu = menu?.dia ?? null

  /* ---------- Arquivo ---------- */

  function receberArquivo(arquivoEscolhido) {
    if (!arquivoEscolhido) return

    const valido = /\.(xls|xlsx)$/i.test(arquivoEscolhido.name)

    setArquivo({
      nome: arquivoEscolhido.name,
      tamanho: arquivoEscolhido.size,
      erro: valido ? null : 'Formato inválido. Envie um arquivo .xls ou .xlsx.',
    })
    setModo('arquivo')
  }

  function abrirSeletorDeArquivo() {
    inputArquivoRef.current?.click()
  }

  /* ---------- Arrastar e soltar ---------- */

  function aoArrastarSobre(evento) {
    evento.preventDefault()
    if (!arrastando) setArrastando(true)
  }

  function aoSairDoArraste(evento) {
    // Só encerra quando o ponteiro sai da página, não dos filhos.
    if (!evento.currentTarget.contains(evento.relatedTarget)) {
      setArrastando(false)
    }
  }

  function aoSoltar(evento) {
    evento.preventDefault()
    setArrastando(false)
    receberArquivo(evento.dataTransfer.files?.[0])
  }

  /* ---------- Notas ---------- */

  function clicarNoDia(dia) {
    setDiaSelecionado(dia)
    setModo('nota')
    setEditando(false)
    setMenu(null)
  }

  /** Cria uma nota nova ou atualiza a que está em edição. */
  function salvarNota({ id, ...dados }) {
    if (id) {
      setNotas((atuais) =>
        atuais.map((item) => (item.id === id ? { ...item, ...dados } : item)),
      )
    } else {
      setNotas((atuais) => [...atuais, { id: `nota-${Date.now()}`, ...dados }])
    }

    setEditando(false)
  }

  /* ---------- Marcações ---------- */

  function abrirMenuDeContexto(evento, dia) {
    evento.preventDefault()
    setMenu({ x: evento.clientX, y: evento.clientY, dia })
  }

  function marcarDiaRapido(tipo) {
    if (!diaDoMenu) return
    setMarcas((atuais) => alternarMarca(atuais, diaDoMenu, tipo))
    setMenu(null)
  }

  function abrirMarcacaoEmIntervalo() {
    if (!diaDoMenu) return
    setDiaSelecionado(diaDoMenu)
    setModo('marcacao')
    setMenu(null)
  }

  function salvarMarcacao({ inicio, fim, tipo }) {
    setMarcas((atuais) => aplicarIntervalo(atuais, inicio, fim, tipo))
    setModo('nota')
  }

  /* ---------- Menu: fecha com Esc ---------- */

  useEffect(() => {
    if (!menu) return undefined

    function fecharComEsc(evento) {
      if (evento.key === 'Escape') setMenu(null)
    }

    document.addEventListener('keydown', fecharComEsc)
    return () => document.removeEventListener('keydown', fecharComEsc)
  }, [menu])

  const modoExibido = arrastando ? 'arquivo' : modo

  // Mantém o menu dentro da viewport.
  const posicaoMenu = menu
    ? {
        top: Math.min(menu.y, (window.innerHeight || 800) - 190),
        left: Math.min(menu.x, (window.innerWidth || 1200) - 260),
      }
    : null

  return (
    <section
      className={styles.pagina}
      aria-labelledby="titulo-calendario"
      onDragOver={aoArrastarSobre}
      onDragLeave={aoSairDoArraste}
      onDrop={aoSoltar}
      data-arrastando={arrastando ? 'true' : undefined}
    >
      <h1 id="titulo-calendario">Calendário</h1>

      <div className={styles.grade}>
        <div className={styles.calendario}>
          <CalendarioAcademico
            diaSelecionado={diaSelecionado}
            marcas={marcas}
            diasComNota={diasComNota}
            onDiaClique={clicarNoDia}
            onDiaContextMenu={abrirMenuDeContexto}
          />
        </div>

        <div className={styles.painel}>
          <PainelCalendario
            key={`${modoExibido}-${diaSelecionado}-${editando}-${arquivo?.nome ?? ''}`}
            modo={modoExibido}
            dia={diaSelecionado}
            nota={nota}
            editando={editando}
            arrastando={arrastando}
            arquivo={arquivo}
            onSalvarNota={salvarNota}
            onSalvarMarcacao={salvarMarcacao}
            onEditar={() => setEditando(true)}
            onCancelarEdicao={() => setEditando(false)}
            onCancelar={() => setModo('nota')}
            onEscolherArquivo={abrirSeletorDeArquivo}
            onReceberArquivo={receberArquivo}
          />
        </div>
      </div>

      {/* Botão flutuante (tablet/mobile). */}
      <button type="button" className={styles.fab} onClick={abrirSeletorDeArquivo}>
        <i className="bi bi-plus-lg" aria-hidden="true" />
        Enviar arquivo
      </button>

      <input
        ref={inputArquivoRef}
        type="file"
        accept=".xls,.xlsx"
        className="visually-hidden"
        onChange={(evento) => {
          receberArquivo(evento.target.files?.[0])
          evento.target.value = ''
        }}
      />

      {/* Menu de contexto do botão direito. */}
      {menu && (
        <>
          <div
            className={styles.backdrop}
            onClick={() => setMenu(null)}
            onContextMenu={(evento) => {
              evento.preventDefault()
              setMenu(null)
            }}
            aria-hidden="true"
          />

          <div className={styles.menu} style={posicaoMenu} role="menu">
            <p className={styles.menuTitulo}>
              {diaDoMenu?.split('-').reverse().join('/')}
            </p>

            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => marcarDiaRapido('semAula')}
            >
              <span className={`${styles.esfera} ${styles.semAula}`} aria-hidden="true" />
              Marcar como sem aula
            </button>

            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => marcarDiaRapido('planejamento')}
            >
              <span className={`${styles.esfera} ${styles.planejamento}`} aria-hidden="true" />
              Marcar como planejamento
            </button>

            <hr className={styles.menuSeparador} />

            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={abrirMarcacaoEmIntervalo}
            >
              <i className="bi bi-calendar-range" aria-hidden="true" />
              Marcar intervalo…
            </button>
          </div>
        </>
      )}
    </section>
  )
}
