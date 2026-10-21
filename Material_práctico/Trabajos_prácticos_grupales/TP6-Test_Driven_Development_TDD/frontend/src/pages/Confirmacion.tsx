import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import ModalMail from "../components/ModalMail";
import { formatearMonto } from "../utils/formato";
import { obtenerResultado } from "../utils/navegacion";

export default function Confirmacion() {
  const { state } = useLocation();
  const resultado = obtenerResultado(state);
  const [mostrarModal, setMostrarModal] = useState(true);

  if (!resultado) {
    return <Navigate to="/" replace />;
  }

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
