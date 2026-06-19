from io import BytesIO
from zipfile import ZipFile
from pathlib import Path
import streamlit as st

from anonymizer import load_image, anonymize_image, image_to_bytes


st.set_page_config(
    page_title="Us.Vet Imagens Anonimizador",
    page_icon="🩺",
    layout="wide",
)


st.title("Us.Vet Imagens Anonimizador")
st.subheader("MVP para anonimização de imagens ultrassonográficas veterinárias")

st.markdown(
    """
Esta aplicação permite enviar imagens ultrassonográficas e aplicar anonimização automática
em regiões que podem conter dados sensíveis, como nome de paciente, tutor, clínica,
data ou número de exame.

> Este MVP não substitui revisão humana. Sempre confira a imagem antes de usar ou compartilhar.
"""
)


with st.sidebar:
    st.header("Configurações")

    mode = st.selectbox(
        "Tipo de anonimização",
        ["Tarja preta", "Desfoque", "Pixelização"],
    )

    st.markdown("### Regiões sensíveis")

    top_percent = st.slider(
        "Faixa superior (%)",
        min_value=0,
        max_value=40,
        value=12,
        step=1,
    )

    bottom_percent = st.slider(
        "Faixa inferior (%)",
        min_value=0,
        max_value=40,
        value=0,
        step=1,
    )

    left_percent = st.slider(
        "Lateral esquerda (%)",
        min_value=0,
        max_value=40,
        value=0,
        step=1,
    )

    right_percent = st.slider(
        "Lateral direita (%)",
        min_value=0,
        max_value=40,
        value=0,
        step=1,
    )

    st.info(
        "Sugestão inicial: comece ocultando a faixa superior, "
        "onde muitos aparelhos exibem dados sensíveis."
    )


uploaded_files = st.file_uploader(
    "Envie uma ou mais imagens ultrassonográficas",
    type=["png", "jpg", "jpeg"],
    accept_multiple_files=True,
)


if uploaded_files:
    st.success(f"{len(uploaded_files)} imagem(ns) carregada(s).")

    processed_images = []

    first_file = uploaded_files[0]
    original_image = load_image(first_file)

    anonymized_image = anonymize_image(
        original_image,
        mode=mode,
        top_percent=top_percent,
        bottom_percent=bottom_percent,
        left_percent=left_percent,
        right_percent=right_percent,
    )

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### Imagem original")
        st.image(original_image, use_container_width=True)

    with col2:
        st.markdown("### Imagem anonimizada")
        st.image(anonymized_image, use_container_width=True)

    image_bytes = image_to_bytes(anonymized_image, "PNG")

    st.download_button(
        label="Baixar primeira imagem anonimizada",
        data=image_bytes,
        file_name=f"anonimizada_{Path(first_file.name).stem}.png",
        mime="image/png",
    )

    st.markdown("---")
    st.markdown("### Processamento em lote")

    zip_buffer = BytesIO()

    with ZipFile(zip_buffer, "w") as zip_file:
        for index, uploaded_file in enumerate(uploaded_files, start=1):
            image = load_image(uploaded_file)

            processed = anonymize_image(
                image,
                mode=mode,
                top_percent=top_percent,
                bottom_percent=bottom_percent,
                left_percent=left_percent,
                right_percent=right_percent,
            )

            processed_bytes = image_to_bytes(processed, "PNG")

            safe_name = f"usvet_anonimizada_{index:03d}_{Path(uploaded_file.name).stem}.png"
            zip_file.writestr(safe_name, processed_bytes)

            processed_images.append(safe_name)

    st.write("Arquivos preparados para exportação:")
    st.write(processed_images)

    st.download_button(
        label="Baixar lote anonimizado em ZIP",
        data=zip_buffer.getvalue(),
        file_name="usvet_imagens_anonimizadas.zip",
        mime="application/zip",
    )

else:
    st.warning("Envie uma imagem para iniciar o processamento.")


st.markdown("---")

st.markdown(
    """
### Próximas versões previstas

- Seleção manual de áreas sensíveis.
- Perfis de máscara por modelo de aparelho.
- OCR para detecção automática de texto.
- Registro de histórico de imagens processadas.
- Banco de imagens anonimizado.
- Classificação por órgão, espécie e achado ultrassonográfico.
"""
)
