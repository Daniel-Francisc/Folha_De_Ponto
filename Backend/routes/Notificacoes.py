"""Consulta notificações locais criadas após tentativas reais de envio SMTP."""
from fastapi import APIRouter

from Backend.services.RepositorioLocal import RepositorioLocal

router = APIRouter(prefix="/notificacoes", tags=["Notificações"])
repositorio = RepositorioLocal()

@router.get("", summary="Listar notificações recentes")
def listar_notificacoes():
    """Lista estados operacionais reais, ordenados do mais recente ao antigo."""
    notificacoes = repositorio.listar("notificacoes")
    return sorted(notificacoes, key=lambda item: item.get("data", ""), reverse=True)[:50]
