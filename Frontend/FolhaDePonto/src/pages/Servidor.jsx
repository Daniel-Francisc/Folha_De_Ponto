import BuscaServidor from '../components/BuscaServidor.jsx'
import AreaFolhaDePonto from '../components/AreaFolhaDePonto.jsx'
import PainelDocumentos from '../components/PainelDocumentos.jsx'

/**
 * Tela de Servidor (Frontend/Agent.md, seção 5.2).
 * Três regiões: busca com cache, área central de upload/visualização
 * e painel lateral de documentos (à direita por padrão).
 */
export default function Servidor() {
  return (
    <section aria-labelledby="titulo-servidor">
      <h1 id="titulo-servidor">Servidor</h1>

      <BuscaServidor />

      <div>
        <AreaFolhaDePonto />
        <PainelDocumentos />
      </div>
    </section>
  )
}
