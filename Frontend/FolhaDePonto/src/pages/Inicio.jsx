import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Inicio.module.css'
import CalendarioAcademico from '../components/CalendarioAcademico.jsx'
import CardFuncionarios from '../components/CardFuncionarios.jsx'
import CardEmails from '../components/CardEmails.jsx'
import ResumoRapido from '../components/ResumoRapido.jsx'
import {
  marcacoes as apiMarcacoes,
  mensagemDeErro,
  notas as apiNotas,
  painel,
} from '../services/api.js'
import { diasDoIntervalo } from '../utils/marcas.js'

/**
 * Tela principal (Frontend/Agent.md, seção 5.1).
 *
 * - GET /inicio, /notas e /marcacoes alimentam cards e calendário.
 * - Clicar em um dia NÃO abre a nota aqui: navega para /calendario?dia=…
 */
function mapaDeMarcas(lista) {
  return Object.fromEntries(lista.map((item) => [item.dia, item.tipos]))
}

export default function Inicio() {
  const navegar = useNavigate()

  const [dados, setDados] = useState(null)
  const [notas, setNotas] = useState([])
  const [marcas, setMarcas] = useState({})
  const [erro, setErro] = useState('')

  const diasComNota = useMemo(
    () => new Set(notas.flatMap((item) => diasDoIntervalo(item.inicio, item.fim))),
    [notas],
  )

  function carregar() {
    Promise.all([painel.inicio(), apiNotas.listar(), apiMarcacoes.listar()])
      .then(([resumo, listaNotas, listaMarcas]) => {
        setDados(resumo)
        setNotas(listaNotas)
        setMarcas(mapaDeMarcas(listaMarcas))
        setErro('')
      })
      .catch((falha) => setErro(mensagemDeErro(falha)))
  }

  useEffect(() => {
    carregar()

    // Recalcula os cards ao voltar para a aba.
    function aoFocar() {
      carregar()
    }

    window.addEventListener('focus', aoFocar)
    return () => window.removeEventListener('focus', aoFocar)
  }, [])

  return (
    <section aria-labelledby="titulo-inicio">
      <h1 id="titulo-inicio">Início</h1>

      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}

      <div className={styles.grade}>
        <div className={styles.calendario}>
          <CalendarioAcademico
            marcas={marcas}
            diasComNota={diasComNota}
            onDiaClique={(dia) => navegar(`/calendario?dia=${dia}`)}
          />
        </div>

        <div className={styles.funcionarios}>
          <CardFuncionarios total={dados?.totalFolhasMes ?? 0} />
        </div>

        <div className={styles.emails}>
          <CardEmails envios={dados?.ultimosEnvios ?? []} />
        </div>
      </div>

      <ResumoRapido dados={dados} />
    </section>
  )
}
