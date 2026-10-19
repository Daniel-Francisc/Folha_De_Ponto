import smtplib
import os


class EmailConnection:
    def __init__(self):
        self.host = os.getenv("SMTP_HOST", "localhost")
        self.port = int(os.getenv("SMTP_PORT", "25"))
        self.timeout = int(os.getenv("SMTP_TIMEOUT", "10"))

    def conectar(self):
        smtp = smtplib.SMTP(
            self.host,
            self.port,
            timeout=self.timeout
        )

        smtp.ehlo()
        return smtp
