import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from main import app, exigir_clave_ia


CLAVE_PRUEBA = "clave-exclusiva-para-pruebas-unitarias-123456789"


class PruebasSeguridadAPI(unittest.TestCase):

    def test_01_sin_configuracion_rechaza(self):
        with patch.dict(os.environ, {"IA_INTERNAL_API_KEY": ""}):
            with self.assertRaises(HTTPException) as contexto:
                exigir_clave_ia(None)
            self.assertEqual(contexto.exception.status_code, 503)

    def test_02_sin_encabezado_rechaza(self):
        with patch.dict(os.environ, {
            "IA_INTERNAL_API_KEY": CLAVE_PRUEBA
        }):
            with self.assertRaises(HTTPException) as contexto:
                exigir_clave_ia(None)
            self.assertEqual(contexto.exception.status_code, 401)

    def test_03_clave_incorrecta_rechaza(self):
        with patch.dict(os.environ, {
            "IA_INTERNAL_API_KEY": CLAVE_PRUEBA
        }):
            with self.assertRaises(HTTPException) as contexto:
                exigir_clave_ia("clave-incorrecta")
            self.assertEqual(contexto.exception.status_code, 401)

    def test_04_clave_correcta_permite(self):
        with patch.dict(os.environ, {
            "IA_INTERNAL_API_KEY": CLAVE_PRUEBA
        }):
            self.assertIsNone(exigir_clave_ia(CLAVE_PRUEBA))

    def test_05_endpoint_tiene_proteccion(self):
        rutas = [
            ruta for ruta in app.routes
            if getattr(ruta, "path", None) == "/evaluar"
        ]
        self.assertEqual(len(rutas), 1)
        dependencias = rutas[0].dependant.dependencies
        self.assertTrue(
            any(d.call is exigir_clave_ia for d in dependencias)
        )
