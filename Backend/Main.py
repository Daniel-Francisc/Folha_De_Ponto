from fastapi import FastAPI
from Backend.routes.Servidores import router as routerUsuarios
from Backend.lib.Excel import router as routerExcel

app = FastAPI()
app.include_router(routerUsuarios)
app.include_router(routerExcel)