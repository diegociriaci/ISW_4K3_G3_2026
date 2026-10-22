import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import ModalMail from "../components/ModalMail";
import * as api from "../services/api";
import type { ResultadoCompra } from "../types";
import { formatearMonto } from "../utils/formato";
import { obtenerResultado } from "../utils/navegacion";

// Mercado Pago Checkout Pro vuelve a esta pantalla con el id del pago en la
// URL ("null" si el comprador volvió sin pagar)
function obtenerPagoId(search: string): string | null {
  const pagoId = new URLSearchParams(search).get("payment_id");
  return pagoId && pagoId !== "null" ? pagoId : null;
}

export default function Confirmacion() {
  const { state, search } = useLocation();
  const pagoId = obtenerPagoId(search);
  const volvioDeMercadoPago = new URLSearchParams(search).has("payment_id");
  const [resultado, setResultado] = useState<ResultadoCompra | null>(() =>
    obtenerResultado(state),
  );
  const [error, setError] = useState<string | null>(null);
  const [mostrarModal, setMostrarModal] = useState(true);
  // El pago se confirma una sola vez aunque el efecto se ejecute de nuevo
  const confirmacionPedida = useRef(false);

  useEffect(() => {
    if (resultado || !pagoId || confirmacionPedida.current) {
      return;
    }
    confirmacionPedida.current = true;
    api
      .confirmarPago(pagoId)
      .then(setResultado)
      .catch((e: unknown) =>
        setError(
          e instanceof Error ? e.message : "No se pudo confirmar el pago",
        ),
      );
  }, [resultado, pagoId]);

  if (resultado) {
    return (
      <section className="seccion confirmacion">
        <h2>¡Compra confirmada!</h2>
        <p className="confirmacion-mensaje">{resultado.mensaje}</p>
        <p>Total: {formatearMonto(resultado.total)}</p>
        <p>
          Código de compra: <strong>#{resultado.compraId}</strong>. Presentá el
          mail de confirmación al ingresar al parque.
        </p>
        <Link to="/" className="boton-principal">
          Comprar más entradas
        </Link>

        {mostrarModal && (
          <ModalMail
            email={resultado.emailConfirmacion}
            onCerrar={() => setMostrarModal(false)}
          />
        )}
      </section>
    );
  }

  if (!volvioDeMercadoPago) {
    return <Navigate to="/" replace />;
  }

  if (pagoId && !error) {
    return (
      <section className="seccion confirmacion">
        <p className="confirmacion-mensaje">Confirmando tu pago…</p>
      </section>
    );
  }

  return (
    <section className="seccion confirmacion">
      <h2>No se pudo confirmar la compra</h2>
      <p role="alert" className="error">
        {error ?? "El pago no se completó"}
      </p>
      <Link to="/" className="boton-principal">
        Volver a comprar entradas
      </Link>
    </section>
  );
}
