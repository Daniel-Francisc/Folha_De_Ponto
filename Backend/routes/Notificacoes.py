"""Notificações recentes de processamento e envio.

O painel do sino é transversal às telas; sua fonte futura deve ser o estado real
dos envios. Este scaffold não cria notificações por conta própria.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/notificacoes", tags=["Notificações"])

@router.get("", summary="Listar notificações recentes")
def listar_notificacoes():
    """TODO: ler estados recentes persistidos (`andamento`, `sucesso`, `erro`).
    Retorna `[]` enquanto não há histórico de operações.
    """
    return []
