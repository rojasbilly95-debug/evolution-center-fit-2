"""Pruebas de integracion del paso 59 (Evolution Center Fit 2.0)."""

import unittest
from unittest.mock import patch

from main import (
    Ejercicio,
    PerfilCliente,
    Rutina,
    SolicitudRecomendacion,
    evaluar_recomendaciones,
)


class PruebasIntegracionDifusa(unittest.TestCase):
    def setUp(self):
        self.perfil = PerfilCliente(
            objetivo="mejorar_condicion_fisica",
            experiencia="principiante",
            frecuencia_semanal=4,
            minutos_por_sesion=60,
            lugar="gimnasio",
            equipamiento=["mancuernas", "maquinas"],
        )
        self.rutina_elegible = Rutina(
            id=1,
            nombre="Acondicionamiento inicial",
            objetivo="mejorar_condicion_fisica",
            nivel="principiante",
            frecuencia_semanal=4,
            duracion_min=60,
            lugar="gimnasio",
            estado="publicada",
            ejercicios=[
                Ejercicio(
                    nombre="Sentadillas",
                    nivel="principiante",
                    lugar="gimnasio",
                    equipamiento="peso_corporal",
                )
            ],
        )
        self.rutina_incompatible = self.rutina_elegible.model_copy(
            update={
                "id": 2,
                "nombre": "Resistencia inicial",
                "objetivo": "mejorar_resistencia",
            }
        )

    def test_01_sin_flag_mantiene_comportamiento_anterior(self):
        solicitud = SolicitudRecomendacion(
            perfil=self.perfil,
            rutinas=[self.rutina_elegible, self.rutina_incompatible],
        )
        with patch("main.calcular_ajuste_difuso_rutina") as calcular:
            respuesta = evaluar_recomendaciones(solicitud)
        calcular.assert_not_called()
        self.assertFalse(respuesta["logica_difusa_aplicada"])
        self.assertEqual(respuesta["total_elegibles"], 1)
        self.assertNotIn("ajuste_difuso", respuesta["resultados"][0])

    def test_02_solo_evalua_difuso_en_rutinas_elegibles(self):
        solicitud = SolicitudRecomendacion(
            perfil=self.perfil,
            rutinas=[self.rutina_incompatible, self.rutina_elegible],
            incluir_logica_difusa=True,
        )
        ajuste = {
            "puntaje_difuso": 100.0,
            "uso_tiempo_pct": 100.0,
            "uso_frecuencia_pct": 100.0,
            "metodo": "logica_difusa_v1",
        }
        with patch(
            "main.calcular_ajuste_difuso_rutina", return_value=ajuste
        ) as calcular:
            respuesta = evaluar_recomendaciones(solicitud)
        calcular.assert_called_once_with(self.perfil, self.rutina_elegible)
        self.assertTrue(respuesta["logica_difusa_aplicada"])
        self.assertEqual(respuesta["resultados"][0]["rutina_id"], 1)
        self.assertEqual(respuesta["resultados"][0]["ajuste_difuso"], ajuste)
        self.assertIsNone(respuesta["resultados"][1]["ajuste_difuso"])
        self.assertIn("difusa_v1", respuesta["metodo"])

    def test_03_sin_rutinas_elegibles_no_llama_logica_difusa(self):
        solicitud = SolicitudRecomendacion(
            perfil=self.perfil,
            rutinas=[self.rutina_incompatible],
            incluir_logica_difusa=True,
        )
        with patch("main.calcular_ajuste_difuso_rutina") as calcular:
            respuesta = evaluar_recomendaciones(solicitud)
        calcular.assert_not_called()
        self.assertFalse(respuesta["logica_difusa_aplicada"])
        self.assertIsNone(respuesta["resultados"][0]["ajuste_difuso"])


if __name__ == "__main__":
    unittest.main()
