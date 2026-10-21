"""Ponto de entrada da API FastAPI.

Para iniciar localmente, na raiz do repositório execute `uvicorn Backend.Main:app
--reload`. Cada módulo de `routes/` cuida de uma área da API, mantendo o padrão
existente de um arquivo por grupo de rotas.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

# Carrega apenas o arquivo local de desenvolvimento, sem sobrescrever variáveis
# já fornecidas pelo processo ou pelo ambiente de produção.
load_dotenv(Path(__file__).resolve().with_name(".env.development"), override=False)

from Backend.routes.Arquivo import router as router_arquivo
from Backend.routes.CalendarioNotas import router as router_notas
from Backend.routes.Emails import router as router_emails
from Backend.routes.Excel import router as router_excel
from Backend.routes.Historico import router as router_historico
from Backend.routes.Inicio import router as router_inicio
from Backend.routes.Marcacoes import router as router_marcacoes
from Backend.routes.Notificacoes import router as router_notificacoes
from Backend.routes.Processamentos import router as router_processamentos
from Backend.routes.Recebidos import router as router_recebidos
from Backend.routes.Rotinas import router as router_rotinas
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

# Rotas separadas por arquivo/área, seguindo o padrão existente em routes/.
app.include_router(router_servidores)
app.include_router(router_excel)
app.include_router(router_arquivo)
app.include_router(router_notas)
app.include_router(router_marcacoes)
app.include_router(router_emails)
app.include_router(router_rotinas)
app.include_router(router_recebidos)
app.include_router(router_historico)
app.include_router(router_inicio)
app.include_router(router_notificacoes)
app.include_router(router_processamentos)


@app.get("/health", tags=["Sistema"], summary="Verificar disponibilidade da API")
def health():
    """Sinal simples usado para confirmar que o processo da API está ativo."""
    return {"status": "ok"}
