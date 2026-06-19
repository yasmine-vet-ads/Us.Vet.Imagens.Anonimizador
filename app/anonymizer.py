from io import BytesIO
from PIL import Image
import numpy as np
import cv2


def load_image(uploaded_file) -> Image.Image:
    """
    Carrega uma imagem enviada pelo usuário e converte para RGB.
    A conversão ajuda a remover metadados e padronizar o processamento.
    """
    image = Image.open(uploaded_file).convert("RGB")
    return image


def pil_to_array(image: Image.Image) -> np.ndarray:
    """Converte imagem PIL para array NumPy em RGB."""
    return np.array(image)


def array_to_pil(image_array: np.ndarray) -> Image.Image:
    """Converte array NumPy RGB para imagem PIL."""
    return Image.fromarray(image_array.astype("uint8"), "RGB")


def apply_black_box(region: np.ndarray) -> np.ndarray:
    """Aplica tarja preta na região selecionada."""
    return np.zeros_like(region)


def apply_blur(region: np.ndarray) -> np.ndarray:
    """Aplica desfoque na região selecionada."""
    height, width = region.shape[:2]
    kernel = max(21, ((min(height, width) // 8) * 2) + 1)
    return cv2.GaussianBlur(region, (kernel, kernel), 0)


def apply_pixelation(region: np.ndarray, pixel_size: int = 12) -> np.ndarray:
    """Aplica pixelização na região selecionada."""
    height, width = region.shape[:2]

    if height == 0 or width == 0:
        return region

    small = cv2.resize(
        region,
        (max(1, width // pixel_size), max(1, height // pixel_size)),
        interpolation=cv2.INTER_LINEAR,
    )

    pixelated = cv2.resize(
        small,
        (width, height),
        interpolation=cv2.INTER_NEAREST,
    )

    return pixelated


def anonymize_region(image_array: np.ndarray, x1: int, y1: int, x2: int, y2: int, mode: str) -> np.ndarray:
    """
    Aplica anonimização em uma região retangular da imagem.
    """
    output = image_array.copy()

    height, width = output.shape[:2]

    x1 = max(0, min(x1, width))
    x2 = max(0, min(x2, width))
    y1 = max(0, min(y1, height))
    y2 = max(0, min(y2, height))

    if x2 <= x1 or y2 <= y1:
        return output

    region = output[y1:y2, x1:x2]

    if mode == "Tarja preta":
        output[y1:y2, x1:x2] = apply_black_box(region)
    elif mode == "Desfoque":
        output[y1:y2, x1:x2] = apply_blur(region)
    elif mode == "Pixelização":
        output[y1:y2, x1:x2] = apply_pixelation(region)
    else:
        output[y1:y2, x1:x2] = apply_black_box(region)

    return output


def anonymize_image(
    image: Image.Image,
    mode: str = "Tarja preta",
    top_percent: int = 12,
    bottom_percent: int = 0,
    left_percent: int = 0,
    right_percent: int = 0,
) -> Image.Image:
    """
    Aplica anonimização automática por faixas da imagem.

    As porcentagens indicam quanto da imagem será coberto:
    - topo
    - rodapé
    - lateral esquerda
    - lateral direita
    """
    image_array = pil_to_array(image)
    height, width = image_array.shape[:2]

    output = image_array.copy()

    top_h = int(height * top_percent / 100)
    bottom_h = int(height * bottom_percent / 100)
    left_w = int(width * left_percent / 100)
    right_w = int(width * right_percent / 100)

    if top_h > 0:
        output = anonymize_region(output, 0, 0, width, top_h, mode)

    if bottom_h > 0:
        output = anonymize_region(output, 0, height - bottom_h, width, height, mode)

    if left_w > 0:
        output = anonymize_region(output, 0, 0, left_w, height, mode)

    if right_w > 0:
        output = anonymize_region(output, width - right_w, 0, width, height, mode)

    return array_to_pil(output)


def image_to_bytes(image: Image.Image, image_format: str = "PNG") -> bytes:
    """
    Exporta imagem para bytes sem preservar metadados EXIF.
    """
    buffer = BytesIO()
    clean_image = image.convert("RGB")
    clean_image.save(buffer, format=image_format)
    return buffer.getvalue()
