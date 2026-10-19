import styles from './CentralNotificacoes.module.css'

/**
 * Central de notificações (Frontend/Agent.md, seções 3.4 e 5.1).
 * Lista os últimos envios de arquivos com estado: sucesso, erro ou em andamento.
 */
export default function CentralNotificacoes() {
  return (
    <section className={styles.wrapper} aria-label="Notificações de envio">
      <button type="button" className={styles.trigger} aria-label="Abrir notificações">
        <i className="bi bi-bell" aria-hidden="true" />
      </button>

      {/* TODO: painel com os últimos envios (ícone/cor do estado, arquivo, data, mensagem) */}
      <ul className={styles.list} aria-label="Últimos envios" hidden />
    </section>
  )
}
