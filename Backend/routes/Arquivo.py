"""Recepção, validação e armazenamento de folhas de ponto PDF.

A rota verifica a extensão, a assinatura `%PDF-` e o limite de tamanho. Para
armazenar definitivamente, precisa de ID/nome de servidor e competência. Esses
metadados devem vir do OCR ou de revisão humana; sem eles o PDF não é salvo numa
pasta incorreta e a resposta informa `armazenado: false`.
"""
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from Backend.services.ArmazenamentoArquivos import ArmazenamentoArquivos

router = APIRouter(prefix="/folhas", tags=["Folhas de ponto"])
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
armazenamento = ArmazenamentoArquivos()


@router.post("", summary="Receber e armazenar folhas de ponto PDF")
async def receber_folhas(
    arquivos: list[UploadFile] = File(..., description="Um ou mais documentos PDF."),
    servidor_id: str | None = Form(default=None),
    servidor_nome: str | None = Form(default=None),
    competencia: str | None = Form(default=None, description="Formato AAAA-MM."),
    substituir: bool = Form(default=False),
):
    """Recebe PDFs e opcionalmente os salva após identificação confirmada.

    Os campos de identificação são únicos por requisição; por isso, se forem
    enviados, a requisição deve conter apenas um PDF. Até a integração OCR, o
    front pode omiti-los. Para substituir o mesmo servidor/mês, deve enviar
    `substituir=true`, que preserva a versão antiga com sufixo `_OLD_`.
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
    for arquivo in arquivos:
        nome = arquivo.filename or ""
        conteudo = await arquivo.read(MAX_UPLOAD_BYTES + 1)
        await arquivo.close()
        if len(conteudo) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"{nome} excede o limite de 25 MB.")
        if not nome.lower().endswith(".pdf") or not conteudo.startswith(b"%PDF-"):
            raise HTTPException(status_code=415, detail=f"{nome or 'Arquivo enviado'} não é um PDF válido.")

        caminho_salvo = None
        mensagem = "OCR pendente; PDF validado, mas ainda sem servidor e competência confirmados."
        if all(metadados):
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
            mensagem = "PDF armazenado na pasta do servidor e competência informados."

        resultados.append(
            {
                "id": str(uuid4()),
                "nome": nome,
                "status": "nao_escaneado",
                "score": None,
                "competencia": competencia or "",
                "servidorId": servidor_id,
                "armazenado": caminho_salvo is not None,
                "caminho": str(caminho_salvo) if caminho_salvo else None,
                "campos": {
                    "servidor": servidor_nome or "",
                    "matricula": servidor_id or "",
                    "email": "",
                    "competencia": competencia or "",
                },
                "mensagem": mensagem,
            }
        )
    return {"documentos": resultados}
