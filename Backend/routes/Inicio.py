"""Indicadores usados na página inicial.

Os valores devem vir de documentos e envios reais persistidos. Não preencher com
números de exemplo, pois o front pode interpretá-los como indicadores oficiais.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/inicio", tags=["Resumo inicial"])

@router.get("", summary="Consultar indicadores da tela inicial")
def resumo_inicio():
    """TODO: calcular total mensal, última folha, pendências e últimos envios.
    Retorna `{}` até existirem fontes reais para os indicadores.
    """
    return {}
