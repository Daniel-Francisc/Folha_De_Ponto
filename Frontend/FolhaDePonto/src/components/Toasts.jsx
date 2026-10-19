import styles from './Toasts.module.css'

/**
 * Notificações temporárias — toasts (Frontend/Agent.md, seção 3.5).
 * Canto inferior direito; warning com carregamento, danger com X, success com check.
 */
export default function Toasts() {
  return (
    <div
      className={styles.region}
      role="status"
      aria-live="polite"
      aria-label="Notificações temporárias"
    >
      {/* TODO: pilha de toasts (máx. 3), fecháveis, sem bloquear a interação */}
    </div>
  )
}
