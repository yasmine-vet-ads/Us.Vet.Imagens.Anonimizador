import sys
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch
from zipfile import ZipFile

import numpy as np
from PIL import Image, PngImagePlugin

sys.path.insert(0, str(Path(__file__).parents[1] / "app"))
from fluxo import (Entrada, assinatura_lote, criar_zip_revisado, decodificar,
                   processar_lote, sincronizar_revisao, validar_lote)
from anonimizador import anonymize_image, image_to_bytes, salvar_sem_metadados


CONFIG = dict(mode="Tarja preta", top_percent=4, bottom_percent=4,
              left_percent=0, right_percent=0)


def entrada(nome="sintetica.png", formato="PNG", tamanho=(100, 100)):
    buffer = BytesIO()
    Image.new("RGB", tamanho, "white").save(buffer, format=formato)
    return Entrada(nome, buffer.getvalue())


class ValidacaoTest(unittest.TestCase):
    def test_uma_imagem(self):
        self.assertEqual(validar_lote([entrada()]), [])

    def test_multiplas(self):
        self.assertEqual(validar_lote([entrada(), entrada()]), [])

    def test_dez(self):
        self.assertEqual(validar_lote([entrada()] * 10), [])

    def test_acima_limite(self):
        self.assertTrue(validar_lote([entrada()] * 11))

    def test_lote_vazio(self):
        self.assertTrue(validar_lote([]))

    def test_png(self):
        self.assertEqual(validar_lote([entrada()]), [])

    def test_jpg(self):
        self.assertEqual(validar_lote([entrada("x.jpg", "JPEG")]), [])

    def test_jpeg(self):
        self.assertEqual(validar_lote([entrada("x.JPEG", "JPEG")]), [])

    def test_extensao_valida_conteudo_invalido(self):
        self.assertTrue(validar_lote([Entrada("x.png", b"nao e imagem")]))

    def test_corrompido(self):
        imagem = entrada()
        self.assertTrue(validar_lote([Entrada(imagem.nome, imagem.conteudo[:50])]))

    def test_vazio(self):
        self.assertTrue(validar_lote([Entrada("x.png", b"")]))

    def test_extensao_nao_suportada(self):
        self.assertTrue(validar_lote([entrada("x.gif")]))

    def test_formato_real_divergente(self):
        self.assertTrue(validar_lote([entrada("x.png", "JPEG")]))

    def test_formato_real_nao_suportado(self):
        self.assertTrue(validar_lote([entrada("x.png", "BMP")]))

    def test_entrada_invalida(self):
        for item in (None, Entrada(None, b"a"), Entrada("x.png", "texto")):
            with self.subTest(item=item):
                self.assertTrue(validar_lote([item]))

    def test_valida_todos_e_nao_expoe_nome(self):
        falhas = validar_lote([entrada(), Entrada("paciente-clinica.png", b"x"), Entrada("tutor.jpg", b"")])
        self.assertEqual([f.indice for f in falhas], [2, 3])
        self.assertNotIn("paciente", str(falhas))
        self.assertNotIn("tutor", str(falhas))

    def test_nao_processa_lote_invalido(self):
        with patch("fluxo.anonymize_image") as processador:
            with self.assertRaises(ValueError):
                processar_lote([entrada(), Entrada("x.png", b"x")], CONFIG)
            processador.assert_not_called()

    def test_png_animado_rejeitado(self):
        buffer = BytesIO()
        Image.new("RGB", (10, 10), "red").save(buffer, format="PNG", save_all=True,
            append_images=[Image.new("RGB", (10, 10), "blue")])
        self.assertTrue(validar_lote([Entrada("x.png", buffer.getvalue())]))

    def test_erro_de_biblioteca_nao_expoe_mensagem(self):
        with patch("fluxo.decodificar", side_effect=ValueError("paciente secreto")):
            falhas = validar_lote([entrada()])
        self.assertEqual(len(falhas), 1)
        self.assertNotIn("secreto", str(falhas))

    def test_limite_de_seguranca_pillow(self):
        imagem = entrada(tamanho=(10, 10))
        with patch.object(Image, "MAX_IMAGE_PIXELS", 60):
            self.assertTrue(validar_lote([imagem]))


class ProcessamentoTest(unittest.TestCase):
    def test_multiplos_resultados(self):
        resultados, falhas = processar_lote([entrada()] * 3, CONFIG)
        self.assertEqual(len(resultados), 3)
        self.assertFalse(falhas)

    def test_falha_isolada_e_zip_somente_validos(self):
        with patch("fluxo.anonymize_image", side_effect=[Image.new("RGB", (10, 10)), RuntimeError("paciente secreto"), Image.new("RGB", (10, 10))]):
            resultados, falhas = processar_lote([entrada()] * 3, CONFIG)
        self.assertEqual([r.indice for r in resultados], [1, 3])
        self.assertEqual([f.indice for f in falhas], [2])
        self.assertNotIn("secreto", str(falhas))
        with ZipFile(BytesIO(criar_zip_revisado(resultados, True))) as zip_file:
            self.assertEqual(zip_file.namelist(), ["imagem_anonimizada_001.png", "imagem_anonimizada_003.png"])
            self.assertIsNone(zip_file.testzip())
            for nome in zip_file.namelist():
                imagem = Image.open(BytesIO(zip_file.read(nome)))
                self.assertEqual((imagem.format, imagem.mode), ("PNG", "RGB"))

    def test_falha_serializacao_isolada(self):
        with patch("fluxo.image_to_bytes", side_effect=[RuntimeError(), image_to_bytes(Image.new("RGB", (1, 1)))]):
            resultados, falhas = processar_lote([entrada()] * 2, CONFIG)
        self.assertEqual([r.indice for r in resultados], [2])
        self.assertEqual([f.indice for f in falhas], [1])

    def test_todos_falham_sem_zip(self):
        with patch("fluxo.anonymize_image", side_effect=RuntimeError()):
            resultados, falhas = processar_lote([entrada()], CONFIG)
        self.assertFalse(resultados)
        self.assertEqual(len(falhas), 1)
        with self.assertRaises(ValueError):
            criar_zip_revisado(resultados, True)

    def test_zip_uma_imagem_nome_neutro(self):
        resultados, _ = processar_lote([entrada("paciente-tutor-clinica.png")], CONFIG)
        with ZipFile(BytesIO(criar_zip_revisado(resultados, True))) as zip_file:
            self.assertEqual(zip_file.namelist(), ["imagem_anonimizada_001.png"])

    def test_zip_exige_revisao(self):
        resultados, _ = processar_lote([entrada()], CONFIG)
        with self.assertRaises(ValueError):
            criar_zip_revisado(resultados, False)

    def test_modos_alteram_regiao_preservam_centro(self):
        pixels = np.random.default_rng(10).integers(0, 256, (100, 100, 3), dtype=np.uint8)
        for modo in ("Tarja preta", "Desfoque", "Pixelização"):
            with self.subTest(modo=modo):
                resultado = np.array(anonymize_image(Image.fromarray(pixels), mode=modo, top_percent=20, bottom_percent=0))
                self.assertFalse(np.array_equal(resultado[:20], pixels[:20]))
                np.testing.assert_array_equal(resultado[20:], pixels[20:])

    def test_quatro_bordas_e_combinacao(self):
        imagem = Image.new("RGB", (100, 100), "white")
        for borda in ("top_percent", "bottom_percent", "left_percent", "right_percent", "todas"):
            with self.subTest(borda=borda):
                config = dict(top_percent=0, bottom_percent=0, left_percent=0, right_percent=0)
                if borda == "todas":
                    config = {k: 10 for k in config}
                else:
                    config[borda] = 10
                resultado = np.array(anonymize_image(imagem, **config))
                if config["top_percent"]:
                    self.assertTrue(np.all(resultado[:10] == 0))
                if config["bottom_percent"]:
                    self.assertTrue(np.all(resultado[-10:] == 0))
                if config["left_percent"]:
                    self.assertTrue(np.all(resultado[:, :10] == 0))
                if config["right_percent"]:
                    self.assertTrue(np.all(resultado[:, -10:] == 0))
                self.assertTrue(np.all(resultado[10:90, 10:90] == 255))

    def test_tamanhos_e_proporcoes_em_todos_modos(self):
        for tamanho in ((1, 1), (2, 3), (1600, 1200), (1, 1000), (1000, 1)):
            for modo in ("Tarja preta", "Desfoque", "Pixelização"):
                with self.subTest(tamanho=tamanho, modo=modo):
                    resultados, falhas = processar_lote([entrada(tamanho=tamanho)], dict(CONFIG, mode=modo, left_percent=40, right_percent=40))
                    self.assertFalse(falhas)
                    self.assertEqual(resultados[0].anonimizada.size, tamanho)


class MetadadosTest(unittest.TestCase):
    def test_exif_preenchido_jpeg_e_png_sem_copia(self):
        exif = Image.Exif()
        exif[270] = "Paciente sintetico"
        exif[315] = "Tutor sintetico"
        exif[306] = "2026:01:01 12:00:00"
        for formato, nome in (("JPEG", "x.jpg"), ("PNG", "x.png")):
            with self.subTest(formato=formato):
                buffer = BytesIO()
                Image.new("RGB", (20, 20)).save(buffer, format=formato, exif=exif, icc_profile=b"perfil sintetico", dpi=(150, 150))
                fonte = Image.open(BytesIO(buffer.getvalue()))
                self.assertEqual(fonte.getexif()[315], "Tutor sintetico")
                for chave in ("exif", "icc_profile", "dpi"):
                    self.assertIn(chave, fonte.info)
                original = decodificar(Entrada(nome, buffer.getvalue()))
                # Também cobre exportação direta, sem passar pela anonimização NumPy.
                for imagem in (original, anonymize_image(original)):
                    final = Image.open(BytesIO(image_to_bytes(imagem)))
                    self.assertEqual((final.format, final.mode), ("PNG", "RGB"))
                    self.assertFalse(final.getexif())
                    for chave in ("exif", "icc_profile", "dpi"):
                        self.assertNotIn(chave, final.info)

    def test_texto_png_nao_copiado(self):
        info = PngImagePlugin.PngInfo()
        info.add_text("Paciente", "Paciente sintetico")
        info.add_itxt("Clinica", "Clinica sintetica")
        buffer = BytesIO()
        Image.new("RGBA", (10, 10)).save(buffer, format="PNG", pnginfo=info)
        original = Image.open(BytesIO(buffer.getvalue()))
        self.assertIn("Paciente", original.info)
        final = Image.open(BytesIO(image_to_bytes(original)))
        self.assertFalse(final.info)
        self.assertEqual(final.mode, "RGB")

    def test_salvar_legado_sem_copia_exif(self):
        imagem = Image.new("RGB", (10, 10))
        exif = Image.Exif()
        exif[315] = "Tutor sintetico"
        imagem.info["exif"] = exif.tobytes()
        buffer = BytesIO()
        salvar_sem_metadados(imagem, buffer)
        self.assertFalse(Image.open(BytesIO(buffer.getvalue())).getexif())


class RevisaoTest(unittest.TestCase):
    def test_assinatura_igual_preserva_revisao(self):
        arquivos = [entrada()]
        assinatura = assinatura_lote(arquivos, CONFIG)
        estado = dict(assinatura=assinatura, resultados=[1], falhas=[], revisado=True)
        sincronizar_revisao(estado, assinatura_lote(arquivos, CONFIG))
        self.assertTrue(estado["revisado"])
        self.assertEqual(estado["resultados"], [1])

    def test_alteracoes_invalidam_resultado_e_revisao(self):
        arquivos = [entrada(), entrada("outro.jpg", "JPEG")]
        assinatura = assinatura_lote(arquivos, CONFIG)
        mudancas = [([], CONFIG), (arquivos[:1], CONFIG), (arquivos[::-1], CONFIG),
                    ([entrada("renomeada.png"), arquivos[1]], CONFIG),
                    ([entrada(tamanho=(40, 40)), arquivos[1]], CONFIG)]
        for chave, valor in dict(mode="Desfoque", top_percent=5, bottom_percent=5, left_percent=5, right_percent=5).items():
            mudancas.append((arquivos, dict(CONFIG, **{chave: valor})))
        for entradas, config in mudancas:
            with self.subTest(config=config, quantidade=len(entradas)):
                estado = dict(assinatura=assinatura, resultados=[1], falhas=[1], revisado=True)
                sincronizar_revisao(estado, assinatura_lote(entradas, config))
                self.assertFalse(estado["revisado"])
                self.assertFalse(estado["resultados"])
                self.assertFalse(estado["falhas"])


if __name__ == "__main__":
    unittest.main()
