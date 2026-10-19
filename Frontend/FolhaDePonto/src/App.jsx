import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import Inicio from './pages/Inicio.jsx'
import Servidor from './pages/Servidor.jsx'
import Calendario from './pages/Calendario.jsx'
import Emails from './pages/Emails.jsx'

/**
 * Mapa de rotas da aplicação.
 * Telas definidas em Frontend/Agent.md (seção 4). Sem login: a aplicação abre em "/".
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Inicio />} />
        <Route path="servidores" element={<Servidor />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="emails" element={<Emails />} />
      </Route>

      {/* Rota desconhecida volta para a tela principal. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
