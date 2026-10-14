class ExcelExtrator:
    # def __init__(self,arquivo):
    #     self.arquivo = arquivo

    async def lerExcel(self, arquivo):
        conteudo = await arquivo.read()