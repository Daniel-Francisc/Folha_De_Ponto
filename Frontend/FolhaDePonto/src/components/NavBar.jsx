import { NavLink } from 'react-router-dom'
import styles from './NavBar.module.css'

/**
 * Navegação principal (Frontend/Agent.md, seção 3.4).
 * Presente em todas as telas; lista exatamente as quatro telas do sistema.
 */

const NAV_ITEMS = [
  { to: '/', label: 'Início', end: true },
  { to: '/servidores', label: 'Servidor' },
  { to: '/calendario', label: 'Calendário' },
  { to: '/emails', label: 'Emails' },
]

export default function NavBar() {
  return (
    <nav aria-label="Navegação principal">
      <ul className={styles.list}>
        {NAV_ITEMS.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
