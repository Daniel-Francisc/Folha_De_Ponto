"""Leitura de servidores a partir das planilhas `.xlsx` importadas.

Os arquivos de cadastro ficam em `Excel/Lista_de_Servidores`, gerenciados por
`ArmazenamentoArquivos`. O contrato público é `[{id, matricula, nome, email}]`;
mantenha esses campos estáveis para não quebrar a busca do front-end.
"""

from pathlib import Path
import re
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter

from Backend.services.ArmazenamentoArquivos import ArmazenamentoArquivos

router = APIRouter(prefix="/servidores", tags=["Servidores"])
STORAGE = ArmazenamentoArquivos().pasta_excel / "Lista_de_Servidores"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def _servidores_da_planilha(caminho: Path):
    """Lê cadastro XLS/XLSX e mapeia matrícula, nome e e-mail por cabeçalho."""
    try:
        if caminho.suffix.casefold() == ".xls":
            import xlrd

            planilha = xlrd.open_workbook(filename=str(caminho)).sheet_by_index(0)
            rows = []
            for numero_linha in range(planilha.nrows):
                linha = []
                for celula in planilha.row(numero_linha):
                    valor = celula.value
                    if isinstance(valor, float) and valor.is_integer():
                        valor = int(valor)
                    linha.append(str(valor).strip() if valor is not None else "")
                rows.append(linha)
        else:
            with ZipFile(caminho) as arquivo:
                workbook = ElementTree.fromstring(arquivo.read("xl/workbook.xml"))
                rels = ElementTree.fromstring(arquivo.read("xl/_rels/workbook.xml.rels"))
                rel_map = {item.attrib["Id"]: item.attrib["Target"] for item in rels}
                sheet_ref = workbook.find("m:sheets/m:sheet", NS)
                if sheet_ref is None:
                    return []
                rid = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
                target = rel_map[sheet_ref.attrib[rid]].lstrip("/")
                sheet_path = target if target.startswith("xl/") else f"xl/{target}"
                sheet = ElementTree.fromstring(arquivo.read(sheet_path))
                shared = []
                if "xl/sharedStrings.xml" in arquivo.namelist():
                    root = ElementTree.fromstring(arquivo.read("xl/sharedStrings.xml"))
                    shared = ["".join(t.text or "" for t in si.findall(".//m:t", NS)) for si in root.findall("m:si", NS)]
                rows = []
                for row in sheet.findall(".//m:sheetData/m:row", NS):
                    values = []
                    for cell in row.findall("m:c", NS):
                        # Respeita a referência de coluna para preservar células vazias.
                        col_ref = re.match(r"[A-Z]+", cell.attrib.get("r", "A"))
                        col_index = 0
                        for char in col_ref.group(0) if col_ref else "A":
                            col_index = col_index * 26 + ord(char) - ord("A") + 1
                        while len(values) < col_index:
                            values.append("")
                        value = cell.findtext("m:v", default="", namespaces=NS)
                        if cell.attrib.get("t") == "s" and value:
                            value = shared[int(value)]
                        elif cell.attrib.get("t") == "inlineStr":
                            value = "".join(t.text or "" for t in cell.findall(".//m:t", NS))
                        values[col_index - 1] = value.strip()
                    rows.append(values)
        if not rows:
            return []
        headers = [value.strip().casefold() for value in rows[0]]

        def index(*names):
            """Retorna a posição do primeiro cabeçalho equivalente encontrado."""
            return next((headers.index(name) for name in names if name in headers), None)

        # Alguns nomes comuns de coluna são aceitos. Ajuste estes aliases ao
        # formato institucional real, mantendo matrícula e nome obrigatórios.
        matricula_i, nome_i, email_i = index("matricula", "matrícula", "siape"), index("nome", "servidor", "nome completo"), index("email", "e-mail", "e-mail institucional")
        if matricula_i is None or nome_i is None:
            return []
        servidores = []
        for row in rows[1:]:
            if max(matricula_i, nome_i) >= len(row) or not row[matricula_i] or not row[nome_i]:
                continue
            email = row[email_i] if email_i is not None and email_i < len(row) else ""
            servidores.append({"id": row[matricula_i], "matricula": row[matricula_i], "nome": row[nome_i], "email": email})
        return servidores
    except (BadZipFile, KeyError, ElementTree.ParseError, ValueError, IndexError, ImportError):
        return []

@router.get("")
def listar_servidores():
    """Lista servidores disponíveis para busca e preenchimento dos formulários.

    O resultado é uma lista JSON direta, conforme o contrato de mocks do front.
    Arquivos com o mesmo ID são deduplicados; a planilha modificada mais
    recentemente prevalece. A lista é ordenada pelo nome para manter a resposta
    estável entre chamadas.
    """
    if not STORAGE.is_dir():
        return []
    servidores = {}
    arquivos = [*STORAGE.glob("*.xlsx"), *STORAGE.glob("*.xls")]
    for caminho in sorted(arquivos, key=lambda item: item.stat().st_mtime):
        for servidor in _servidores_da_planilha(caminho):
            servidores[servidor["id"]] = servidor
    return sorted(servidores.values(), key=lambda item: item["nome"].casefold())


