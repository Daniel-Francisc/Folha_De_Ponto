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
 * O QUE JÁ EXISTE
 * - Grade de mês completa (semanas domingo → sábado), com dias adjacentes.
 * - Navegação mês anterior / próximo mês.
 * - Destaque do dia atual e diferenciação dos dias fora do mês.
 *
 * O QUE AINDA FALTA (marcado com TODO abaixo)
 * - Exibir eventos/feriados dentro das células.
 * - Visão semanal exclusiva para mobile.
 * - Modo de edição usado pela tela Calendário.
 */
export default function CalendarioAcademico() {
  // "hoje" é lido a cada renderização; o destaque acompanha a virada do dia.
  const hoje = new Date()

  // Estado do mês exibido: { ano, mes } com mes 0–11 (padrão do Date).
  const [referencia, setReferencia] = useState(() => ({
    ano: hoje.getFullYear(),
    mes: hoje.getMonth(),
  }))

  // Id único para ligar a tabela ao título (leitor de tela anuncia o mês).
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
      {/*
        Tabela semântica: colunas são os dias da semana, linhas são as semanas.
        aria-labelledby liga a tabela ao título ("Outubro de 2026"), evitando
        que o leitor de tela leia a grade sem contexto.
      */}
      <table className={styles.tabela} aria-labelledby={tituloId}>
        <thead>
          <tr>
            {DIAS_DA_SEMANA.map(({ curto, extenso }) => (
              <th key={curto} scope="col" className={styles.diaSemana}>
                {/* abbr: mostra "seg" e expande para "segunda-feira" */}
                <abbr title={extenso}>{curto}</abbr>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {semanas.map((semana) => (
            <tr key={semana[0].chave}>
              {semana.map(({ chave, dia, doMes, data }) => {
                const ehHoje = chave === hojeISO

                // Classes condicionais: base + fora do mês + hoje.
                const classes = [
                  styles.celula,
                  doMes ? styles.doMes : styles.foraDoMes,
                  ehHoje ? styles.hoje : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <td
                    key={chave}
                    className={classes}
                    aria-label={formatarDataCompleta(data)}
                  >
                    {/* O número do dia fica num "chip" para o destaque de hoje. */}
                    <span className={styles.numeroDia}>
                      <time dateTime={chave}>{dia}</time>
                    </span>

                    {/*
                      TODO (lógica): mapa de eventos por data
                      Ex.: eventosPorData[chave]?.map(...) renderizando
                      <ul className={styles.eventos}> com os títulos.
                      Enquanto não há dados, o container fica vazio.
                    */}
                    <ul className={styles.eventos} />
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
