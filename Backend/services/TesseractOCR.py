"""Integração de baixo nível com o Tesseract para PDFs de folhas de ponto.

O pacote Python pytesseract apenas conversa com o programa Tesseract; ele não
instala o executável OCR nem os arquivos de idioma. O executável precisa estar
no PATH ou ser indicado por TESSERACT_CMD. O idioma padrão é português (por),
configurável por TESSERACT_LANG.

Cada página é renderizada individualmente pelo PyMuPDF, evitando manter todas
as imagens do documento na memória ao mesmo tempo. O texto bruto fica no
serviço e não é devolvido ao navegador, pois pode conter dados pessoais que o
formulário não precisa exibir.
"""

from dataclasses import dataclass
from io import BytesIO
import os


class OCRNaoConfigurado(RuntimeError):
    """Indica que falta uma dependência ou configuração do Tesseract."""


class PDFNaoProcessavel(ValueError):
    """Indica que o PDF está inválido, protegido ou excede os limites do OCR."""


@dataclass(frozen=True)
class ResultadoOCR:
    """Resultado técnico da leitura, antes da extração dos campos do formulário."""

    texto: str
    confianca: float | None
    paginas_lidas: int


class TesseractOCR:
    """Renderiza páginas PDF e extrai texto e confiança por palavra."""

    def __init__(
        self,
        dpi: int = 220,
        limite_paginas: int = 50,
        idioma: str | None = None,
    ):
        self.dpi = dpi
        self.limite_paginas = limite_paginas
        self.idioma = idioma or os.getenv("TESSERACT_LANG", "por")

    def processar(self, conteudo_pdf: bytes) -> ResultadoOCR:
        """Executa OCR em cada página e calcula confiança média entre 0 e 1."""
        if not conteudo_pdf:
            raise PDFNaoProcessavel("O PDF recebido está vazio.")

        # Imports tardios permitem que a API suba mesmo antes de instalar as
        # dependências OCR. A rota retorna 503 explicando o pré-requisito.
        try:
            import fitz
            import pytesseract
            from PIL import Image
            from pytesseract import Output, TesseractError, TesseractNotFoundError
        except ImportError as erro:
            raise OCRNaoConfigurado(
                "As dependências Python do OCR não estão instaladas. "
                "Consulte Backend/requirements.txt."
            ) from erro

        executavel = os.getenv("TESSERACT_CMD")
        if executavel:
            pytesseract.pytesseract.tesseract_cmd = executavel

        try:
            documento = fitz.open(stream=conteudo_pdf, filetype="pdf")
        except Exception as erro:
            raise PDFNaoProcessavel("O conteúdo não pôde ser aberto como PDF.") from erro

        try:
            if documento.is_encrypted and not documento.authenticate(""):
                raise PDFNaoProcessavel("PDF protegido por senha não pode ser processado.")
            if documento.page_count == 0:
                raise PDFNaoProcessavel("O PDF não contém páginas.")
            if documento.page_count > self.limite_paginas:
                raise PDFNaoProcessavel(
                    f"O limite do OCR é de {self.limite_paginas} páginas por PDF."
                )

            fator = self.dpi / 72
            textos_paginas: list[str] = []
            confiancas: list[float] = []

            for pagina in documento:
                pixmap = pagina.get_pixmap(
                    matrix=fitz.Matrix(fator, fator),
                    alpha=False,
                )
                imagem_png = pixmap.tobytes("png")

                try:
                    with Image.open(BytesIO(imagem_png)) as imagem:
                        dados = pytesseract.image_to_data(
                            imagem,
                            lang=self.idioma,
                            config="--psm 6",
                            output_type=Output.DICT,
                        )
                except TesseractNotFoundError as erro:
                    raise OCRNaoConfigurado(
                        "O executável Tesseract não foi encontrado. Configure "
                        "TESSERACT_CMD ou coloque tesseract.exe no PATH."
                    ) from erro
                except TesseractError as erro:
                    raise OCRNaoConfigurado(
                        "O Tesseract falhou. Confira a instalação do idioma "
                        f"{self.idioma} e seus arquivos traineddata."
                    ) from erro

                # image_to_data devolve uma palavra por item. Agrupamos por
                # bloco/parágrafo/linha para preservar a leitura do formulário.
                linhas: dict[tuple[int, int, int], list[str]] = {}
                for posicao, palavra_bruta in enumerate(dados.get("text", [])):
                    palavra = palavra_bruta.strip()
                    if palavra:
                        chave = (
                            int(dados["block_num"][posicao]),
                            int(dados["par_num"][posicao]),
                            int(dados["line_num"][posicao]),
                        )
                        linhas.setdefault(chave, []).append(palavra)

                    try:
                        confianca = float(dados["conf"][posicao])
                    except (KeyError, TypeError, ValueError, IndexError):
                        continue
                    # O Tesseract usa -1 para caixas que não representam texto.
                    if confianca >= 0:
                        confiancas.append(confianca)

                textos_paginas.append(
                    "\n".join(
                        " ".join(palavras)
                        for _, palavras in sorted(linhas.items())
                    )
                )

            media = sum(confiancas) / len(confiancas) if confiancas else None
            return ResultadoOCR(
                texto="\n\n".join(textos_paginas).strip(),
                confianca=round(media / 100, 4) if media is not None else None,
                paginas_lidas=documento.page_count,
            )
        finally:
            documento.close()