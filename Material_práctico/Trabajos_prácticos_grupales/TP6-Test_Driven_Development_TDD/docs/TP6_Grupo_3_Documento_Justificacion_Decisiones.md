<p align="center">
  Ingeniería y Calidad de Software<br />
  <strong>Trabajo Práctico N° 6: TDD</strong><br />
  Documento de justificación de decisiones de diseño<br />
  User Story: Comprar entradas (EcoHarmony Park)
</p>

**Curso:** 4K3

**Grupo:** N° 3

**Docentes:**

- Adjunto: Ing. Laura Covaro
- Auxiliares de Trabajos Prácticos: Ing. Cecilia Massano e Ing. Constanza Garnero
- Adscripto: Ezequiel Izaguirre

**Integrantes:**

| N° | Apellido y Nombre | Legajo |
|---:|---|---:|
| 1 | Caliva, Ariel Enrique | 69777 |
| 2 | Ciriaci Ribone, Diego | 70071 |
| 3 | Ferreyra, Emiliano José | 85396 |
| 4 | Mendez Bazan, Santino | 406354 |
| 5 | Miserendino, José | 90150 |
| 6 | Palacios, Matias Valentin | 94690 |
| 7 | Pohl, Santiago | 400340 |
| 8 | Pou, Tomás | 97242 |
| 9 | Rivadero, Maximiliano | 97963 |
| 10 | Romero, Victoria Micaela | 89909 |
| 11 | Silvestri, Brian | 76860 |

Córdoba, 20 de octubre de 2026

---

## 1. Introducción

En este documento explicamos las decisiones de diseño que tomamos para implementar la User Story "Comprar entradas" del enunciado de EcoHarmony Park, que es la que corresponde a los grupos impares.

La User Story dice: **COMO** visitante **QUIERO** comprar una entrada **PARA** asegurar mi visita al parque. Para desarrollarla aplicamos TDD, o sea que para cada funcionalidad primero escribimos la prueba, la hicimos fallar, después escribimos el código para que pase y por último refactorizamos (ciclo Red, Green, Refactor).

Además de las decisiones de diseño, el documento muestra la evidencia del ciclo TDD en el historial de Git, qué test cubre cada criterio de aceptación y cada prueba de usuario, y los resultados de los tests y de la cobertura.

## 2. Tecnologías utilizadas

En el TP2 habíamos elegido TypeScript como lenguaje, así que lo mantuvimos tanto para el backend como para el frontend, en modo estricto. Las herramientas que usamos son:

- **Node.js 22 y Express 5:** runtime y framework de la API. Express 5 maneja los errores de los handlers `async`, y la API se puede probar con Supertest sin levantar un servidor real.
- **Zod:** para validar la forma del body de cada request.
- **SQLite (`better-sqlite3`):** como base de datos. Es una base embebida en un archivo, no hace falta instalar un servidor, y para los tests se puede crear una base en memoria (`:memory:`).
- **Resend:** servicio para enviar el mail de confirmación. Si no hay una API key configurada, se usa un notificador simulado que imprime el mail por consola.
- **React 19, Vite y React Router:** para el frontend, que es una aplicación web responsive (FAQ 24).
- **Vitest:** para las pruebas automatizadas del backend y del frontend. Tiene modo watch, que ayuda mucho a hacer ciclos Red-Green cortos.
- **Supertest:** para probar los endpoints de la API.
- **Testing Library, user-event y jsdom:** para probar la interfaz como la usa el visitante.
- **ESLint (guía de Airbnb) y Prettier:** son las reglas de estilo que definimos en el TP2.

## 3. Estructura del proyecto

El proyecto está dividido en tres carpetas:

- **backend:** la API. Está organizada por capas (controller, service, repository) y tiene las reglas de negocio aparte, en funciones puras.
- **frontend:** la aplicación web. La pantalla principal es `ComprarEntradas`, con sus componentes para elegir la fecha, cargar los visitantes, elegir la cantidad y la forma de pago. Después tiene las pantallas de confirmación y de Mercado Pago simulado.
- **docs:** este documento. En la raíz también están el README y la guía de instalación y ejecución (`INSTALACION_Y_EJECUCION.md`).

Dentro del backend, cada carpeta tiene una responsabilidad:

| Carpeta | Responsabilidad |
|---|---|
| `entities/` | Tipos del dominio: `TipoPase`, `FormaPago`, `EntradaSolicitada`, `Compra`, `Usuario` y `Momento`. |
| `rules/` | Reglas de negocio en funciones puras (precios, calendario del parque y límites de compra). No dependen de la infraestructura. |
| `errors/` | Un error propio por cada regla que se incumple (por ejemplo `ParqueCerradoError` o `CantidadInvalidaError`). |
| `services/` | Casos de uso. Orquestan las reglas y las dependencias externas (`CompraService`, cotización y calendario). |
| `repositories/` | Interfaces de persistencia, con una implementación en SQLite (la aplicación real) y otra en memoria (tests). |
| `database/` | Creación de la base SQLite y de sus tablas, y carga del usuario de prueba. |
| `integrations/` | Interfaces de Mercado Pago y de mail, con el Mercado Pago simulado, el notificador de Resend y el notificador simulado. |
| `config/` | El `Reloj`, que da la fecha y hora actuales en la zona horaria del parque. |
| `utils/` | Funciones auxiliares para manejar fechas y formatear montos. |
| `dtos/`, `controllers/`, `routes.ts` | La capa HTTP: forma del body de cada request y endpoints. |
| `middlewares/` | Traduce los errores de negocio a códigos HTTP en un solo lugar. |
| `server.ts` | Arma las dependencias de la aplicación real. |

El funcionamiento general es así: al entrar a la pantalla de compra, el frontend le pide a la API el calendario para saber qué días deshabilitar. El usuario elige la fecha, la cantidad de entradas y completa la edad y el tipo de pase de cada visitante. A medida que carga las edades, el frontend consulta el precio de cada entrada y el total. Cuando confirma, se manda un POST con la fecha, la forma de pago, el mail y la lista de entradas. El backend valida los datos, cobra si el pago es con tarjeta, registra la compra, envía el mail de confirmación y responde con la cantidad de entradas, la fecha, el total y, si pagó con tarjeta, la URL de Mercado Pago a la que se redirige.

La API tiene tres endpoints:

| Endpoint | Para qué lo usamos |
|---|---|
| `POST /api/compras` | Registra la compra de entradas. |
| `POST /api/compras/cotizar` | Calcula el precio de cada entrada y el total sin registrar nada. |
| `GET /api/calendario` | Indica qué días se pueden elegir y por qué no se puede elegir cada uno de los otros. |

## 4. Decisiones de diseño

### 4.1 Reglas de negocio como funciones puras

Los precios, el calendario del parque y los límites de compra están en la carpeta `rules/`, en funciones que no dependen de Express, de la base ni de la hora del sistema. Así las pudimos testear directamente, pasándoles un valor y viendo qué devuelven, que es lo más cómodo para hacer TDD. Fueron además lo primero que escribimos con TDD, y el resto del sistema se construyó sobre reglas ya probadas.

Los valores de las reglas (precios, máximo de entradas, edades) los dejamos como constantes con nombre, por ejemplo `PRECIOS_BASE`, `MAX_ENTRADAS_POR_COMPRA` y `MAX_ENTRADAS_POR_USUARIO_Y_FECHA`. Los descuentos por edad los armamos como una lista de reglas, donde se aplica la primera que coincide con la edad. De esta forma, si cambia un precio o un porcentaje se modifica en un solo lugar, y agregar un descuento nuevo es agregar un elemento a la lista.

### 4.2 Inyección de dependencias por constructor

`CompraService` no crea las cosas que necesita, las recibe por el constructor: los repositorios de compras y de usuarios, la pasarela de pago, el notificador de mails y el reloj. En los tests le pasamos dobles de prueba (`vi.fn`) o los repositorios en memoria, y en `server.ts` le pasamos los repositorios de SQLite, el notificador de Resend y el Mercado Pago simulado.

Esto nos permitió verificar cosas que son difíciles de probar de otra forma, por ejemplo que si una validación falla no se cobra, no se registra la compra y no se envía el mail.

### 4.3 El tiempo como dependencia

Las reglas de fecha no consultan `new Date()`, reciben el momento actual por parámetro como un objeto con la fecha y la hora (`{ fecha: "YYYY-MM-DD", hora: "HH:mm" }`). Así ningún test depende del día en que se ejecuta, porque en cada caso se fija el "ahora", y se pueden probar casos límite como las 17:30 y las 17:31, o el fin de mes.

En la aplicación real, la clase `RelojSistema` calcula la fecha y la hora en la zona horaria de Argentina, y las fechas se manejan en UTC para evitar corrimientos por la zona horaria.

### 4.4 Errores de negocio tipados

Cada regla que se incumple lanza un error propio, que extiende de `ErrorDeNegocio`. Los tests verifican el tipo del error y no el texto del mensaje, así se puede cambiar un mensaje sin romper los tests. Un middleware traduce los errores a códigos HTTP en un solo lugar:

| Error | Cuándo se lanza | Código |
|---|---|:---:|
| `SolicitudInvalidaError` | El body no tiene el formato esperado. | 400 |
| `UsuarioNoRegistradoError` | No llega la sesión (header `x-usuario-id`) o el usuario no existe. | 401 |
| `PagoRechazadoError` | Mercado Pago rechaza el pago con tarjeta. | 402 |
| Cualquier otro error de negocio | Fecha, cantidad, edad, tipo de pase, forma de pago o límite incumplidos. | 422 |

Si todo sale bien, la API responde 201 con los datos de la compra.

### 4.5 Validación en dos niveles

Los DTOs con Zod validan solamente la forma del body y, si está mal, responden 400. Las reglas de negocio (forma de pago válida, rango de edad, tipo de pase, fechas, cantidad) se validan en `rules/` y en el servicio, y responden 422. Por ejemplo, la prueba de usuario "comprar sin seleccionar forma de pago" se resuelve con una regla de negocio probada en el servicio, sin depender de la capa HTTP.

En el frontend las validaciones sirven para que el usuario vea el problema enseguida: los días en que no se puede comprar aparecen deshabilitados en el calendario, no se puede superar las 10 entradas y el botón de confirmar está deshabilitado hasta que el formulario esté completo. Pero como a la API se le puede pegar directamente, el backend vuelve a validar todo.

### 4.6 Orden del caso de uso: validar, cobrar, registrar y notificar

`CompraService` hace las cosas siempre en este orden. Primero valida todo (usuario, forma de pago, entradas, fecha y límite acumulado). Después cobra, si el pago es con tarjeta. Después registra la compra, y recién al final envía el mail.

Lo pensamos así para que si algo falla antes de registrar no se cobre ni se mande el mail, y para que si Mercado Pago rechaza el pago no quede registrada una compra sin pagar. El mail se envía solo cuando la compra ya está registrada.

### 4.7 Pago con tarjeta (Mercado Pago)

El Product Owner permitió simular Mercado Pago (FAQ 4). La integración está detrás de la interfaz `PasarelaPago`, y la implementación `MercadoPagoSimulado` aprueba el pago y devuelve la URL de una pantalla "Mercado Pago – Compra exitosa", a la que redirige el frontend. Los datos de la tarjeta se ingresan en Mercado Pago, entonces el sistema solo envía el monto y recibe la URL de redirección.

Para probar el caso de pago rechazado, en los tests se usa una pasarela que devuelve el pago como no aprobado, y en ese caso la API responde 402. Para conectar la API real alcanza con hacer otra clase que implemente la misma interfaz, sin tocar el servicio.

### 4.8 Envío del mail de confirmación

El servicio no sabe cómo se envía el mail, solo usa la interfaz `Notificador`. En `server.ts` se elige la implementación: si hay una `RESEND_API_KEY` configurada se usa `NotificadorResend`, que envía el mail de verdad, y si no se usa `NotificadorMailSimulado`, que lo muestra por consola (FAQ 5). En los dos casos la aplicación muestra un modal "Mail enviado a …".

El mail con el resumen de la compra se arma en un archivo aparte (`resumen-compra.ts`), que también arma el mensaje con la cantidad de entradas y la fecha que se muestra al finalizar. El mail se envía también cuando el pago es en efectivo, porque el criterio de aceptación no hace distinción. El mail al que se envía se ingresa en el formulario de compra, y si no llega en la solicitud se usa el del usuario de la sesión.

### 4.9 Persistencia en SQLite y repositorios

Las compras y sus entradas se guardan en SQLite, así que se conservan al reiniciar el backend. El acceso a la base está detrás de las interfaces `CompraRepository` y `UsuarioRepository`, que tienen dos implementaciones: la de SQLite para la aplicación real y una en memoria para los tests. Los tests de la API usan la de memoria y no dependen de un archivo de base de datos, y los repositorios de SQLite se prueban aparte contra una base `:memory:`. Una compra y sus entradas se guardan en una única transacción, para que no queden compras sin sus entradas.

Las tablas que usamos son las siguientes:

| Tabla | Para qué la usamos |
|---|---|
| `usuarios` | El usuario de prueba (nombre y email, que es a donde se manda la confirmación). |
| `compras` | La compra: usuario, fecha de visita, forma de pago (efectivo o tarjeta), total y fecha de creación. |
| `entradas` | Una por cada visitante, con la edad, el tipo de pase (común o VIP) y el precio. |

Separamos compra y entrada porque la fecha de visita y la forma de pago son de toda la compra, pero la edad, el tipo de pase y el precio son de cada visitante. El precio se guarda en cada entrada para que no cambie si después se modifican las tarifas. Agregamos restricciones en la base (por ejemplo que la edad esté entre 0 y 120) y un índice por usuario y fecha, que es la consulta que hacemos para controlar el límite de 10 entradas.

Como el Product Owner permitió tener la sesión mockeada (FAQ 19), al iniciar el backend se precarga un usuario de prueba, y el usuario logueado se identifica con el header `x-usuario-id`.

### 4.10 El precio lo calcula el backend

El frontend no repite las reglas de negocio. Para mostrar el precio de cada entrada y el total a medida que se completan las edades consulta `POST /api/compras/cotizar`, y para saber qué días deshabilitar en el calendario consulta `GET /api/calendario`. Lo decidimos así para tener las reglas en un solo lugar, y porque si el precio viniera del frontend se podría modificar desde el navegador. En el pedido de compra el frontend manda solamente la edad y el tipo de pase de cada visitante.

### 4.11 Frontend probado desde el punto de vista del usuario

Los tests de la interfaz buscan los elementos por su rol y su etiqueta (`getByRole`, `getByLabelText`) y simulan interacciones reales con user-event. El cliente de la API se reemplaza por un mock. Esto además nos obligó a hacer una interfaz accesible: botones con nombre, campos con etiqueta, el modal con `role="dialog"` y los errores con `role="alert"`.

La pantalla de compra es un único formulario donde se elige la fecha en un calendario, se completan los visitantes, se elige la forma de pago y se confirma. Usa la paleta y la fuente que indicó el Product Owner (FAQ 3, fuente Lato), definidas como variables CSS. Es responsive (FAQ 24): el layout es fluido, la grilla del calendario se adapta, el formulario de cada visitante pasa a una columna en pantallas angostas y los controles táctiles miden al menos 44 px.

## 5. Supuestos

Hay algunas cosas que la User Story no especifica. Las que aclaró el Product Owner en el FAQ las tomamos de ahí, y el resto las definimos nosotros:

- El parque está cerrado los lunes, el 25 de diciembre y el 1 de enero (FAQ 1).
- La entrada común cuesta $10.000 y la VIP $20.000 (FAQ 6). La única diferencia entre los pases es el precio (FAQ 21), y el tipo de pase se elige por cada entrada, así que una compra puede mezclar VIP y común.
- Los menores de hasta 3 años no pagan. Los menores de hasta 15 años y los mayores de 60 o más pagan la mitad (FAQ 7).
- La edad tiene que ser un número entero entre 0 y 120.
- Se pueden comprar entradas desde hoy hasta el mismo día del mes siguiente, inclusive (FAQ 25). Si ese día no existe, se toma el último día del mes siguiente (por ejemplo, desde el 31/01 se puede comprar hasta el 28/02).
- Para el día de hoy se puede comprar hasta las 17:30 (FAQ 26). La fecha de hoy y la hora de corte se evalúan en hora de Argentina.
- No hay un cupo máximo de visitantes por día (FAQ 20), pero un usuario solo puede comprar 10 entradas para una fecha, ya sea en una o en varias compras (FAQ 27).
- El registro y el inicio de sesión no entran en esta User Story, así que usamos un único usuario de prueba (FAQ 19), configurable con las variables `TEST_USER_NAME` y `TEST_USER_EMAIL`.
- Mercado Pago está simulado (FAQ 4) y el mail se puede simular por consola (FAQ 5).
- La base de datos es un archivo SQLite local, que se configura con la variable `DATABASE_PATH`.

## 6. Aplicación de TDD

Para cada módulo seguimos el mismo ciclo: escribir los tests, correrlos y ver que fallen (Red), escribir el código mínimo para que pasen (Green) y después mejorar el código sin que se rompan los tests (Refactor). Para no hacer un commit por cada test, agrupamos los ciclos por módulo, y la evidencia queda en el historial de Git:

- Cada módulo empezó con un commit `test:` con sus tests. Antes de commitear corrimos la suite y verificamos que esos tests fallaran (fase Red).
- Le siguieron uno o más commits `feat:` con el código para hacerlos pasar (fase Green). Los `feat:` intermedios de un módulo pueden dejar algunos de sus tests todavía en rojo, y el último deja toda la suite en verde, con el lint y la verificación de tipos sin errores.
- En los primeros módulos (precios, calendario y servicio de compra) hicimos commits `refactor:` separados, con la suite en verde antes y después. Después, el refactor lo hicimos dentro del mismo `feat:`, para que el historial no quedara tan largo.

El ejemplo más claro es el cálculo de precios. El commit `efb4ec2` agrega 17 tests que fallan porque el archivo `rules/precios.ts` no existe todavía. El commit `63898b3` hace pasar los tests del precio según el tipo de pase, y los de descuentos y total siguen en rojo hasta `59fe06e` (descuentos por edad) y `cb1fbc1` (total de la compra). Cuando estaban todos en verde refactorizamos (`6eecdab`): los descuentos pasaron a ser una lista de reglas, como contamos en el punto 4.1.

Estos son los ciclos de cada módulo:

| Módulo | Red (`test:`) | Green (`feat:`) | Refactor |
|---|---|---|---|
| Reglas de precios | `efb4ec2` precios por tipo de pase y edad | `63898b3` precio por tipo de pase, `59fe06e` descuentos por edad, `cb1fbc1` total de la compra | `6eecdab` descuentos como lista de reglas |
| Calendario y fecha de visita | `2033073` reglas de calendario y fecha de visita | `ad7365d` días en que el parque está abierto, `4d1294e` ventana de compra y hora de corte | `29a1c01` utilidades de fechas |
| Cantidad, edad y tipo de pase | `f6183c4` reglas de cantidad, edad y tipo de pase | `42c37c6` cantidad por compra, `f1a1155` edad y pase por entrada, `003fccf` límite acumulado | — |
| Servicio de compra | `edcfdd0` servicio de compra de entradas | `7b2fce3` registrar compra validando reglas, `e11c851` pago con tarjeta y mail | `7dabcec` construcción del resumen de compra |
| Adaptadores | `a3fec76` adaptadores en memoria y simulados | `4c22bda` repositorios en memoria e integraciones simuladas | En el `feat:` |
| API | `44dda6c` endpoints de compra, cotización y calendario | `269ce0f` API de compra, cotización y calendario | En el `feat:` |
| Formulario (frontend) | `fb95eb7` formulario de compra de entradas | `36f98ac` formulario de compra de entradas | En el `feat:` |
| Confirmación y pago simulado | `3c728f6` confirmación de compra y pago simulado | `020d9b1` confirmación de compra y pago simulado | En el `feat:` |
| Precio por entrada | `8626001` precio individual de cada entrada | `cc17007` mostrar el precio individual | En el `feat:` |
| Precios en tiempo real | `2122321` actualizar precios y total al completar entradas | `9296663` actualizar precios y total al completar entradas | En el `feat:` |

Otros ejemplos de la fase Red: en el servicio de compra, `edcfdd0` agrega 15 tests, y después de `7b2fce3` quedan en rojo solo los 4 que involucran la tarjeta y el mail, que pasan en `e11c851`. En los precios en tiempo real, `2122321` reemplaza el test "no muestra precios mientras falte una edad" por los comportamientos nuevos que se pidieron, y fallan hasta `9296663`.

Algunos tests los escribimos como protección y ya pasaban cuando los escribimos. Por ejemplo, "al quitar una entrada el total se actualiza" (`2122321`) cubre un comportamiento que el código anterior ya tenía, y lo dejamos para evitar regresiones.

## 7. Pruebas

Las pruebas se corren con `npm test` en la carpeta `backend` y en la carpeta `frontend` (ambos ejecutan `vitest run`). Actualmente pasan los 130 tests: 108 del backend y 22 del frontend.

| Archivo | Qué prueba | Cant. |
|---|---|:---:|
| `tests/rules/precios.test.ts` | Precio por tipo de pase y descuentos por edad | 17 |
| `tests/rules/calendario-parque.test.ts` | Días abiertos, ventana de compra y hora de corte | 23 |
| `tests/rules/limites-compra.test.ts` | Cantidad, edad, tipo de pase y límite acumulado | 17 |
| `tests/services/compra.service.test.ts` | Caso de uso de comprar entradas | 15 |
| `tests/adapters/adaptadores.test.ts` | Repositorios en memoria e integraciones simuladas | 10 |
| `tests/adapters/sqlite.test.ts` | Repositorios de SQLite (base en memoria) | 5 |
| `tests/adapters/notificador-resend.test.ts` | Notificador de mails con Resend | 3 |
| `tests/api/api.test.ts` | Endpoints de compra, cotización y calendario | 17 |
| `tests/smoke.test.ts` | Prueba de la configuración de testing | 1 |
| `frontend/tests/formulario-compra.test.tsx` | Formulario de compra | 15 |
| `frontend/tests/flujo-compra.test.tsx` | Flujo completo de compra (efectivo y tarjeta) | 7 |
| **Total** | | **130** |

Para no depender de la base, de servicios externos ni de la hora, usamos repositorios en memoria, dobles de prueba (`vi.fn`), una base SQLite `:memory:` para los repositorios de SQLite, y un reloj fijo. También probamos los valores límite, por ejemplo 10 y 11 entradas, 17:30 y 17:31, edades de 3 y 4, de 15 y 16, y de 59 y 60 años, y el límite de un mes de anticipación (del 14/10 se puede comprar hasta el 14/11 y no el 15/11).

A continuación se muestra qué tests cubren cada criterio de aceptación:

| Criterio de aceptación | Dónde se prueba |
|---|---|
| Indicar fecha, cantidad, edad de cada visitante y tipo de pase | `limites-compra.test.ts`, `formulario-compra.test.tsx` |
| La fecha puede ser del día actual o futura | `calendario-parque.test.ts`, `api.test.ts` |
| Enviar mail de confirmación | `compra.service.test.ts`, `notificador-resend.test.ts`, `flujo-compra.test.tsx` (modal con el mail) |
| Redirigir a Mercado Pago si se paga con tarjeta | `compra.service.test.ts`, `api.test.ts`, `flujo-compra.test.tsx` |
| La fecha debe ser un día en que el parque está abierto | `calendario-parque.test.ts`, `api.test.ts`, `formulario-compra.test.tsx` |
| Seleccionar forma de pago | `compra.service.test.ts`, `api.test.ts`, `formulario-compra.test.tsx` |
| No más de 10 entradas | `limites-compra.test.ts`, `compra.service.test.ts`, `api.test.ts`, `formulario-compra.test.tsx` |
| Informar cantidad de entradas y fecha al finalizar | `compra.service.test.ts`, `flujo-compra.test.tsx` |
| Solo usuarios registrados | `compra.service.test.ts`, `api.test.ts` |

Y las pruebas de usuario del enunciado:

| Prueba de usuario | Resultado | Tests |
|---|:---:|---|
| Compra válida con tarjeta por Mercado Pago y recepción del mail | Pasa | `compra.service.test.ts`: "cobra el total en Mercado Pago, redirige y envía el mail". `api.test.ts`: "con tarjeta responde la URL de Mercado Pago". `flujo-compra.test.tsx`: "redirige a Mercado Pago, que informa la compra exitosa" y "al volver de Mercado Pago muestra la confirmación y el mail enviado". |
| Comprar sin seleccionar forma de pago | Falla | `compra.service.test.ts`: "rechaza una compra sin forma de pago". `api.test.ts` (422). `formulario-compra.test.tsx`: el botón de confirmar está deshabilitado sin forma de pago. |
| Comprar para una fecha en que el parque está cerrado | Falla | `compra.service.test.ts`: "rechaza una fecha en la que el parque está cerrado". `api.test.ts` (422). `formulario-compra.test.tsx`: se deshabilitan los días en que no se puede comprar. |
| Comprar más de 10 entradas | Falla | `compra.service.test.ts`: "rechaza una compra de más de 10 entradas". `api.test.ts` (422). `formulario-compra.test.tsx`: "no permite superar las 10 entradas". |

Por último, medimos la cobertura del backend con `npm run test:coverage`:

| Métrica | Cobertura |
|---|:---:|
| Sentencias | 89,9 % |
| Ramas | 72,7 % |
| Funciones | 96,3 % |
| Líneas | 90,2 % |

Las reglas, las entidades, los errores, los repositorios (en memoria y SQLite), los controllers, el notificador de Resend y los servicios de compra y cotización tienen 100 % de cobertura. Lo que no está cubierto es:

- `server.ts`: es donde se arman las dependencias de la aplicación real, y lo verificamos levantando el servidor a mano.
- `manejador-errores.ts`: las ramas de JSON mal formado y de error inesperado (500) no tienen test automatizado. El caso de JSON mal formado lo verificamos manualmente.
- Detalles menores: la impresión por consola del mail simulado, la creación de la carpeta de la base de datos, el valor por defecto del reloj y la rama del servicio de calendario que relanza un error que no es de negocio.

## 8. Estándar de código

Usamos las reglas que definimos en el TP2: ESLint con la configuración de Airbnb y Prettier para el formato (con `trailingComma: all`). Los nombres de funciones, variables y archivos están en español para que coincidan con los términos de la User Story (por ejemplo `validarFechaVisita` o `calcularPrecioEntrada`). Usamos camelCase para variables y funciones, PascalCase para clases, tipos y componentes, y mayúsculas para las constantes. Los nombres de los tests describen lo que se espera que pase.

Hicimos solamente algunas excepciones a la guía, acotadas y justificadas:

- `max-classes-per-file` está desactivada solo en la carpeta `errors/`, porque los errores de negocio son clases mínimas y los agrupamos en un único archivo.
- `react/react-in-jsx-scope` y `react/jsx-uses-react` están desactivadas, porque con el JSX runtime automático de React 17 o superior no hace falta importar React.
- `no-console` está permitido puntualmente en el notificador de mails simulado, donde la consola es justamente el envío simulado.

## 9. Pendientes y mejoras

Algunas cosas que quedaron simuladas o que se podrían mejorar más adelante:

- Agregar registro e inicio de sesión para tomar el usuario real en vez del usuario de prueba.
- Conectar con la API real de Mercado Pago.
- Hacer atómico el cobro y el registro: hoy se cobra antes de registrar la compra, y si el registro fallara después de un cobro aprobado no hay una reversión del pago.
- Hacer atómico el control del límite de 10 entradas por usuario y fecha: se consulta cuántas entradas ya compró el usuario y después se guarda, y dos compras simultáneas podrían superar el límite. Se resolvería haciendo la consulta y el guardado dentro de la misma transacción.
- Agregar tests automáticos para los errores inesperados (500) y para el JSON mal formado del middleware de errores.
- Cargar los feriados desde la base de datos o un archivo de configuración, en vez de tenerlos como constantes en el código.
