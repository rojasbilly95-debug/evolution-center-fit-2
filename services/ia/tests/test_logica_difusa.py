
import unittest

from logica_difusa import evaluar_ajuste_difuso


class PruebasLogicaDifusa(unittest.TestCase):

    def test_01_ajuste_completo(self):
        resultado = evaluar_ajuste_difuso(
            minutos_disponibles=60,
            minutos_requeridos=60,
            dias_disponibles=4,
            dias_requeridos=4,
        )

        self.assertEqual(
            resultado["puntaje_difuso"],
            95.0,
        )

    def test_02_ajuste_intermedio(self):
        resultado = evaluar_ajuste_difuso(
            minutos_disponibles=60,
            minutos_requeridos=45,
            dias_disponibles=4,
            dias_requeridos=3,
        )

        self.assertEqual(
            resultado["puntaje_difuso"],
            85.0,
        )

    def test_03_comparacion_puntajes(self):
        alto = evaluar_ajuste_difuso(
            minutos_disponibles=60,
            minutos_requeridos=60,
            dias_disponibles=4,
            dias_requeridos=4,
        )

        bajo = evaluar_ajuste_difuso(
            minutos_disponibles=60,
            minutos_requeridos=30,
            dias_disponibles=4,
            dias_requeridos=2,
        )

        self.assertGreater(
            alto["puntaje_difuso"],
            bajo["puntaje_difuso"],
        )

    def test_04_rechazar_tiempo_excesivo(self):
        with self.assertRaises(ValueError):
            evaluar_ajuste_difuso(
                minutos_disponibles=60,
                minutos_requeridos=90,
                dias_disponibles=4,
                dias_requeridos=3,
            )

    def test_05_rechazar_valores_invalidos(self):
        with self.assertRaises(ValueError):
            evaluar_ajuste_difuso(
                minutos_disponibles=60,
                minutos_requeridos=0,
                dias_disponibles=4,
                dias_requeridos=3,
            )


if __name__ == "__main__":
    unittest.main()
