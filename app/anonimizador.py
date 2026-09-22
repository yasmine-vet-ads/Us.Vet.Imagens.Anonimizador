from io import BytesIO

import cv2
import numpy as np
from PIL import Image


def carregar_imagem(arquivo):
    """
    Carrega uma imagem enviada no Colab ou em aplicação web e converte para RGB.

    A conversão para RGB ajuda a padronizar o processamento e evita manter
    metadados EXIF no arquivo final salvo posteriormente.
    """
    if isinstance(arquivo, bytes):
        imagem = Image.open(BytesIO(arquivo)).convert("RGB")
    else:
        imagem = Image.open(arquivo).convert("RGB")

    return imagem


def pil_para_array(imagem):
    """
    Converte imagem PIL para array NumPy.
    """
    return np.array(imagem)


def array_para_pil(array):
    """
    Converte array NumPy para imagem PIL.
    """
    return Image.fromarray(array.astype("uint8"))


def aplicar_tarja_preta(regiao):
    """
    Aplica tarja preta na região selecionada.
    """
    return np.zeros_like(regiao)


def aplicar_desfoque(regiao):
    """
    Aplica desfoque na região selecionada.
    """
    altura, largura = regiao.shape[:2]

    if altura == 0 or largura == 0:
        return regiao

    kernel = max(21, ((min(altura, largura) // 8) * 2) + 1)

    return cv2.GaussianBlur(
        regiao,
        (kernel, kernel),
        0,
    )


def aplicar_pixelizacao(regiao, tamanho_pixel=12):
    """
    Aplica pixelização na região selecionada.
    """
    altura, largura = regiao.shape[:2]

    if altura == 0 or largura == 0:
        return regiao

    reduzida = cv2.resize(
        regiao,
        (
            max(1, largura // tamanho_pixel),
            max(1, altura // tamanho_pixel),
        ),
        interpolation=cv2.INTER_LINEAR,
    )

    pixelizada = cv2.resize(
        reduzida,
        (largura, altura),
        interpolation=cv2.INTER_NEAREST,
    )

    return pixelizada


def anonimizar_regiao(
    imagem_array,
    x1,
    y1,
    x2,
    y2,
    modo="tarja",
):
    """
    Aplica anonimização em uma região retangular da imagem.
    """
    saida = imagem_array.copy()

    altura, largura = saida.shape[:2]

    x1 = max(0, min(x1, largura))
    x2 = max(0, min(x2, largura))
    y1 = max(0, min(y1, altura))
    y2 = max(0, min(y2, altura))

    if x2 <= x1 or y2 <= y1:
        return saida

    regiao = saida[y1:y2, x1:x2]

    if modo == "tarja":
        saida[y1:y2, x1:x2] = aplicar_tarja_preta(regiao)

    elif modo == "desfoque":
        saida[y1:y2, x1:x2] = aplicar_desfoque(regiao)

    elif modo == "pixelizacao":
        saida[y1:y2, x1:x2] = aplicar_pixelizacao(regiao)

    else:
        saida[y1:y2, x1:x2] = aplicar_tarja_preta(regiao)

    return saida


def anonimizar_canto_inferior_direito(
    imagem,
    modo="tarja",
    largura_percent=55,
    altura_percent=3,
):
    """
    Anonimiza apenas o canto inferior direito da imagem.

    Essa configuração foi definida para preservar a área diagnóstica e evitar
    cobrir medidas técnicas do exame, ocultando apenas a linha inferior onde
    podem aparecer nome do paciente, tutor e ID do exame.

    Parâmetros:
    - largura_percent: porcentagem da largura coberta a partir da direita.
    - altura_percent: porcentagem da altura coberta a partir da parte inferior.
    """
    imagem_array = pil_para_array(imagem)
    altura, largura = imagem_array.shape[:2]

    x1 = int(largura * (100 - largura_percent) / 100)
    y1 = int(altura * (100 - altura_percent) / 100)
    x2 = largura
    y2 = altura

    imagem_anonimizada = anonimizar_regiao(
        imagem_array,
        x1,
        y1,
        x2,
        y2,
        modo,
    )

    return array_para_pil(imagem_anonimizada)


def salvar_sem_metadados(imagem, caminho_saida):
    """
    Salva a imagem anonimizada sem preservar metadados EXIF.
    """
    imagem_limpa = imagem.convert("RGB")
    imagem_limpa.save(caminho_saida)


def load_image(file):
    """
    Carrega um upload ou conteúdo em bytes como imagem RGB.
    """
    return carregar_imagem(file)


def anonymize_image(
    image,
    mode="Tarja preta",
    top_percent=4,
    bottom_percent=4,
    left_percent=0,
    right_percent=0,
):
    """
    Anonimiza faixas percentuais nas quatro bordas da imagem.

    As faixas superior e inferior de 4% formam o perfil padrão para imagens
    como a do exemplo. Elas cobrem o cabeçalho e o rodapé sem atingir a área
    central do exame.

    Percentuais iguais a zero não alteram aquela borda.
    """
    mode_map = {
        "Tarja preta": "tarja",
        "Desfoque": "desfoque",
        "Pixelização": "pixelizacao",
        "tarja": "tarja",
        "desfoque": "desfoque",
        "pixelizacao": "pixelizacao",
    }

    selected_mode = mode_map.get(mode, "tarja")

    result = pil_para_array(image.convert("RGB"))
    height, width = result.shape[:2]

    regions = (
        (
            0,
            0,
            width,
            round(height * top_percent / 100),
        ),
        (
            0,
            round(height * (100 - bottom_percent) / 100),
            width,
            height,
        ),
        (
            0,
            0,
            round(width * left_percent / 100),
            height,
        ),
        (
            round(width * (100 - right_percent) / 100),
            0,
            width,
            height,
        ),
    )

    for x1, y1, x2, y2 in regions:
        result = anonimizar_regiao(
            result,
            x1,
            y1,
            x2,
            y2,
            selected_mode,
        )

    return array_para_pil(result)


def image_to_bytes(image, image_format="PNG"):
    """
    Serializa a imagem sem copiar EXIF ou outros metadados do original.
    """
    buffer = BytesIO()

    image.convert("RGB").save(
        buffer,
        format=image_format,
    )

    return buffer.getvalue()
