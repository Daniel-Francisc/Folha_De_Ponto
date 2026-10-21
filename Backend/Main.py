"""Ponto de entrada da API FastAPI.

Para iniciar localmente, na raiz do repositório execute `uvicorn Backend.Main:app
--reload`. Cada router agrupa endpoints por assunto; a divisão mantém este
arquivo simples e deixa validações e regras de negócio perto de cada área.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Backend.routes.Arquivo import router as router_arquivo
from Backend.routes.Excel import router as router_excel
from Backend.routes.Integracao import (
    emails_router,
    historico_router,
    inicio_router,
    marcas_router,
    notas_router,
    notificacoes_router,
    processamentos_router,
    recebidos_router,
    rotinas_router,
)
from Backend.routes.Servidores import router as router_servidores

app = FastAPI(
    title="Folha de Ponto API",
    description=(
        "API local para integrar o processamento de folhas de ponto ao front-end. "
        "As rotas ainda sem serviço real estão marcadas como pontos de extensão "
        "e devolvem respostas vazias. Consulte cada descrição em /docs."
    ),
    version="0.2.0",
)

# CORS permite que o servidor de desenvolvimento Vite acesse a API. Em produção,
# substitua esta lista por origens institucionais explícitas.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas com implementação atual.
app.include_router(router_servidores)
app.include_router(router_excel)
app.include_router(router_arquivo)

# Rotas scaffold: os handlers explicam o que falta e retornam vazio até que a
# persistência/serviço correspondente seja implementado com segurança.
for router in (
    notas_router,
    marcas_router,
    emails_router,
    rotinas_router,
    recebidos_router,
    historico_router,
    inicio_router,
    notificacoes_router,
    processamentos_router,
):
    app.include_router(router)


@app.get("/health", tags=["Sistema"], summary="Verificar disponibilidade da API")
def health():
    """Sinal simples usado para confirmar que o processo da API está ativo."""
    return {"status": "ok"}
