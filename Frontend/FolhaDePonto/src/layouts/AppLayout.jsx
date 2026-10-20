import styles from './AppLayout.module.css'
import { Outlet } from 'react-router-dom'
import LogoUniversidade from '../components/LogoUniversidade.jsx'
import NavBar from '../components/NavBar.jsx'
import CentralNotificacoes from '../components/CentralNotificacoes.jsx'
import Toasts from '../components/Toasts.jsx'

/**
 * Estrutura global presente em todas as telas (Frontend/Agent.md, seção 3.4):
 * logo centralizada, NavBar com todas as telas e central de notificações.
 *
 * No mobile, o bloco de notificações sai da linha da NavBar e sobe para o
 * canto superior direito (ver AppLayout.module.css), liberando espaço para
 * as quatro telas caberem em uma única linha.
 */
export default function AppLayout() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.logoRow}>
          <LogoUniversidade />
        </div>

        <div className={styles.navRow}>
          <NavBar />

          <div className={styles.acoes}>
            <CentralNotificacoes />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <Toasts />
    </>
  )
}
