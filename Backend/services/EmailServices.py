from email.message import EmailMessage
from pathlib import Path

from Backend.config.EmailConnection import EmailConnection


class EmailServices:
    """Monta mensagens de e-mail e delega transporte à conexão SMTP local."""

    def __init__(self):
        """Cria o adaptador SMTP que lê configuração do ambiente do processo."""
        self.conexao = EmailConnection()

    def enviar_email(
        self,
        remetente: str,
        destinatario: str,
        assunto: str,
        corpo: str,
        anexo: str | Path | None = None,
        anexos: list[str | Path] | None = None,
    ) -> None:
        """Envia uma mensagem com zero ou mais PDFs já validados pelo chamador.

        Args:
            remetente: endereço configurado no backend, nunca recebido do front.
            destinatario: um ou mais endereços aceitos pelo cabeçalho SMTP.
            assunto: assunto revisado pelo usuário.
            corpo: texto simples da mensagem.
            anexo: caminho compatível com chamadas antigas que enviam um arquivo.
            anexos: caminhos de todos os PDFs que serão anexados à mensagem.

        Raises:
            FileNotFoundError: qualquer caminho de anexo não aponta para arquivo.
            OSError/smtplib.SMTPException: falha ao ler o anexo ou conectar/enviar.
        """
        mensagem = EmailMessage()
        mensagem["From"] = remetente
        mensagem["To"] = destinatario
        mensagem["Subject"] = assunto
        mensagem.set_content(corpo)

        caminhos = list(anexos or [])
        if anexo is not None:
            caminhos.append(anexo)
        for caminho in caminhos:
            arquivo = Path(caminho)

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
