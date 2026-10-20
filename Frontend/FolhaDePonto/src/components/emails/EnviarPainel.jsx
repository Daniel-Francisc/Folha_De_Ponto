import { useState } from 'react'
import styles from './emails.module.css'
import { EMAILS_ROTINA } from '../../mocks/emails.js'

/**
 * Aba "Enviar" (Frontend/Agent.md, seção 5.4).
 *
 * - E-mail ocupa ⅔; card de arquivos não enviados ocupa ⅓.
 * - Arrastar arquivo troca o campo de contexto por uma área de recebimento.
 * - Abaixo: e-mails de rotina com data/hora editável (nunca no passado).
 */

/** Valor para o atributo min do datetime-local (horário local). */
function agoraLocal() {
  const agora = new Date()
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function EnviarPainel({
  arquivos = [],
  selecionados = [],
  onToggleArquivo,
  assunto,
  onAssunto,
  contexto,
  onContexto,
  arrastando,
  onEnviar,
  onCancelar,
  erro,
}) {
  const [rotinas, setRotinas] = useState(EMAILS_ROTINA)
  const [erroRotina, setErroRotina] = useState('')

  const destinatarios = [
    ...new Set(
      arquivos.filter((item) => selecionados.includes(item.id)).map((item) => item.email),
    ),
  ]

  function mudarData(id, valor) {
    if (!valor) return

    if (new Date(valor) < new Date()) {
      setErroRotina('A data e hora não podem estar no passado.')
      return
    }

    setErroRotina('')
    setRotinas((atuais) =>
      atuais.map((rotina) => (rotina.id === id ? { ...rotina, data: valor } : rotina)),
    )
  }

  return (
    <>
      <div className={styles.grade}>
        {/* ---------- E-mail (⅔) ---------- */}
        <form
          className={styles.card}
          onSubmit={(evento) => {
            evento.preventDefault()
            onEnviar()
          }}
        >
          <header className={styles.cardCabecalho}>
            <h2 className={styles.cardTitulo}>Novo e-mail</h2>
            <span className={styles.cardSubtitulo}>
              {destinatarios.length > 0
                ? `${destinatarios.length} destinatário(s)`
                : 'Selecione os arquivos ao lado'}
            </span>
          </header>

          {destinatarios.length > 0 && (
            <p className={styles.dica}>Para: {destinatarios.join(', ')}</p>
          )}

          <label className={styles.campo}>
            <span className={styles.rotulo}>Assunto</span>
            <input
              className={styles.input}
              type="text"
              value={assunto}
              onChange={(evento) => onAssunto(evento.target.value)}
              placeholder="Folha de ponto — MM/AAAA"
            />
          </label>

          <div className={styles.campo}>
            <span className={styles.rotulo}>Contexto</span>

            {arrastando ? (
              <div className={styles.dropzone}>
                <i className={`bi bi-cloud-arrow-up ${styles.dropIcone}`} aria-hidden="true" />
                <span className={styles.dropTitulo}>Solte o arquivo aqui</span>
                <span className={styles.dropTexto}>Ele será anexado ao e-mail</span>
              </div>
            ) : (
              <textarea
                className={styles.textarea}
                rows={10}
                value={contexto}
                onChange={(evento) => onContexto(evento.target.value)}
                placeholder="Escreva a mensagem…"
              />
            )}
          </div>

          {erro && <p className={styles.erro}>{erro}</p>}

          <div className={styles.acoes}>
            <button type="submit" className={styles.botaoPrimario}>
              <i className="bi bi-send" aria-hidden="true" />
              Enviar
            </button>
            <button type="button" className={styles.botaoSecundario} onClick={onCancelar}>
              Cancelar
            </button>
          </div>
        </form>

        {/* ---------- Arquivos não enviados (⅓) ---------- */}
        <aside className={styles.card}>
          <header className={styles.cardCabecalho}>
            <h2 className={styles.cardTitulo}>Arquivos não enviados</h2>
            <span className={`${styles.badge} ${styles.badgeNeutra}`}>{arquivos.length}</span>
          </header>
          <p className={styles.cardSubtitulo}>
            Folhas de ponto processadas aguardando envio.
          </p>

          {arquivos.length === 0 ? (
            <p className={styles.vazio}>Nenhum arquivo pendente.</p>
          ) : (
            <ul className={styles.listaArquivos}>
              {arquivos.map((arquivo) => {
                const marcado = selecionados.includes(arquivo.id)

                return (
                  <li key={arquivo.id}>
                    <label
                      className={`${styles.arquivo} ${marcado ? styles.arquivoMarcado : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => onToggleArquivo(arquivo.id)}
                      />
                      <span className={styles.arquivoTexto}>
                        <span className={styles.arquivoNome}>{arquivo.nome}</span>
                        <span className={styles.arquivoMeta}>
                          {arquivo.servidor} · {arquivo.competencia}
                        </span>
                      </span>
                      {arquivo.score !== null && (
                        <span className={styles.score}>{arquivo.score.toFixed(2)}</span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>
      </div>

      {/* ---------- E-mails de rotina ---------- */}
      <section className={styles.card}>
        <header className={styles.cardCabecalho}>
          <h2 className={styles.cardTitulo}>E-mails de rotina</h2>
          <span className={styles.cardSubtitulo}>Datas nunca no passado</span>
        </header>

        {erroRotina && <p className={styles.erro}>{erroRotina}</p>}

        <div className={styles.tabelaWrap}>
          <table className={`${styles.tabela} ${styles.rotinaTabela}`}>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Data e hora</th>
                <th>Destinatários</th>
              </tr>
            </thead>
            <tbody>
              {rotinas.map((rotina) => (
                <tr key={rotina.id}>
                  <td>{rotina.descricao}</td>
                  <td className={styles.rotinaData}>
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={rotina.data}
                      min={agoraLocal()}
                      onChange={(evento) => mudarData(rotina.id, evento.target.value)}
                      aria-label={`Data e hora — ${rotina.descricao}`}
                    />
                  </td>
                  <td>{rotina.destinatarios.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
