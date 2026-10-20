import { useState } from 'react'
import styles from './Servidor.module.css'
import BuscaServidor from '../components/BuscaServidor.jsx'
import AreaFolhaDePonto from '../components/AreaFolhaDePonto.jsx'
import PainelDocumentos from '../components/PainelDocumentos.jsx'

// DADOS DE EXEMPLO (ver src/mocks/servidores.js).
import { DOCUMENTOS, SERVIDORES } from '../mocks/servidores.js'

/**
 * Monta os campos editáveis de um documento.
 * TODO(lógica): trocar pelos campos devolvidos pelo OCR no backend.
 */
function camposIniciais(documento, servidor) {
  return [
    { id: 'servidor', rotulo: 'Servidor', valor: servidor?.nome ?? '' },
    { id: 'matricula', rotulo: 'Matrícula', valor: servidor?.matricula ?? '' },
    { id: 'email', rotulo: 'E-mail', valor: servidor?.email ?? '' },
    { id: 'competencia', rotulo: 'Competência', valor: documento?.competencia ?? '' },
  ]
}

/**
 * Tela de Servidor (Frontend/Agent.md, seção 5.2).
 *
 * Três regiões:
 * - Busca (topo) com cache de servidores.
 * - Área central de upload/visualização.
 * - Painel lateral de documentos e dados (movível; direita por padrão).
 *
 * Estado atual: tudo em memória. Nenhum arquivo é enviado ao backend ainda.
 */
export default function Servidor() {
  const [busca, setBusca] = useState('')
  const [servidorSelecionado, setServidorSelecionado] = useState(null)

  const [documentos, setDocumentos] = useState(DOCUMENTOS)
  const [documentoAtivoId, setDocumentoAtivoId] = useState(null)

  const [lado, setLado] = useState('direita')
  const [aba, setAba] = useState('documentos')
  const [mostrarOutros, setMostrarOutros] = useState(false)
  const [campos, setCampos] = useState([])

  const documentoAtivo = documentos.find((doc) => doc.id === documentoAtivoId) ?? null

  /** Abre um documento: carrega os dados e joga o foco para a aba "Dados". */
  function abrirDocumento(documento) {
    const servidor = SERVIDORES.find((item) => item.id === documento.servidorId) ?? null

    setDocumentoAtivoId(documento.id)
    setServidorSelecionado(servidor)
    setCampos(camposIniciais(documento, servidor))
    setAba('dados')
  }

  /** Escolhe um servidor na busca e preenche os campos do documento aberto. */
  function escolherServidor(servidor) {
    setServidorSelecionado(servidor)
    setBusca(servidor.matricula)
    setCampos(camposIniciais(documentoAtivo, servidor))
  }

  /**
   * Recebe o PDF escolhido pelo usuário.
   * TODO(backend): enviar via multipart e substituir pelo resultado do OCR.
   */
  function enviarArquivo(arquivo) {
    const documento = {
      id: `local-${Date.now()}`,
      nome: arquivo.name,
      status: 'nao_escaneado',
      score: null,
      competencia: '',
      servidorId: null,
    }

    setDocumentos((atuais) => [documento, ...atuais])
    setDocumentoAtivoId(documento.id)
    setCampos(camposIniciais(documento, null))
    setAba('dados')
  }

  /** Edição local dos campos extraídos. */
  function editarCampo(id, valor) {
    setCampos((atuais) =>
      atuais.map((campo) => (campo.id === id ? { ...campo, valor } : campo)),
    )
  }

  return (
    <section className={styles.pagina} aria-labelledby="titulo-servidor">
      <h1 id="titulo-servidor">Servidor</h1>

      <BuscaServidor
        servidores={SERVIDORES}
        valor={busca}
        onValorChange={setBusca}
        onSelecionar={escolherServidor}
        servidorSelecionado={servidorSelecionado}
      />

      <div className={styles.conteudo} data-lado={lado}>
        <div className={styles.central}>
          <AreaFolhaDePonto
            documentoAtivo={documentoAtivo}
            documentos={documentos}
            onEnviarArquivo={enviarArquivo}
            mostrarOutros={mostrarOutros}
            onAlternarOutros={() => setMostrarOutros((atual) => !atual)}
            onSelecionar={abrirDocumento}
          />
        </div>

        <PainelDocumentos
          documentos={documentos}
          docAtivoId={documentoAtivoId}
          onSelecionar={abrirDocumento}
          campos={campos}
          onCampoChange={editarCampo}
          aba={aba}
          onAba={setAba}
          lado={lado}
          onAlternarLado={() => setLado((atual) => (atual === 'direita' ? 'esquerda' : 'direita'))}
        />
      </div>
    </section>
  )
}
