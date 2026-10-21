"""Importação das planilhas de referência recebidas pelo sistema.

A planilha é gravada pela classe `ArmazenamentoArquivos` em uma das pastas:
`Excel/Calendario_Academico` ou `Excel/Lista_de_Servidores`. O leitor de eventos
usa apenas bibliotecas padrão e entende `.xlsx`; o formato binário `.xls` ainda
é recusado com uma mensagem clara.
"""
from datetime import date, datetime, timedelta
from io import BytesIO
import re
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from Backend.services.ArmazenamentoArquivos import ArmazenamentoArquivos

router = APIRouter(prefix="/calendario", tags=["Calendário e planilhas"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
NAMESPACES = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
armazenamento = ArmazenamentoArquivos()


def _ler_eventos_xlsx(conteudo: bytes) -> list[dict[str, str]]:
    """Lê eventos da primeira aba de uma planilha `.xlsx` de calendário.

    O XLSX é um ZIP de documentos XML. Texto em muitas células fica em
    `sharedStrings.xml`; a referência da célula (como C4) informa sua coluna.
    Aqui reconstruímos as colunas para células vazias não deslocarem valores.

    Cabeçalhos aceitos: Data/Dia/Date (obrigatório); Título/Evento/Descrição/
    Feriado (opcional); Tipo/Categoria (opcional). Retorna ISO date (`YYYY-MM-DD`).
    Para lista de servidores, o chamador não usa esta função.
    """
    with ZipFile(BytesIO(conteudo)) as planilha:
        workbook = ElementTree.fromstring(planilha.read("xl/workbook.xml"))
        relationships = ElementTree.fromstring(
            planilha.read("xl/_rels/workbook.xml.rels")
        )
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
        primeira_aba = workbook.find("m:sheets/m:sheet", NAMESPACES)
        if primeira_aba is None:
            return []

        relationship_id = primeira_aba.attrib[f"{{{NAMESPACES['r']}}}id"]
        caminho_aba = targets[relationship_id].lstrip("/")
        if not caminho_aba.startswith("xl/"):
            caminho_aba = f"xl/{caminho_aba}"
        aba = ElementTree.fromstring(planilha.read(caminho_aba))

        strings_compartilhadas: list[str] = []
        if "xl/sharedStrings.xml" in planilha.namelist():
            xml_strings = ElementTree.fromstring(planilha.read("xl/sharedStrings.xml"))
            strings_compartilhadas = [
                "".join(texto.text or "" for texto in item.findall(".//m:t", NAMESPACES))
                for item in xml_strings.findall("m:si", NAMESPACES)
            ]

        linhas: list[list[str]] = []
        for linha_xml in aba.findall(".//m:sheetData/m:row", NAMESPACES):
            valores: list[str] = []
            for celula in linha_xml.findall("m:c", NAMESPACES):
                referencia = re.match(r"[A-Z]+", celula.attrib.get("r", "A"))
                indice_coluna = 0
                for letra in referencia.group(0) if referencia else "A":
                    indice_coluna = indice_coluna * 26 + ord(letra) - ord("A") + 1
                while len(valores) < indice_coluna:
                    valores.append("")

                valor = celula.findtext("m:v", default="", namespaces=NAMESPACES)
                if celula.attrib.get("t") == "s" and valor:
                    valor = strings_compartilhadas[int(valor)]
                elif celula.attrib.get("t") == "inlineStr":
                    valor = "".join(
                        texto.text or ""
                        for texto in celula.findall(".//m:t", NAMESPACES)
                    )
                valores[indice_coluna - 1] = valor.strip()
            linhas.append(valores)

    if not linhas:
        return []
    cabecalhos = [valor.strip().casefold() for valor in linhas[0]]
    indice_data = next(
        (i for i, nome in enumerate(cabecalhos) if nome in {"data", "dia", "date"}),
        None,
    )
    indice_titulo = next(
        (
            i for i, nome in enumerate(cabecalhos)
            if nome in {"titulo", "título", "evento", "descrição", "descricao", "feriado"}
        ),
        None,
    )
    indice_tipo = next(
        (i for i, nome in enumerate(cabecalhos) if nome in {"tipo", "categoria"}),
        None,
    )
    if indice_data is None:
        raise ValueError("A planilha de calendário precisa ter uma coluna Data.")

    eventos = []
    for linha in linhas[1:]:
        if indice_data >= len(linha) or not linha[indice_data]:
            continue
        valor_data = linha[indice_data]
        if valor_data.isdigit():
            valor_data = (date(1899, 12, 30) + timedelta(days=int(valor_data))).isoformat()
        elif "/" in valor_data:
            valor_data = datetime.strptime(valor_data, "%d/%m/%Y").date().isoformat()
        else:
            # Já pode estar em ISO; valida para não devolver datas impossíveis.
            valor_data = date.fromisoformat(valor_data).isoformat()

        titulo = (
            linha[indice_titulo]
            if indice_titulo is not None and indice_titulo < len(linha)
            else ""
        )
        tipo = (
            linha[indice_tipo].casefold()
            if indice_tipo is not None and indice_tipo < len(linha)
            else ""
        )
        eventos.append(
            {
                "data": valor_data,
                "titulo": titulo or "Evento acadêmico",
                "tipo": tipo or "evento",
            }
        )
    return eventos


@router.post("", summary="Importar uma planilha de referência")
async def importar_planilha(
    arquivo: UploadFile = File(..., description="Arquivo .xlsx de calendário ou servidores."),
    categoria: str = Form(
        default="calendario",
        description="Use 'calendario' ou 'servidores' para definir a pasta de destino.",
    ),
):
    """Valida, processa e armazena uma planilha Excel localmente.

    Multipart: `arquivo` e `categoria`. A categoria é explícita para não
    classificar planilhas vazias ou layouts diferentes por suposição. O retorno
    inclui a categoria e o nome salvo. Para `.xls`, primeiro salve como `.xlsx`.
    """
    nome_original = arquivo.filename or ""
    nome_minusculo = nome_original.lower()
    if not nome_minusculo.endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Envie um arquivo .xls ou .xlsx.")
    if categoria not in ArmazenamentoArquivos.PASTAS_EXCEL:
        raise HTTPException(
            status_code=400,
            detail="Categoria inválida. Use 'calendario' ou 'servidores'.",
        )

    conteudo = await arquivo.read(MAX_UPLOAD_BYTES + 1)
    await arquivo.close()
    if not conteudo:
        raise HTTPException(status_code=400, detail="O arquivo está vazio.")
    if len(conteudo) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="A planilha excede o limite de 10 MB.")
    if nome_minusculo.endswith(".xls"):
        raise HTTPException(
            status_code=415,
            detail="Planilhas XLS binárias ainda não são suportadas. Salve o arquivo como XLSX.",
        )

    eventos: list[dict[str, str]] = []
    if categoria == "calendario":
        try:
            eventos = _ler_eventos_xlsx(conteudo)
        except (BadZipFile, KeyError, ElementTree.ParseError, ValueError, IndexError) as erro:
            raise HTTPException(
                status_code=422,
                detail="Não foi possível ler a planilha de calendário. Confira o arquivo e a coluna Data.",
            ) from erro

    try:
        caminho = armazenamento.salvar_excel(conteudo, nome_original, categoria)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro)) from erro

    return {"eventos": eventos, "categoria": categoria, "arquivo": caminho.name}
