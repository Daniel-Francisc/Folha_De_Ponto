import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './Calendario.module.css'
import CalendarioAcademico from '../components/CalendarioAcademico.jsx'
import PainelCalendario from '../components/PainelCalendario.jsx'
import {
  calendario as apiCalendario,
  marcacoes as apiMarcacoes,
  mensagemDeErro,
  notas as apiNotas,
} from '../services/api.js'
import { diasDoIntervalo, notaDoDia } from '../utils/marcas.js'

/**
 * Tela de Calendário (Frontend/Agent.md, seção 5.3).
 *
 * Dados reais:
 * - GET /notas + GET /marcacoes ............ ao abrir
 * - POST /notas / PUT /notas/{id} .......... criar e editar nota
 * - PUT /marcacoes ......................... marcar dias/intervalos (aditivo)
 * - POST /calendario ....................... importar planilha .xls/.xlsx
 */

/** Converte a lista da API ({dia, tipos}) no mapa usado pelo calendário. */
function mapaDeMarcas(lista) {
  return Object.fromEntries(lista.map((item) => [item.dia, item.tipos]))
}

export default function Calendario() {
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [notas, setNotas] = useState([])
  const [marcas, setMarcas] = useState({})
  const [modo, setModo] = useState('nota')
  const [editando, setEditando] = useState(false)

  const [arrastando, setArrastando] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [menu, setMenu] = useState(null)

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const inputArquivoRef = useRef(null)

  const nota = notaDoDia(notas, diaSelecionado)

  // Conjunto de dias cobertos por alguma nota (usado para pintar a célula).
  const diasComNota = useMemo(
    () => new Set(notas.flatMap((item) => diasDoIntervalo(item.inicio, item.fim))),
    [notas],
  )

  const diaDoMenu = menu?.dia ?? null

  /* ---------- Carga inicial ---------- */

  useEffect(() => {
    let ativo = true

    Promise.all([apiNotas.listar(), apiMarcacoes.listar()])
      .then(([listaNotas, listaMarcas]) => {
        if (!ativo) return
        setNotas(listaNotas)
        setMarcas(mapaDeMarcas(listaMarcas))
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

  /* ---------- Arquivo ---------- */

  async function receberArquivo(arquivoEscolhido) {
    if (!arquivoEscolhido) return

    if (!/\.(xls|xlsx)$/i.test(arquivoEscolhido.name)) {
      setArquivo({
        nome: arquivoEscolhido.name,
        erro: 'Formato inválido. Envie um arquivo .xls ou .xlsx.',
      })
      setModo('arquivo')
      return
    }

    setErro('')
    setAviso('Importando planilha…')
    setModo('arquivo')

    try {
      const resposta = await apiCalendario.importar(arquivoEscolhido)
      setArquivo({ nome: resposta.arquivo, erro: null })
      setAviso(`${resposta.eventos.length} evento(s) importado(s) da planilha.`)
    } catch (falha) {
      setArquivo({ nome: arquivoEscolhido.name, erro: mensagemDeErro(falha) })
      setAviso('')
    }
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
    if (!evento.currentTarget.contains(evento.relatedTarget)) setArrastando(false)
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

  async function salvarNota({ id, ...dados }) {
    try {
      const salva = id
        ? await apiNotas.atualizar(id, dados)
        : await apiNotas.criar(dados)

      setNotas((atuais) =>
        id ? atuais.map((item) => (item.id === id ? salva : item)) : [...atuais, salva],
      )
      setEditando(false)
      setErro('')
      setAviso(id ? 'Nota atualizada.' : 'Nota criada.')
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    }
  }

  /* ---------- Marcações ---------- */

  function abrirMenuDeContexto(evento, dia) {
    evento.preventDefault()
    setMenu({ x: evento.clientX, y: evento.clientY, dia })
  }

  /** A API soma marcações; para remover seria necessário um endpoint de exclusão. */
  async function marcarDiaRapido(tipo) {
    if (!diaDoMenu) return

    try {
      const lista = await apiMarcacoes.salvar([{ inicio: diaDoMenu, fim: diaDoMenu, tipo }])
      setMarcas(mapaDeMarcas(lista))
      setMenu(null)
      setErro('')
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    }
  }

  function abrirMarcacaoEmIntervalo() {
    if (!diaDoMenu) return
    setDiaSelecionado(diaDoMenu)
    setModo('marcacao')
    setMenu(null)
  }

  async function salvarMarcacao({ inicio, fim, tipo }) {
    try {
      const lista = await apiMarcacoes.salvar([{ inicio, fim, tipo }])
      setMarcas(mapaDeMarcas(lista))
      setModo('nota')
      setErro('')
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    }
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

      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}

      {aviso && (
        <p className={styles.aviso} role="status">
          {aviso}
        </p>
      )}

      {carregando && <p className={styles.aviso}>Carregando notas e marcações…</p>}

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
