import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendario from "../components/Calendario";
import FormularioVisitante, {
  type VisitanteForm,
} from "../components/FormularioVisitante";
import SelectorCantidad from "../components/SelectorCantidad";
import SelectorFormaPago from "../components/SelectorFormaPago";
import * as api from "../services/api";
import type {
  Cotizacion,
  DiaCalendario,
  EntradaSolicitada,
  FormaPago,
  ResultadoCompra,
} from "../types";
import { formatearMonto } from "../utils/formato";

const EDAD_MAXIMA = 120;

const nuevoVisitante = (): VisitanteForm => ({
  id: crypto.randomUUID(),
  edad: "",
  tipoPase: "COMUN",
});

function edadValida(edad: string): boolean {
  return /^\d+$/.test(edad) && Number(edad) <= EDAD_MAXIMA;
}

function aEntrada(visitante: VisitanteForm): EntradaSolicitada {
  return { edad: Number(visitante.edad), tipoPase: visitante.tipoPase };
}

export default function ComprarEntradas() {
  const [dias, setDias] = useState<DiaCalendario[]>([]);
  const [fechaVisita, setFechaVisita] = useState<string | null>(null);
  const [visitantes, setVisitantes] = useState<VisitanteForm[]>(() => [
    nuevoVisitante(),
  ]);
  const [formaPago, setFormaPago] = useState<FormaPago | null>(null);
  // Cotización junto con las entradas a las que corresponde, para no mostrar
  // precios desactualizados mientras llega la respuesta del servidor
  const [cotizacion, setCotizacion] = useState<{
    para: string;
    resultado: Cotizacion;
  } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Se cotizan los visitantes que ya tienen la edad completa, así los precios
  // se van actualizando a medida que se carga cada entrada
  const completos = visitantes.filter((v) => edadValida(v.edad));
  // Clave por contenido: agregar una entrada vacía no vuelve a cotizar
  const claveCotizacion = JSON.stringify(completos.map(aEntrada));
  // Entradas para enviar: sólo cuando todos los visitantes están completos
  const entradas =
    completos.length === visitantes.length ? completos.map(aEntrada) : null;

  useEffect(() => {
    api
      .obtenerCalendario()
      .then((calendario) => setDias(calendario.dias))
      .catch(() => setError("No se pudo cargar el calendario del parque"));
  }, []);

  // Los precios los calcula el servidor, que es quien conoce las reglas
  useEffect(() => {
    const entradasCompletas = JSON.parse(
      claveCotizacion,
    ) as EntradaSolicitada[];
    if (entradasCompletas.length === 0) {
      return undefined;
    }
    let vigente = true;
    api
      .cotizar(entradasCompletas)
      .then(
        (resultado) =>
          vigente && setCotizacion({ para: claveCotizacion, resultado }),
      )
      .catch(() => vigente && setCotizacion(null));
    return () => {
      vigente = false;
    };
  }, [claveCotizacion]);

  const cambiarCantidad = (cantidad: number) => {
    setVisitantes((actuales) =>
      cantidad > actuales.length
        ? [...actuales, nuevoVisitante()]
        : actuales.slice(0, cantidad),
    );
  };

  const cambiarVisitante = (cambiado: VisitanteForm) => {
    setVisitantes((actuales) =>
      actuales.map((v) => (v.id === cambiado.id ? cambiado : v)),
    );
  };

  const cotizacionVigente =
    cotizacion?.para === claveCotizacion ? cotizacion.resultado : null;

  const precioPorVisitante = new Map<string, number>();
  completos.forEach((visitante, indice) => {
    const precio = cotizacionVigente?.entradas[indice]?.precio;
    if (precio !== undefined) {
      precioPorVisitante.set(visitante.id, precio);
    }
  });

  const puedeConfirmar = Boolean(fechaVisita && formaPago && entradas);

  const irAlSiguientePaso = (resultado: ResultadoCompra) => {
    const estado = { state: { resultado } };

    if (resultado.urlRedireccion) {
      // Redirección simulada a Mercado Pago dentro de la misma app (FAQ 4)
      const { pathname, search } = new URL(resultado.urlRedireccion);
      navigate(`${pathname}${search}`, estado);
    } else {
      navigate("/confirmacion", estado);
    }
  };

  const confirmar = async () => {
    if (!fechaVisita || !formaPago || !entradas) {
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      irAlSiguientePaso(
        // El mail de confirmación lo decide el backend (usuario de la sesión)
        await api.comprar({ fechaVisita, formaPago, entradas }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo realizar la compra",
      );
      setEnviando(false);
    }
  };

  return (
    <section>
      <h2>Comprar entradas</h2>

      <Calendario
        dias={dias}
        seleccionada={fechaVisita}
        onSeleccionar={setFechaVisita}
      />

      <SelectorCantidad
        cantidad={visitantes.length}
        onCambiar={cambiarCantidad}
      />

      <fieldset className="seccion">
        <legend>Visitantes</legend>
        {visitantes.map((visitante, indice) => (
          <FormularioVisitante
            key={visitante.id}
            numero={indice + 1}
            visitante={visitante}
            precio={precioPorVisitante.get(visitante.id) ?? null}
            onCambiar={cambiarVisitante}
          />
        ))}
      </fieldset>

      <SelectorFormaPago formaPago={formaPago} onSeleccionar={setFormaPago} />

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <div className="resumen">
        {cotizacionVigente && (
          <p className="total">
            Total: {formatearMonto(cotizacionVigente.total)}
          </p>
        )}
        <button
          type="button"
          className="boton-principal"
          disabled={!puedeConfirmar || enviando}
          onClick={confirmar}
        >
          Confirmar compra
        </button>
      </div>
    </section>
  );
}
