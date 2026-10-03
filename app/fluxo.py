"""Validação, processamento e controle de revisão do lote, somente em memória."""
from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import warnings
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image

from anonimizador import anonymize_image, generate_anonymized_filename, image_to_bytes


@dataclass(frozen=True)
class Entrada:
    nome: str
    conteudo: bytes


@dataclass
class Resultado:
    indice: int
    original: Image.Image
    anonimizada: Image.Image
    png: bytes


@dataclass(frozen=True)
class Falha:
    indice: int
    mensagem: str

    @property
    def referencia(self):
        return f"Item {self.indice:03d}"


FORMATOS = {".png": "PNG", ".jpg": "JPEG", ".jpeg": "JPEG"}


class ErroValidacao(ValueError):
    """Mensagem controlada que pode ser apresentada sem dados da entrada."""


def decodificar(entrada):
    """Confere o formato real, integridade e decodificação completa dos pixels."""
    if not isinstance(entrada, Entrada) or not isinstance(entrada.nome, str):
        raise ErroValidacao("Entrada inválida.")
    extensao = Path(entrada.nome).suffix.lower()
    if extensao not in FORMATOS:
        raise ErroValidacao("Use somente PNG, JPG ou JPEG.")
    if not isinstance(entrada.conteudo, bytes) or not entrada.conteudo:
        raise ErroValidacao("Arquivo vazio ou entrada inválida.")
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(BytesIO(entrada.conteudo)) as imagem:
            if imagem.format != FORMATOS[extensao]:
                raise ErroValidacao("Formato real incompatível com a extensão.")
            if getattr(imagem, "n_frames", 1) != 1:
                raise ErroValidacao("Use uma imagem estática por arquivo.")
            imagem.verify()
        with Image.open(BytesIO(entrada.conteudo)) as imagem:
            imagem.load()
            return imagem.convert("RGB")


def validar_lote(entradas):
    falhas = []
    if not 1 <= len(entradas) <= 10:
        falhas.append(Falha(0, "Selecione de 1 a 10 imagens por lote."))
    for indice, entrada in enumerate(entradas, 1):
        try:
            decodificar(entrada)
        except ErroValidacao as erro:
            falhas.append(Falha(indice, str(erro)))
        except Exception:
            # Não propagar mensagens de bibliotecas que possam conter identificadores.
            falhas.append(Falha(indice, "Não foi possível decodificar a imagem com segurança; arquivo ilegível, corrompido ou grande demais."))
    return falhas


def assinatura_lote(entradas, configuracao):
    digest = sha256()
    for entrada in entradas:
        for valor in (entrada.nome.encode("utf-8"), entrada.conteudo):
            digest.update(len(valor).to_bytes(8, "big"))
            digest.update(valor)
    digest.update(repr(sorted(configuracao.items())).encode("utf-8"))
    return digest.hexdigest()


def sincronizar_revisao(estado, assinatura):
    """Mudanças em conteúdo, nome, ordem ou parâmetros descartam saída e revisão."""
    if estado.get("assinatura") != assinatura:
        estado["assinatura"] = assinatura
        estado["resultados"] = []
        estado["falhas"] = []
        estado["revisado"] = False


def processar_lote(entradas, configuracao):
    if validar_lote(entradas):
        raise ValueError("Corrija o lote antes de processar.")
    resultados, falhas = [], []
    for indice, entrada in enumerate(entradas, 1):
        try:
            original = decodificar(entrada)
            anonimizada = anonymize_image(original, **configuracao)
            png = image_to_bytes(anonimizada)
            resultados.append(Resultado(indice, original, anonimizada, png))
        except Exception:
            falhas.append(Falha(indice, "Falha inesperada de processamento. Item excluído do ZIP; tente novamente ou remova-o do lote."))
    return resultados, falhas


def criar_zip_revisado(resultados, revisado):
    if not revisado or not resultados:
        raise ValueError("Revise visualmente os resultados antes do download.")
    buffer = BytesIO()
    with ZipFile(buffer, "w", compression=ZIP_DEFLATED) as arquivo_zip:
        for resultado in resultados:
            arquivo_zip.writestr(generate_anonymized_filename(resultado.indice), resultado.png)
    return buffer.getvalue()
