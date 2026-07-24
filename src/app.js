import express from "express"
import cors from "cors"

import { Conexion } from "./database/conexion.js"
import AppRoutes from "./routes/app.route.js"
import "./jobs/runLedger.js"

const app = express();
app.init = async () => {

  // load components
  await Conexion();

  app.use(cors({
    origin: true,
    credentials: true,
    methods: [ "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS" ],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
  }))

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // load routes
  app.use("/posinnovate/siigo", AppRoutes);
};

export default app;
