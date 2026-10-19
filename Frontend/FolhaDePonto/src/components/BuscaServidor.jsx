/**
 * Busca de servidores (Frontend/Agent.md, seção 5.2-A).
 * Aceita número, nome ou a combinação "número|nome".
 * Ao receber foco, a lista de servidores em cache é revelada abaixo.
 */
export default function BuscaServidor() {
  return (
    <section aria-label="Busca de servidor">
      <form role="search">
        <input
          type="search"
          name="busca-servidor"
          aria-label="Buscar servidor por número, nome ou número|nome"
          autoComplete="off"
        />
        {/* TODO: botão limpar */}
      </form>

      <div aria-label="Servidores em cache">
        {/* TODO: lista de resultados; estado vazio explícito */}
      </div>
    </section>
  )
}
