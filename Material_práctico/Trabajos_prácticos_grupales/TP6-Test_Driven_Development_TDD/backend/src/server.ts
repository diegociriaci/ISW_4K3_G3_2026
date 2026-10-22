import "dotenv/config";
import crearApp from "./app";
import { RelojSistema } from "./config/reloj";
import crearBaseDeDatos from "./database/sqlite";
import MercadoPagoCheckoutPro from "./integrations/mercado-pago-checkout-pro";
import MercadoPagoSimulado from "./integrations/mercado-pago-simulado";
import NotificadorMailSimulado from "./integrations/notificador-mail-simulado";
import NotificadorResend from "./integrations/notificador-resend";
import type { Notificador } from "./integrations/notificador";
import type { PasarelaPago } from "./integrations/pasarela-pago";
import CompraRepositorySQLite from "./repositories/sqlite/compra.repository.sqlite";
import UsuarioRepositorySQLite from "./repositories/sqlite/usuario.repository.sqlite";
import CalendarioService from "./services/calendario.service";
import { CompraService } from "./services/compra.service";

// Composición de dependencias de la aplicación real. Mail y pago usan los
// servicios reales si están configurados en .env, o las simulaciones de las
// FAQ 4 y 5 si no; la sesión siempre es simulada (FAQ 19).
const PUERTO = Number(process.env.PORT ?? 3000);
const URL_FRONTEND = process.env.URL_FRONTEND ?? "http://localhost:5173";
const RUTA_DB = process.env.DATABASE_PATH ?? "./data/ecoharmony.db";

// Usuario de la sesión simulada (FAQ 19)
const USUARIO_DE_PRUEBA = {
  id: 1,
  nombre: process.env.TEST_USER_NAME ?? "Visitante de prueba",
  email: process.env.TEST_USER_EMAIL ?? "visitante@ecoharmony.test",
};

const reloj = new RelojSistema();
const db = crearBaseDeDatos(RUTA_DB, USUARIO_DE_PRUEBA);
const apiKeyResend = process.env.RESEND_API_KEY;
const notificador: Notificador = apiKeyResend
  ? new NotificadorResend(
      apiKeyResend,
      process.env.RESEND_FROM ?? "EcoHarmony Park <onboarding@resend.dev>",
    )
  : new NotificadorMailSimulado(true);
// Con access token se usa Mercado Pago Checkout Pro; sin él, la simulación
const accessTokenMercadoPago = process.env.MP_ACCESS_TOKEN;
const pasarelaPago: PasarelaPago = accessTokenMercadoPago
  ? new MercadoPagoCheckoutPro({
      accessToken: accessTokenMercadoPago,
      urlRetorno: `${URL_FRONTEND}/confirmacion`,
      // Por defecto se usa el entorno de prueba: no se cobra de verdad
      entornoPrueba: process.env.MP_ENTORNO !== "produccion",
    })
  : new MercadoPagoSimulado({
      urlCheckout: `${URL_FRONTEND}/mercado-pago`,
    });
const compraRepository = new CompraRepositorySQLite(db);
const usuarioRepository = new UsuarioRepositorySQLite(db);

const app = crearApp({
  compraService: new CompraService({
    compraRepository,
    usuarioRepository,
    pasarelaPago,
    notificador,
    reloj,
  }),
  calendarioService: new CalendarioService(reloj),
});

app.listen(PUERTO, () => {
  // eslint-disable-next-line no-console
  console.info(
    `API de EcoHarmony Park escuchando en http://localhost:${PUERTO}`,
  );
});
