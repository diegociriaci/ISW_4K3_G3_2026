import type { FormaPago } from "../types";

const OPCIONES: { valor: FormaPago; texto: string }[] = [
  { valor: "EFECTIVO", texto: "Efectivo (en boletería)" },
  { valor: "TARJETA", texto: "Tarjeta (Mercado Pago)" },
];

interface SelectorFormaPagoProps {
  formaPago: FormaPago | null;
  onSeleccionar: (formaPago: FormaPago) => void;
}

export default function SelectorFormaPago({
  formaPago,
  onSeleccionar,
}: SelectorFormaPagoProps) {
  return (
    <fieldset className="seccion">
      <legend>Forma de pago</legend>
      <div className="formas-pago">
        {OPCIONES.map(({ valor, texto }) => (
          <label key={valor} htmlFor={`pago-${valor}`} className="forma-pago">
            <input
              id={`pago-${valor}`}
              type="radio"
              name="formaPago"
              value={valor}
              checked={formaPago === valor}
              onChange={() => onSeleccionar(valor)}
            />
            {texto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
