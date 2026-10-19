import FormularioEmail from '../components/FormularioEmail.jsx'
import ListaEnvios from '../components/ListaEnvios.jsx'

/**
 * Tela de Emails (Frontend/Agent.md, seção 5.4).
 * Monta e envia o JSON de envio: mensagem automática, servidor,
 * e-mail cadastrado e arquivo do backend.
 */
export default function Emails() {
  return (
    <section aria-labelledby="titulo-emails">
      <h1 id="titulo-emails">Emails</h1>

      <FormularioEmail />
      <ListaEnvios />
    </section>
  )
}
