"""Rotas para arquivos pendentes e envio nominal de e-mail.

O envio real deve usar `Backend.services.EmailServices`, receber arquivos de um
repositório controlado e registrar o resultado somente após SMTP responder. Esta
rota não envia e-mail nem simula sucesso; os retornos vazios são scaffolds.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/emails", tags=["E-mails"])

class EnvioEmailEntrada(BaseModel):
    """Pedido revisado no front-end antes do envio SMTP."""
    servidorId: str | None = None
    destinatario: str = Field(description="Endereço revisado pelo usuário.")
    assunto: str
    mensagem: str
    arquivos: list[str] = Field(default_factory=list, description="IDs persistidos dos anexos.")

@router.get("/pendentes", summary="Listar folhas aguardando envio")
def listar_emails_pendentes():
    """TODO: listar arquivos processados não enviados, com servidor, e-mail,
    competência e score. Retorna `[]` pois PDFs ainda não são persistidos.
    """
    return []

@router.post("/enviar", summary="Enviar folha por e-mail")
def enviar_email(dados: EnvioEmailEntrada):
    """TODO: validar destinatário e IDs, carregar anexos do diretório controlado,
    chamar o serviço SMTP e registrar histórico/notificação. Traduzir falhas para
    mensagem legível sem stack trace. SMTP não é chamado; retorna `{}`.
    """
    return {}
