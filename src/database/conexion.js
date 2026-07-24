import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config()

export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

export async function Conexion(retries = 5) {
    try {
        const conn = await pool.getConnection()         // Obtiene una conexión del pool
        await conn.ping()                               // Verifica comunicación con MySQL
        conn.release()                                  // Devuelve la conexión al pool

        console.log(`MySQL conectado a ${process.env.DB_NAME}`)
    } catch (err) {
        console.log(`Error conectado MySQL`)

        if (retries <= 0) {
            logger.error("Base de datos imposible de conectar", err)
            process.exit(1)                             // Detiene la aplicación si no hay DB
        }

        console.log(`Reintentando conexión DB (${retries})...`)
        await new Promise(r => setTimeout(r, 3000))     // Espera 3 segundos

        return Conexion(retries - 1)            // Reintento recursivo
    }
}