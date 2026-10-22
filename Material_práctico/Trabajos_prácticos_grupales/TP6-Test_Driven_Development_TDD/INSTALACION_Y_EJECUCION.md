# Instalacion y ejecucion

## Requisitos

Solo hace falta instalar:

- Node.js 22 o superior, que ya incluye npm.
- Git, si se va a clonar el repositorio en otra computadora.

No hace falta instalar SQLite ni un servidor de base de datos. El paquete
`better-sqlite3` crea y administra el archivo local automaticamente.

## Primera instalacion

Desde la raiz del repositorio:

```powershell
cd backend
npm install
Copy-Item .env.example .env

cd ..\frontend
npm install
```

Todas las variables se colocan en el archivo **`backend/.env`**. No se ponen en
el `.env` de la raiz ni en `frontend/`. Si el archivo no existe, se crea desde
la plantilla ejecutando, desde la raiz del repositorio:

```powershell
Copy-Item backend\.env.example backend\.env
```

Luego se abre `backend/.env` y se completan las credenciales. La API key de
Resend debe ser agregada por cada desarrollador:

```dotenv
DATABASE_PATH=./data/ecoharmony.db
TEST_USER_NAME=Nombre del visitante
TEST_USER_EMAIL=correo-registrado@example.com
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM=EcoHarmony Park <onboarding@resend.dev>
```

`onboarding@resend.dev` sirve para las primeras pruebas y normalmente solo
permite enviar al correo asociado a la cuenta de Resend. Para enviar a cualquier
visitante hay que verificar un dominio en Resend y cambiar `RESEND_FROM`, por
ejemplo a `EcoHarmony Park <entradas@midominio.com>`.

## Levantar la aplicacion

Abrir dos terminales.

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Abrir http://localhost:5173. La API queda disponible en
http://localhost:3000.

La base se crea en `backend/data/ecoharmony.db` durante el primer arranque. Las
compras y entradas persisten al reiniciar el backend. Para usar otra ubicacion,
cambiar `DATABASE_PATH`.

## Mail de confirmacion

El visitante ingresa el correo de confirmacion en el formulario. Despues de una
compra valida se envia a esa direccion:

- numero de compra;
- cantidad de entradas y fecha de visita;
- edad, tipo de pase y subtotal de cada visitante;
- forma de pago;
- total de la compra.

Si `RESEND_API_KEY` queda vacia, la aplicacion sigue funcionando y muestra el
mail simulado en la consola del backend.

La API key de Resend se obtiene en **resend.com > API Keys** y se coloca en
`RESEND_API_KEY` dentro de `backend/.env`. Con
`onboarding@resend.dev` solo se puede probar normalmente contra el correo de la
cuenta de Resend. Para enviar a cualquier direccion se debe verificar un dominio
propio.

## Pago con tarjeta (Mercado Pago Checkout Pro o simulado)

Si `MP_ACCESS_TOKEN` tiene un access token de Mercado Pago, el pago con tarjeta
usa **Checkout Pro**:

1. Al confirmar la compra, el backend registra la compra como pendiente de pago,
   crea una preferencia de pago y la app redirige a la pagina de Mercado Pago.
   Todavia no se envia el mail.
2. Al terminar de pagar, Mercado Pago vuelve a `URL_FRONTEND/confirmacion` con
   el id del pago. La app le pide al backend que confirme el pago: el backend lo
   consulta en Mercado Pago y, si esta aprobado, corresponde a la compra y cubre
   su total, confirma la compra y envia el mail de confirmacion.
3. Si el pago no se aprobo o se vuelve sin pagar, la app lo informa y no se
   envia el mail.

```dotenv
MP_ACCESS_TOKEN=APP_USR-xxxxxxxx
MP_ENTORNO=prueba
```

El access token se obtiene en **mercadopago.com.ar/developers > Tus
integraciones > (aplicacion) > Credenciales de prueba**. Con
`MP_ENTORNO=prueba` (valor por defecto) la app redirige al checkout de prueba
(sandbox) y no se cobra de verdad; con `MP_ENTORNO=produccion` usa el checkout
real.

Para pagar en el entorno de prueba hay que crear un usuario "Comprador" en
**Tus integraciones > (aplicacion) > Cuentas de prueba**, iniciar sesion en
Mercado Pago con ese usuario y pagar con una tarjeta de prueba. Con la cuenta
real de Mercado Pago el pago de prueba se rechaza.

Mercado Pago solo vuelve **automaticamente** a la app despues de pagar si
`URL_FRONTEND` es `https`. Con `http://localhost` hay que tocar "Volver al sitio"
en la pagina de Mercado Pago. Para que vuelva solo, levantar el frontend con un
certificado local y apuntar `URL_FRONTEND` a esa direccion:

```powershell
cd frontend
npm run dev:https
```

```dotenv
URL_FRONTEND=https://localhost:5173
```

La primera vez el navegador avisa que el certificado no es de confianza (es
local); hay que aceptarlo para continuar.

Si `MP_ACCESS_TOKEN` queda vacio, el pago con tarjeta esta simulado (FAQ 4): el
backend aprueba el pago simulado, registra la compra y envia el correo de
confirmacion. Despues la app redirige a la pantalla "Mercado Pago - Compra
exitosa" y, al volver, muestra la confirmacion. No hace falta ninguna
credencial de Mercado Pago.

## Verificaciones

```powershell
cd backend
npm test
npm run typecheck

cd ..\frontend
npm test
npm run build
```
