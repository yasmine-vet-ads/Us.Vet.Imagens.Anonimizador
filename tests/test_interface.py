import sys
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from streamlit.testing.v1 import AppTest

sys.path.insert(0, str(Path(__file__).parents[1] / "app"))


def upload(nome="sintetica.png", valido=True):
    buffer = BytesIO()
    if valido:
        Image.new("RGB", (20, 20), "white").save(buffer, format="PNG")
    buffer.name = nome
    return buffer


class InterfaceTest(unittest.TestCase):
    def app(self):
        return AppTest.from_file(str(Path(__file__).parents[1] / "app" / "main.py"))

    def test_fluxo_todas_imagens_zip_revisao_e_invalida_config(self):
        with patch("streamlit.file_uploader", return_value=[upload(), upload("outra.png")]):
            app = self.app().run()
            self.assertFalse(app.exception)
            self.assertFalse(app.get("download_button"))
            self.assertFalse(app.checkbox)
            app.button[0].click().run()
            self.assertFalse(app.exception)
            self.assertEqual(len(app.get("image")), 4)
            self.assertFalse(app.get("download_button"))
            app.checkbox[0].check().run()
            self.assertFalse(app.exception)
            self.assertEqual(len(app.get("download_button")), 1)
            self.assertTrue(app.get("download_button")[0].proto.url.endswith(".zip"))
            app.radio[0].set_value("Vertical (telas menores)").run()
            self.assertEqual(len(app.get("image")), 4)
            self.assertTrue(app.checkbox[0].value)
            app.slider[0].set_value(5).run()
            self.assertFalse(app.exception)
            self.assertFalse(app.get("download_button"))
            self.assertFalse(app.session_state["revisado"])
            self.assertFalse(app.session_state["resultados"])

    def test_arquivo_invalido_bloqueia_processamento(self):
        with patch("streamlit.file_uploader", return_value=[upload(), upload("paciente.png", False)]):
            app = self.app().run()
            self.assertFalse(app.exception)
            self.assertTrue(app.button[0].disabled)
            self.assertTrue(app.error)
            self.assertFalse(app.get("download_button"))
            self.assertNotIn("paciente", app.error[0].value)

    def test_troca_upload_invalida_e_reprocessar_exige_nova_revisao(self):
        with patch("streamlit.file_uploader", return_value=[upload()]):
            app = self.app().run()
            app.button[0].click().run()
            app.checkbox[0].check().run()
            self.assertEqual(len(app.get("download_button")), 1)
            app.button[0].click().run()
            self.assertFalse(app.checkbox[0].value)
            self.assertFalse(app.get("download_button"))
            app.checkbox[0].check().run()
        with patch("streamlit.file_uploader", return_value=[]):
            app.run()
            self.assertFalse(app.exception)
            self.assertFalse(app.session_state["revisado"])
            self.assertFalse(app.session_state["resultados"])
            self.assertFalse(app.get("download_button"))

    def test_falha_parcial_exibe_status_e_preserva_conferencia(self):
        with patch("streamlit.file_uploader", return_value=[upload(), upload("outra.png")]):
            app = self.app().run()
            with patch("fluxo.anonymize_image", side_effect=[RuntimeError("dado privado"), Image.new("RGB", (20, 20))]):
                app.button[0].click().run()
            self.assertFalse(app.exception)
            self.assertEqual(len(app.get("image")), 2)
            self.assertIn("Item 001", app.error[0].value)
            self.assertNotIn("privado", app.error[0].value)
            self.assertFalse(app.get("download_button"))
            app.checkbox[0].check().run()
            self.assertEqual(len(app.get("download_button")), 1)


if __name__ == "__main__":
    unittest.main()
