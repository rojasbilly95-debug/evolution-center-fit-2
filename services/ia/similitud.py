
"""
EVOLUTION CENTER FIT 2.0

Motor recomendador - Fase semantica.

Compara textos mediante embeddings de
un modelo multilingue preentrenado.

Esta version es independiente de FastAPI.
"""

from functools import lru_cache

from sentence_transformers import SentenceTransformer


MODELO = (
    "sentence-transformers/"
    "paraphrase-multilingual-MiniLM-L12-v2"
)


# Cargar el modelo una vez por proceso
@lru_cache(maxsize=1)
def obtener_modelo() -> SentenceTransformer:
    return SentenceTransformer(
        MODELO,
        device="cpu",
    )


def comparar_semanticamente(
    descripcion_cliente: str,
    descripciones_rutinas: list[str],
) -> list[dict]:
    """
    Calcula similitud coseno entre la
    descripcion de un cliente y las rutinas.

    Los valores se aproximan a:
    -1: direcciones semanticas opuestas
     0: poca similitud
     1: alta similitud

    No representan probabilidades de exito.
    """

    if not descripcion_cliente.strip():
        raise ValueError(
            "La descripcion del cliente esta vacia."
        )

    if not descripciones_rutinas:
        return []

    if any(
        not descripcion.strip()
        for descripcion in descripciones_rutinas
    ):
        raise ValueError(
            "Las rutinas deben tener descripciones."
        )

    modelo = obtener_modelo()

    textos = [
        descripcion_cliente,
        *descripciones_rutinas,
    ]

    # Generar vectores normalizados
    vectores = modelo.encode(
        textos,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    vector_cliente = vectores[0]
    vectores_rutinas = vectores[1:]

    # Producto punto de vectores normalizados
    # equivale a similitud coseno.
    similitudes = (
        vectores_rutinas @ vector_cliente
    )

    resultados = []

    for descripcion, similitud in zip(
        descripciones_rutinas,
        similitudes,
    ):
        resultados.append(
            {
                "descripcion": descripcion,
                "similitud_coseno": round(
                    float(similitud),
                    4,
                ),
            }
        )

    # Ordenar por similitud descendente
    resultados.sort(
        key=lambda item: item["similitud_coseno"],
        reverse=True,
    )

    return resultados


# ==========================================
# SIMILITUD SEMANTICA POR LOTES
# ==========================================

def obtener_similitudes_por_posicion(
    descripcion_cliente: str,
    descripciones_rutinas: list[str],
) -> list[float]:
    """
    Calcula la similitud entre el cliente
    y cada rutina.

    IMPORTANTE:
    Devuelve los valores en el mismo orden
    en que se recibieron las rutinas.

    No ordena ni modifica las entradas.
    """

    if not descripciones_rutinas:
        return []

    if not descripcion_cliente.strip():
        raise ValueError(
            "La descripcion del cliente esta vacia."
        )

    if any(
        not descripcion.strip()
        for descripcion in descripciones_rutinas
    ):
        raise ValueError(
            "Existe una descripcion de rutina vacia."
        )

    modelo = obtener_modelo()

    textos = [
        descripcion_cliente,
        *descripciones_rutinas,
    ]

    vectores = modelo.encode(
        textos,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    vector_cliente = vectores[0]
    vectores_rutinas = vectores[1:]

    similitudes = (
        vectores_rutinas @ vector_cliente
    )

    return [
        round(float(valor), 4)
        for valor in similitudes
    ]


# ==========================================
# PRUEBA INDEPENDIENTE
# ==========================================

if __name__ == "__main__":

    descripcion_cliente = (
        "Soy principiante y quiero mejorar "
        "mi condicion fisica general. "
        "Busco desarrollar resistencia "
        "y entrenar progresivamente."
    )

    rutinas = [
        (
            "Programa de acondicionamiento "
            "fisico general para principiantes, "
            "con ejercicios de fuerza basica "
            "y resistencia progresiva."
        ),
        (
            "Programa de resistencia "
            "cardiovascular mediante bicicleta "
            "estatica y ejercicios aerobicos."
        ),
        (
            "Entrenamiento avanzado de "
            "levantamiento de cargas elevadas "
            "para desarrollar fuerza maxima."
        ),
    ]

    print()
    print("EVOLUTION CENTER FIT 2.0")
    print("PRUEBA DE SIMILITUD SEMANTICA")
    print("-" * 45)

    resultados = comparar_semanticamente(
        descripcion_cliente,
        rutinas,
    )

    for posicion, resultado in enumerate(
        resultados,
        start=1,
    ):
        print()
        print(f"Posicion: {posicion}")
        print(
            "Similitud coseno:",
            resultado["similitud_coseno"],
        )
        print(
            "Descripcion:",
            resultado["descripcion"],
        )

    print()
    print("Prueba finalizada.")
