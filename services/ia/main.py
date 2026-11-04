
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field


# ==========================================
# EVOLUTION CENTER FIT 2.0
# MOTOR RECOMENDADOR - FASE 1
# Reglas de elegibilidad
# ==========================================

app = FastAPI(
    title="Evolution Center Fit 2.0 - Motor IA",
    description=(
        "Servicio para evaluar la compatibilidad "
        "entre perfiles de clientes y rutinas."
    ),
    version="0.1.0",
)


# Valores compatibles con PostgreSQL

Objetivo = Literal[
    "perder_grasa",
    "ganar_masa_muscular",
    "mejorar_resistencia",
    "mejorar_condicion_fisica",
]

Nivel = Literal[
    "principiante",
    "intermedio",
    "avanzado",
]

Lugar = Literal[
    "gimnasio",
    "casa",
    "mixto",
]

Equipo = Literal[
    "mancuernas",
    "maquinas",
    "bandas",
    "barra",
    "peso_corporal",
]


# ==========================================
# MODELOS DE DATOS
# ==========================================

class PerfilCliente(BaseModel):
    objetivo: Objetivo
    experiencia: Nivel

    frecuencia_semanal: int = Field(
        ge=1,
        le=7,
    )

    minutos_por_sesion: int = Field(
        ge=15,
        le=240,
    )

    lugar: Lugar
    equipamiento: list[Equipo]


class Ejercicio(BaseModel):
    nombre: str
    nivel: Nivel
    lugar: Lugar
    equipamiento: Equipo


class Rutina(BaseModel):
    id: int
    nombre: str

    objetivo: Objetivo
    nivel: Nivel

    frecuencia_semanal: int = Field(
        ge=1,
        le=7,
    )

    duracion_min: int = Field(
        ge=15,
        le=240,
    )

    lugar: Lugar

    estado: Literal[
        "borrador",
        "publicada",
    ]

    ejercicios: list[Ejercicio] = Field(
        min_length=1,
    )


class SolicitudRecomendacion(BaseModel):
    perfil: PerfilCliente
    rutinas: list[Rutina]


# ==========================================
# REGLAS DE ELEGIBILIDAD
# ==========================================

NIVELES = {
    "principiante": 1,
    "intermedio": 2,
    "avanzado": 3,
}


def lugar_compatible(
    lugar_cliente: Lugar,
    lugar_requerido: Lugar,
) -> bool:
    return (
        lugar_cliente == "mixto"
        or lugar_requerido == "mixto"
        or lugar_cliente == lugar_requerido
    )


def evaluar_rutina(
    perfil: PerfilCliente,
    rutina: Rutina,
) -> dict:

    motivos = []

    # 1. Estado de la plantilla
    if rutina.estado != "publicada":
        motivos.append(
            "La rutina no está publicada."
        )

    # 2. Objetivo
    if rutina.objetivo != perfil.objetivo:
        motivos.append(
            "El objetivo de la rutina no coincide."
        )

    # 3. Experiencia
    if (
        NIVELES[rutina.nivel]
        > NIVELES[perfil.experiencia]
    ):
        motivos.append(
            "La rutina supera el nivel del cliente."
        )

    # 4. Frecuencia semanal
    if (
        rutina.frecuencia_semanal
        > perfil.frecuencia_semanal
    ):
        motivos.append(
            "La rutina requiere más días "
            "de los disponibles."
        )

    # 5. Duración
    if (
        rutina.duracion_min
        > perfil.minutos_por_sesion
    ):
        motivos.append(
            "La rutina supera el tiempo "
            "disponible por sesión."
        )

    # 6. Lugar de entrenamiento
    if not lugar_compatible(
        perfil.lugar,
        rutina.lugar,
    ):
        motivos.append(
            "El lugar de entrenamiento no coincide."
        )

    # 7. Ejercicios y equipamiento
    equipos_disponibles = set(
        perfil.equipamiento
    )

    equipos_disponibles.add(
        "peso_corporal"
    )

    for ejercicio in rutina.ejercicios:

        if (
            ejercicio.equipamiento
            not in equipos_disponibles
        ):
            motivos.append(
                f"Falta equipamiento para "
                f"{ejercicio.nombre}."
            )

        if (
            NIVELES[ejercicio.nivel]
            > NIVELES[perfil.experiencia]
        ):
            motivos.append(
                f"El ejercicio {ejercicio.nombre} "
                f"supera el nivel del cliente."
            )

        if not lugar_compatible(
            perfil.lugar,
            ejercicio.lugar,
        ):
            motivos.append(
                f"Lugar incompatible para "
                f"{ejercicio.nombre}."
            )

    # Resultado
    elegible = len(motivos) == 0

    return {
        "rutina_id": rutina.id,
        "nombre": rutina.nombre,
        "elegible": elegible,
        "motivos": motivos if motivos else [
            "Cumple las reglas iniciales "
            "de elegibilidad."
        ],
    }


# ==========================================
# ENDPOINTS DE FASTAPI
# ==========================================

@app.get("/health")
def comprobar_estado():
    return {
        "estado": "activo",
        "servicio": "motor-recomendador",
        "version": "0.1.0",
        "fase": "reglas_elegibilidad",
    }


@app.post("/evaluar")
def evaluar_recomendaciones(
    solicitud: SolicitudRecomendacion,
):
    resultados = [
        evaluar_rutina(
            solicitud.perfil,
            rutina,
        )
        for rutina in solicitud.rutinas
    ]

    # Mostrar primero las elegibles
    resultados.sort(
        key=lambda resultado:
        not resultado["elegible"]
    )

    total_elegibles = sum(
        1
        for resultado in resultados
        if resultado["elegible"]
    )

    return {
        "total_evaluadas": len(resultados),
        "total_elegibles": total_elegibles,
        "metodo": "reglas_deterministas_v1",
        "resultados": resultados,
    }
