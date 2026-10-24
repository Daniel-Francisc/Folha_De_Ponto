"""Indicadores calculados a partir de documentos e envios reais persistidos."""
from datetime import date

from fastapi import APIRouter

from Backend.services.RepositorioLocal import RepositorioLocal

router = APIRouter(prefix="/inicio", tags=["Resumo inicial"])
repositorio = RepositorioLocal()

@router.get("", summary="Consultar indicadores da tela inicial")
def resumo_inicio():
    """Calcula indicadores apenas com folhas e envios realmente persistidos."""
    documentos = repositorio.listar("documentos")
    historico = sorted(
        repositorio.listar("historico"),
        key=lambda item: item.get("data", ""), reverse=True,
    )
    hoje = date.today()
    # "Folhas lidas este mês" = recebidas no mês corrente, independente da
    # competência da folha (que pode ser de um mês anterior).
    prefixo_mes = hoje.strftime("%Y-%m")
    folhas_mes = [
        item for item in documentos
        if str(item.get("recebidoEm", "")).startswith(prefixo_mes)
    ]
    ultima_folha = max(
        documentos, key=lambda item: item.get("recebidoEm", ""), default=None
    )
    ultimos_envios = []
    for registro in historico:
        for arquivo in registro.get("arquivos", []) or []:
            ultimos_envios.append({
                "id": f"{registro.get('id', '')}:{arquivo.get('id', '')}",
                "arquivo": arquivo.get("nome", ""),
                "destinatario": registro.get("destinatario", ""),
                "data": registro.get("data", ""),
                "status": registro.get("status", "erro"),
            })
            if len(ultimos_envios) == 3:
                break
        if len(ultimos_envios) == 3:
            break
    return {
        "totalFolhasMes": len(folhas_mes),
        "ultimaFolha": (
            {"nome": ultima_folha["nome"], "data": ultima_folha.get("recebidoEm", "")}
            if ultima_folha else None
        ),
        "solicitacoesPendentes": sum(
            1 for item in repositorio.listar("recebidos")
            if item.get("status") == "pendente"
        ),
        "ultimosEnvios": ultimos_envios,
    }
