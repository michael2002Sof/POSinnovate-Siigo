import express from "express"
import cors from "cors"
import fs from "fs"
import crypto from "crypto"
  import path from "path";

import { Conexion } from "./database/conexion.js"
import AppRoutes from "./routes/app.route.js"

const app = express();
app.init = async () => {

  // load components
  await Conexion();

  const privateKeyPath = path.join(process.cwd(), "qz-private-key.pem");
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");

  

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

  // 🔐 QZ SIGN
  app.post("/qz/sign", (req, res) => {
    const { toSign } = req.body;

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(toSign, "utf8");
    signer.end();

    const signature = signer.sign(privateKey, "base64");

    res.json({ signature });
  });

  // load routes
  app.use("/posinnovate/siigo", AppRoutes);
};

export default app;
