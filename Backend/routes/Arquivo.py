"""Recepção de folhas PDF.

Esta rota valida apenas que cada arquivo tenha extensão `.pdf`, caiba no limite
e comece pela assinatura `%PDF-`. Isso confirma o tipo básico do arquivo, mas
**não** significa que o documento tenha sido lido por OCR. Nenhum PDF é salvo
nesta versão. O próximo agente deve conectar um serviço de OCR, persistir o PDF
em diretório controlado e atualizar o status/score/campos com o resultado real.
"""

from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(prefix="/folhas", tags=["Folhas de ponto"])
# Limite por PDF; a leitura para em limite + 1 byte para detectar excesso sem
# carregar arquivos maiores inteiros na memória.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@router.post("")
async def receber_folhas(arquivos: list[UploadFile] = File(...)):
    """Valida PDFs e devolve estrutura provisória para revisão no front-end.

    O campo multipart chama-se `arquivos` e pode ser repetido para enviar vários
    documentos. O status `nao_escaneado` é intencional: não existe OCR conectado.
    """
    if not arquivos:
        raise HTTPException(status_code=400, detail="Selecione ao menos um arquivo PDF.")
    resultados = []
    for arquivo in arquivos:
        nome = arquivo.filename or ""
        conteudo = await arquivo.read(MAX_UPLOAD_BYTES + 1)
        await arquivo.close()
        if len(conteudo) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"{nome} excede o limite de 25 MB.")
        if not nome.lower().endswith(".pdf") or not conteudo.startswith(b"%PDF-"):
            raise HTTPException(status_code=415, detail=f"{nome or 'Arquivo enviado'} não é um PDF válido.")
        resultados.append({"id": str(uuid4()), "nome": nome, "status": "nao_escaneado", "score": None, "competencia": "", "servidorId": None, "campos": {"servidor": "", "matricula": "", "email": "", "competencia": ""}, "mensagem": "PDF recebido. O processamento OCR ainda não está configurado."})
    return {"documentos": resultados}
