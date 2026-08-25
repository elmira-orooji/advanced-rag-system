import unittest

from ocr_cli import OcrLine, character_error_rate, normalize_persian, reconstruct_page_text


class OcrTextTests(unittest.TestCase):
    def test_normalize_persian_characters(self) -> None:
        self.assertEqual(normalize_persian("كتاب يكي"), "کتاب یکی")

    def test_character_error_rate_exact_match(self) -> None:
        self.assertEqual(character_error_rate("این یک آزمون است", "این یک آزمون است"), 0)

    def test_character_error_rate_detects_difference(self) -> None:
        self.assertEqual(character_error_rate("سلام", "کلام"), 0.25)

    def test_reconstructs_rtl_words_by_position(self) -> None:
        lines = [
            OcrLine(1, "است", 0.9, [[10, 10], [50, 10], [50, 30], [10, 30]]),
            OcrLine(1, "آزمون", 0.9, [[60, 11], [120, 11], [120, 31], [60, 31]]),
            OcrLine(1, "این", 0.9, [[130, 9], [180, 9], [180, 29], [130, 29]]),
        ]
        self.assertEqual(reconstruct_page_text(lines), "این آزمون است")


if __name__ == "__main__":
    unittest.main()
