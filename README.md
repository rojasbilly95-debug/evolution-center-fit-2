EVOLUTION CENTER FIT 2.0
Sistema inteligente de recomendación de rutinas de ejercicio y seguimiento de la adherencia al plan de entrenamiento
Proyecto académico de desarrollo de software. Estado actual: prototipo funcional en desarrollo. La generación automática de recomendaciones con Python y FastAPI aún no está implementada; comenzará en el paso 51.

1. Descripción general
Evolution Center Fit 2.0 es una aplicación web orientada a gimnasios que busca personalizar las rutinas de entrenamiento y facilitar el seguimiento de la adherencia de sus clientes. Integra la información del cliente, un catálogo estructurado de ejercicios y rutinas y la supervisión de un entrenador.

El producto está diseñado para que, en una etapa posterior, un motor recomendador híbrido analice perfiles y proponga rutinas compatibles. Cada propuesta deberá pasar por la revisión y aprobación del entrenador antes de ser utilizada como plan de entrenamiento.

La adherencia será evaluada mediante tres dimensiones principales:
- Asistencia: sesiones realizadas respecto de las programadas.
- Cumplimiento: realización de los ejercicios, series, repeticiones y duración indicados.
- Continuidad: permanencia y participación a lo largo de las semanas del plan.
Alcance actual: aplicación y base de datos funcionales para autenticación, perfiles, catálogo y clientes asignados. El motor de IA, la aprobación operativa, el registro de sesiones y las métricas de adherencia siguen pendientes.
2. Objetivos
Objetivo general
Desarrollar una herramienta inteligente de recomendación de rutinas de ejercicio que permita analizar su influencia en la adherencia al plan de entrenamiento de clientes de un gimnasio.
Objetivos funcionales
1. Administrar el acceso de clientes, entrenadores y administradores mediante roles.
2. Registrar y actualizar perfiles físico-contextuales de los clientes.
3. Mantener un catálogo de ejercicios y plantillas de rutinas.
4. Asignar clientes a entrenadores autorizados.
5. Proponer rutinas personalizadas con un motor recomendador híbrido (pendiente).
6. Permitir que el entrenador revise, ajuste, apruebe o rechace propuestas (pendiente).
7. Registrar sesiones de entrenamiento y calcular indicadores de adherencia (pendiente).
8. Presentar reportes para el seguimiento y la evaluación del proyecto (pendiente).
3. Tecnologías
Tecnología	Función	Situación
Next.js (App Router)	Aplicación web y renderizado del lado del servidor	Implementado
React + TypeScript	Interfaz y lógica tipada	Implementado
Tailwind CSS	Estilos responsivos	Implementado
Supabase Auth	Autenticación y sesiones	Implementado
Supabase PostgreSQL	Base de datos relacional	Implementado
PostgreSQL RLS	Control de acceso a filas	Implementado en tablas principales; continuar pruebas
Git y GitHub	Control de versiones y respaldo del código	Implementado
Python + FastAPI	Servicio independiente del motor recomendador	Pendiente: paso 51
Sentence Transformers / embeddings	Similitud semántica	Planificado
Lógica difusa	Ajustes de compatibilidad	Planificado
pgvector	Almacenamiento y búsqueda vectorial	Planificado
Playwright	Pruebas automatizadas de interfaz	Planificado
Netlify o Vercel	Posible despliegue de la aplicación web	Pendiente de definir y configurar


Importante: usar una interfaz que mencione «IA» no significa que el motor de aprendizaje automático ya funcione. Se distinguirán los resultados de reglas deterministas de los resultados obtenidos mediante modelos de IA.
4. Roles y permisos
Cliente
- Iniciar y cerrar sesión.
- Consultar su panel personal.
- Registrar y editar su perfil de entrenamiento.
- Acceder únicamente a sus datos autorizados.
- Planificado: consultar rutinas aprobadas, registrar entrenamientos y visualizar su adherencia.
Entrenador
- Iniciar y cerrar sesión.
- Consultar su panel de entrenador.
- Ver el catálogo de ejercicios y rutinas.
- Consultar los clientes que tenga asignados y sus datos de entrenamiento autorizados.
- Planificado: solicitar recomendaciones, revisar propuestas, aprobarlas y dar seguimiento a sus clientes.
Administrador
- Iniciar sesión y acceder al panel administrativo protegido.
- Consultar el catálogo de ejercicios y rutinas.
- Planificado: gestionar altas, bajas, asignaciones, permisos, catálogo y reportes desde la aplicación.
Las operaciones administrativas sensibles todavía no se encuentran habilitadas en la interfaz. Las asignaciones y las cargas iniciales de datos se han realizado desde Supabase SQL Editor durante el desarrollo.
5. Funcionalidades implementadas y estado
Módulo	Estado	Evidencia o alcance
Proyecto Next.js y página inicial	Funcional	Servidor local en localhost:3000
Login con Supabase Auth	Funcional	Acceso con cuentas de prueba
Redirección según rol	Implementada	Rutas distintas para los tres roles
Protección de páginas	Implementada	Identidad y rol consultados en servidor
Cierre de sesión	Implementado	Acción de servidor reutilizable
Perfil del cliente (HU-01)	Funcional	Crear, consultar y actualizar; comprobado en PostgreSQL
Catálogo (HU-02)	Funcional en lectura	Ejercicios, rutinas, relaciones, búsqueda y filtros
Asignación cliente-entrenador	Funcional en pruebas	Cliente Demo asociado a Entrenador Demo
Vista «Mis clientes»	Funcional	Entrenador Demo visualiza el perfil asignado
Gestión administrativa completa	Pendiente	El panel existe, pero no todas sus operaciones
Motor recomendador (HU-03)	Pendiente	Se iniciará en el paso 51
Aprobación de rutinas (HU-04)	Pendiente	Flujo de revisión aún no implementado
Sesiones y asistencia (HU-05)	Pendiente	Registro operativo aún no implementado
Indicadores de adherencia (HU-06)	Pendiente	Asistencia, cumplimiento y continuidad
Pruebas automatizadas y despliegue	Pendiente	Por realizar antes de la entrega final


Los estados anteriores describen los avances vistos durante el desarrollo; no sustituyen una auditoría de seguridad, un conjunto completo de pruebas ni la validación del software en producción.
6. Arquitectura del sistema
                       USUARIOS
          Cliente | Entrenador | Administrador
                           |
                           v
                 APLICACIÓN NEXT.JS
            App Router + TypeScript + CSS
                           |
              +------------+------------+
              |                         |
              v                         v
       SUPABASE AUTH             SUPABASE POSTGRESQL
       Inicio de sesión          Usuarios, perfiles,
       y sesiones                asignaciones, rutinas
              |                  y ejercicios
              +------------+------------+
                           |
                  Políticas RLS
                           |
                           v
              MOTOR RECOMENDADOR (FUTURO)
                   Python + FastAPI
                           |
         Elegibilidad -> similitud -> ranking
                           |
                           v
                REVISIÓN DEL ENTRENADOR
                           |
                           v
                PLAN APROBADO (FUTURO)
                           |
                           v
          SESIONES Y ADHERENCIA (FUTURO)
El motor futuro no deberá recibir acceso administrativo irrestricto a la base de datos desde el navegador. Next.js validará la sesión, el rol y la asignación antes de enviar al servicio de recomendación los datos mínimos necesarios.
7. Estructura principal del proyecto
evolution-center-fit-2/
├── app/
│   ├── administrador/
│   │   └── page.tsx
│   ├── api/
│   │   └── comprobar-supabase/
│   │       └── route.ts
│   ├── catalogo/
│   │   ├── catalogo-interactivo.tsx
│   │   └── page.tsx
│   ├── cliente/
│   │   ├── perfil/
│   │   │   ├── formulario-perfil.tsx
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── entrenador/
│   │   ├── clientes/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── actions/
│   │   └── auth.ts
│   └── supabase/
│       ├── client.ts
│       ├── proxy.ts
│       └── server.ts
├── public/
├── .env.local              # Local; NO subir a GitHub
├── .gitignore
├── package.json
├── package-lock.json
├── proxy.ts
└── README.md
Próxima incorporación, todavía no creada:
services/
└── ia/
    ├── main.py
    └── requirements.txt
La estructura puede ampliarse conforme se implementen las historias de usuario. Si existen archivos adicionales del proyecto, no es necesario eliminarlos para ajustarse a este esquema.
8. Rutas web
Ruta	Descripción	Acceso previsto
/	Portada del proyecto	Público
/login	Inicio de sesión	Público
/cliente	Panel del cliente	Cliente autenticado
/cliente/perfil	Registro y edición del perfil	Cliente autenticado
/entrenador	Panel del entrenador	Entrenador autenticado
/entrenador/clientes	Clientes asignados	Entrenador autenticado
/administrador	Panel del administrador	Administrador autenticado
/catalogo	Catálogo de ejercicios y rutinas	Entrenador o administrador
/api/comprobar-supabase	Ruta de diagnóstico de conexión	Desarrollo; revisar antes de producción


El archivo proxy.ts contribuye a la renovación de sesiones. La autorización no depende exclusivamente del Proxy: las páginas protegidas verifican la identidad y el rol en el servidor y las consultas están sujetas a RLS.
9. Modelo de datos en Supabase
9.1. Cuentas y roles
- auth.users: cuentas gestionadas por Supabase Auth.
- public.usuarios: datos básicos de usuario, como id y nombre_completo.
- public.usuario_roles: asociación entre usuario_id y el rol (cliente, entrenador o administrador).
9.2. Perfiles de entrenamiento
La tabla public.perfiles_clientes utiliza usuario_id como clave principal. Almacena:
- edad, peso_kg, estatura_cm e imc calculado.
- objetivo y experiencia.
- frecuencia_semanal, minutos_por_sesion y lugar.
- equipamiento y restricciones opcionales.
- creado_en.
El IMC es un indicador orientativo, no un diagnóstico ni una evaluación clínica.
9.3. Catálogo de entrenamiento
- public.ejercicios: ejercicios, grupo muscular, tipo, nivel, equipamiento, lugar y estado.
- public.rutinas: plantillas con objetivo, nivel, duración, frecuencia, lugar y estado.
- public.rutina_ejercicios: relación entre rutinas y ejercicios, incluyendo orden, series, repeticiones, duración y descanso.
Datos de demostración verificados: 10 ejercicios, 2 rutinas y 10 asociaciones de rutina-ejercicio. Estos valores corresponden al catálogo de prueba y no son límites del sistema.
9.4. Asignaciones
public.asignaciones_entrenadores vincula cliente_id con entrenador_id, e incluye activa y asignado_en. El prototipo contempla un entrenador responsable por cliente y permite que un entrenador tenga varios clientes.
9.5. Tablas previstas
Más adelante se definirán tablas o estructuras para recomendaciones, aprobaciones, sesiones, asistencia, cumplimiento, continuidad, auditoría y reportes. No se deben tratar como implementadas todavía.
10. Seguridad y privacidad
- Autenticación con Supabase Auth.
- Verificación de sesión e identidad en páginas protegidas del servidor.
- Verificación del rol autorizado en PostgreSQL.
- Políticas de Row Level Security (RLS) en las tablas principales.
- Lectura del perfil propio para el cliente; acceso del entrenador limitado a sus asignaciones autorizadas.
- Uso de la clave publicable de Supabase para el cliente web.
- Exclusión de .env.local del repositorio Git.
- Prohibido incluir la service_role o cualquier clave secreta en variables con prefijo NEXT_PUBLIC_.
Pendiente antes de producción: completar pruebas de acceso negativo por rol, revisión de políticas RLS, privacidad de datos personales, registro de auditoría, validación de entradas, gestión de sesiones, copias de seguridad y retirada o protección de las rutas de diagnóstico.

Los datos físicos y las restricciones requieren tratamiento cuidadoso. Utilizar información ficticia durante el desarrollo; para datos reales serán necesarios consentimiento informado, finalidad definida, retención limitada y controles de acceso apropiados.
11. Requisitos para ejecutar la aplicación
- Windows 10/11, macOS o Linux (los comandos siguientes están escritos para PowerShell en Windows).
- Node.js y npm compatibles con la versión instalada de Next.js.
- Git.
- Visual Studio Code u otro editor.
- Proyecto de Supabase configurado y tablas creadas.
- Python, únicamente cuando se inicie el servicio de IA.
Entorno de desarrollo usado hasta ahora: Node.js 22.17.1, npm 10.9.2, Git 2.50.1 y Python 3.14.10. Los requisitos exactos de las dependencias deben verificarse en package.json y package-lock.json.
12. Instalación y ejecución local
12.1. Obtener el proyecto
Clonar el repositorio privado desde una cuenta autorizada, o abrir la copia local existente:
cd C:\Users\Denis\Proyectos\evolution-center-fit-2
12.2. Instalar dependencias de Next.js
npm ci
npm ci utiliza las versiones registradas en package-lock.json.
12.3. Configurar variables de entorno
Crear el archivo .env.local en la raíz, sin subirlo al repositorio:
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
Los valores se obtienen desde el proyecto de Supabase. No utilizar claves secretas en estas variables.

La aplicación requiere que la base de datos y las políticas estén configuradas: un clon del repositorio no reconstruye automáticamente las tablas creadas manualmente en SQL Editor. Está pendiente incorporar migraciones reproducibles al control de versiones.
12.4. Iniciar el servidor
npm run dev
Abrir http://localhost:3000 y acceder a http://localhost:3000/login para iniciar sesión.
12.5. Detener el servidor
Presionar Ctrl + C en la terminal donde se ejecuta npm run dev.
13. Verificaciones técnicas
En la raíz del proyecto:
npx tsc --noEmit
npx eslint .
npm run build
Se recomienda ejecutar la compilación con el servidor de desarrollo detenido, especialmente para evitar interferencias durante las verificaciones.

Para revisar los cambios y crear un respaldo:
git status
git add app lib proxy.ts README.md
git diff --cached --name-only
git commit -m "docs: documentar arquitectura y avances de Evolution Center Fit 2.0"
git push origin main
Antes de confirmar el commit: verificar que no se incluyan .env.local, credenciales, archivos temporales, datos personales ni .venv.
14. Datos y cuentas de prueba
Se han utilizado cuentas ficticias con los siguientes roles:
Cuenta de demostración	Rol
Cliente Demo	cliente
Entrenador Demo	entrenador
Administrador Demo	administrador


Las contraseñas se crean y administran mediante Supabase Auth; no deben anotarse en este archivo.

Como demostración, el perfil de Cliente Demo contiene objetivo de mejora de condición física, nivel principiante, disponibilidad de 4 días semanales, 60 minutos por sesión y equipamiento de mancuernas y máquinas. La vista «Mis clientes» del entrenador ha mostrado esta información a través de su asignación activa.
15. Casos de prueba recomendados
Código	Caso	Resultado esperado
CP-01	Cliente inicia sesión	Accede a /cliente
CP-02	Entrenador inicia sesión	Accede a /entrenador
CP-03	Administrador inicia sesión	Accede a /administrador
CP-04	Entrenador intenta abrir /cliente	Acceso restringido
CP-05	Cliente intenta abrir /entrenador/clientes	Acceso restringido
CP-06	Cuenta sin sesión abre ruta privada	Redirección a /login
CP-07	Cliente guarda su perfil	Registro persistente en PostgreSQL
CP-08	Cliente actualiza frecuencia/equipamiento	Cambios persistentes sin duplicación
CP-09	Entrenador abre catálogo	Lectura de ejercicios y rutinas autorizada
CP-10	Entrenador abre «Mis clientes»	Visualiza solo asignaciones activas autorizadas
CP-11	Cliente intenta consultar perfil ajeno	RLS debe impedirlo
CP-12	Se cierra sesión y se reabre una ruta privada	Se exige autenticación


Nota: varios escenarios han sido comprobados manualmente mediante capturas y consultas; otros siguen pendientes de una batería completa de pruebas automatizadas y evidencias formales.
16. Plan de desarrollo con Scrum
Sprint 1 — Fundamentos
- HU-07: autenticación, roles y protección de rutas.
- HU-01: perfil físico-contextual.
- HU-02: catálogo de ejercicios y rutinas.
Avance: principales pantallas y lecturas/escrituras construidas; quedan validaciones y operaciones administrativas.
Sprint 2 — Motor recomendador (siguiente)
- HU-03: reglas de elegibilidad.
- Servicio Python + FastAPI.
- Integración autenticada con Next.js y Supabase.
- Ranking y explicación de compatibilidad.
- Evaluación posterior de similitud semántica, embeddings y lógica difusa.
Sprint 3 — Ejecución supervisada
- HU-04: revisión y aprobación de recomendaciones por el entrenador.
- HU-05: programación, asistencia y registro de ejercicios.
Sprint 4 — Seguimiento y calidad
- HU-06: indicadores de asistencia, cumplimiento y continuidad.
- Reportes, pruebas, correcciones y preparación de la demostración.
Plan estimado: los Sprints organizan el desarrollo, pero sus fechas y alcances deben ajustarse a la planificación real del equipo.
17. Motor recomendador híbrido: diseño previsto
El servicio de recomendación se implementará por etapas:
1. Elegibilidad determinista: comprobar restricciones básicas de objetivo, nivel, tiempo, frecuencia, lugar y equipamiento.
2. Compatibilidad de contenido: comparar características del perfil con las de las rutinas.
3. Similitud semántica: explorar embeddings con Sentence Transformers para comparar descripciones y objetivos.
4. Lógica difusa: permitir ajustes graduales en variables seleccionadas.
5. Ranking explicable: ordenar alternativas y presentar motivos verificables.
6. Revisión humana: someter cada propuesta a aprobación del entrenador antes de asignarla.
Paso 51 — pendiente de iniciar: crear services/ia, instalar FastAPI y Uvicorn, definir main.py y probar inicialmente los endpoints /health y /evaluar con datos ficticios. La API no deberá exponerse públicamente sin autenticación y controles de acceso adecuados.

Las reglas de elegibilidad no constituyen por sí solas aprendizaje automático. Esta distinción se documentará en las pruebas y en la exposición académica.
18. Adherencia al plan de entrenamiento
El objetivo principal del proyecto no es únicamente recomendar rutinas, sino estudiar su relación con la adherencia.

En las etapas siguientes, el sistema recopilará datos de sesiones para calcular:
- Porcentaje de asistencia: (sesiones asistidas / sesiones programadas) × 100.
- Porcentaje de cumplimiento: (actividades completadas / actividades planificadas) × 100, con una definición operativa consistente para ejercicios, series, repeticiones y duración.
- Continuidad: número de semanas de participación durante el periodo de seguimiento, según las reglas metodológicas del estudio.
El análisis académico prevé mediciones pretest y postest, con grupo experimental y grupo de control, para evaluar cambios en la adherencia. El diseño de investigación y sus pruebas estadísticas pertenecen a la fase de evaluación y no deben confundirse con funciones ya programadas.
19. Limitaciones actuales
- El proyecto es un prototipo académico, no un servicio clínico ni un sistema de prescripción médica.
- El catálogo usa datos de demostración y no garantiza que una rutina sea apropiada para una persona específica.
- No existe todavía un motor de IA conectado al catálogo.
- No se han implementado la aprobación completa del entrenador, la programación de sesiones ni los indicadores finales.
- El proyecto todavía requiere despliegue, respaldo de base de datos, pruebas automatizadas y revisión de seguridad.
- La documentación y las migraciones SQL deben mantenerse sincronizadas con los cambios futuros de Supabase.
20. Próximas tareas inmediatas
1. Guardar este README.md y confirmar que los cambios no contienen secretos.
2. Iniciar el paso 51: entorno Python con FastAPI y primera API de elegibilidad.
3. Probar /health y /evaluar con datos ficticios.
4. Conectar el motor a la aplicación sin exponer claves administrativas.
5. Validar resultados con el entrenador y ampliar el motor híbrido progresivamente.
Evolution Center Fit 2.0 · Proyecto universitario · Lima, Perú · 2026
Estado: desarrollo activo — autenticación, perfiles, catálogo y clientes asignados funcionales; motor recomendador en planificación.