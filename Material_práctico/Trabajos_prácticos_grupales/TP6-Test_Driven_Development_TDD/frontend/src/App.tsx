import { Route, Routes } from "react-router-dom";
import ComprarEntradas from "./pages/ComprarEntradas";
import Confirmacion from "./pages/Confirmacion";
import MercadoPagoSimulado from "./pages/MercadoPagoSimulado";

export default function App() {
  return (
    <>
      <header className="encabezado">
        <h1>EcoHarmony Park</h1>
      </header>
      <main className="contenido">
        <Routes>
          <Route path="/" element={<ComprarEntradas />} />
          <Route path="/mercado-pago" element={<MercadoPagoSimulado />} />
          <Route path="/confirmacion" element={<Confirmacion />} />
        </Routes>
      </main>
    </>
  );
}
