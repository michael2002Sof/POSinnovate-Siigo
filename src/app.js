import express from "express"
import cors from "cors"

import { Conexion } from "./database/conexion.js"
import AppRoutes from "./routes/app.route.js"

const app = express();
app.init = async () => {

  // load components
  await Conexion();

  // Dominios admitidos
  const allowedOrigins = [
    "http://localhost:5173",
    "https://mundocarnespos.vercel.app",
  ];

  app.use(
    cors({
        origin: (origin, callback) => {
            
        // Permite peticiones sin origin (como Postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`Bloqueado por CORS: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }

        },
        credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // load routes
  app.use("/posinnovate/siigo", AppRoutes);
};

export default app;
