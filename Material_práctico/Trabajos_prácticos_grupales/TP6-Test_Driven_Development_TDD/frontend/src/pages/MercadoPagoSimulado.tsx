import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { formatearMonto } from "../utils/formato";
import { obtenerResultado } from "../utils/navegacion";

// Simulación de la pasarela de Mercado Pago (FAQ 4)
export default function MercadoPagoSimulado() {
  const [parametros] = useSearchParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const monto = Number(parametros.get("monto") ?? 0);
  const resultado = obtenerResultado(state);

  const volver = () => {
    if (resultado) {
      navigate("/confirmacion", { state: { resultado } });
    } else {
      navigate("/");
    }
  };

  return (
    <section className="mercado-pago">
      <h2>Mercado Pago</h2>
      <p className="mercado-pago-estado">Compra exitosa</p>
      <p className="mercado-pago-monto">{formatearMonto(monto)}</p>
      <p>Pagaste tus entradas de EcoHarmony Park con tarjeta.</p>
      <button type="button" className="boton-mercado-pago" onClick={volver}>
        Volver a EcoHarmony Park
      </button>
    </section>
  );
}
