import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import styles from './PdfViewer.module.css'

/**
 * Visualizador de PDF (Frontend/Agent.md, seção 5.2-C).
 *
 * Renderiza cada página em um <canvas> com pdf.js. Foi escolhido no lugar de
 * <iframe src="blob:"> porque o visualizador nativo do Chrome pode ficar em
 * branco (plugin desabilitado em alguns ambientes).
 */

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfViewer({ url, nome }) {
  const containerRef = useRef(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let cancelado = false
    const container = containerRef.current

    if (!container) return undefined

    container.innerHTML = ''
    setCarregando(true)
    setErro('')

    const tarefa = pdfjs.getDocument({ url })

    tarefa.promise
      .then(async (pdf) => {
        if (cancelado) return

        const largura = container.clientWidth || 800
        const densidade = window.devicePixelRatio || 1

        for (let numero = 1; numero <= pdf.numPages; numero += 1) {
          const pagina = await pdf.getPage(numero)
          if (cancelado) break

          const base = pagina.getViewport({ scale: 1 })
          const escala = Math.min(2.5, (largura / base.width) * densidade)
          const viewport = pagina.getViewport({ scale: escala })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.height = 'auto'
          container.appendChild(canvas)

          await pagina.render({
            canvas,
            canvasContext: canvas.getContext('2d'),
            viewport,
          }).promise
        }

        if (!cancelado) setCarregando(false)
      })
      .catch(() => {
        if (!cancelado) {
          setErro('Não foi possível exibir o PDF.')
          setCarregando(false)
        }
      })

    return () => {
      cancelado = true
      try {
        tarefa.destroy()
      } catch {
        // A tarefa já pode ter sido finalizada.
      }
    }
  }, [url])

  return (
    <div className={styles.visualizador} aria-label={`Pré-visualização de ${nome}`}>
      {carregando && <p className={styles.aviso}>Carregando PDF…</p>}
      {erro && <p className={styles.aviso}>{erro}</p>}
      <div ref={containerRef} className={styles.paginas} />
    </div>
  )
}
