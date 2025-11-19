import dotenv from "dotenv"
import app from "./app.js"

dotenv.config()

const PORT = process.env.PORT

const StartServe = async () => {
    try {
        app.init();

        app.listen(PORT, () => {
            console.log(`Servidor escuchando en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("ERROR al iniciar el servidor:", error);
        process.exit(1);
    }
}

StartServe()