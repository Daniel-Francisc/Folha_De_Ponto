import styles from './CardFuncionarios.module.css'

/**
 * Card "Funcionários" (Frontend/Agent.md, seção 5.1).
 *
 * Regras visuais:
 * - Fundo azul escuro (contraste com o resto da tela).
 * - Título e ícone no MESMO azul claro.
 * - Número de folhas lidas em destaque.
 * - No desktop o ícone fica ABAIXO do texto; no mobile o card ocupa a linha toda.
 *
 * @param {number} total quantidade de folhas lidas no mês
 */
export default function CardFuncionarios({ total = 0 }) {
  return (
    <article className={styles.card} aria-labelledby="titulo-funcionarios">
      <div className={styles.texto}>
        <h2 id="titulo-funcionarios" className={styles.titulo}>
          Funcionários
        </h2>

        {/* Número principal: é o dado que o usuário procura primeiro. */}
        <p className={styles.valor}>{total}</p>

        <p className={styles.legenda}>folhas lidas este mês</p>
      </div>

      {/* Ícone decorativo (o texto já dá o significado). */}
      <i className={`bi bi-people ${styles.icone}`} aria-hidden="true" />
    </article>
  )
}
