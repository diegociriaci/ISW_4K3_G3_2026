interface ModalMailProps {
  email: string;
  onCerrar: () => void;
}

// Simulación del envío del mail de confirmación (FAQ 5)
export default function ModalMail({ email, onCerrar }: ModalMailProps) {
  return (
    <div className="modal-fondo">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-mail-titulo"
      >
        <h3 id="modal-mail-titulo">📧 Confirmación enviada</h3>
        <p>Mail enviado a {email}</p>
        <button type="button" className="boton-principal" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
