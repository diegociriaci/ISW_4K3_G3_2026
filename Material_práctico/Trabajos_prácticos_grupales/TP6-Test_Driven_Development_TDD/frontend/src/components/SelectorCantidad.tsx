export const MIN_ENTRADAS = 1;
export const MAX_ENTRADAS = 10;

interface SelectorCantidadProps {
  cantidad: number;
  onCambiar: (cantidad: number) => void;
}

export default function SelectorCantidad({
  cantidad,
  onCambiar,
}: SelectorCantidadProps) {
  return (
    <fieldset className="seccion">
      <legend>Cantidad de entradas (máximo {MAX_ENTRADAS})</legend>
      <div className="selector-cantidad">
        <button
          type="button"
          aria-label="Quitar una entrada"
          disabled={cantidad <= MIN_ENTRADAS}
          onClick={() => onCambiar(cantidad - 1)}
        >
          −
        </button>
        <output aria-label="Cantidad de entradas">{cantidad}</output>
        <button
          type="button"
          aria-label="Agregar una entrada"
          disabled={cantidad >= MAX_ENTRADAS}
          onClick={() => onCambiar(cantidad + 1)}
        >
          +
        </button>
      </div>
    </fieldset>
  );
}
