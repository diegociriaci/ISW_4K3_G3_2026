# TP6 – TDD: EcoHarmony Park · Comprar entradas

Implementación de la User Story **"Comprar entradas"** de EcoHarmony Park aplicando
Desarrollo Conducido por Pruebas (ciclo Red → Green → Refactor).

Ingeniería y Calidad de Software · UTN FRC · Curso 4K3 · Grupo 3 · 2026

| Documento | Contenido |
|---|---|
| [`INSTALACION_Y_EJECUCION.md`](./INSTALACION_Y_EJECUCION.md) | Guía detallada de instalación, configuración (`.env`) y ejecución |
| [`docs/TP6_Grupo_3_Documento_Justificacion_Decisiones.md`](./docs/TP6_Grupo_3_Documento_Justificacion_Decisiones.md) | Decisiones de diseño, evidencia del ciclo TDD y cobertura |

---

## Requisitos

- [Node.js](https://nodejs.org/) 22 o superior
- npm 10 o superior

## Instalación

```bash
cd backend && npm install
cd ../frontend && npm install
```

Después se crea el archivo de configuración del backend a partir de la plantilla y
se completan los valores (ver [Variables de entorno](#variables-de-entorno)):

```powershell
Copy-Item backend\.env.example backend\.env
```

## Ejecución

En dos terminales:

```bash
# Terminal 1 – API en http://localhost:3000
cd backend
npm run dev

# Terminal 2 – App web en http://localhost:5173
cd frontend
npm run dev
```

Abrir http://localhost:5173 en el navegador.

- El usuario está **mockeado** (FAQ 19): la sesión corresponde siempre al usuario
  de prueba configurado en `TEST_USER_NAME` / `TEST_USER_EMAIL`. El correo al que
  se envía la confirmación se ingresa en el formulario de compra.
- El pago con tarjeta usa **Mercado Pago Checkout Pro** si hay un
  `MP_ACCESS_TOKEN` configurado. Si no, está simulado (FAQ 4): el pago se aprueba
  y la app redirige a una pantalla "Mercado Pago – Compra exitosa".
- El **mail de confirmación** se envía con [Resend](https://resend.com) si hay una
  `RESEND_API_KEY` configurada. Si no, se simula por la consola del backend (FAQ 5).
  En ambos casos la app muestra un modal "Mail enviado a …".
- Los datos se guardan en una base **SQLite** (por defecto
  `backend/data/ecoharmony.db`), así que se conservan al reiniciar el backend.

### Variables de entorno

El backend las lee de `backend/.env` (plantilla: `backend/.env.example`). Todas son
opcionales.

| Variable | Dónde | Por defecto |
|---|---|---|
| `PORT` | backend | `3000` |
| `URL_FRONTEND` | backend (URL de redirección de Mercado Pago) | `http://localhost:5173` |
| `DATABASE_PATH` | backend (archivo SQLite) | `./data/ecoharmony.db` |
| `TEST_USER_NAME` | backend (usuario de la sesión mockeada) | `Visitante de prueba` |
| `TEST_USER_EMAIL` | backend (usuario de la sesión mockeada) | `visitante@ecoharmony.test` |
| `RESEND_API_KEY` | backend (envío real de mails) | vacío → mail simulado por consola |
| `RESEND_FROM` | backend (remitente de los mails) | `EcoHarmony Park <onboarding@resend.dev>` |
| `VITE_URL_API` | frontend | `http://localhost:3000/api` |

La API key de Resend es personal: cada integrante usa la suya y **nunca se sube al
repositorio** (`backend/.env` está en el `.gitignore`). Con el remitente
`onboarding@resend.dev`, Resend sólo entrega mails al correo de la cuenta dueña de
la API key.

## Tests y calidad de código

Disponible en `backend/` y en `frontend/`:

```bash
npm test               # ejecuta la suite una vez
npm run test:watch     # modo watch (útil para el ciclo TDD)
npm run lint           # ESLint con la guía de estilo Airbnb + Prettier
npm run typecheck      # verificación de tipos de TypeScript
```

Sólo en `backend/`:

```bash
npm run test:coverage  # reporte de cobertura (texto + HTML en coverage/)
```

## Estructura

```
├── backend/
│   ├── src/
│   │   ├── controllers/     # HTTP → service; sesión simulada (header x-usuario-id)
│   │   ├── services/        # casos de uso: compra, cotización, calendario
│   │   ├── repositories/    # interfaces + implementaciones SQLite y en memoria (tests)
│   │   ├── database/        # creación del esquema SQLite
│   │   ├── dtos/            # forma del body (zod)
│   │   ├── entities/        # TipoPase, FormaPago, Compra, Usuario, Momento…
│   │   ├── rules/           # reglas de negocio puras: precios, calendario, límites
│   │   ├── integrations/    # pasarela de pago (simulada) y notificador (Resend / simulado)
│   │   ├── config/          # Reloj (zona horaria Argentina)
│   │   ├── errors/          # errores de negocio tipados
│   │   ├── middlewares/     # errores de negocio → status HTTP
│   │   ├── utils/           # fechas y montos
│   │   ├── routes.ts · app.ts
│   │   └── server.ts        # composición de dependencias
│   └── tests/               # rules, services, adapters, api
└── frontend/
    ├── src/
    │   ├── components/      # Calendario, SelectorCantidad, FormularioVisitante…
    │   ├── pages/           # ComprarEntradas, MercadoPagoSimulado, Confirmacion
    │   ├── services/api.ts  # cliente HTTP
    │   └── styles/          # paleta FAQ 3 + fuente Lato
    └── tests/               # formulario y flujo completo (Testing Library)
```

## API

| Método y ruta | Descripción | Respuestas |
|---|---|---|
| `GET /api/calendario` | Días desde hoy hasta 1 mes después, con `habilitado` y `motivo` | 200 |
| `POST /api/compras/cotizar` | Precio de cada entrada y total | 200 · 400 · 422 |
| `POST /api/compras` | Registra la compra (requiere header `x-usuario-id`) | 201 · 400 · 401 · 402 · 422 |

Ejemplo de body de `POST /api/compras`:

```json
{
  "fechaVisita": "2026-10-20",
  "formaPago": "TARJETA",
  "entradas": [
    { "edad": 30, "tipoPase": "VIP" },
    { "edad": 8, "tipoPase": "COMUN" }
  ]
}
```

Los errores responden `{ "error": { "tipo": "ParqueCerradoError", "mensaje": "…" } }`.
