"""Consulta de folhas pendentes e envio nominal por SMTP."""

from datetime import datetime, timezone
import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field, TypeAdapter, ValidationError

from Backend.services.ArmazenamentoArquivos import ArmazenamentoArquivos
from Backend.services.EmailServices import EmailServices
from Backend.services.RepositorioLocal import RepositorioLocal

router = APIRouter(prefix="/emails", tags=["E-mails"])
repositorio = RepositorioLocal()
armazenamento = ArmazenamentoArquivos()
validar_email = TypeAdapter(EmailStr)

class EnvioEmailEntrada(BaseModel):
    """Pedido revisado no front-end antes do envio SMTP."""
    servidorId: str | None = None
    destinatario: str = Field(description="Um ou mais endereços separados por vírgula.")
    assunto: str = Field(min_length=1, max_length=250)
    mensagem: str = Field(min_length=1, max_length=20_000)
    arquivos: list[str | dict[str, str]] = Field(
        default_factory=list,
        description="IDs persistidos; também aceita objetos com id e nome do frontend atual.",
    )

@router.get("/pendentes", summary="Listar folhas aguardando envio")
def listar_emails_pendentes():
    """Lista PDFs confirmados e gravados que ainda não foram enviados."""
    return [
        {chave: valor for chave, valor in item.items() if chave != "caminho"}
        for item in repositorio.listar("documentos")
        if item.get("statusEnvio") == "pendente"
    ]

@router.post("/enviar", summary="Enviar folha por e-mail")
def enviar_email(dados: EnvioEmailEntrada):
    """Valida anexos salvos, envia uma mensagem e registra o resultado real."""
    if not dados.arquivos:
        raise HTTPException(status_code=422, detail="Selecione ao menos uma folha salva.")
    try:
        destinatarios = [
            str(validar_email.validate_python(endereco.strip()))
            for endereco in dados.destinatario.split(",") if endereco.strip()
        ]
    except ValidationError as erro:
        raise HTTPException(status_code=422, detail="Informe endereços de e-mail válidos.") from erro
    if not destinatarios:
        raise HTTPException(status_code=422, detail="Informe ao menos um destinatário.")
    # Aceita os objetos {id,nome} do front atual e também a forma simples de IDs.
    ids_arquivos = []
    for item in dados.arquivos:
        arquivo_id = item if isinstance(item, str) else item.get("id", "")
        if not arquivo_id:
            raise HTTPException(status_code=422, detail="Cada anexo precisa conter um ID persistido.")
        ids_arquivos.append(arquivo_id)
    if len(set(ids_arquivos)) != len(ids_arquivos):
        raise HTTPException(status_code=422, detail="A lista de anexos contém IDs duplicados.")
    remetente = os.getenv("SMTP_FROM", "").strip() or os.getenv("SMTP_USER", "").strip()
    if not remetente:
        raise HTTPException(
            status_code=503,
            detail="Configure SMTP_FROM (ou SMTP_USER) antes de habilitar o envio.",
        )

    todos = repositorio.listar("documentos")
    por_id = {str(item.get("id")): item for item in todos}
    selecionados = []
    for arquivo_id in ids_arquivos:
        documento = por_id.get(arquivo_id)
        if documento is None or documento.get("statusEnvio") != "pendente":
            raise HTTPException(
                status_code=404,
                detail=f"A folha selecionada ({arquivo_id}) não existe ou já foi enviada.",
            )
        if dados.servidorId and str(documento.get("servidorId")) != dados.servidorId:
            raise HTTPException(status_code=422, detail="A folha não pertence ao servidor informado.")
        selecionados.append(documento)

    raiz_pdf = armazenamento.pasta_pdfs.resolve()
    caminhos = []
    for documento in selecionados:
        caminho = Path(documento.get("caminho", "")).resolve()
        if not caminho.is_relative_to(raiz_pdf) or not caminho.is_file():
            raise HTTPException(status_code=422, detail="Um anexo não está disponível no armazenamento local.")
        caminhos.append(caminho)

    ids_enviados = {str(item["id"]) for item in selecionados}
    if not repositorio.atualizar_status_documentos(
        ids_enviados, "pendente", {"statusEnvio": "enviando"}
    ):
        raise HTTPException(
            status_code=409,
            detail="Uma das folhas já está sendo enviada por outra solicitação.",
        )

    agora = datetime.now(timezone.utc).isoformat()
    historico = {
        "id": str(uuid4()), "tipo": "nominal", "data": agora,
        "remetente": remetente, "destinatario": ", ".join(destinatarios),
        "assunto": dados.assunto, "corpo": dados.mensagem,
        "arquivos": [{"id": item["id"], "nome": item["nome"]} for item in selecionados],
        "status": "sucesso",
    }
    try:
        EmailServices().enviar_email(
            remetente=remetente, destinatario=", ".join(destinatarios),
            assunto=dados.assunto, corpo=dados.mensagem, anexos=caminhos,
        )
    except Exception as erro:
        repositorio.atualizar_status_documentos(
            ids_enviados, "enviando", {"statusEnvio": "pendente"}
        )
        tentativa = {**historico, "status": "erro", "data": datetime.now(timezone.utc).isoformat()}
        repositorio.adicionar("historico", tentativa)
        repositorio.adicionar("notificacoes", {
            "id": tentativa["id"], "arquivo": ", ".join(item["nome"] for item in selecionados),
            "data": tentativa["data"], "status": "erro",
        })
        raise HTTPException(status_code=502, detail="O servidor SMTP não concluiu o envio.") from erro

    repositorio.adicionar("historico", historico)
    repositorio.adicionar("notificacoes", {
        "id": historico["id"], "arquivo": ", ".join(item["nome"] for item in selecionados),
        "data": agora, "status": "sucesso",
    })
    repositorio.atualizar_status_documentos(
        ids_enviados, "enviando", {"statusEnvio": "enviado", "enviadoEm": agora}
    )
    return historico
