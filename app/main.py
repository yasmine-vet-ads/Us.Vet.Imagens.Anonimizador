import streamlit as st

from fluxo import (
    Entrada, assinatura_lote, criar_zip_revisado, processar_lote,
    sincronizar_revisao, validar_lote,
)


st.set_page_config(page_title="Us.Vet Imagens Anonimizador", page_icon="🩺", layout="wide")
st.title("Us.Vet Imagens Anonimizador")
st.caption("Upload → Validação → Processamento → Conferência → Download ZIP")
st.warning(
    "As máscaras podem não cobrir todos os identificadores. Revise visualmente cada "
    "resultado e a preservação da região diagnóstica antes de usar ou compartilhar."
)
st.caption("ANONIMIZAÇÃO VERIFICADA significa conferência humana visual; não equivale a autorização editorial.")

with st.sidebar:
    st.header("Configurações do lote")
    mode = st.selectbox("Tipo de anonimização", ["Tarja preta", "Desfoque", "Pixelização"])
    top = st.slider("Faixa superior (%)", 0, 40, 4)
    bottom = st.slider("Faixa inferior (%)", 0, 40, 4)
    left = st.slider("Lateral esquerda (%)", 0, 40, 0)
    right = st.slider("Lateral direita (%)", 0, 40, 0)
    st.info("4% é apenas um ponto de partida. Ajuste as máscaras e confira todos os resultados. Desfoque e pixelização podem deixar texto reconhecível.")

configuracao = dict(mode=mode, top_percent=top, bottom_percent=bottom,
                    left_percent=left, right_percent=right)
st.header("1. Upload e validação")
uploads = st.file_uploader("Selecione de 1 a 10 imagens PNG/JPG/JPEG",
                           type=["png", "jpg", "jpeg"], accept_multiple_files=True,
                           key="uploads")
entradas = [Entrada(arquivo.name, arquivo.getvalue()) for arquivo in (uploads or [])]
sincronizar_revisao(st.session_state, assinatura_lote(entradas, configuracao))

if not entradas:
    st.info("Envie imagens para iniciar. Os resultados e a revisão anterior foram descartados.")
else:
    erros = validar_lote(entradas)
    for erro in erros:
        st.error(f"{erro.referencia}: {erro.mensagem}" if erro.indice else erro.mensagem)
    if erros:
        st.info("Remova ou substitua os itens indicados no seletor de upload antes de processar.")
    else:
        st.success(f"Lote validado: {len(entradas)} imagem(ns).")
    st.header("2. Processamento")
    if st.button("Processar lote", disabled=bool(erros)):
        st.session_state.revisado = False
        st.session_state.resultados = []
        st.session_state.falhas = []
        with st.spinner("Processando imagens…"):
            try:
                resultados, falhas = processar_lote(entradas, configuracao)
                st.session_state.resultados = resultados
                st.session_state.falhas = falhas
            except ValueError:
                st.error("O lote não passou pela validação. Corrija os arquivos e tente novamente.")
    for falha in st.session_state.falhas:
        st.error(f"{falha.referencia}: {falha.mensagem}")
    resultados = st.session_state.resultados
    if resultados and not erros:
        st.header("3. Conferência visual")
        st.write(f"Confira todas as {len(resultados)} imagens abaixo: máscaras, região diagnóstica e ausência aparente de identificação residual.")
        visualizacao = st.radio("Disposição da comparação", ["Lado a lado", "Vertical (telas menores)"])
        for resultado in resultados:
            st.subheader(f"Item {resultado.indice:03d}")
            if visualizacao == "Lado a lado":
                original, anonimizada = st.columns(2)
                with original:
                    st.image(resultado.original, caption="Original", width="stretch")
                with anonimizada:
                    st.image(resultado.anonimizada, caption="Anonimizada", width="stretch")
            else:
                st.image(resultado.original, caption="Original", width="stretch")
                st.image(resultado.anonimizada, caption="Anonimizada", width="stretch")
        revisado = st.checkbox("Revisei visualmente todas as imagens processadas.", key="revisado")
        st.header("4. Download ZIP")
        if revisado:
            st.success("ANONIMIZAÇÃO VERIFICADA: revisão visual declarada pelo usuário.")
            st.download_button("Baixar imagens revisadas (ZIP)",
                               data=criar_zip_revisado(resultados, revisado),
                               file_name="usvet_imagens_anonimizadas.zip", mime="application/zip")
        else:
            st.info("O ZIP será liberado após a confirmação de revisão visual de todas as imagens processadas.")
    elif st.session_state.falhas:
        st.warning("Nenhuma imagem foi processada com sucesso. Não há ZIP disponível.")
    elif not erros:
        st.info("Configure as máscaras e clique em Processar lote para continuar.")
