"""Recepção, validação, OCR e armazenamento opcional de folhas de ponto PDF.

A rota valida os arquivos, delega o reconhecimento ao serviço Tesseract e
devolve ao front os campos sugeridos para revisão humana. O PDF só é gravado
na pasta definitiva quando servidor e competência são enviados explicitamente.
"""

import re
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from Backend.services.ArmazenamentoArquivos import ArmazenamentoArquivos
from Backend.services.ProcessadorFolhas import ProcessadorFolhas
from Backend.services.RepositorioLocal import RepositorioLocal
from Backend.services.TesseractOCR import OCRNaoConfigurado, PDFNaoProcessavel

router = APIRouter(prefix="/folhas", tags=["Folhas de ponto"])
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
armazenamento = ArmazenamentoArquivos()
processador = ProcessadorFolhas()
repositorio = RepositorioLocal()


def _competencia_para_tela(valor: str) -> str:
    """Converte AAAA-MM do contrato de armazenamento para MM/AAAA da interface."""
    achado = re.fullmatch(r"(\d{4})-(0[1-9]|1[0-2])", valor)
    return f"{achado.group(2)}/{achado.group(1)}" if achado else valor


@router.post("", summary="Receber, processar e opcionalmente armazenar folhas PDF")
async def receber_folhas(
    arquivos: list[UploadFile] = File(..., description="Um ou mais documentos PDF."),
    servidor_id: str | None = Form(default=None),
    servidor_nome: str | None = Form(default=None),
    competencia: str | None = Form(default=None, description="Formato AAAA-MM."),
    substituir: bool = Form(default=False),
):
    """Recebe PDFs, executa OCR e devolve sugestões para revisão no front.

    Os campos de identificação são únicos por requisição; por isso, se forem
    enviados, a requisição deve conter apenas um PDF. Sem esses campos, o
    documento não é salvo. Para substituir o mesmo servidor/mês, envie
    substituir=true; a versão antiga fica preservada com sufixo _OLD_.
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
            detail="Envie apenas um PDF por requisição quando informar os dados do servidor.",
        )

    resultados = []
    processamento_id = str(uuid4())
    for arquivo in arquivos:
        nome = arquivo.filename or ""
        conteudo = await arquivo.read(MAX_UPLOAD_BYTES + 1)
        await arquivo.close()
        if len(conteudo) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"{nome} excede o limite de 25 MB.")
        if not nome.lower().endswith(".pdf") or not conteudo.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=415,
                detail=f"{nome or 'Arquivo enviado'} não é um PDF válido.",
            )

        try:
            # Tesseract é bloqueante; a threadpool evita parar o event loop.
            resultado = await run_in_threadpool(processador.processar, conteudo)
        except OCRNaoConfigurado as erro:
            raise HTTPException(status_code=503, detail=str(erro)) from erro
        except PDFNaoProcessavel as erro:
            raise HTTPException(status_code=422, detail=str(erro)) from erro

        campos = resultado["campos"].copy()
        # Os campos enviados pelo usuário são dados confirmados e têm
        # precedência sobre as sugestões automáticas do OCR.
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
                caminho_salvo = armazenamento.salvar_pdf(
                    conteudo=conteudo,
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
            # Ao substituir o mesmo servidor/competência, tira a cópia antiga
            # da fila de pendências; o arquivo OLD continua preservado em disco.
            documentos_salvos = repositorio.listar("documentos")
            for documento_salvo in documentos_salvos:
                if (
                    documento_salvo.get("servidorId") == servidor_id
                    and documento_salvo.get("competencia") == competencia_tela
                    and documento_salvo.get("statusEnvio") == "pendente"
                ):
                    documento_salvo["statusEnvio"] = "arquivado"
            documento_pendente = {
                "id": documento_id,
                "nome": caminho_salvo.name,
                "servidorId": servidor_id,
                "servidor": servidor_nome,
                "email": campos.get("email", ""),
                "competencia": competencia_tela,
                "score": resultado["score"],
                "caminho": str(caminho_salvo.resolve()),
                "statusEnvio": "pendente",
                "recebidoEm": datetime.now(timezone.utc).isoformat(),
            }
            documentos_salvos.append(documento_pendente)
            repositorio.salvar_todos("documentos", documentos_salvos)

        resultados.append(
            {
                "id": documento_id,
                "nome": caminho_salvo.name if caminho_salvo else nome,
                "status": resultado["status"],
                "score": resultado["score"],
                "competencia": competencia_tela,
                "servidorId": servidor_id or resultado["servidorId"],
                "armazenado": caminho_salvo is not None,
                # A resposta não revela o caminho absoluto do servidor.
                "caminho": (
                    str(caminho_salvo.relative_to(armazenamento.raiz))
                    if caminho_salvo else None
                ),
                "campos": campos,
                "paginasLidas": resultado["paginas_lidas"],
                "mensagem": (
                    "PDF armazenado após confirmação dos dados."
                    if caminho_salvo
                    else resultado["mensagem"]
                ),
            }
        )
    documentos_publicos = [
        {chave: valor for chave, valor in documento.items() if chave != "caminho"}
        for documento in resultados
    ]
    repositorio.adicionar("processamentos", {
        "id": processamento_id,
        "status": "concluido",
        "criadoEm": datetime.now(timezone.utc).isoformat(),
        "documentos": documentos_publicos,
    })
    return {"processamentoId": processamento_id, "documentos": resultados}
