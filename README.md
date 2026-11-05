
# EVOLUTION CENTER FIT 2.0

**Sistema inteligente de recomendación de rutinas de ejercicio y seguimiento de la adherencia al plan de entrenamiento**

Proyecto académico de desarrollo de software | Lima, Perú | 2026

**Estado:** Desarrollo activo — PASO 66 completado.  
**Siguiente etapa:** PASO 67 — Validación del registro de ejercicios por sesión.  
**Entorno:** Next.js 16.4.4 + React + TypeScript + Supabase + Python/FastAPI.  
**Modalidad:** Prototipo funcional en desarrollo. No preparado todavía para producción.  
**Última actualización:** 05 de noviembre de 2026.

---

## 1. Descripción general

Evolution Center Fit 2.0 es una aplicación web orientada a gimnasios que permite administrar perfiles de entrenamiento, recomendar rutinas personalizadas, supervisar su aprobación y realizar el seguimiento de los planes asignados a los clientes.

El sistema integra un motor recomendador híbrido con la supervisión humana del entrenador.

Las recomendaciones no se convierten automáticamente en planes de entrenamiento. Primero deben ser revisadas y aprobadas por un entrenador autorizado.

El proyecto busca estudiar la influencia de esta herramienta en la **adherencia al plan de entrenamiento en clientes de un gimnasio**.

### 1.1. Dimensiones de adherencia

La adherencia se organiza en tres dimensiones:

1. **Asistencia:** participación del cliente en las sesiones programadas.
2. **Cumplimiento:** ejecución de los ejercicios, series, repeticiones y duración previstos.
3. **Continuidad:** participación sostenida durante las semanas del plan.

### 1.2. Estado actual

Se han desarrollado los siguientes módulos:

- Autenticación y gestión de sesiones.
- Protección de rutas por roles.
- Perfiles de entrenamiento.
- Catálogo de ejercicios y rutinas.
- Relaciones entre entrenadores y clientes.
- Motor recomendador mediante FastAPI.
- Evaluación y clasificación de rutinas.
- Revisión y aprobación profesional.
- Historial de decisiones.
- Asignación de rutinas aprobadas.
- Programación del calendario de entrenamiento.
- Control de asistencia.
- Estructuras para registrar ejercicios y series.
- API de registro de series realizadas.
- Indicadores de cumplimiento por sesión.
- Resumen integral de adherencia.
- Seguimiento de continuidad semanal.
- Interfaz inicial para exportar información de investigación.

**Avance verificado:** se registraron correctamente 16 sesiones de entrenamiento para una asignación de prueba.

**Pendiente:** validar el ciclo completo de ejecución de una sesión, comprobar el registro real de series y finalizar las pruebas del seguimiento estadístico.

---

## 2. Objetivos

### 2.1. Objetivo general

Desarrollar una herramienta inteligente de recomendación de rutinas de ejercicio que permita analizar su influencia en la adherencia al plan de entrenamiento en clientes de un gimnasio.

### 2.2. Objetivos funcionales

1. Gestionar usuarios y permisos mediante roles.
2. Registrar perfiles físico-contextuales de los clientes.
3. Administrar un catálogo estructurado de ejercicios y rutinas.
4. Vincular clientes con entrenadores autorizados.
5. Evaluar rutinas mediante un motor recomendador.
6. Presentar recomendaciones ordenadas por compatibilidad.
7. Permitir la revisión y aprobación del entrenador.
8. Asignar rutinas aprobadas a los clientes.
9. Programar las sesiones correspondientes al plan.
10. Registrar asistencia, ausencias y duración real.
11. Registrar el cumplimiento de ejercicios y series.
12. Calcular indicadores de asistencia, cumplimiento y continuidad.
13. Presentar un resumen de adherencia por plan.
14. Exportar información para análisis estadístico.
15. Proteger las operaciones sensibles mediante validaciones y permisos.

### 2.3. Avance

Los objetivos 1 al 9 cuentan con implementaciones funcionales probadas en el entorno de desarrollo.

Los objetivos 10 al 13 cuentan con implementaciones que requieren pruebas con sesiones ejecutadas.

El objetivo 14 dispone de una sección visible en la interfaz, pero debe verificarse la exportación completa y la calidad de los datos.

El objetivo 15 requiere una auditoría de seguridad integral antes del despliegue.

---

## 3. Tecnologías utilizadas

| Tecnología | Función | Estado |
|---|---|---|
| Next.js 16.4.4 | Aplicación web y rutas API | Implementado |
| React | Componentes interactivos | Implementado |
| TypeScript | Tipado y lógica de aplicación | Implementado |
| Tailwind CSS | Diseño responsivo | Implementado |
| Supabase Auth | Autenticación | Implementado |
| Supabase PostgreSQL | Base de datos relacional | Implementado |
| PostgreSQL RLS | Restricciones de acceso | Implementado parcialmente; auditoría pendiente |
| Funciones PostgreSQL | Validaciones y operaciones controladas | Implementado |
| Python | Lenguaje del motor recomendador | Implementado |
| FastAPI | Servicio independiente de recomendaciones | Implementado |
| Reglas de elegibilidad | Filtrado de rutinas | Implementado |
| Similitud semántica | Evaluación de afinidad | Implementado |
| Lógica difusa | Ajuste gradual de compatibilidad | Incorporado |
| Git | Control de versiones | En uso |
| GitHub | Repositorio del proyecto | En uso |
| ESLint | Análisis estático | En uso |
| TypeScript Compiler | Verificación de tipos | En uso |
| Playwright | Pruebas automatizadas | Pendiente |
| Netlify/Vercel | Posible despliegue | Pendiente |

### 3.1. Consideración sobre inteligencia artificial

El sistema utiliza un motor de recomendación híbrido.

El flujo combina:

- Reglas de elegibilidad.
- Evaluación de compatibilidad.
- Similitud semántica.
- Ajustes mediante lógica difusa.
- Clasificación de alternativas.

No debe describirse como un modelo entrenado específicamente con datos del gimnasio sin contar con evidencia de ese entrenamiento.

Los puntajes de compatibilidad no representan probabilidades clínicas ni garantías de resultados.

---

## 4. Arquitectura general

El sistema se organiza en cuatro niveles.

### 4.1. Interfaz web

Desarrollada con Next.js, React y Tailwind CSS.

Incluye:

- Inicio de sesión.
- Panel del cliente.
- Perfil de entrenamiento.
- Panel del entrenador.
- Consulta de clientes asignados.
- Catálogo de ejercicios y rutinas.
- Análisis de compatibilidad.
- Revisión de recomendaciones.
- Asignación de planes.
- Calendario de entrenamiento.
- Control de asistencia.
- Registro de ejercicios y series.
- Resumen de adherencia.

### 4.2. API de Next.js

Responsabilidades:

1. Identificar al usuario autenticado.
2. Verificar el rol correspondiente.
3. Comprobar la relación entrenador-cliente.
4. Validar los datos recibidos.
5. Comunicarse con FastAPI.
6. Ejecutar operaciones autorizadas en Supabase.
7. Devolver respuestas controladas al navegador.

### 4.3. Motor recomendador

Servicio independiente desarrollado con Python y FastAPI.

Procesa el perfil del cliente y las rutinas disponibles para calcular su compatibilidad.

### 4.4. Persistencia y seguridad

Supabase proporciona:

- Autenticación.
- PostgreSQL.
- Políticas RLS.
- Funciones SQL.
- Restricciones de integridad.
- Almacenamiento de perfiles.
- Historial de revisiones.
- Asignaciones.
- Sesiones.
- Ejercicios ejecutados.
- Series registradas.

### 4.5. Flujo funcional

```text
CLIENTE
   |
   v
Registro del perfil físico-contextual
   |
   v
ENTRENADOR
   |
   v
Solicitar recomendación
   |
   v
API NEXT.JS
   |
   v
MOTOR RECOMENDADOR - FASTAPI
   |
   +-- Elegibilidad
   +-- Compatibilidad
   +-- Similitud semántica
   +-- Lógica difusa
   +-- Ranking
   |
   v
Rutinas recomendadas
   |
   v
Revisión del entrenador
   |
   +-- Aprobar
   +-- Solicitar ajustes
   +-- Rechazar
   |
   v
Rutina aprobada
   |
   v
Asignación del plan
   |
   v
Programación del calendario
   |
   v
Sesiones de entrenamiento
   |
   +-- Iniciar
   +-- Registrar ejercicios y series
   +-- Finalizar
   +-- Marcar ausencia
   +-- Cancelar
   |
   v
SEGUIMIENTO DE ADHERENCIA
   |
   +-- Asistencia
   +-- Cumplimiento
   +-- Continuidad
   |
   v
Resumen de indicadores
   |
   v
Exportación y análisis estadístico
```

**Nota:** los últimos pasos del flujo están implementados parcialmente y pendientes de validación con sesiones realizadas.

---

## 5. Roles del sistema

### 5.1. Cliente

Funciones disponibles:

- Iniciar y cerrar sesión.
- Acceder a su panel.
- Registrar y modificar su perfil.
- Consultar información propia autorizada.

Funciones pendientes o por ampliar:

- Consultar detalladamente su plan aprobado.
- Visualizar su calendario personal.
- Consultar sus ejercicios y objetivos.
- Revisar su progreso.
- Visualizar indicadores personales de adherencia.

### 5.2. Entrenador

Funciones desarrolladas:

- Acceder al panel.
- Consultar clientes asignados.
- Revisar perfiles.
- Consultar el catálogo.
- Solicitar evaluaciones del motor.
- Aprobar, rechazar o solicitar ajustes.
- Consultar el historial de decisiones.
- Asignar rutinas aprobadas.
- Programar sesiones.
- Consultar el calendario.
- Acceder al control de asistencia.
- Abrir el registro de ejercicios.
- Consultar el resumen de adherencia.

Funciones implementadas pendientes de validación completa:

- Iniciar sesiones.
- Finalizar sesiones.
- Registrar ausencias.
- Cancelar sesiones con observaciones.
- Preparar ejercicios por sesión.
- Registrar series realizadas.
- Consultar cumplimiento final.

### 5.3. Administrador

Funciones disponibles:

- Autenticación.
- Acceso a panel protegido.
- Consulta de información autorizada.

Funciones pendientes:

- Gestión integral de usuarios.
- Administración de relaciones entrenador-cliente.
- Mantenimiento del catálogo desde la interfaz.
- Auditoría administrativa.
- Reportes generales.

---

## 6. Estado de los módulos

| Módulo | Estado |
|---|---|
| Proyecto Next.js | Funcional |
| Autenticación Supabase | Funcional |
| Roles y protección de rutas | Implementado |
| Perfil del cliente | Funcional |
| Catálogo de ejercicios | Funcional en lectura |
| Catálogo de rutinas | Funcional en lectura |
| Relación entrenador-cliente | Funcional |
| Panel Mis clientes | Funcional |
| Motor FastAPI | Funcional en pruebas |
| Recomendación de rutinas | Funcional |
| Revisión del entrenador | Funcional |
| Historial de revisiones | Funcional |
| Asignación de rutina aprobada | Funcional |
| Protección contra asignaciones simultáneas | Implementado |
| Tabla de sesiones | Creada |
| Programación de sesiones | Probada |
| Calendario de 16 sesiones | Confirmado en PostgreSQL |
| API de asistencia | Implementada |
| Componente de asistencia | Implementado |
| Preparación de ejercicios por sesión | Implementada |
| Tabla de ejercicios por sesión | Creada |
| Tabla de series realizadas | Creada |
| API de ejercicios | Implementada |
| API de registro de series | Implementada |
| Interfaz de registro de ejercicios | Implementada |
| Indicadores por sesión | Implementados |
| Resumen integral de adherencia | Visible y funcional sin registros ejecutados |
| Continuidad semanal | Visible |
| Sección de exportación estadística | Visible; validación pendiente |
| Portal detallado del cliente | Pendiente |
| Pruebas automatizadas | Pendiente |
| Auditoría integral de seguridad | Pendiente |
| Despliegue de producción | Pendiente |

Los estados anteriores describen el avance observado durante el desarrollo y no constituyen una certificación de calidad o seguridad.

---

## 7. Motor recomendador híbrido

### 7.1. Objetivo

Evaluar qué rutinas son compatibles con el perfil, las condiciones y la disponibilidad del cliente.

### 7.2. Datos de entrada

El motor considera información como:

- Edad.
- IMC.
- Objetivo de entrenamiento.
- Experiencia.
- Frecuencia semanal.
- Tiempo disponible.
- Lugar de entrenamiento.
- Equipamiento.
- Restricciones registradas.

### 7.3. Procesamiento

1. **Elegibilidad:** identificar rutinas que cumplen los requisitos.
2. **Compatibilidad:** comparar el perfil con los atributos de la rutina.
3. **Similitud:** calcular afinidad semántica.
4. **Lógica difusa:** evaluar gradualmente determinadas condiciones.
5. **Ranking:** ordenar las propuestas.
6. **Explicación:** mostrar criterios al entrenador.

### 7.4. Resultados observados

En una prueba de desarrollo se evaluaron dos rutinas.

**Rutina #1: Acondicionamiento inicial - Gimnasio 4 días**

- Elegibilidad: 100/100.
- Similitud semántica: 0.910.
- Ajuste con lógica difusa: 95/100.
- Resultado: elegible.

**Rutina #2: Resistencia inicial - Gimnasio 3 días**

- Resultado: no elegible.

Los resultados corresponden a pruebas funcionales y no constituyen una validación científica de la precisión del motor.

---

## 8. Revisión de recomendaciones

El entrenador puede registrar tres decisiones:

- `aprobada`
- `rechazada`
- `ajustes_solicitados`

Tabla:

`public.revisiones_rutinas`

La tabla almacena:

- Identificador de revisión.
- Cliente.
- Entrenador.
- Rutina.
- Decisión.
- Observaciones.
- Compatibilidad.
- Método del motor.
- Fecha de revisión.

### 8.1. Protecciones

- Identificación del usuario.
- Verificación del rol de entrenador.
- Comprobación de la relación entrenador-cliente.
- Validación de la recomendación.
- Registro del historial.
- Protección frente a decisiones incompatibles con planes vigentes.

### 8.2. Evidencia

Se registró una revisión aprobada para la rutina #1.

La interfaz muestra la aprobación y el historial de decisiones correspondiente.

---

## 9. Asignación de rutinas

Tabla:

`public.asignaciones_rutinas`

Campos principales:

- `id`
- `cliente_id`
- `entrenador_id`
- `rutina_id`
- `revision_id`
- `fecha_inicio`
- `fecha_fin`
- `estado`
- `notas`
- `asignada_en`
- `actualizada_en`

### 9.1. Estados del plan

- `programada`
- `activa`
- `pausada`
- `finalizada`
- `cancelada`

### 9.2. Reglas de negocio

1. La rutina debe estar aprobada.
2. La aprobación debe corresponder al entrenador autorizado.
3. El cliente debe tener una relación válida con el entrenador.
4. La rutina debe cumplir las condiciones requeridas.
5. No debe existir una asignación vigente incompatible.
6. La asignación debe conservar la relación con la revisión.

### 9.3. Función PostgreSQL

`public.asignar_rutina_aprobada`

### 9.4. Asignación de demostración

**Asignación #1**

- Rutina: Acondicionamiento inicial - Gimnasio 4 días.
- Revisión: #1.
- Inicio: 09/11/2026.
- Fin: 06/12/2026.
- Estado: `programada`.
- Frecuencia: 4 días por semana.

Esta asignación se utiliza para verificar la programación y el seguimiento.

---

## 10. Programación de sesiones

### 10.1. Tabla principal

`public.sesiones_entrenamiento`

Campos principales:

- `id`
- `asignacion_id`
- `numero_sesion`
- `fecha_programada`
- `estado`
- `inicio_real`
- `fin_real`
- `duracion_real_min`
- `observaciones`

### 10.2. Función SQL

`public.programar_sesiones_rutina`

Permite crear las sesiones correspondientes al período y frecuencia del plan.

### 10.3. Seguridad

Se ha comprobado:

- RLS habilitado en la tabla de sesiones.
- Existencia del trigger `validar_sesion_plan`.
- Ejecución de la función de programación restringida a `service_role`.
- Uso de `SECURITY INVOKER`.

### 10.4. Interfaz

Archivo:

`app/entrenador/clientes/programar-sesiones.tsx`

Funciones:

1. Consultar fechas del plan.
2. Consultar frecuencia semanal.
3. Seleccionar días.
4. Previsualizar sesiones.
5. Confirmar programación.
6. Consultar calendario guardado.
7. Consultar estados.
8. Acceder al control de asistencia.
9. Abrir el registro de ejercicios.
10. Mostrar el resumen integral de adherencia.

### 10.5. Resultado confirmado

La programación de la asignación #1 se realizó correctamente.

| Propiedad | Resultado |
|---|---|
| Asignación | #1 |
| Sesiones registradas | 16 |
| Primera sesión | 09/11/2026 |
| Última sesión | 05/12/2026 |
| Fin del plan | 06/12/2026 |
| Frecuencia | 4 días/semana |
| Días seleccionados | Lunes, martes, jueves y sábado |
| Sesiones realizadas | 0 |
| Ausencias | 0 |
| Sesiones en curso | 0 |

Las 16 sesiones están almacenadas en PostgreSQL.

La interfaz muestra el mensaje **Calendario creado** y permite consultar las sesiones.

### 10.6. Consulta SQL de verificación

```sql
SELECT
    asignacion_id,
    COUNT(*) AS total_sesiones,
    MIN(fecha_programada) AS primera_sesion,
    MAX(fecha_programada) AS ultima_sesion
FROM public.sesiones_entrenamiento
WHERE asignacion_id = 1
GROUP BY asignacion_id;
```

Resultado observado:

```text
asignacion_id: 1
total_sesiones: 16
primera_sesion: 2026-11-09
ultima_sesion: 2026-12-05
```

**Estado:** programación confirmada.

---

## 11. Control de asistencia

### 11.1. Función SQL

`public.registrar_estado_sesion`

Acciones:

- `iniciar`
- `finalizar`
- `marcar_ausente`
- `cancelar`

### 11.2. Estados de sesión

- `programada`: pendiente de ejecución.
- `en_curso`: entrenamiento iniciado.
- `realizada`: entrenamiento finalizado.
- `ausente`: cliente no asistió.
- `cancelada`: sesión cancelada.

### 11.3. Reglas

**Iniciar**

- La sesión debe estar programada.
- Debe corresponder a la fecha actual del gimnasio.
- Se registra la hora de inicio.

**Finalizar**

- La sesión debe estar en curso.
- Debe existir una hora de inicio.
- Debe haber transcurrido al menos un minuto.
- Se registra la hora final y la duración.

**Marcar ausencia**

- La sesión debe estar programada.
- Su fecha debe haber pasado.

**Cancelar**

- La sesión debe estar programada.
- No debe cancelarse retroactivamente.
- Se exige un motivo válido.

### 11.4. Zona horaria

`America/Lima`

### 11.5. Seguridad verificada

Para `registrar_estado_sesion`:

| Propiedad | Resultado |
|---|---|
| Seguridad | SECURITY INVOKER |
| EXECUTE por authenticated | false |
| EXECUTE por service_role | true |

### 11.6. API

`app/api/sesiones/asistencia/route.ts`

Método: `POST`.

La API verifica:

1. Datos recibidos.
2. Identidad del usuario.
3. Rol de entrenador.
4. Acción solicitada.
5. Autorización de la operación.
6. Resultado de la función SQL.

### 11.7. Preparación automática de ejercicios

Al iniciar una sesión correctamente, la API intenta ejecutar:

`public.preparar_ejercicios_sesion`

Esta función prepara los ejercicios correspondientes a la rutina asignada.

Si la preparación falla después de iniciar la sesión, debe informarse el error y revisarse el estado antes de continuar.

### 11.8. Interfaz

Archivo:

`app/entrenador/clientes/control-asistencia.tsx`

Incluye:

- Estado visual.
- Fecha programada.
- Inicio.
- Finalización.
- Registro de ausencia.
- Cancelación con motivo.
- Confirmaciones.
- Mensajes de error.
- Duración real.

**Estado:** implementado; pendiente de pruebas completas con sesiones ejecutadas.

---

## 12. Registro de ejercicios y series

### 12.1. Objetivo

Registrar la ejecución de los ejercicios programados para cada sesión.

El registro permite comparar los objetivos de la rutina con las actividades realmente realizadas.

### 12.2. Tabla de ejercicios por sesión

`public.sesion_ejercicios`

Campos principales:

- `id`
- `sesion_id`
- `ejercicio_id`
- `orden`
- `series_objetivo`
- `repeticiones_objetivo`
- `duracion_objetivo_min`
- `descanso_objetivo_seg`
- `estado`
- `duracion_real_seg`
- `observaciones`
- `creado_en`
- `actualizado_en`

Estados previstos:

- `pendiente`
- `en_progreso`
- `completado`
- `omitido`

### 12.3. Tabla de series realizadas

`public.sesion_series`

Campos principales:

- `id`
- `sesion_ejercicio_id`
- `numero_serie`
- `repeticiones_realizadas`
- `duracion_real_seg`
- `peso_kg`
- `completada`
- `observaciones`
- `registrado_por`
- `creado_en`
- `actualizado_en`

### 12.4. Restricciones

Las estructuras incluyen restricciones para evitar duplicaciones.

En `sesion_ejercicios`:

- Una combinación de sesión y ejercicio no debe duplicarse.
- El orden del ejercicio dentro de la sesión debe ser único.

En `sesion_series`:

- No debe duplicarse el número de serie de un mismo ejercicio de sesión.

### 12.5. Preparación de ejercicios

Función SQL:

`public.preparar_ejercicios_sesion`

Responsabilidades:

1. Identificar la sesión.
2. Comprobar la asignación.
3. Validar los estados permitidos.
4. Consultar la composición de la rutina.
5. Copiar los objetivos de los ejercicios.
6. Evitar preparaciones duplicadas o parciales.

### 12.6. Registro de series

Función SQL:

`public.registrar_serie_ejercicio`

Permite registrar:

- Número de serie.
- Repeticiones realizadas.
- Duración real.
- Peso utilizado.
- Estado de cumplimiento.
- Observaciones.
- Usuario responsable del registro.

La función valida que la sesión esté en curso y que la serie pertenezca a un ejercicio autorizado.

### 12.7. Seguridad

Se verificó que las funciones sensibles utilicen:

- `SECURITY INVOKER`.
- Ejecución restringida a `service_role`.
- Validaciones de estado.
- Restricciones de integridad.

Las tablas tienen RLS habilitado.

Las escrituras sensibles se realizan mediante operaciones autorizadas del servidor.

### 12.8. APIs

**Consulta y preparación de ejercicios**

`app/api/sesiones/ejercicios/route.ts`

Métodos:

- `GET`: consultar ejercicios y series de una sesión.
- `POST`: preparar los ejercicios de una sesión.

**Registro de series**

`app/api/sesiones/series/route.ts`

Método:

- `POST`: registrar o actualizar una serie.

### 12.9. Interfaz

Archivo:

`app/entrenador/clientes/registro-ejercicios.tsx`

Permite consultar y registrar información de ejecución por ejercicio y serie.

El componente está integrado en el calendario mediante el botón:

**Ver ejercicios**

### 12.10. Rutina de demostración

La rutina #1 incluye los siguientes ejercicios:

| Orden | Ejercicio | Series objetivo |
|---|---|---|
| 1 | Sentadilla goblet con mancuerna | 3 |
| 2 | Press de pecho en máquina | 3 |
| 3 | Remo sentado en máquina | 3 |
| 4 | Curl de bíceps con mancuernas | 3 |
| 5 | Caminata en cinta | 1 |
| 6 | Plancha abdominal | 3 |

La caminata tiene un objetivo de duración de 15 minutos.

La plancha tiene un objetivo de duración de 1 minuto por serie.

### 12.11. Estado actual

Las tablas, funciones, APIs y componentes se encuentran implementados.

Todavía debe verificarse el registro real de las series durante una sesión iniciada.

No se deben introducir registros ficticios en las sesiones que posteriormente se utilizarán como evidencia de investigación.

---

## 13. Indicadores de cumplimiento por sesión

### 13.1. API

`app/api/sesiones/cumplimiento/route.ts`

Método: `GET`.

La API consulta:

- Sesión.
- Asignación.
- Ejercicios preparados.
- Series registradas.
- Series completadas.
- Objetivos de repeticiones.
- Objetivos de duración.

### 13.2. Indicadores

La implementación contempla:

- Ejercicios con registro.
- Ejercicios completados.
- Series objetivo.
- Series registradas.
- Series completadas.
- Repeticiones objetivo.
- Repeticiones registradas.
- Duración objetivo.
- Duración registrada.
- Cobertura de registros.
- Avance del cumplimiento.

### 13.3. Estados de evaluación

El resumen puede distinguir situaciones como:

- Sesión no iniciada.
- Sesión en curso.
- Sesión sin evidencia.
- Registro incompleto.
- Registro verificado.
- Sesión sin objetivos.
- Sesión no aplicable.

### 13.4. Interfaz

Archivo:

`app/entrenador/clientes/resumen-cumplimiento.tsx`

El componente muestra información de cumplimiento y permite actualizar los indicadores.

### 13.5. Consideración metodológica

Una serie registrada no necesariamente equivale a una serie completada.

El sistema debe conservar esta diferencia para evitar sobreestimar el cumplimiento.

La fórmula definitiva para la investigación debe documentarse antes de utilizar los resultados en pruebas de hipótesis.

---

## 14. Resumen integral de adherencia

### 14.1. Objetivo

Presentar el seguimiento del cliente mediante tres dimensiones:

1. Asistencia.
2. Cumplimiento.
3. Continuidad.

### 14.2. API

`app/api/adherencia/plan/route.ts`

Método: `GET`.

Permite consultar el resumen del plan de entrenamiento.

### 14.3. Interfaz

El resumen está integrado en:

`/entrenador/clientes`

Se presenta dentro de la sección:

**Seguimiento integral — Adherencia al plan de entrenamiento**

### 14.4. Indicadores visibles

**Asistencia**

- Sesiones realizadas.
- Ausencias.
- Sesiones pendientes vencidas.
- Porcentaje cuando existe información evaluable.

**Cumplimiento de series**

- Series completadas.
- Series objetivo evaluables.
- Porcentaje cuando existe evidencia suficiente.

**Continuidad semanal**

- Semanas verificadas.
- Semanas con asistencia.
- Seguimiento de participación durante el plan.

### 14.5. Información adicional

El panel muestra:

- Estado del calendario.
- Sesiones futuras.
- Sesiones en curso.
- Sesiones canceladas.
- Calidad del registro.
- Semanas del plan.
- Resumen de asistencia semanal.

### 14.6. Resultado observado

Para la asignación #1:

| Indicador | Estado |
|---|---|
| Sesiones programadas | 16 |
| Sesiones realizadas | 0 |
| Ausencias | 0 |
| Sesiones en curso | 0 |
| Sesiones futuras | 16 |
| Asistencia | Sin datos |
| Cumplimiento | Sin datos |
| Continuidad | Sin datos |

### 14.7. Interpretación

El estado **Sin datos** es correcto.

Las sesiones comienzan el 09/11/2026 y todavía no existen entrenamientos ejecutados.

El sistema no debe mostrar 0 % de adherencia cuando aún no existe información evaluable.

Esta distinción es importante para la calidad de los resultados de investigación.

### 14.8. Continuidad por semana

El panel identifica cuatro semanas:

| Semana | Período |
|---|---|
| 1 | 09/11/2026 al 15/11/2026 |
| 2 | 16/11/2026 al 22/11/2026 |
| 3 | 23/11/2026 al 29/11/2026 |
| 4 | 30/11/2026 al 06/12/2026 |

Actualmente todas aparecen como períodos no finalizados.

---

## 15. Exportación para análisis estadístico

### 15.1. Objetivo

Facilitar la obtención de registros estructurados para su análisis académico.

### 15.2. Interfaz

El resumen de adherencia muestra una sección denominada:

**Exportar registros para análisis estadístico**

La interfaz hace referencia a archivos CSV.

### 15.3. Variables de investigación

Se deben obtener indicadores compatibles con las dimensiones:

- Asistencia.
- Cumplimiento.
- Continuidad.

Para el análisis cuantitativo se consideran variables como:

- `pre_asistencia_pct`
- `post_asistencia_pct`
- `pre_cumplimiento_pct`
- `post_cumplimiento_pct`
- `pre_continuidad_sem`
- `post_continuidad_sem`

### 15.4. Datos experimentales

El diseño contempla:

- Grupo experimental.
- Grupo de control.
- Medición pretest.
- Medición postest.

Los campos de grupo y fase de medición deben completarse con información válida de la investigación.

### 15.5. Estado

La sección de exportación es visible.

Todavía debe comprobarse:

1. Que los archivos se generen correctamente.
2. Que las columnas coincidan con la matriz de operacionalización.
3. Que no existan registros duplicados.
4. Que las fechas y estados sean consistentes.
5. Que los valores faltantes se representen correctamente.
6. Que no se expongan datos personales innecesarios.

---

## 16. Modelo de datos

### 16.1. Usuarios

- `auth.users`
- `public.usuarios`
- `public.usuario_roles`

### 16.2. Perfiles

- `public.perfiles_clientes`

Información considerada:

- Edad.
- Peso.
- Estatura.
- IMC.
- Objetivo.
- Experiencia.
- Frecuencia.
- Duración disponible.
- Lugar.
- Equipamiento.
- Restricciones.

### 16.3. Catálogo

- `public.ejercicios`
- `public.rutinas`
- `public.rutina_ejercicios`

### 16.4. Relaciones

- `public.asignaciones_entrenadores`

### 16.5. Recomendaciones y planes

- `public.revisiones_rutinas`
- `public.asignaciones_rutinas`

### 16.6. Seguimiento

- `public.sesiones_entrenamiento`
- `public.sesion_ejercicios`
- `public.sesion_series`

### 16.7. Relaciones principales

```text
auth.users
   |
   +-- usuarios
   |
   +-- usuario_roles
   |
   +-- perfiles_clientes

entrenador
   |
   v
asignaciones_entrenadores
   |
   v
cliente
   |
   v
revisiones_rutinas
   |
   v
asignaciones_rutinas
   |
   v
sesiones_entrenamiento
   |
   v
sesion_ejercicios
   |
   v
sesion_series
```

El diagrama representa las relaciones funcionales principales; no sustituye al diagrama entidad-relación completo.

---

## 17. Seguridad

### 17.1. Controles desarrollados

- Autenticación mediante Supabase Auth.
- Protección de rutas.
- Validación de roles.
- Comprobación de relaciones entrenador-cliente.
- RLS en tablas relevantes.
- Funciones SQL para operaciones sensibles.
- Validación de parámetros.
- Control de estados.
- Restricciones de integridad.
- Protección frente a registros duplicados.

### 17.2. Uso de service_role

Las operaciones administrativas se realizan exclusivamente en el servidor.

La clave privada nunca debe enviarse al navegador.

### 17.3. Verificaciones realizadas

Se comprobaron permisos de lectura y ejecución para determinadas tablas y funciones.

Durante las pruebas de programación se detectaron errores PostgreSQL:

`42501 - permission denied`

Estos errores afectaron consultas a tablas como:

- `usuario_roles`
- `rutinas`

Después de las correcciones, la programación de 16 sesiones se completó correctamente.

Esto confirma la operación de programación probada, pero no garantiza que todos los permisos de los demás módulos estén correctamente configurados.

### 17.4. Auditoría pendiente

Revisar:

- Privilegios efectivos de las tablas.
- Políticas RLS.
- Funciones SQL.
- Acceso mediante `service_role`.
- Acceso del rol `authenticated`.
- Operaciones no autorizadas.
- Validación de propiedad de los registros.
- Pruebas de concurrencia.
- Registros de auditoría.
- Copias de seguridad.

### 17.5. Credenciales

No publicar:

- `.env.local`
- Contraseñas.
- Claves privadas de Supabase.
- Tokens.
- Credenciales administrativas.
- Datos personales reales.

---

## 18. Estructura principal del proyecto

```text
evolution-center-fit-2/
|
+-- app/
|   |
|   +-- administrador/
|   |   +-- page.tsx
|   |
|   +-- api/
|   |   |
|   |   +-- comprobar-supabase/
|   |   |   +-- route.ts
|   |   |
|   |   +-- recomendaciones/
|   |   |   +-- evaluar/route.ts
|   |   |   +-- revisar/route.ts
|   |   |   +-- historial/route.ts
|   |   |
|   |   +-- asignaciones/
|   |   |   +-- rutinas/
|   |   |       +-- route.ts
|   |   |       +-- estado/route.ts
|   |   |
|   |   +-- sesiones/
|   |   |   +-- programar/route.ts
|   |   |   +-- asistencia/route.ts
|   |   |   +-- ejercicios/route.ts
|   |   |   +-- series/route.ts
|   |   |   +-- cumplimiento/route.ts
|   |   |
|   |   +-- adherencia/
|   |       +-- plan/route.ts
|   |
|   +-- catalogo/
|   |   +-- catalogo-interactivo.tsx
|   |   +-- page.tsx
|   |
|   +-- cliente/
|   |   +-- perfil/
|   |   |   +-- formulario-perfil.tsx
|   |   |   +-- page.tsx
|   |   +-- page.tsx
|   |
|   +-- entrenador/
|   |   +-- clientes/
|   |   |   +-- page.tsx
|   |   |   +-- boton-recomendar.tsx
|   |   |   +-- revision-rutina.tsx
|   |   |   +-- asignar-rutina.tsx
|   |   |   +-- programar-sesiones.tsx
|   |   |   +-- control-asistencia.tsx
|   |   |   +-- registro-ejercicios.tsx
|   |   |   +-- resumen-cumplimiento.tsx
|   |   |   +-- resumen-adherencia.tsx
|   |   +-- page.tsx
|   |
|   +-- login/
|   |   +-- page.tsx
|   |
|   +-- globals.css
|   +-- layout.tsx
|   +-- page.tsx
|
+-- lib/
|   +-- actions/
|   |   +-- auth.ts
|   |
|   +-- supabase/
|       +-- client.ts
|       +-- proxy.ts
|       +-- server.ts
|
+-- services/
|   +-- ia/
|       +-- [archivos del servicio FastAPI]
|
+-- public/
|
+-- .env.local
+-- .gitignore
+-- package.json
+-- package-lock.json
+-- next.config.ts
+-- proxy.ts
+-- README.md
```

La estructura muestra los principales archivos identificados durante el desarrollo.

Los nombres internos del servicio Python y los componentes adicionales deben contrastarse con la carpeta local.

---

## 19. Rutas web

| Ruta | Descripción |
|---|---|
| `/` | Portada |
| `/login` | Autenticación |
| `/cliente` | Panel del cliente |
| `/cliente/perfil` | Perfil de entrenamiento |
| `/entrenador` | Panel del entrenador |
| `/entrenador/clientes` | Clientes, recomendaciones, planes y seguimiento |
| `/administrador` | Panel administrativo |
| `/catalogo` | Catálogo de ejercicios y rutinas |

---

## 20. Endpoints de Next.js

| Endpoint | Método | Función |
|---|---|---|
| `/api/recomendaciones/evaluar` | POST | Evaluar compatibilidad |
| `/api/recomendaciones/revisar` | POST | Registrar decisión |
| `/api/recomendaciones/historial` | GET | Consultar revisiones |
| `/api/asignaciones/rutinas` | POST | Asignar rutina |
| `/api/asignaciones/rutinas/estado` | GET | Consultar asignación |
| `/api/sesiones/programar` | GET | Consultar calendario |
| `/api/sesiones/programar` | POST | Programar sesiones |
| `/api/sesiones/asistencia` | POST | Registrar estado de sesión |
| `/api/sesiones/ejercicios` | GET | Consultar ejercicios y series |
| `/api/sesiones/ejercicios` | POST | Preparar ejercicios |
| `/api/sesiones/series` | POST | Registrar serie |
| `/api/sesiones/cumplimiento` | GET | Consultar cumplimiento de sesión |
| `/api/adherencia/plan` | GET | Consultar adherencia del plan |

### 20.1. Autorización

Las rutas privadas deben:

1. Obtener la identidad autenticada.
2. Comprobar el rol.
3. Validar la relación con el cliente.
4. Verificar la propiedad de la asignación.
5. Validar los datos.
6. Ejecutar únicamente operaciones autorizadas.

### 20.2. Compatibilidad con Next.js

El proyecto utiliza Next.js 16.4.4 con `cacheComponents` habilitado.

Durante el desarrollo se detectó que las declaraciones:

```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

pueden resultar incompatibles con esta configuración.

Se corrigió el problema en la ruta de adherencia afectada.

Antes de añadir nuevas configuraciones de segmento, debe comprobarse su compatibilidad con la versión y configuración actual de Next.js.

---

## 21. Instalación local

### 21.1. Requisitos

- Windows 10/11, macOS o Linux.
- Node.js.
- npm.
- Git.
- Visual Studio Code.
- Python compatible con el motor.
- Proyecto Supabase configurado.

### 21.2. Abrir el proyecto

En PowerShell:

```powershell
cd C:\Users\Denis\Proyectos\evolution-center-fit-2
```

### 21.3. Instalar dependencias

```powershell
npm ci
```

### 21.4. Configurar variables de entorno

Crear `.env.local` en la raíz.

Ejemplo sin credenciales reales:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE

SUPABASE_SECRET_KEY=TU_CLAVE_PRIVADA_DEL_SERVIDOR

IA_SERVICE_URL=http://127.0.0.1:8000
```

Si el código utiliza `SUPABASE_SERVICE_ROLE_KEY`, conservar el nombre que esperan los módulos.

No publicar claves privadas.

### 21.5. Iniciar Next.js

```powershell
npm run dev
```

Abrir:

`http://localhost:3000`

### 21.6. Iniciar el servicio de IA

El motor recomendador se ejecuta como un servicio independiente.

Dirección local utilizada:

`http://127.0.0.1:8000`

Endpoints principales:

- `/health`
- `/evaluar`

El comando exacto depende de la ubicación del módulo FastAPI dentro de `services/ia`.

Next.js y FastAPI deben estar disponibles simultáneamente para realizar nuevas evaluaciones.

### 21.7. Detener los servicios

En cada terminal:

`Ctrl + C`

---

## 22. Verificaciones técnicas

Desde la raíz del proyecto:

```powershell
npx eslint .
npx tsc --noEmit
npm run build
```

### 22.1. Verificación de módulos recientes

```powershell
npx eslint app/api/sesiones/programar/route.ts
npx eslint app/api/sesiones/asistencia/route.ts
npx eslint app/api/sesiones/ejercicios/route.ts
npx eslint app/api/sesiones/series/route.ts
npx eslint app/api/sesiones/cumplimiento/route.ts
npx eslint app/api/adherencia/plan/route.ts
```

Componentes:

```powershell
npx eslint app/entrenador/clientes/programar-sesiones.tsx
npx eslint app/entrenador/clientes/control-asistencia.tsx
npx eslint app/entrenador/clientes/registro-ejercicios.tsx
npx eslint app/entrenador/clientes/resumen-cumplimiento.tsx
npx tsc --noEmit
```

La ausencia de errores de TypeScript no garantiza el correcto funcionamiento de las funciones SQL.

También deben ejecutarse pruebas funcionales.

---

## 23. Pruebas funcionales

| Código | Caso | Estado |
|---|---|---|
| CP-01 | Inicio de sesión por rol | Probado |
| CP-02 | Protección de páginas | Implementado |
| CP-03 | Guardar perfil | Probado |
| CP-04 | Actualizar perfil | Probado |
| CP-05 | Consultar catálogo | Probado |
| CP-06 | Consultar clientes asignados | Probado |
| CP-07 | Evaluar rutina mediante FastAPI | Probado |
| CP-08 | Visualizar compatibilidad | Probado |
| CP-09 | Aprobar recomendación | Probado |
| CP-10 | Consultar historial | Probado |
| CP-11 | Asignar rutina aprobada | Probado |
| CP-12 | Impedir asignaciones vigentes duplicadas | Protección implementada |
| CP-13 | Consultar calendario | Probado |
| CP-14 | Programar 16 sesiones | Probado |
| CP-15 | Verificar sesiones en PostgreSQL | Probado |
| CP-16 | Iniciar entrenamiento | Pendiente |
| CP-17 | Finalizar entrenamiento | Pendiente |
| CP-18 | Registrar ausencia | Pendiente |
| CP-19 | Cancelar sesión | Pendiente |
| CP-20 | Consultar ejercicios de sesión | Pendiente de validación visual |
| CP-21 | Preparar ejercicios | Implementado; prueba pendiente |
| CP-22 | Registrar series | Implementado; prueba pendiente |
| CP-23 | Calcular cumplimiento por sesión | Implementado; prueba pendiente |
| CP-24 | Visualizar resumen integral | Probado sin sesiones ejecutadas |
| CP-25 | Visualizar continuidad semanal | Probado sin sesiones ejecutadas |
| CP-26 | Exportar datos estadísticos | Pendiente de validación |
| CP-27 | Pruebas automatizadas | Pendiente |
| CP-28 | Auditoría de permisos | Pendiente |
| CP-29 | Pruebas de concurrencia | Pendiente |
| CP-30 | Despliegue de producción | Pendiente |

### 23.1. Observaciones

Los casos probados corresponden a verificaciones de desarrollo.

No equivalen a una batería formal de pruebas de aceptación.

### 23.2. Datos de demostración

La asignación #1 se utiliza para comprobar el sistema.

No se deben presentar los registros de prueba como evidencia experimental real.

---

## 24. Metodología de seguimiento

### 24.1. Asistencia

La asistencia relaciona las sesiones realizadas con las sesiones evaluables.

Fórmula orientativa:

```text
Asistencia (%) =
(Sesiones realizadas / Sesiones evaluables) * 100
```

Las sesiones futuras no deben tratarse automáticamente como ausencias.

Debe documentarse cómo se consideran:

- Ausencias.
- Cancelaciones.
- Sesiones vencidas sin registro.
- Sesiones reprogramadas.
- Ausencias justificadas.

### 24.2. Cumplimiento

El cumplimiento evalúa qué proporción del entrenamiento indicado fue ejecutada.

Considera:

- Ejercicios.
- Series.
- Repeticiones.
- Duración.

Fórmula orientativa para series:

```text
Cumplimiento de series (%) =
(Series completadas / Series objetivo evaluables) * 100
```

La fórmula definitiva y sus criterios de evaluación deben estar alineados con la matriz de operacionalización de la investigación.

### 24.3. Continuidad

La continuidad representa la participación sostenida durante las semanas del plan.

Se debe definir operativamente:

- Qué constituye una semana evaluable.
- Cuándo una semana cuenta como activa.
- Cómo se registran interrupciones.
- Cómo se mide la permanencia durante la intervención.

### 24.4. Diferencia entre ausencia de datos y cero

**Sin datos:** no existe información suficiente para calcular el indicador.

**0 %:** existe información evaluable y el resultado observado es cero.

Esta distinción debe mantenerse en los reportes y exportaciones.

### 24.5. Relación con la investigación

El proyecto contempla:

- Enfoque cuantitativo.
- Tipo aplicado.
- Diseño cuasiexperimental.
- Grupo experimental.
- Grupo de control.
- Pretest.
- Postest.

La metodología prevé:

- Medición inicial durante las semanas 1 a 4.
- Medición posterior durante las semanas 9 a 12.

Los registros deberán permitir comparar los resultados entre grupos y períodos.

No deben presentarse resultados simulados como evidencia científica real.

---

## 25. Organización mediante Scrum

### Sprint 1 — Fundamentos

- Autenticación.
- Roles.
- Protección de rutas.
- Perfil físico-contextual.
- Catálogo.
- Relaciones entrenador-cliente.

**Estado:** principales funcionalidades desarrolladas.

### Sprint 2 — Motor recomendador

- FastAPI.
- Reglas de elegibilidad.
- Compatibilidad.
- Similitud.
- Lógica difusa.
- Ranking.
- Integración con Next.js.

**Estado:** prototipo funcional en pruebas.

### Sprint 3 — Supervisión y ejecución

- Revisión del entrenador.
- Historial.
- Asignación.
- Programación.
- Calendario.
- Control de asistencia.
- Preparación de ejercicios.
- Registro de series.

**Estado:** programación verificada; ejecución y registro real pendientes de pruebas.

### Sprint 4 — Adherencia y calidad

- Indicadores de asistencia.
- Indicadores de cumplimiento.
- Indicadores de continuidad.
- Resumen integral.
- Exportación estadística.
- Pruebas automatizadas.
- Auditoría.
- Despliegue.

**Estado:** resumen integral visible; validación con datos reales, pruebas y despliegue pendientes.

---

## 26. Incidencias resueltas y observaciones

### 26.1. Permisos PostgreSQL

Se detectaron errores de autorización durante la programación de sesiones.

Código:

`42501`

Mensajes observados:

- `permission denied for table usuario_roles`
- `permission denied for table rutinas`

Después de los ajustes realizados durante el desarrollo, la asignación #1 pudo generar sus 16 sesiones.

Se requiere una auditoría posterior para verificar el conjunto completo de permisos.

### 26.2. Next.js cacheComponents

Se detectaron errores de compilación al declarar configuraciones de segmento incompatibles.

Ejemplos:

- `runtime`
- `dynamic`

El problema se corrigió en la ruta de adherencia afectada.

### 26.3. React Hooks

Se detectó una advertencia de ESLint relacionada con:

`react-hooks/set-state-in-effect`

La implementación del formulario de series se ajustó para evitar la actualización de estado problemática.

### 26.4. Datos de adherencia

El panel muestra **Sin datos** cuando todavía no existen sesiones evaluables.

Este comportamiento evita interpretar como incumplimiento una actividad que aún no debía ejecutarse.

---

## 27. Limitaciones actuales

1. El proyecto es un prototipo académico.
2. No sustituye la supervisión de un entrenador.
3. El catálogo contiene datos utilizados para desarrollo.
4. El motor requiere validación adicional.
5. La programación está probada con una asignación de demostración.
6. Las transiciones de asistencia requieren pruebas completas.
7. El registro de series necesita pruebas durante sesiones reales.
8. Los indicadores aún no han sido validados con datos ejecutados.
9. La exportación estadística requiere revisión.
10. El portal detallado del cliente está pendiente.
11. La auditoría integral de seguridad no está terminada.
12. No existe un despliegue de producción validado.
13. Las migraciones SQL deben organizarse para reproducir el esquema.
14. No se dispone todavía de una batería automatizada de pruebas de aceptación.

---

## 28. Próximos pasos

### PASO 67 — Validar el registro de ejercicios

1. Abrir `/entrenador/clientes`.
2. Localizar la asignación #1.
3. Buscar la sesión #1.
4. Presionar **Ver ejercicios**.
5. Comprobar la respuesta de la API.
6. Verificar el estado de preparación de ejercicios.
7. Confirmar que los objetivos corresponden a la rutina.
8. Comprobar los mensajes de error y los permisos.

### PASO 68 — Validar una sesión real

Cuando corresponda la fecha programada:

1. Iniciar la sesión.
2. Comprobar la preparación de ejercicios.
3. Registrar series realizadas.
4. Verificar el avance del cumplimiento.
5. Finalizar la sesión.
6. Comprobar la duración registrada.
7. Revisar los indicadores de adherencia.

### PASO 69 — Portal del cliente

Desarrollar o ampliar:

- Visualización del plan aprobado.
- Calendario personal.
- Detalle de ejercicios.
- Estado de las sesiones.
- Historial de entrenamientos.
- Indicadores personales.
- Progreso semanal.

### PASO 70 — Investigación y reportes

- Validar exportaciones.
- Preparar datos pretest.
- Preparar datos postest.
- Distinguir grupos de estudio.
- Comprobar valores faltantes.
- Revisar consistencia de indicadores.
- Preparar información para Jamovi o R.

### PASO 71 — Calidad y despliegue

- Pruebas automatizadas.
- Auditoría de permisos.
- Revisión de RLS.
- Pruebas de concurrencia.
- Corrección de errores.
- Optimización.
- Documentación de instalación.
- Preparación del despliegue.
- Demostración final.

---

## 29. Control de versiones

Antes de confirmar cambios:

```powershell
git status
git diff
```

Agregar únicamente el README:

```powershell
git add README.md
```

Verificar los cambios preparados:

```powershell
git diff --cached
```

Crear el commit:

```powershell
git commit -m "docs: actualizar README hasta seguimiento de adherencia"
```

Enviar al repositorio remoto, si está configurado:

```powershell
git push
```

### Archivos que no deben publicarse

- `.env.local`
- Contraseñas.
- Claves privadas.
- Tokens.
- Datos personales reales.
- Archivos temporales.
- Entornos virtuales Python.

---

## 30. Estado general del proyecto

**Último paso completado:** PASO 66.

**Siguiente paso:** PASO 67 — Validación del registro de ejercicios.

### Última evidencia de PostgreSQL

Se confirmó:

- Asignación #1.
- 16 sesiones programadas.
- Primera sesión: 09/11/2026.
- Última sesión: 05/12/2026.
- Todas las sesiones pendientes de ejecución.

### Última evidencia de interfaz

La página `/entrenador/clientes` muestra:

- Recomendación de rutinas.
- Compatibilidad.
- Revisión aprobada.
- Plan asignado.
- Calendario creado.
- 16 sesiones registradas.
- Control de asistencia.
- Botones para consultar ejercicios.
- Resumen integral de adherencia.
- Asistencia sin datos.
- Cumplimiento sin datos.
- Continuidad sin datos.
- Seguimiento de cuatro semanas.
- Sección de exportación estadística.

### Funcionalidades principales desarrolladas

- Autenticación.
- Roles.
- Perfiles.
- Catálogo.
- Motor recomendador.
- Revisión de rutinas.
- Historial.
- Asignación de planes.
- Programación de sesiones.
- Control de asistencia.
- Estructuras de ejercicios y series.
- Registro de series.
- Cálculo de cumplimiento.
- Resumen integral de adherencia.
- Continuidad semanal.

### Funcionalidades pendientes de validación o desarrollo

- Consulta completa de ejercicios en una sesión.
- Ejecución real de entrenamientos.
- Registro y verificación de series realizadas.
- Cálculo de adherencia con evidencia real.
- Exportación estadística completa.
- Portal detallado del cliente.
- Pruebas automatizadas.
- Auditoría integral de seguridad.
- Despliegue.

---

**EVOLUTION CENTER FIT 2.0**

Proyecto universitario de desarrollo de software.  
Lima, Perú — 2026.

**Documento actualizado hasta el PASO 66 — 05/11/2026.**
