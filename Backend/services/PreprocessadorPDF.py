"""Divide PDFs recebidos em documentos temporários de uma única página.

O front pode enviar um PDF que reúna várias folhas digitalizadas. Para que o
OCR identifique cada folha de forma independente, este serviço cria uma cópia
PDF temporária por página, sem gravar arquivos intermediários no armazenamento
definitivo. A rota processa esses bytes um por vez e pode salvar apenas a página
que o usuário confirmou.
"""

from dataclasses import dataclass

from Backend.services.TesseractOCR import OCRNaoConfigurado, PDFNaoProcessavel


@dataclass(frozen=True)
class PaginaPDF:
    """Representa uma página extraída e seu contexto no arquivo original.

    `numero` é contado a partir de 1, como a numeração que a interface mostra.
    `total_paginas` informa quantas páginas havia no PDF enviado.
    `conteudo` contém um PDF válido de uma única página, pronto para OCR ou
    armazenamento após a confirmação dos dados.
    """

    numero: int
    total_paginas: int
    conteudo: bytes


class PreprocessadorPDF:
    """Valida um PDF e produz um PDF independente para cada uma de suas páginas."""

    def __init__(self, limite_paginas: int = 50):
        """Define o máximo de páginas aceito por arquivo de entrada."""
        self.limite_paginas = limite_paginas

    def separar(self, conteudo_pdf: bytes) -> list[PaginaPDF]:
        """Retorna uma lista ordenada de PDFs de uma página.

        A divisão acontece em memória: nenhum arquivo temporário é deixado no
        projeto ou na pasta final do servidor. PDFs vazios, protegidos por senha,
        sem páginas ou acima do limite são rejeitados com uma mensagem clara.
        """
        if not conteudo_pdf:
            raise PDFNaoProcessavel("O PDF recebido está vazio.")

        # PyMuPDF já é a biblioteca usada pelo OCR para renderizar as páginas.
        try:
            import fitz
        except ImportError as erro:
            raise OCRNaoConfigurado(
                "PyMuPDF não está disponível. Confira as dependências OCR do backend."
            ) from erro

        try:
            documento = fitz.open(stream=conteudo_pdf, filetype="pdf")
        except Exception as erro:
            raise PDFNaoProcessavel("O conteúdo não pôde ser aberto como PDF.") from erro

        try:
            if documento.is_encrypted and not documento.authenticate(""):
                raise PDFNaoProcessavel("PDF protegido por senha não pode ser processado.")
            total_paginas = documento.page_count
            if total_paginas == 0:
                raise PDFNaoProcessavel("O PDF não contém páginas.")
            if total_paginas > self.limite_paginas:
                raise PDFNaoProcessavel(
                    f"O limite é de {self.limite_paginas} páginas por PDF."
                )

            paginas: list[PaginaPDF] = []
            for indice in range(total_paginas):
                # Criar um novo documento mantém cada folha isolada. O OCR não
                # recebe as páginas seguintes nem mistura texto de páginas.
                documento_pagina = fitz.open()
                try:
                    documento_pagina.insert_pdf(
                        documento,
                        from_page=indice,
                        to_page=indice,
                    )
                    pdf_de_uma_pagina = documento_pagina.tobytes(
                        garbage=4,
                        deflate=True,
                    )
                finally:
                    documento_pagina.close()

                paginas.append(
                    PaginaPDF(
                        numero=indice + 1,
                        total_paginas=total_paginas,
                        conteudo=pdf_de_uma_pagina,
                    )
                )
            return paginas
        except PDFNaoProcessavel:
            raise
        except Exception as erro:
            raise PDFNaoProcessavel(
                "Não foi possível separar as páginas deste PDF."
            ) from erro
        finally:
            documento.close()
