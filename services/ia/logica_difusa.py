
"""
EVOLUTION CENTER FIT 2.0
MOTOR INTELIGENTE - FASE 3

Modulo de logica difusa para evaluar
el ajuste entre la disponibilidad del
cliente y las exigencias de una rutina.

Metodo: Sugeno de orden cero.

Los puntajes son heuristicas iniciales.
No representan probabilidades de exito.
"""


# ==========================================
# 1. FUNCIONES DE PERTENENCIA
# ==========================================

def hombro_izquierdo(
    x: float,
    a: float,
    b: float,
) -> float:
    if x <= a:
        return 1.0
    if x >= b:
        return 0.0

    return (b - x) / (b - a)


def triangular(
    x: float,
    a: float,
    b: float,
    c: float,
) -> float:
    if x <= a or x >= c:
        return 0.0
    if x == b:
        return 1.0
    if x < b:
        return (x - a) / (b - a)

    return (c - x) / (c - b)


def hombro_derecho(
    x: float,
    a: float,
    b: float,
) -> float:
    if x <= a:
        return 0.0
    if x >= b:
        return 1.0

    return (x - a) / (b - a)


# ==========================================
# 2. CONJUNTOS DIFUSOS
# ==========================================

def grados_uso(
    proporcion: float,
) -> dict[str, float]:

    return {
        "bajo": hombro_izquierdo(
            proporcion, 0.55, 0.75
        ),
        "medio": triangular(
            proporcion, 0.60, 0.80, 1.00
        ),
        "alto": hombro_derecho(
            proporcion, 0.80, 0.95
        ),
    }


# ==========================================
# 3. BASE DE REGLAS DIFUSAS
# ==========================================

REGLAS = {
    ("bajo", "bajo"): 55.0,
    ("bajo", "medio"): 65.0,
    ("bajo", "alto"): 75.0,

    ("medio", "bajo"): 65.0,
    ("medio", "medio"): 85.0,
    ("medio", "alto"): 90.0,

    ("alto", "bajo"): 75.0,
    ("alto", "medio"): 90.0,
    ("alto", "alto"): 95.0,
}


# ==========================================
# 4. MOTOR DE INFERENCIA DIFUSA
# ==========================================

def evaluar_ajuste_difuso(
    *,
    minutos_disponibles: int,
    minutos_requeridos: int,
    dias_disponibles: int,
    dias_requeridos: int,
) -> dict[str, float | str]:

    valores = (
        minutos_disponibles,
        minutos_requeridos,
        dias_disponibles,
        dias_requeridos,
    )

    if any(valor <= 0 for valor in valores):
        raise ValueError(
            "Los tiempos y dias deben ser "
            "mayores que cero."
        )

    # Las reglas de elegibilidad tienen
    # prioridad sobre la logica difusa.

    if (
        minutos_requeridos > minutos_disponibles
        or dias_requeridos > dias_disponibles
    ):
        raise ValueError(
            "El ajuste difuso solo se calcula "
            "para rutinas elegibles."
        )

    # Proporcion de disponibilidad utilizada.

    uso_tiempo = (
        minutos_requeridos / minutos_disponibles
    )

    uso_frecuencia = (
        dias_requeridos / dias_disponibles
    )

    # Fuzzificacion.

    tiempo = grados_uso(uso_tiempo)
    frecuencia = grados_uso(uso_frecuencia)

    # Inferencia mediante operador MIN.
    # Defuzzificacion Sugeno de orden cero.

    numerador = 0.0
    denominador = 0.0

    for (
        etiqueta_tiempo,
        etiqueta_frecuencia,
    ), salida in REGLAS.items():

        activacion = min(
            tiempo[etiqueta_tiempo],
            frecuencia[etiqueta_frecuencia],
        )

        numerador += activacion * salida
        denominador += activacion

    if denominador == 0:
        raise ValueError(
            "No se activaron reglas difusas."
        )

    puntaje = numerador / denominador

    return {
        "puntaje_difuso": round(puntaje, 1),
        "uso_tiempo_pct": round(
            uso_tiempo * 100, 1
        ),
        "uso_frecuencia_pct": round(
            uso_frecuencia * 100, 1
        ),
        "metodo": "sugeno_orden_cero_v1",
    }
