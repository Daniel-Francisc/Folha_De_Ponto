from fastapi import FastAPI
from routes.Usuarios import router as routerUsuarios
from routes.Excel import router as routerExcel

app = FastAPI()
app.include_router(routerUsuarios)
app.include_router(routerExcel)