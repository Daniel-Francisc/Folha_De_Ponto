import styles from './AppLayout.module.css'
import { Outlet } from 'react-router-dom'
import LogoUniversidade from '../components/LogoUniversidade.jsx'
import NavBar from '../components/NavBar.jsx'
import CentralNotificacoes from '../components/CentralNotificacoes.jsx'
import Toasts from '../components/Toasts.jsx'

/**
 * Estrutura global presente em todas as telas (Frontend/Agent.md, seção 3.4):
 * logo centralizada, NavBar com todas as telas e central de notificações.
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
          <CentralNotificacoes />
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <Toasts />
    </>
  )
}
