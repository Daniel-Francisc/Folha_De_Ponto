"""Recepção, pré-processamento, OCR e armazenamento opcional de folhas PDF.

Um PDF recebido pode conter uma folha por página. A rota divide esse PDF em
documentos de uma página, chama o OCR separadamente para cada um e devolve um
resultado por página para revisão no frontend. O armazenamento definitivo só
ocorre quando o usuário envia servidor e competência confirmados.
"""

import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from Backend.services.ArmazenamentoArquivos import ArmazenamentoArquivos
from Backend.services.PreprocessadorPDF import PreprocessadorPDF
from Backend.services.ProcessadorFolhas import ProcessadorFolhas
from Backend.services.RepositorioLocal import RepositorioLocal
from Backend.services.TesseractOCR import OCRNaoConfigurado, PDFNaoProcessavel

router = APIRouter(prefix="/folhas", tags=["Folhas de ponto"])
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
armazenamento = ArmazenamentoArquivos()
preprocessador = PreprocessadorPDF(limite_paginas=50)
processador = ProcessadorFolhas()
repositorio = RepositorioLocal()


def _competencia_para_tela(valor: str) -> str:
    """Converte AAAA-MM usado pelo armazenamento para MM/AAAA no frontend."""
    achado = re.fullmatch(r"(\d{4})-(0[1-9]|1[0-2])", valor)
    return f"{achado.group(2)}/{achado.group(1)}" if achado else valor


def _nome_pagina(nome_original: str, numero: int, total: int) -> str:
    """Cria um rótulo de página sem alterar o nome do arquivo enviado.

    O rótulo ajuda o frontend a mostrar qual página gerou cada sugestão. O
    nome final gravado no armazenamento é gerado por `ArmazenamentoArquivos`.
    """
    caminho = Path(nome_original or "folha.pdf")
    if total == 1:
        return caminho.name
    return f"{caminho.stem}_pagina_{numero:03d}.pdf"


@router.post("", summary="Separar páginas, processar folhas e armazenar após confirmação")
async def receber_folhas(
    arquivos: list[UploadFile] = File(..., description="Um ou mais documentos PDF."),
    servidor_id: str | None = Form(default=None),
    servidor_nome: str | None = Form(default=None),
    competencia: str | None = Form(default=None, description="Formato AAAA-MM."),
    substituir: bool = Form(default=False),
    pagina: int | None = Form(
        default=None,
        ge=1,
        description=(
            "Página de origem (contada a partir de 1). Use ao reenviar um PDF "
            "multipágina após revisar apenas uma das folhas."
        ),
    ),
):
    """Recebe PDFs e processa cada página de forma independente.

    Sem `pagina`, todas as páginas de todos os arquivos são separadas e lidas
    individualmente. Para confirmar e armazenar, envie um único arquivo, os
    três metadados (servidor, nome e competência) e, se ele tiver várias
    páginas, `pagina` para escolher qual folha será salva. O arquivo original
    pode ser reenviado: o backend volta a separar e seleciona a página indicada.

    Cada elemento de `documentos` corresponde a uma página e inclui o nome do
    arquivo de origem, número da página e total de páginas da origem. Os PDFs
    intermediários são mantidos apenas em memória; só a página confirmada é
    gravada na pasta definitiva.
    """
    if not arquivos:
        raise HTTPException(status_code=400, detail="Selecione ao menos um arquivo PDF.")

    metadados = (servidor_id, servidor_nome, competencia)
    if any(metadados) and not all(metadados):
        raise HTTPException(
            status_code=422,
            detail="Para armazenar, informe servidor_id, servidor_nome e competencia juntos.",
        )
    if all(metadados) and len(arquivos) != 1:
        raise HTTPException(
            status_code=400,
            detail="Confirme e armazene uma folha por requisição, usando um único arquivo.",
        )
    if pagina is not None and len(arquivos) != 1:
        raise HTTPException(
            status_code=400,
            detail="Informe pagina somente quando enviar um único PDF.",
        )

    resultados: list[dict] = []
    processamento_id = str(uuid4())

    for arquivo in arquivos:
        nome_original = arquivo.filename or ""
        conteudo_original = await arquivo.read(MAX_UPLOAD_BYTES + 1)
        await arquivo.close()

        if len(conteudo_original) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"{nome_original} excede o limite de 25 MB.",
            )
        if not nome_original.lower().endswith(".pdf") or not conteudo_original.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=415,
                detail=f"{nome_original or 'Arquivo enviado'} não é um PDF válido.",
            )

        try:
            # A extração e o OCR usam PyMuPDF/Tesseract e podem bloquear. A
            # threadpool mantém a API responsiva para outras requisições.
            paginas_arquivo = await run_in_threadpool(
                preprocessador.separar,
                conteudo_original,
            )
        except OCRNaoConfigurado as erro:
            raise HTTPException(status_code=503, detail=str(erro)) from erro
        except PDFNaoProcessavel as erro:
            raise HTTPException(status_code=422, detail=str(erro)) from erro

        if pagina is not None and pagina > len(paginas_arquivo):
            raise HTTPException(
                status_code=422,
                detail=(
                    f"A página {pagina} não existe em {nome_original}; "
                    f"o arquivo tem {len(paginas_arquivo)} página(s)."
                ),
            )

        if all(metadados) and len(paginas_arquivo) > 1 and pagina is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    "O PDF tem várias páginas. Informe pagina para selecionar a folha "
                    "confirmada antes de armazená-la."
                ),
            )

        # Durante o primeiro envio, processamos todas as páginas. Na confirmação
        # posterior, limitamos o trabalho à página escolhida pelo usuário.
        paginas_para_processar = (
            [paginas_arquivo[pagina - 1]]
            if pagina is not None
            else paginas_arquivo
        )

        for pagina_pdf in paginas_para_processar:
            try:
                resultado = await run_in_threadpool(
                    processador.processar,
                    pagina_pdf.conteudo,
                )
            except OCRNaoConfigurado as erro:
                raise HTTPException(status_code=503, detail=str(erro)) from erro
            except PDFNaoProcessavel as erro:
                raise HTTPException(status_code=422, detail=str(erro)) from erro

            campos = resultado["campos"].copy()
            # Os metadados informados pelo usuário substituem sugestões do OCR.
            if servidor_nome:
                campos["servidor"] = servidor_nome
            if servidor_id:
                campos["matricula"] = servidor_id
            competencia_tela = (
                _competencia_para_tela(competencia)
                if competencia
                else resultado["competencia"]
            )
            if competencia_tela:
                campos["competencia"] = competencia_tela

            caminho_salvo = None
            if all(metadados):
                documento_em_envio = any(
                    item.get("servidorId") == servidor_id
                    and item.get("competencia") == _competencia_para_tela(competencia or "")
                    and item.get("statusEnvio") == "enviando"
                    for item in repositorio.listar("documentos")
                )
                if documento_em_envio:
                    raise HTTPException(
                        status_code=409,
                        detail="A folha dessa competência está sendo enviada; tente atualizar depois.",
                    )
                try:
                    # Salva o PDF isolado da página confirmada, não o conjunto
                    # original que poderia conter folhas de outras pessoas.
                    caminho_salvo = armazenamento.salvar_pdf(
                        conteudo=pagina_pdf.conteudo,
                        servidor_id=servidor_id or "",
                        nome_servidor=servidor_nome or "",
                        competencia=competencia or "",
                        substituir=substituir,
                    )
                except FileExistsError as erro:
                    raise HTTPException(status_code=409, detail=str(erro)) from erro
                except ValueError as erro:
                    raise HTTPException(status_code=422, detail=str(erro)) from erro

            documento_id = str(uuid4())
            if caminho_salvo is not None:
                # Substituir arquiva a versão anterior no disco e a remove da
                # fila de pendências, sem apagar o arquivo histórico.
                documentos_salvos = repositorio.listar("documentos")
                for documento_salvo in documentos_salvos:
                    if (
                        documento_salvo.get("servidorId") == servidor_id
                        and documento_salvo.get("competencia") == competencia_tela
                        and documento_salvo.get("statusEnvio") == "pendente"
                    ):
                        documento_salvo["statusEnvio"] = "arquivado"

                documentos_salvos.append(
                    {
                        "id": documento_id,
                        "nome": caminho_salvo.name,
                        "servidorId": servidor_id,
                        "servidor": servidor_nome,
                        "email": campos.get("email", ""),
                        "competencia": competencia_tela,
                        "horarios": campos.get("horarios", []),
                        "score": resultado["score"],
                        "caminho": str(caminho_salvo.resolve()),
                        "statusEnvio": "pendente",
                        "recebidoEm": datetime.now(timezone.utc).isoformat(),
                    }
                )
                repositorio.salvar_todos("documentos", documentos_salvos)

            resultados.append(
                {
                    "id": documento_id,
                    "nome": (
                        caminho_salvo.name
                        if caminho_salvo
                        else _nome_pagina(
                            nome_original,
                            pagina_pdf.numero,
                            pagina_pdf.total_paginas,
                        )
                    ),
                    "arquivoOrigem": nome_original,
                    "paginaOrigem": pagina_pdf.numero,
                    "totalPaginasOrigem": pagina_pdf.total_paginas,
                    "status": resultado["status"],
                    "score": resultado["score"],
                    "competencia": competencia_tela,
                    "servidorId": servidor_id or resultado["servidorId"],
                    "armazenado": caminho_salvo is not None,
                    # Não expor caminhos absolutos do computador do servidor.
                    "caminho": (
                        str(caminho_salvo.relative_to(armazenamento.raiz))
                        if caminho_salvo
                        else None
                    ),
                    "campos": campos,
                    "paginasLidas": resultado["paginas_lidas"],
                    "mensagem": (
                        "Página armazenada após confirmação dos dados."
                        if caminho_salvo
                        else resultado["mensagem"]
                    ),
                }
            )

    documentos_publicos = [
        {chave: valor for chave, valor in documento.items() if chave != "caminho"}
        for documento in resultados
    ]
    repositorio.adicionar(
        "processamentos",
        {
            "id": processamento_id,
            "status": "concluido",
            "criadoEm": datetime.now(timezone.utc).isoformat(),
            "documentos": documentos_publicos,
        },
    )
    return {"processamentoId": processamento_id, "documentos": resultados}
