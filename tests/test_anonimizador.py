import sys
import unittest
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image


sys.path.insert(
    0,
    str(Path(__file__).parents[1] / "app"),
)

from anonimizador import anonymize_image, image_to_bytes, load_image


class AnonymizerTest(unittest.TestCase):
    def test_default_profile_covers_header_and_footer(self):
        original = Image.fromarray(
            np.full(
                (100, 200, 3),
                255,
                dtype=np.uint8,
            )
        )

        result = np.array(
            anonymize_image(original)
        )

        self.assertTrue(np.all(result[:4] == 0))
        self.assertTrue(np.all(result[96:] == 0))
        self.assertTrue(np.all(result[4:96] == 255))

    def test_custom_side_bands_are_applied(self):
        original = Image.fromarray(
            np.full(
                (100, 100, 3),
                255,
                dtype=np.uint8,
            )
        )

        result = np.array(
            anonymize_image(
                original,
                top_percent=0,
                bottom_percent=0,
                left_percent=10,
                right_percent=20,
            )
        )

        self.assertTrue(np.all(result[:, :10] == 0))
        self.assertTrue(np.all(result[:, 80:] == 0))
        self.assertTrue(np.all(result[:, 10:80] == 255))

    def test_export_is_rgb_png_without_original_metadata(self):
        source = BytesIO()

        Image.new(
            "RGB",
            (8, 8),
            "white",
        ).save(
            source,
            format="JPEG",
            exif=Image.Exif(),
        )

        exported = Image.open(
            BytesIO(
                image_to_bytes(
                    load_image(source.getvalue())
                )
            )
        )

        self.assertEqual(exported.format, "PNG")
        self.assertEqual(exported.mode, "RGB")
        self.assertFalse(exported.getexif())


if __name__ == "__main__":
    unittest.main()
