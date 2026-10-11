from email.message import EmailMessage
from pathlib import Path

from config.EmailConnection import EmailConnection


class EmailServices:
    def __init__(self):
        self.conexao = EmailConnection()

    def enviar_email(
        self,
        remetente: str,
        destinatario: str,
        assunto: str,
        corpo: str,
        anexo: str | Path | None = None
    ):
        mensagem = EmailMessage()
        mensagem["From"] = remetente
        mensagem["To"] = destinatario
        mensagem["Subject"] = assunto
        mensagem.set_content(corpo)

        if anexo is not None:
            arquivo = Path(anexo)

            if not arquivo.is_file():
                raise FileNotFoundError(
                    f"Anexo não encontrado: {arquivo}"
                )

            with arquivo.open("rb") as f:
                mensagem.add_attachment(
                    f.read(),
                    maintype="application",
                    subtype="pdf",
                    filename=arquivo.name
                )

        with self.conexao.conectar() as smtp:
            smtp.send_message(mensagem)
