import cors from "cors";
import express, { type Express } from "express";
import manejadorErrores from "./middlewares/manejador-errores";
import crearRutas, { type Servicios } from "./routes";

export default function crearApp(servicios: Servicios): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/api", crearRutas(servicios));
  app.use(manejadorErrores);

  return app;
}
