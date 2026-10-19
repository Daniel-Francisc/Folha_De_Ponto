/**
 * Formulário de envio de e-mail (Frontend/Agent.md, seção 5.4).
 * JSON enviado ao backend: mensagem automática, servidor, e-mail cadastrado e arquivo.
 */
export default function FormularioEmail() {
  return (
    <form aria-label="Envio de e-mail">
      {/* TODO: seleção do servidor (busca no cache) */}
      {/* TODO: destinatário — e-mail cadastrado do servidor */}

      <label htmlFor="assunto-email">Assunto</label>
      <input id="assunto-email" type="text" name="assunto" />

      <label htmlFor="mensagem-email">Mensagem</label>
      <textarea id="mensagem-email" name="mensagem" rows={6} />

      {/* TODO: anexos — arquivos do backend */}
      {/* TODO: botão enviar + estado de envio */}
    </form>
  )
}
