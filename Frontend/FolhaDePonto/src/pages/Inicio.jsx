import { useEffect, useState } from 'react'
import styles from './Inicio.module.css'
import CalendarioAcademico from '../components/CalendarioAcademico.jsx'
import CardFuncionarios from '../components/CardFuncionarios.jsx'
import CardEmails from '../components/CardEmails.jsx'
import ResumoRapido from '../components/ResumoRapido.jsx'
import { mensagemDeErro, painel } from '../services/api.js'

/**
 * Tela principal (Frontend/Agent.md, seção 5.1).
 *
 * Dados reais: GET /inicio
 * { totalFolhasMes, ultimaFolha, solicitacoesPendentes, ultimosEnvios }
 */
export default function Inicio() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    painel
      .inicio()
      .then((resposta) => {
        if (ativo) {
          setDados(resposta)
          setErro('')
        }
      })
      .catch((falha) => {
        if (ativo) setErro(mensagemDeErro(falha))
      })

    return () => {
      ativo = false
    }
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
          <CalendarioAcademico />
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
