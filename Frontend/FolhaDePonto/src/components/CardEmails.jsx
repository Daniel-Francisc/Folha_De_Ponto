import { useRef } from 'react'
import styles from './CardEmails.module.css'

/**
 * Card "Emails" (Frontend/Agent.md, seção 5.1).
 *
 * Regras visuais:
 * - Cores INVERSAS ao card Funcionários: fundo azul claro, texto/ícone azul escuro.
 * - Ocupa a linha inteira; ícone de carta (rotacionado 60°) à esquerda.
 * - Carrossel com as três últimas solicitações de envio.
 * - No mobile, o ícone fica ATRÁS do texto.
 *
 * @param {Array<{id: string, arquivo: string, destinatario: string, data: string, status: 'sucesso'|'erro'|'andamento'}>} envios
 */

// Mapa de status → ícone, cor e rótulo acessível.
// Para adicionar um estado novo, basta incluir uma entrada aqui.
const STATUS = {
  sucesso: {
    icone: 'bi-check-circle-fill',
    rotulo: 'Enviado com sucesso',
    classe: styles.sucesso,
  },
  erro: {
    icone: 'bi-x-circle-fill',
    rotulo: 'Falha no envio',
    classe: styles.erro,
  },
  andamento: {
    icone: 'bi-arrow-repeat',
    rotulo: 'Envio em andamento',
    classe: styles.andamento,
  },
}

/** Data curta: "19/10, 14:32". */
function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CardEmails({ envios = [] }) {
  const listaRef = useRef(null)

  // O card mostra no máximo as três solicitações mais recentes.
  const recentes = envios.slice(0, 3)

  /**
   * Rola o carrossel em uma "página" (90% da largura visível).
   * Usa scroll suave nativo; nenhuma biblioteca de carrossel é necessária.
   */
  function rolar(direcao) {
    const lista = listaRef.current
    if (!lista) return

    lista.scrollBy({
      left: direcao * lista.clientWidth * 0.9,
      behavior: 'smooth',
    })
  }

  return (
    <article className={styles.card} aria-labelledby="titulo-emails">
      {/* Ícone de carta rotacionado 60° (decorativo). */}
      <div className={styles.iconeArea} aria-hidden="true">
        <i className={`bi bi-envelope-fill ${styles.icone}`} />
      </div>

      <div className={styles.conteudo}>
        <header className={styles.cabecalho}>
          <h2 id="titulo-emails" className={styles.titulo}>
            Emails
          </h2>

          {/* Setas aparecem apenas quando há mais de um item para navegar. */}
          {recentes.length > 1 && (
            <div className={styles.setas}>
              <button
                type="button"
                className={styles.seta}
                onClick={() => rolar(-1)}
                aria-label="Solicitações anteriores"
              >
                <i className="bi bi-chevron-left" aria-hidden="true" />
              </button>

              <button
                type="button"
                className={styles.seta}
                onClick={() => rolar(1)}
                aria-label="Próximas solicitações"
              >
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </button>
            </div>
          )}
        </header>

        {recentes.length === 0 ? (
          <p className={styles.vazio}>Nenhuma solicitação de envio recente.</p>
        ) : (
          <ul className={styles.lista} ref={listaRef}>
            {recentes.map((envio) => {
              const config = STATUS[envio.status] ?? STATUS.andamento

              return (
                <li key={envio.id} className={styles.item}>
                  <i
                    className={`bi ${config.icone} ${styles.status} ${config.classe}`}
                    aria-hidden="true"
                  />

                  <div className={styles.itemTexto}>
                    <p className={styles.arquivo}>{envio.arquivo}</p>
                    <p className={styles.meta}>
                      {envio.destinatario} · {formatarData(envio.data)}
                    </p>
                    {/* Status também em texto para leitores de tela. */}
                    <span className="visually-hidden">{config.rotulo}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </article>
  )
}
