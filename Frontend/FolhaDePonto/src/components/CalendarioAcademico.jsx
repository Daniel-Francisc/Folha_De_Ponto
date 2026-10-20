import { useId, useState } from 'react'
import styles from './CalendarioAcademico.module.css'
import {
  DIAS_DA_SEMANA,
  criarMatrizDoMes,
  formatarDataCompleta,
  formatarMesAno,
  paraISO,
} from '../utils/calendario.js'

/**
 * Calendário acadêmico (Frontend/Agent.md, seções 5.1 e 5.3).
 *
 * É usado em dois lugares:
 * - Início: sem interação (só exibição).
 * - Calendário: com clique no dia, menu de contexto e marcações.
 *
 * @param {string|null} diaSelecionado  dia destacado (YYYY-MM-DD)
 * @param {Object} marcas               { 'YYYY-MM-DD': ['semAula' | 'planejamento'] }
 * @param {Set<string>} diasComNota     dias cobertos por alguma nota (fundo azul claro)
 * @param {(iso: string) => void} [onDiaClique]
 * @param {(evento: MouseEvent, iso: string) => void} [onDiaContextMenu]
 */

const TIPOS = ['semAula', 'planejamento']

export default function CalendarioAcademico({
  diaSelecionado = null,
  marcas = {},
  diasComNota = new Set(),
  onDiaClique,
  onDiaContextMenu,
}) {
  const hoje = new Date()

  // Estado do mês exibido: { ano, mes } com mes 0–11 (padrão do Date).
  const [referencia, setReferencia] = useState(() => ({
    ano: hoje.getFullYear(),
    mes: hoje.getMonth(),
  }))
  const tituloId = useId()

  const semanas = criarMatrizDoMes(referencia.ano, referencia.mes)
  const hojeISO = paraISO(hoje)

  /**
   * Avança/retrocede meses usando o próprio Date, que já resolve
   * virada de ano (dez → jan) e meses de 28/29/30/31 dias.
   */
  function navegar(delta) {
    setReferencia((atual) => {
      const destino = new Date(atual.ano, atual.mes + delta, 1)
      return { ano: destino.getFullYear(), mes: destino.getMonth() }
    })
  }

  return (
    <section className={styles.calendario} aria-label="Calendário acadêmico">
      {/* ---------- Cabeçalho: título do mês + navegação ---------- */}
      <header className={styles.cabecalho}>
        <h2 id={tituloId} className={styles.titulo}>
          {formatarMesAno(referencia.ano, referencia.mes)}
        </h2>

        <div className={styles.controles}>
          <button
            type="button"
            className={styles.botaoNavegacao}
            onClick={() => navegar(-1)}
            aria-label="Mês anterior"
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>

          <button
            type="button"
            className={styles.botaoNavegacao}
            onClick={() => navegar(1)}
            aria-label="Próximo mês"
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ---------- Grade do mês ---------- */}
      <table className={styles.tabela} aria-labelledby={tituloId}>
        <thead>
          <tr>
            {DIAS_DA_SEMANA.map(({ curto, extenso }) => (
              <th key={curto} scope="col" className={styles.diaSemana}>
                <abbr title={extenso}>{curto}</abbr>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {semanas.map((semana) => (
            <tr key={semana[0].chave}>
              {semana.map(({ chave, dia, doMes, data }, indice) => {
                const ehHoje = chave === hojeISO
                const selecionado = chave === diaSelecionado
                const temNota = diasComNota.has(chave)
                const marcasDoDia = marcas[chave] ?? []

                // Vizinhos na MESMA semana: usados para conectar a linha
                // quando o usuário marca uma sequência de dias.
                const anterior =
                  indice > 0 ? (marcas[semana[indice - 1].chave] ?? []) : []
                const proximo =
                  indice < semana.length - 1 ? (marcas[semana[indice + 1].chave] ?? []) : []

                const classes = [
                  styles.celula,
                  doMes ? styles.doMes : styles.foraDoMes,
                  temNota ? styles.comNota : '',
                  ehHoje ? styles.hoje : '',
                  selecionado ? styles.selecionado : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <td
                    key={chave}
                    className={classes}
                    onContextMenu={(evento) => onDiaContextMenu?.(evento, chave)}
                  >
                    <button
                      type="button"
                      className={styles.botaoDia}
                      onClick={() => onDiaClique?.(chave)}
                      aria-label={formatarDataCompleta(data)}
                      aria-pressed={selecionado}
                    >
                      <span className={styles.numeroDia}>
                        <time dateTime={chave}>{dia}</time>
                      </span>
                    </button>

                    {/* Duas trilhas fixas (uma por tipo) mantêm os pontos alinhados. */}
                    <div className={styles.marcadores} aria-hidden="true">
                      {TIPOS.map((tipo) => {
                        const ativo = marcasDoDia.includes(tipo)
                        const conectaEsquerda = ativo && anterior.includes(tipo)
                        const conectaDireita = ativo && proximo.includes(tipo)

                        return (
                          <span key={tipo} className={`${styles.trilha} ${styles[tipo]}`}>
                            {ativo && (
                              <>
                                <span
                                  className={`${styles.conector} ${
                                    conectaEsquerda ? styles.esquerda : ''
                                  } ${conectaDireita ? styles.direita : ''}`}
                                />
                                <span className={styles.ponto} />
                              </>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
