
import unittest

from pydantic import ValidationError

from main import (
    PerfilCliente,
    Ejercicio,
    Rutina,
    SolicitudRecomendacion,
    evaluar_rutina,
    evaluar_recomendaciones,
)


class PruebasMotorRecomendador(unittest.TestCase):

    def setUp(self):
        """
        Crear un perfil y una rutina ficticios
        para cada prueba.
        """

        self.perfil = PerfilCliente(
            objetivo="mejorar_condicion_fisica",
            experiencia="principiante",
            frecuencia_semanal=4,
            minutos_por_sesion=60,
            lugar="gimnasio",
            equipamiento=[
                "mancuernas",
                "maquinas",
            ],
        )

        self.rutina = Rutina(
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
                    nombre="Sentadilla goblet",
                    nivel="principiante",
                    lugar="gimnasio",
                    equipamiento="mancuernas",
                ),
                Ejercicio(
                    nombre="Press de pecho",
                    nivel="principiante",
                    lugar="gimnasio",
                    equipamiento="maquinas",
                ),
            ],
        )

    # ======================================
    # PRUEBA 1 - RUTINA COMPATIBLE
    # ======================================

    def test_01_rutina_compatible(self):
        resultado = evaluar_rutina(
            self.perfil,
            self.rutina,
        )

        self.assertTrue(resultado["elegible"])

        self.assertEqual(
            resultado["puntaje_compatibilidad"],
            100,
        )

    # ======================================
    # PRUEBA 2 - OBJETIVO DIFERENTE
    # ======================================

    def test_02_objetivo_incompatible(self):
        rutina = self.rutina.model_copy(
            update={
                "objetivo": "mejorar_resistencia",
            }
        )

        resultado = evaluar_rutina(
            self.perfil,
            rutina,
        )

        self.assertFalse(resultado["elegible"])

        self.assertEqual(
            resultado["puntaje_compatibilidad"],
            70,
        )

        self.assertIn(
            "El objetivo de la rutina no coincide.",
            resultado["motivos"],
        )

    # ======================================
    # PRUEBA 3 - EQUIPAMIENTO INCOMPATIBLE
    # ======================================

    def test_03_equipamiento_incompatible(self):
        rutina = self.rutina.model_copy(
            update={
                "ejercicios": [
                    self.rutina.ejercicios[0],
                    Ejercicio(
                        nombre="Sentadilla con barra",
                        nivel="principiante",
                        lugar="gimnasio",
                        equipamiento="barra",
                    ),
                ],
            }
        )

        resultado = evaluar_rutina(
            self.perfil,
            rutina,
        )

        self.assertFalse(resultado["elegible"])

        self.assertEqual(
            resultado["desglose_puntaje"]["equipamiento"],
            5,
        )

    # ======================================
    # PRUEBA 4 - NIVEL SUPERIOR
    # ======================================

    def test_04_nivel_superior(self):
        rutina = self.rutina.model_copy(
            update={
                "nivel": "avanzado",
            }
        )

        resultado = evaluar_rutina(
            self.perfil,
            rutina,
        )

        self.assertFalse(resultado["elegible"])

        self.assertEqual(
            resultado["desglose_puntaje"]["nivel"],
            0,
        )

    # ======================================
    # PRUEBA 5 - FRECUENCIA INCOMPATIBLE
    # ======================================

    def test_05_frecuencia_incompatible(self):
        rutina = self.rutina.model_copy(
            update={
                "frecuencia_semanal": 5,
            }
        )

        resultado = evaluar_rutina(
            self.perfil,
            rutina,
        )

        self.assertFalse(resultado["elegible"])

        self.assertEqual(
            resultado["desglose_puntaje"]["frecuencia"],
            0,
        )

    # ======================================
    # PRUEBA 6 - DURACION EXCESIVA
    # ======================================

    def test_06_duracion_incompatible(self):
        rutina = self.rutina.model_copy(
            update={
                "duracion_min": 90,
            }
        )

        resultado = evaluar_rutina(
            self.perfil,
            rutina,
        )

        self.assertFalse(resultado["elegible"])

        self.assertEqual(
            resultado["desglose_puntaje"]["duracion"],
            0,
        )

    # ======================================
    # PRUEBA 7 - RUTINA NO PUBLICADA
    # ======================================

    def test_07_rutina_no_publicada(self):
        rutina = self.rutina.model_copy(
            update={
                "estado": "borrador",
            }
        )

        resultado = evaluar_rutina(
            self.perfil,
            rutina,
        )

        self.assertFalse(resultado["elegible"])

        self.assertEqual(
            resultado["puntaje_compatibilidad"],
            95,
        )

    # ======================================
    # PRUEBA 8 - LUGAR INCOMPATIBLE
    # ======================================

    def test_08_lugar_incompatible(self):
        rutina = self.rutina.model_copy(
            update={
                "lugar": "casa",
            }
        )

        resultado = evaluar_rutina(
            self.perfil,
            rutina,
        )

        self.assertFalse(resultado["elegible"])

    # ======================================
    # PRUEBA 9 - ORDEN DEL RANKING
    # ======================================

    def test_09_prioridad_de_elegibilidad(self):
        """
        Una rutina elegible debe aparecer
        antes que una no elegible, incluso
        si esta ultima tiene mayor puntaje.
        """

        elegible = self.rutina.model_copy(
            update={
                "duracion_min": 30,
            }
        )

        no_elegible = self.rutina.model_copy(
            update={
                "id": 2,
                "estado": "borrador",
            }
        )

        solicitud = SolicitudRecomendacion(
            perfil=self.perfil,
            rutinas=[
                no_elegible,
                elegible,
            ],
        )

        respuesta = evaluar_recomendaciones(
            solicitud,
        )

        self.assertEqual(
            respuesta["total_evaluadas"],
            2,
        )

        self.assertEqual(
            respuesta["total_elegibles"],
            1,
        )

        self.assertTrue(
            respuesta["resultados"][0]["elegible"]
        )

        self.assertEqual(
            respuesta["resultados"][0]["rutina_id"],
            1,
        )

    # ======================================
    # PRUEBA 10 - VALIDACION DE DATOS
    # ======================================

    def test_10_frecuencia_fuera_de_rango(self):
        """
        El perfil debe rechazar frecuencias
        superiores a siete dias.
        """

        with self.assertRaises(ValidationError):
            PerfilCliente(
                objetivo="mejorar_condicion_fisica",
                experiencia="principiante",
                frecuencia_semanal=8,
                minutos_por_sesion=60,
                lugar="gimnasio",
                equipamiento=["mancuernas"],
            )


if __name__ == "__main__":
    unittest.main()
