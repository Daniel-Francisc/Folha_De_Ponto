import { useState } from 'react'
import styles from './PainelCalendario.module.css'
import { TIPOS_MARCA } from '../utils/marcas.js'

/**
 * Painel lateral da tela Calendário (Frontend/Agent.md, seção 5.3).
 *
 * Três modos:
 * - nota ..... detalhe da nota (com botão Editar), edição ou criação
 * - marcacao . intervalo + tipo para marcar dias (vindo do botão direito)
 * - arquivo .. recebimento da planilha .xls/.xlsx
 */

function formatarData(iso) {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function PainelCalendario({
  modo = 'nota',
  dia,
  nota,
  editando = false,
  arrastando,
  arquivo,
  onSalvarNota,
  onSalvarMarcacao,
  onEditar,
  onCancelarEdicao,
  onCancelar,
  onEscolherArquivo,
  onReceberArquivo,
}) {
  return (
    <aside className={styles.painel} aria-label="Painel do calendário">
      {modo === 'nota' && (
        <PainelNota
          dia={dia}
          nota={nota}
          editando={editando}
          onSalvar={onSalvarNota}
          onEditar={onEditar}
          onCancelarEdicao={onCancelarEdicao}
        />
      )}

      {modo === 'marcacao' && (
        <PainelMarcacao dia={dia} onSalvar={onSalvarMarcacao} onCancelar={onCancelar} />
      )}

      {modo === 'arquivo' && (
        <PainelArquivo
          arrastando={arrastando}
          arquivo={arquivo}
          onEscolher={onEscolherArquivo}
          onReceber={onReceberArquivo}
        />
      )}
    </aside>
  )
}

/* -------------------------------------------------------------------------
   Nota: detalhe, edição ou criação
   ------------------------------------------------------------------------- */

function PainelNota({ dia, nota, editando, onSalvar, onEditar, onCancelarEdicao }) {
  if (!dia) {
    return (
      <div className={styles.vazio}>
        <i className={`bi bi-calendar2-plus ${styles.vazioIcone}`} aria-hidden="true" />
        <p className={styles.vazioTexto}>
          Clique em um dia do calendário para ver ou criar uma nota.
        </p>
      </div>
    )
  }

  // Já existe nota cobrindo o dia: mostra o conteúdo + botão Editar.
  if (nota && !editando) {
    return (
      <div className={styles.detalhe}>
        <div className={styles.detalheCabecalho}>
          <div className={styles.detalheTexto}>
            <p className={styles.etiqueta}>Nota do período</p>
            <h3 className={styles.detalheTitulo}>{nota.titulo}</h3>
          </div>

          {/* Botão azul escuro com lápis branco, no topo à direita. */}
          <button type="button" className={styles.botaoEditar} onClick={onEditar}>
            <i className="bi bi-pencil-fill" aria-hidden="true" />
            Editar
          </button>
        </div>

        <p className={styles.periodo}>
          <i className="bi bi-calendar-range" aria-hidden="true" />
          {formatarData(nota.inicio)} — {formatarData(nota.fim)}
        </p>

        <p className={styles.contexto}>{nota.contexto}</p>
      </div>
    )
  }

  // Criação (sem nota) ou edição (nota existente).
  return (
    <FormularioNota
      dia={dia}
      nota={editando ? nota : null}
      onSalvar={onSalvar}
      onCancelar={editando ? onCancelarEdicao : null}
    />
  )
}

function FormularioNota({ dia, nota = null, onSalvar, onCancelar }) {
  const [titulo, setTitulo] = useState(nota?.titulo ?? '')
  const [inicio, setInicio] = useState(nota?.inicio ?? dia)
  const [fim, setFim] = useState(nota?.fim ?? dia)
  const [contexto, setContexto] = useState(nota?.contexto ?? '')
  const [erro, setErro] = useState('')

  function enviar(evento) {
    evento.preventDefault()

    if (!titulo.trim()) {
      setErro('Dê um nome para a nota.')
      return
    }

    if (!inicio || !fim) {
      setErro('Informe as datas de início e fim.')
      return
    }

    if (fim < inicio) {
      setErro('A data final não pode ser anterior à data inicial.')
      return
    }

    setErro('')
    onSalvar({
      id: nota?.id,
      titulo: titulo.trim(),
      inicio,
      fim,
      contexto: contexto.trim(),
    })
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <h3 className={styles.formTitulo}>{nota ? 'Editar nota' : 'Nova nota'}</h3>
      <p className={styles.formSubtitulo}>
        {nota
          ? `Período atual: ${formatarData(nota.inicio)} — ${formatarData(nota.fim)}`
          : `Dia selecionado: ${formatarData(dia)}`}
      </p>

      <label className={styles.campo}>
        <span className={styles.rotulo}>Nome da nota</span>
        <input
          className={styles.input}
          type="text"
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          placeholder="Ex.: Semana de provas"
        />
      </label>

      <div className={styles.duasColunas}>
        <label className={styles.campo}>
          <span className={styles.rotulo}>Início</span>
          <input
            className={styles.input}
            type="date"
            value={inicio}
            onChange={(evento) => setInicio(evento.target.value)}
          />
        </label>

        <label className={styles.campo}>
          <span className={styles.rotulo}>Fim</span>
          <input
            className={styles.input}
            type="date"
            value={fim}
            onChange={(evento) => setFim(evento.target.value)}
          />
        </label>
      </div>

      <label className={styles.campo}>
        <span className={styles.rotulo}>Contexto</span>
        <textarea
          className={styles.textarea}
          rows={5}
          value={contexto}
          onChange={(evento) => setContexto(evento.target.value)}
          placeholder="Descreva o que acontece nesse período"
        />
      </label>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.acoes}>
        <button type="submit" className={styles.botaoPrimario}>
          <i className={`bi ${nota ? 'bi-check-lg' : 'bi-plus-lg'}`} aria-hidden="true" />
          {nota ? 'Salvar alterações' : 'Salvar nota'}
        </button>

        {onCancelar && (
          <button type="button" className={styles.botaoSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

/* -------------------------------------------------------------------------
   Marcação de intervalo (aberta pelo botão direito)
   ------------------------------------------------------------------------- */

function PainelMarcacao({ dia, onSalvar, onCancelar }) {
  const [tipo, setTipo] = useState('semAula')
  const [inicio, setInicio] = useState(dia ?? '')
  const [fim, setFim] = useState(dia ?? '')
  const [erro, setErro] = useState('')

  function enviar(evento) {
    evento.preventDefault()

    if (!inicio || !fim) {
      setErro('Informe as datas de início e fim.')
      return
    }

    if (fim < inicio) {
      setErro('A data final não pode ser anterior à data inicial.')
      return
    }

    setErro('')
    onSalvar({ inicio, fim, tipo })
  }

  return (
    <form className={styles.form} onSubmit={enviar}>
      <div className={styles.formCabecalho}>
        <h3 className={styles.formTitulo}>Marcar datas</h3>
        <button type="button" className={styles.fechar} onClick={onCancelar} aria-label="Voltar">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      <fieldset className={styles.tipos}>
        <legend className={styles.rotulo}>Tipo de marcação</legend>

        {Object.entries(TIPOS_MARCA).map(([chave, config]) => (
          <label key={chave} className={styles.tipoOpcao}>
            <input
              type="radio"
              name="tipo-marcacao"
              value={chave}
              checked={tipo === chave}
              onChange={() => setTipo(chave)}
            />
            <span className={`${styles.esfera} ${styles[chave]}`} aria-hidden="true" />
            {config.rotulo}
          </label>
        ))}
      </fieldset>

      <div className={styles.duasColunas}>
        <label className={styles.campo}>
          <span className={styles.rotulo}>Início</span>
          <input
            className={styles.input}
            type="date"
            value={inicio}
            onChange={(evento) => setInicio(evento.target.value)}
          />
        </label>

        <label className={styles.campo}>
          <span className={styles.rotulo}>Fim</span>
          <input
            className={styles.input}
            type="date"
            value={fim}
            onChange={(evento) => setFim(evento.target.value)}
          />
        </label>
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      <button type="submit" className={styles.botaoPrimario}>
        <i className="bi bi-check-lg" aria-hidden="true" />
        Aplicar marcação
      </button>
    </form>
  )
}

/* -------------------------------------------------------------------------
   Recebimento da planilha
   ------------------------------------------------------------------------- */

function PainelArquivo({ arrastando, arquivo, onEscolher, onReceber }) {
  const [sobre, setSobre] = useState(false)

  function soltar(evento) {
    evento.preventDefault()
    evento.stopPropagation()
    setSobre(false)
    onReceber(evento.dataTransfer.files?.[0])
  }

  return (
    <div className={styles.recebimento}>
      <h3 className={styles.formTitulo}>Receber planilha</h3>
      <p className={styles.formSubtitulo}>
        Arraste o arquivo para a página ou escolha abaixo.
      </p>

      <button
        type="button"
        className={`${styles.dropzone} ${arrastando || sobre ? styles.dropzoneAtiva : ''}`}
        onClick={onEscolher}
        onDragOver={(evento) => {
          evento.preventDefault()
          setSobre(true)
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={soltar}
      >
        <i className={`bi bi-file-earmark-spreadsheet ${styles.dropIcone}`} aria-hidden="true" />
        <span className={styles.dropTitulo}>Solte a planilha aqui</span>
        <span className={styles.dropTexto}>ou clique para escolher</span>
        <span className={styles.dropNota}>.xls ou .xlsx</span>
      </button>

      {arquivo && (
        <div className={arquivo.erro ? styles.arquivoErro : styles.arquivoOk}>
          <i
            className={`bi ${arquivo.erro ? 'bi-exclamation-octagon' : 'bi-check-circle'} ${styles.arquivoIcone}`}
            aria-hidden="true"
          />
          <div>
            <p className={styles.arquivoNome}>{arquivo.nome}</p>
            <p className={styles.arquivoMeta}>
              {arquivo.erro ?? 'Importado. A leitura das datas será feita pelo backend.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
