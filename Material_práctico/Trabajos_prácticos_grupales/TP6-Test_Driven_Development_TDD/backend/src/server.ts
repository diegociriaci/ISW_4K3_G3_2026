import "dotenv/config";
import crearApp from "./app";
import { RelojSistema } from "./config/reloj";
import crearBaseDeDatos from "./database/sqlite";
import MercadoPagoSimulado from "./integrations/mercado-pago-simulado";
import NotificadorMailSimulado from "./integrations/notificador-mail-simulado";
import NotificadorResend from "./integrations/notificador-resend";
import type { Notificador } from "./integrations/notificador";
import CompraRepositorySQLite from "./repositories/sqlite/compra.repository.sqlite";
import UsuarioRepositorySQLite from "./repositories/sqlite/usuario.repository.sqlite";
import CalendarioService from "./services/calendario.service";
import { CompraService } from "./services/compra.service";

// Composición de dependencias de la aplicación real (con adaptadores
// simulados, según FAQ 4, 5 y 19).
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
const pasarelaPago = new MercadoPagoSimulado({
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
