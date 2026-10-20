import styles from './emails.module.css'

/**
 * Aba "Recebidos" (Frontend/Agent.md, seção 5.4).
 *
 * - Visualizador do e-mail recebido (⅔) + outras notificações (⅓).
 * - Abaixo, o registro completo, onde cada item pode ser marcado como
 *   "solicitação concluída" ou "negada".
 */

const STATUS = {
  pendente: { rotulo: 'Pendente', classe: styles.badgePendente },
  concluida: { rotulo: 'Concluída', classe: styles.badgeConcluida },
  negada: { rotulo: 'Negada', classe: styles.badgeNegada },
}

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function RecebidosPainel({ recebidos = [], selecionadoId, onSelecionar, onStatus }) {
  const selecionado = recebidos.find((item) => item.id === selecionadoId) ?? recebidos[0] ?? null
  const outros = recebidos.filter((item) => item.id !== selecionado?.id)

  return (
    <>
      <div className={styles.grade}>
        {/* ---------- Visualizador ---------- */}
        <article className={styles.card}>
          {selecionado ? (
            <div className={styles.viewer}>
              <div className={styles.cardCabecalho}>
                <h2 className={styles.viewerAssunto}>{selecionado.assunto}</h2>
                <span className={`${styles.badge} ${STATUS[selecionado.status].classe}`}>
                  {STATUS[selecionado.status].rotulo}
                </span>
              </div>

              <p className={styles.viewerMeta}>
                {selecionado.remetente} · {selecionado.email} · {formatarData(selecionado.data)}
              </p>

              <p className={styles.viewerCorpo}>{selecionado.corpo}</p>

              <div className={styles.acoes}>
                <button
                  type="button"
                  className={styles.miniBotao}
                  onClick={() => onStatus(selecionado.id, 'concluida')}
                  disabled={selecionado.status === 'concluida'}
                >
                  Marcar como concluída
                </button>
                <button
                  type="button"
                  className={styles.miniBotao}
                  onClick={() => onStatus(selecionado.id, 'negada')}
                  disabled={selecionado.status === 'negada'}
                >
                  Marcar como negada
                </button>
              </div>
            </div>
          ) : (
            <p className={styles.vazio}>Nenhum e-mail recebido selecionado.</p>
          )}
        </article>

        {/* ---------- Outras notificações ---------- */}
        <aside className={styles.card}>
          <h2 className={styles.cardTitulo}>Outras notificações</h2>

          <ul className={styles.listaNotificacoes}>
            {outros.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.notificacao}
                  onClick={() => onSelecionar(item.id)}
                >
                  <span className={styles.notificacaoAssunto}>{item.assunto}</span>
                  <span className={styles.notificacaoMeta}>
                    {item.remetente} · {formatarData(item.data)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* ---------- Registro completo ---------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitulo}>Registro completo de recebidos</h2>

        <div className={styles.tabelaWrap}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Remetente</th>
                <th>Assunto</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {recebidos.map((item) => (
                <tr
                  key={item.id}
                  className={item.id === selecionado?.id ? styles.linhaSelecionada : undefined}
                >
                  <td>{formatarData(item.data)}</td>
                  <td className={styles.cellTrunc}>{item.remetente}</td>
                  <td className={styles.cellTrunc}>
                    <button
                      type="button"
                      className={styles.miniBotao}
                      onClick={() => onSelecionar(item.id)}
                    >
                      {item.assunto}
                    </button>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${STATUS[item.status].classe}`}>
                      {STATUS[item.status].rotulo}
                    </span>
                  </td>
                  <td>
                    <div className={styles.acoesLinha}>
                      <button
                        type="button"
                        className={styles.miniBotao}
                        onClick={() => onStatus(item.id, 'concluida')}
                        disabled={item.status === 'concluida'}
                      >
                        Concluir
                      </button>
                      <button
                        type="button"
                        className={styles.miniBotao}
                        onClick={() => onStatus(item.id, 'negada')}
                        disabled={item.status === 'negada'}
                      >
                        Negar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
