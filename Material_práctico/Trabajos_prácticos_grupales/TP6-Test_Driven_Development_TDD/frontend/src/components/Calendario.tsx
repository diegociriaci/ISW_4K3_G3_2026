import type { DiaCalendario } from "../types";
import { formatearFecha, nombreDelDia } from "../utils/formato";

interface CalendarioProps {
  dias: DiaCalendario[];
  seleccionada: string | null;
  onSeleccionar: (fecha: string) => void;
}

// Los días en que no se puede comprar se muestran deshabilitados (FAQ 2)
export default function Calendario({
  dias,
  seleccionada,
  onSeleccionar,
}: CalendarioProps) {
  return (
    <fieldset className="seccion">
      <legend>Fecha de visita</legend>
      <div className="calendario">
        {dias.map(({ fecha, habilitado, motivo }) => {
          const dia = nombreDelDia(fecha);
          return (
            <button
              key={fecha}
              type="button"
              className={`dia ${fecha === seleccionada ? "dia-seleccionado" : ""}`}
              disabled={!habilitado}
              title={motivo}
              aria-pressed={fecha === seleccionada}
              aria-label={`${dia} ${formatearFecha(fecha)}`}
              onClick={() => onSeleccionar(fecha)}
            >
              <span className="dia-semana">{dia.slice(0, 3)}</span>
              <span className="dia-numero">{fecha.slice(8)}</span>
              <span className="dia-mes">{fecha.slice(5, 7)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
