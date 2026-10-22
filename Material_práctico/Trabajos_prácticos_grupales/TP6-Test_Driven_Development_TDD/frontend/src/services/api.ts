import type {
  Calendario,
  Cotizacion,
  EntradaSolicitada,
  ResultadoCompra,
  SolicitudCompra,
} from "../types";

const URL_API = import.meta.env.VITE_URL_API ?? "http://localhost:3000/api";

// Sesión simulada (FAQ 19): el usuario logueado es siempre el de prueba
const USUARIO_ID = "1";

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      "x-usuario-id": USUARIO_ID,
      ...opciones.headers,
    },
  });
  const cuerpo = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      cuerpo?.error?.mensaje ?? "No se pudo completar la operación",
    );
  }
  return cuerpo as T;
}

export function obtenerCalendario(): Promise<Calendario> {
  return pedir<Calendario>("/calendario");
}

export function cotizar(entradas: EntradaSolicitada[]): Promise<Cotizacion> {
  return pedir<Cotizacion>("/compras/cotizar", {
    method: "POST",
    body: JSON.stringify({ entradas }),
  });
}

export function comprar(solicitud: SolicitudCompra): Promise<ResultadoCompra> {
  return pedir<ResultadoCompra>("/compras", {
    method: "POST",
    body: JSON.stringify(solicitud),
  });
}

// Al volver de Mercado Pago Checkout Pro: el backend verifica el pago y, si
// está aprobado, confirma la compra y envía el mail
export function confirmarPago(pagoId: string): Promise<ResultadoCompra> {
  return pedir<ResultadoCompra>("/compras/confirmar-pago", {
    method: "POST",
    body: JSON.stringify({ pagoId }),
  });
}
