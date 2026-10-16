from io import BytesIO as io
import pandas as pd
import json

class ExcelExtrator:
    # def __init__(self,arquivo):
    #     self.arquivo = arquivo

    async def lerExcel(self, arquivo):
        try:
            DataFrame = pd.read_excel(io(arquivo),engine='openpyxl')
            data = DataFrame.to_dict(orient="records")
            json_dados = json.dumps(data, ensure_ascii=False, indent=4)

            print(json_dados)
            return (json_dados)
        except KeyError:
            print(KeyError)
            return False
        