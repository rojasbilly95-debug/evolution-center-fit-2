
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field


# ==========================================
# EVOLUTION CENTER FIT 2.0
# MOTOR RECOMENDADOR - VERSION 0.2.0
#
# Fase 1: Reglas de elegibilidad
# Fase 2: Ranking de compatibilidad
#
# Futuras fases:
# - Similitud semantica (embeddings)
# - Logica difusa
# - Ranking hibrido explicable
# ==========================================

app = FastAPI(
    title="Evolution Center Fit 2.0 - Motor IA",
    description=(
        "Servicio inteligente para evaluar la elegibilidad "
        "y calcular la compatibilidad entre perfiles "
        "de clientes y rutinas de entrenamiento."
    ),
    version="0.2.0",
)


# ==========================================
# VALORES COMPATIBLES CON POSTGRESQL
# ==========================================

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
# CONFIGURACION DEL MOTOR
# ==========================================

NIVELES = {
    "principiante": 1,
    "intermedio": 2,
    "avanzado": 3,
}

# Pesos iniciales del ranking.
# Total maximo: 100 puntos.
#
# Estos pesos son heuristicas del prototipo
# y necesitan validacion posterior.

PESOS = {
    "estado": 5,
    "objetivo": 30,
    "nivel": 20,
    "frecuencia": 10,
    "duracion": 15,
    "lugar": 10,
    "equipamiento": 10,
}


# ==========================================
# FUNCIONES AUXILIARES
# ==========================================

def lugar_compatible(
    lugar_cliente: Lugar,
    lugar_requerido: Lugar,
) -> bool:
    """
    Determina si el lugar solicitado es
    compatible con el lugar disponible.
    """

    return (
        lugar_cliente == "mixto"
        or lugar_requerido == "mixto"
        or lugar_cliente == lugar_requerido
    )


def obtener_equipamiento(
    perfil: PerfilCliente,
) -> set[str]:
    """
    Obtiene los equipos disponibles.

    El peso corporal se considera disponible
    sin equipamiento adicional.
    """

    equipos = set(perfil.equipamiento)

    equipos.add("peso_corporal")

    return equipos


# ==========================================
# FASE 1 - REGLAS DE ELEGIBILIDAD
# ==========================================

def comprobar_elegibilidad(
    perfil: PerfilCliente,
    rutina: Rutina,
) -> list[str]:
    """
    Evalua las restricciones obligatorias.

    Devuelve los motivos que impiden que
    una rutina sea considerada elegible.
    """

    motivos = []

    # REGLA 1: ESTADO DE LA PLANTILLA

    if rutina.estado != "publicada":
        motivos.append(
            "La rutina no esta publicada."
        )

    # REGLA 2: OBJETIVO

    if rutina.objetivo != perfil.objetivo:
        motivos.append(
            "El objetivo de la rutina no coincide."
        )

    # REGLA 3: NIVEL DE EXPERIENCIA

    if (
        NIVELES[rutina.nivel]
        > NIVELES[perfil.experiencia]
    ):
        motivos.append(
            "La rutina supera el nivel del cliente."
        )

    # REGLA 4: FRECUENCIA SEMANAL

    if (
        rutina.frecuencia_semanal
        > perfil.frecuencia_semanal
    ):
        motivos.append(
            "La rutina requiere mas dias "
            "de los disponibles."
        )

    # REGLA 5: DURACION

    if (
        rutina.duracion_min
        > perfil.minutos_por_sesion
    ):
        motivos.append(
            "La rutina supera el tiempo "
            "disponible por sesion."
        )

    # REGLA 6: LUGAR

    if not lugar_compatible(
        perfil.lugar,
        rutina.lugar,
    ):
        motivos.append(
            "El lugar de entrenamiento no coincide."
        )

    # REGLA 7: EJERCICIOS

    equipos = obtener_equipamiento(perfil)

    for ejercicio in rutina.ejercicios:

        # Equipamiento disponible
        if ejercicio.equipamiento not in equipos:
            motivos.append(
                f"Falta equipamiento para "
                f"{ejercicio.nombre}."
            )

        # Nivel del ejercicio
        if (
            NIVELES[ejercicio.nivel]
            > NIVELES[perfil.experiencia]
        ):
            motivos.append(
                f"El ejercicio {ejercicio.nombre} "
                f"supera el nivel del cliente."
            )

        # Lugar del ejercicio
        if not lugar_compatible(
            perfil.lugar,
            ejercicio.lugar,
        ):
            motivos.append(
                f"Lugar incompatible para "
                f"{ejercicio.nombre}."
            )

    return motivos


# ==========================================
# FASE 2 - RANKING DE COMPATIBILIDAD
# ==========================================

def calcular_compatibilidad(
    perfil: PerfilCliente,
    rutina: Rutina,
) -> dict:
    """
    Calcula un puntaje heuristico entre 0 y 100.

    Una puntuacion alta NO elimina las
    restricciones de elegibilidad.

    Tampoco representa una probabilidad
    clinica ni garantiza resultados.
    """

    puntos = {}

    # --------------------------------------
    # 1. ESTADO - MAXIMO 5 PUNTOS
    # --------------------------------------

    puntos["estado"] = (
        PESOS["estado"]
        if rutina.estado == "publicada"
        else 0
    )

    # --------------------------------------
    # 2. OBJETIVO - MAXIMO 30 PUNTOS
    # --------------------------------------

    puntos["objetivo"] = (
        PESOS["objetivo"]
        if rutina.objetivo == perfil.objetivo
        else 0
    )

    # --------------------------------------
    # 3. NIVEL - MAXIMO 20 PUNTOS
    # --------------------------------------

    nivel_cliente = NIVELES[
        perfil.experiencia
    ]

    nivel_rutina = NIVELES[
        rutina.nivel
    ]

    ejercicios_adecuados = all(
        NIVELES[ejercicio.nivel] <= nivel_cliente
        for ejercicio in rutina.ejercicios
    )

    if (
        nivel_rutina > nivel_cliente
        or not ejercicios_adecuados
    ):
        puntos["nivel"] = 0

    elif nivel_rutina == nivel_cliente:
        puntos["nivel"] = PESOS["nivel"]

    else:
        # Rutina de nivel inferior al cliente
        puntos["nivel"] = 12

    # --------------------------------------
    # 4. FRECUENCIA - MAXIMO 10 PUNTOS
    # --------------------------------------

    diferencia_dias = (
        perfil.frecuencia_semanal
        - rutina.frecuencia_semanal
    )

    if diferencia_dias < 0:
        puntos["frecuencia"] = 0
    else:
        puntos["frecuencia"] = max(
            0,
            PESOS["frecuencia"] - 2 * diferencia_dias,
        )

    # --------------------------------------
    # 5. DURACION - MAXIMO 15 PUNTOS
    # --------------------------------------

    diferencia_minutos = (
        perfil.minutos_por_sesion
        - rutina.duracion_min
    )

    if diferencia_minutos < 0:
        puntos["duracion"] = 0
    else:
        puntos["duracion"] = max(
            0,
            PESOS["duracion"]
            - diferencia_minutos // 5,
        )

    # --------------------------------------
    # 6. LUGAR - MAXIMO 10 PUNTOS
    # --------------------------------------

    lugar_valido = lugar_compatible(
        perfil.lugar,
        rutina.lugar,
    )

    ejercicios_lugar_valido = all(
        lugar_compatible(
            perfil.lugar,
            ejercicio.lugar,
        )
        for ejercicio in rutina.ejercicios
    )

    puntos["lugar"] = (
        PESOS["lugar"]
        if lugar_valido and ejercicios_lugar_valido
        else 0
    )

    # --------------------------------------
    # 7. EQUIPAMIENTO - MAXIMO 10 PUNTOS
    # --------------------------------------

    equipos = obtener_equipamiento(perfil)

    total_ejercicios = len(
        rutina.ejercicios
    )

    ejercicios_compatibles = sum(
        1
        for ejercicio in rutina.ejercicios
        if ejercicio.equipamiento in equipos
    )

    if total_ejercicios > 0:
        puntos["equipamiento"] = round(
            PESOS["equipamiento"]
            * ejercicios_compatibles
            / total_ejercicios,
            1,
        )
    else:
        puntos["equipamiento"] = 0

    # --------------------------------------
    # RESULTADO FINAL
    # --------------------------------------

    puntuacion = round(
        sum(puntos.values()),
        1,
    )

    # Garantizar rango de 0 a 100
    puntuacion = max(
        0,
        min(100, puntuacion),
    )

    return {
        "puntaje_compatibilidad": puntuacion,
        "desglose_puntaje": puntos,
    }


# ==========================================
# EVALUACION COMPLETA DE UNA RUTINA
# ==========================================

def evaluar_rutina(
    perfil: PerfilCliente,
    rutina: Rutina,
) -> dict:
    """
    Combina las reglas obligatorias
    con el ranking de compatibilidad.
    """

    # Primero verificar elegibilidad
    motivos = comprobar_elegibilidad(
        perfil,
        rutina,
    )

    elegible = len(motivos) == 0

    # Luego calcular puntuacion
    compatibilidad = calcular_compatibilidad(
        perfil,
        rutina,
    )

    return {
        "rutina_id": rutina.id,
        "nombre": rutina.nombre,
        "elegible": elegible,
        "motivos": motivos if motivos else [
            "Cumple las reglas iniciales "
            "de elegibilidad."
        ],
        "puntaje_compatibilidad":
            compatibilidad["puntaje_compatibilidad"],
        "desglose_puntaje":
            compatibilidad["desglose_puntaje"],
    }


# ==========================================
# ENDPOINTS DE FASTAPI
# ==========================================

@app.get("/health")
def comprobar_estado():
    """
    Comprueba el estado del servicio.
    """

    return {
        "estado": "activo",
        "servicio": "motor-recomendador",
        "version": "0.2.0",
        "fase": "elegibilidad_y_ranking",
    }


@app.post("/evaluar")
def evaluar_recomendaciones(
    solicitud: SolicitudRecomendacion,
):
    """
    Evalua todas las rutinas recibidas
    y devuelve un ranking explicable.
    """

    resultados = [
        evaluar_rutina(
            solicitud.perfil,
            rutina,
        )
        for rutina in solicitud.rutinas
    ]

    # Prioridad:
    # 1. Primero las rutinas elegibles.
    # 2. Mayor puntuacion de compatibilidad.
    # 3. ID para desempate estable.

    resultados.sort(
        key=lambda resultado: (
            not resultado["elegible"],
            -resultado["puntaje_compatibilidad"],
            resultado["rutina_id"],
        )
    )

    total_elegibles = sum(
        1
        for resultado in resultados
        if resultado["elegible"]
    )

    return {
        "total_evaluadas": len(resultados),
        "total_elegibles": total_elegibles,
        "metodo": "reglas_deterministas_ranking_v2",
        "resultados": resultados,
    }
