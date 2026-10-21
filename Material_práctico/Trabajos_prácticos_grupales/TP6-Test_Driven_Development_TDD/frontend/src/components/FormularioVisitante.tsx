import type { TipoPase } from "../types";
import { formatearMonto } from "../utils/formato";

export interface VisitanteForm {
  id: string;
  edad: string;
  tipoPase: TipoPase;
}

interface FormularioVisitanteProps {
  numero: number;
  visitante: VisitanteForm;
  // Precio cotizado por el servidor; null mientras no esté disponible
  precio: number | null;
  onCambiar: (visitante: VisitanteForm) => void;
}

// Teclas que un input numérico acepta pero no forman una edad válida
const TECLAS_NO_NUMERICAS = ["-", "+", "e", "E", ".", ","];

// Cada entrada tiene su propia edad y su propio tipo de pase
export default function FormularioVisitante({
  numero,
  visitante,
  precio,
  onCambiar,
}: FormularioVisitanteProps) {
  const idEdad = `edad-${visitante.id}`;
  const idPase = `pase-${visitante.id}`;
  const idTitulo = `visitante-${visitante.id}`;

  return (
    <div className="visitante" role="group" aria-labelledby={idTitulo}>
      <div className="visitante-encabezado">
        <span id={idTitulo} className="visitante-titulo">
          Visitante {numero}
        </span>
        {precio !== null && (
          <span className="visitante-precio">
            Precio: {formatearMonto(precio)}
          </span>
        )}
      </div>
      <label htmlFor={idEdad}>
        Edad
        <input
          id={idEdad}
          type="number"
          inputMode="numeric"
          min={0}
          max={120}
          aria-label={`Edad del visitante ${numero}`}
          value={visitante.edad}
          onKeyDown={(e) => {
            if (TECLAS_NO_NUMERICAS.includes(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            // Sólo enteros no negativos (descarta "-5" pegado, decimales, etc.)
            if (/^\d*$/.test(e.target.value)) {
              // Sin ceros a la izquierda ("023" → "23"), pero "0" es válido
              const edad = e.target.value.replace(/^0+(?=\d)/, "");
              onCambiar({ ...visitante, edad });
            }
          }}
        />
      </label>
      <label htmlFor={idPase}>
        Pase
        <select
          id={idPase}
          aria-label={`Pase del visitante ${numero}`}
          value={visitante.tipoPase}
          onChange={(e) =>
            onCambiar({ ...visitante, tipoPase: e.target.value as TipoPase })
          }
        >
          <option value="COMUN">Común</option>
          <option value="VIP">VIP</option>
        </select>
      </label>
    </div>
  );
}
