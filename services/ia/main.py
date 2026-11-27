import hmac
import os
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field


# ==========================================
# EVOLUTION CENTER FIT 2.0
# MOTOR RECOMENDADOR - VERSION 0.3.0
#
# Fase 1: Reglas de elegibilidad
# Fase 2: Ranking de compatibilidad
# Fase 3: Similitud semantica opcional (embeddings)
# Fase 4: Logica difusa opcional para rutinas elegibles
#
# Siguiente fase: validacion del ranking hibrido explicable
# ==========================================

app = FastAPI(
    title="Evolution Center Fit 2.0 - Motor IA",
    description=(
        "Servicio inteligente para evaluar la elegibilidad "
        "y calcular la compatibilidad entre perfiles "
        "de clientes y rutinas de entrenamiento."
    ),
    version="0.3.0",
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

    # Campo histórico: se conserva para compatibilidad.
    equipamiento: list[Equipo] = Field(default_factory=list)

    # Equipamiento declarado para cada ubicación.
    # None significa que todavía no está clasificado.
    # [] significa que el cliente declaró no tener equipos.
    equipamiento_casa: list[Equipo] | None = None
    equipamiento_gimnasio: list[Equipo] | None = None

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

    # Opcional para mantener compatibilidad
    # con las pruebas anteriores.
    incluir_similitud: bool = False

    # Activar solo cuando se solicite expresamente.
    # Evita modificar las pruebas y los clientes existentes.
    incluir_logica_difusa: bool = False


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
# EQUIPAMIENTO Y UBICACIONES
# ==========================================

def ubicaciones_declaradas(
    perfil: PerfilCliente,
) -> list[str]:
    """
    Devuelve las ubicaciones declaradas
    por el cliente.
    """

    if perfil.lugar == "mixto":
        return [
            "casa",
            "gimnasio",
        ]

    return [perfil.lugar]


def equipamiento_en_ubicacion(
    perfil: PerfilCliente,
    lugar: str,
) -> set[str]:
    """
    Obtiene el equipamiento disponible
    exclusivamente en una ubicación.

    No presupone que el equipamiento del
    gimnasio también exista en casa.
    """

    if lugar == "casa":
        declarado = perfil.equipamiento_casa

    elif lugar == "gimnasio":
        declarado = perfil.equipamiento_gimnasio

    else:
        return set()

    if declarado is None:
        # Compatibilidad con perfiles antiguos
        # que solo utilizaban una ubicación.
        #
        # Para perfiles mixtos históricos,
        # no se puede conocer la distribución
        # real del equipamiento.

        if perfil.lugar == lugar:
            declarado = perfil.equipamiento
        else:
            declarado = []

    equipos = set(declarado)

    # El peso corporal no requiere
    # equipamiento adicional.
    equipos.add("peso_corporal")

    return equipos


def lugares_compatibles_rutina(
    perfil: PerfilCliente,
    rutina: Rutina,
) -> list[str]:
    """
    Determina en qué ubicaciones puede
    realizarse la rutina completa.

    Todos los ejercicios deben ser compatibles
    con una misma ubicación.
    """

    compatibles = []

    for lugar in ubicaciones_declaradas(perfil):

        if not lugar_compatible(
            lugar,
            rutina.lugar,
        ):
            continue

        disponibles = equipamiento_en_ubicacion(
            perfil,
            lugar,
        )

        ejercicios_compatibles = all(
            lugar_compatible(
                lugar,
                ejercicio.lugar,
            )
            and ejercicio.equipamiento in disponibles
            for ejercicio in rutina.ejercicios
        )

        if ejercicios_compatibles:
            compatibles.append(lugar)

    return compatibles

# ==========================================
# FASE 1 - REGLAS DE ELEGIBILIDAD
# ==========================================

def comprobar_elegibilidad(
    perfil: PerfilCliente,
    rutina: Rutina,
) -> list[str]:
    """
    Evalúa las restricciones obligatorias.

    Una rutina únicamente será elegible
    cuando cumpla todas las reglas.
    """

    motivos = []

    # --------------------------------------
    # REGLA 1: ESTADO DE LA RUTINA
    # --------------------------------------

    if rutina.estado != "publicada":
        motivos.append(
            "La rutina no está publicada."
        )

    # --------------------------------------
    # REGLA 2: OBJETIVO
    # --------------------------------------

    if rutina.objetivo != perfil.objetivo:
        motivos.append(
            "El objetivo de la rutina no coincide."
        )

    # --------------------------------------
    # REGLA 3: NIVEL
    # --------------------------------------

    if (
        NIVELES[rutina.nivel]
        > NIVELES[perfil.experiencia]
    ):
        motivos.append(
            "La rutina supera el nivel del cliente."
        )

    # --------------------------------------
    # REGLA 4: FRECUENCIA
    # --------------------------------------

    if (
        rutina.frecuencia_semanal
        > perfil.frecuencia_semanal
    ):
        motivos.append(
            "La rutina requiere más días "
            "de los disponibles."
        )

    # --------------------------------------
    # REGLA 5: DURACIÓN
    # --------------------------------------

    if (
        rutina.duracion_min
        > perfil.minutos_por_sesion
    ):
        motivos.append(
            "La rutina supera el tiempo "
            "disponible por sesión."
        )

    # --------------------------------------
    # REGLA 6: UBICACIONES
    # --------------------------------------

    ubicaciones = ubicaciones_declaradas(
        perfil
    )

    lugar_valido = any(
        lugar_compatible(
            lugar,
            rutina.lugar,
        )
        for lugar in ubicaciones
    )

    if not lugar_valido:
        motivos.append(
            "El lugar de entrenamiento no coincide."
        )

    # --------------------------------------
    # REGLA 7: EJERCICIOS
    # --------------------------------------

    for ejercicio in rutina.ejercicios:

        # Verificar nivel de cada ejercicio.

        if (
            NIVELES[ejercicio.nivel]
            > NIVELES[perfil.experiencia]
        ):
            motivos.append(
                f"El ejercicio {ejercicio.nombre} "
                f"supera el nivel del cliente."
            )

        # Verificar ubicación del ejercicio.

        ubicacion_valida = any(
            lugar_compatible(
                lugar,
                ejercicio.lugar,
            )
            for lugar in ubicaciones
        )

        if not ubicacion_valida:
            motivos.append(
                f"Lugar incompatible para "
                f"{ejercicio.nombre}."
            )

        # Verificar que el equipo exista
        # en alguna ubicación adecuada.

        equipo_disponible = any(
            lugar_compatible(
                lugar,
                ejercicio.lugar,
            )
            and ejercicio.equipamiento
            in equipamiento_en_ubicacion(
                perfil,
                lugar,
            )
            for lugar in ubicaciones
        )

        if not equipo_disponible:
            motivos.append(
                f"Falta equipamiento para "
                f"{ejercicio.nombre}."
            )

    # --------------------------------------
    # REGLA 8: RUTINA COMPLETA
    # --------------------------------------

    # Evita combinar equipos de diferentes
    # ubicaciones como si estuvieran juntos.

    lugares_compatibles = (
        lugares_compatibles_rutina(
            perfil,
            rutina,
        )
    )

    if not lugares_compatibles:
        motivos.append(
            "No existe una ubicación donde "
            "pueda realizarse toda la rutina "
            "con el equipamiento disponible."
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
    # 6. LUGAR - MÁXIMO 10 PUNTOS
    # --------------------------------------

    ubicaciones = ubicaciones_declaradas(
        perfil
    )

    lugar_valido = any(
        lugar_compatible(
            lugar,
            rutina.lugar,
        )
        for lugar in ubicaciones
    )

    ejercicios_lugar_valido = any(
        lugar_compatible(
            lugar,
            rutina.lugar,
        )
        and all(
            lugar_compatible(
                lugar,
                ejercicio.lugar,
            )
            for ejercicio in rutina.ejercicios
        )
        for lugar in ubicaciones
    )

    puntos["lugar"] = (
        PESOS["lugar"]
        if lugar_valido
        and ejercicios_lugar_valido
        else 0
    )

    # --------------------------------------
    # 7. EQUIPAMIENTO - MÁXIMO 10 PUNTOS
    # --------------------------------------

    total_ejercicios = len(
        rutina.ejercicios
    )

    # Se evalúa cada ubicación por separado.
    # No se mezclan equipos entre casa
    # y gimnasio.

    ejercicios_compatibles = max(
        (
            sum(
                1
                for ejercicio in rutina.ejercicios
                if lugar_compatible(
                    lugar,
                    ejercicio.lugar,
                )
                and ejercicio.equipamiento
                in equipamiento_en_ubicacion(
                    perfil,
                    lugar,
                )
            )
            for lugar in ubicaciones
            if lugar_compatible(
                lugar,
                rutina.lugar,
            )
        ),
        default=0,
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
                "lugares_compatibles": lugares_compatibles_rutina(
            perfil,
            rutina,
        ),
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
# PASO 57
# INTEGRACION DE SIMILITUD SEMANTICA
# ==========================================

DESCRIPCIONES_OBJETIVOS = {
    "perder_grasa":
        "reducir grasa corporal y mejorar "
        "la condicion fisica",

    "ganar_masa_muscular":
        "aumentar masa muscular mediante "
        "entrenamiento de fuerza",

    "mejorar_resistencia":
        "mejorar resistencia cardiovascular "
        "y capacidad aerobica",

    "mejorar_condicion_fisica":
        "mejorar condicion fisica general "
        "con fuerza basica y resistencia",
}


def construir_texto_cliente(
    perfil: PerfilCliente,
) -> str:
    """
    Construye una descripcion semantica
    a partir del perfil autorizado.
    """

    objetivo = DESCRIPCIONES_OBJETIVOS[
        perfil.objetivo
    ]

    return (
        f"Persona con nivel {perfil.experiencia}. "
        f"Busca {objetivo}. "
        f"Entrena en {perfil.lugar}. "
        f"Tiene disponibles "
        f"{perfil.frecuencia_semanal} dias por semana "
        f"y {perfil.minutos_por_sesion} minutos "
        f"por sesion."
    )


def construir_texto_rutina(
    rutina: Rutina,
) -> str:
    """
    Construye una descripcion de la rutina
    utilizando sus datos del catalogo.
    """

    objetivo = DESCRIPCIONES_OBJETIVOS[
        rutina.objetivo
    ]

    ejercicios = ", ".join(
        ejercicio.nombre
        for ejercicio in rutina.ejercicios
    )

    return (
        f"Programa {rutina.nombre}. "
        f"Objetivo: {objetivo}. "
        f"Nivel {rutina.nivel}. "
        f"Entrenamiento en {rutina.lugar}. "
        f"{rutina.frecuencia_semanal} dias "
        f"por semana. "
        f"{rutina.duracion_min} minutos "
        f"por sesion. "
        f"Ejercicios: {ejercicios}."
    )


def calcular_similitud_por_lote(
    perfil: PerfilCliente,
    rutinas: list[Rutina],
) -> list[float]:
    """
    Ejecuta el modelo de embeddings.

    Se importa aqui para evitar cargar
    PyTorch durante las pruebas que solo
    necesitan las reglas deterministas.
    """

    from similitud import (
        obtener_similitudes_por_posicion,
    )

    descripcion_cliente = (
        construir_texto_cliente(perfil)
    )

    descripciones_rutinas = [
        construir_texto_rutina(rutina)
        for rutina in rutinas
    ]

    return obtener_similitudes_por_posicion(
        descripcion_cliente,
        descripciones_rutinas,
    )


# ==========================================
# PASO 59 - INTEGRACION DE LOGICA DIFUSA
# ==========================================

def calcular_ajuste_difuso_rutina(
    perfil: PerfilCliente,
    rutina: Rutina,
) -> dict:
    """
    Calcula el ajuste difuso de disponibilidad.

    Solo se llama cuando la rutina ya es elegible.
    La puntuacion difusa es informativa y no
    reemplaza las reglas obligatorias.
    """

    # Importacion diferida: las pruebas de reglas
    # no necesitan cargar el modulo de logica difusa.
    from logica_difusa import evaluar_ajuste_difuso

    return evaluar_ajuste_difuso(
        minutos_disponibles=perfil.minutos_por_sesion,
        minutos_requeridos=rutina.duracion_min,
        dias_disponibles=perfil.frecuencia_semanal,
        dias_requeridos=rutina.frecuencia_semanal,
    )


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
        "version": "0.3.0",
        "fase": "ranking_embeddings_y_logica_difusa_opcional",
    }




def exigir_clave_ia(
    x_ia_service_key: str | None = Header(
        default=None,
        alias="X-IA-Service-Key",
    ),
) -> None:
    clave = os.environ.get("IA_INTERNAL_API_KEY", "")

    if len(clave) < 32:
        raise HTTPException(
            status_code=503,
            detail="Motor IA sin configurar.",
        )

    if not x_ia_service_key or not hmac.compare_digest(
        x_ia_service_key, clave
    ):
        raise HTTPException(
            status_code=401,
            detail="No autorizado.",
        )


@app.post("/evaluar", dependencies=[Depends(exigir_clave_ia)])
def evaluar_recomendaciones(
    solicitud: SolicitudRecomendacion,
):
    """
    Evalua las rutinas mediante:

    1. Reglas de elegibilidad.
    2. Ranking heuristico.
    3. Similitud semantica opcional.
    4. Logica difusa opcional para rutinas elegibles.

    Ni la similitud ni la logica difusa
    modifican la elegibilidad.
    """

    # Primera fase: reglas y puntuacion.
    resultados = [
        evaluar_rutina(
            solicitud.perfil,
            rutina,
        )
        for rutina in solicitud.rutinas
    ]

    similitud_aplicada = False

    # Segunda fase: embeddings.
    if (
        solicitud.incluir_similitud
        and solicitud.rutinas
    ):
        similitudes = calcular_similitud_por_lote(
            solicitud.perfil,
            solicitud.rutinas,
        )

        if len(similitudes) != len(resultados):
            raise ValueError(
                "El modelo devolvio una cantidad "
                "incorrecta de similitudes."
            )

        for resultado, similitud in zip(
            resultados,
            similitudes,
        ):
            resultado["similitud_semantica"] = (
                similitud
            )

        similitud_aplicada = True

    # Tercera fase: logica difusa.
    # Se evalua exclusivamente en rutinas elegibles.
    logica_difusa_aplicada = False

    if solicitud.incluir_logica_difusa:
        for rutina, resultado in zip(
            solicitud.rutinas,
            resultados,
        ):
            if resultado["elegible"]:
                resultado["ajuste_difuso"] = (
                    calcular_ajuste_difuso_rutina(
                        solicitud.perfil,
                        rutina,
                    )
                )
                logica_difusa_aplicada = True
            else:
                # No mostrar puntuaciones difusas de
                # rutinas descartadas por seguridad.
                resultado["ajuste_difuso"] = None

    # Orden:
    # 1. Elegibilidad obligatoria.
    # 2. Compatibilidad heuristica.
    # 3. Similitud como desempate.
    # 4. ID como desempate estable.

    resultados.sort(
        key=lambda resultado: (
            not resultado["elegible"],
            -resultado["puntaje_compatibilidad"],
            -resultado.get(
                "similitud_semantica",
                -2.0,
            ),
            resultado["rutina_id"],
        )
    )

    total_elegibles = sum(
        1
        for resultado in resultados
        if resultado["elegible"]
    )

    metodo = (
        "reglas_ranking_v2_embeddings_desempate"
        if similitud_aplicada
        else "reglas_deterministas_ranking_v2"
    )

    if logica_difusa_aplicada:
        metodo += "_difusa_v1"

    return {
        "total_evaluadas": len(resultados),
        "total_elegibles": total_elegibles,
        "metodo": metodo,
        "similitud_aplicada": similitud_aplicada,
        "logica_difusa_aplicada": logica_difusa_aplicada,
        "resultados": resultados,
    }
