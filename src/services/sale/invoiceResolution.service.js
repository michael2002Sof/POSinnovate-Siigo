import { pool } from "../../database/conexion.js"

const InvoiceResolutionService = {
    async AllPOS (company) {
        try {
            const [resolutions] = await pool.query(`SELECT * FROM invoice_resolution WHERE company = ?`, [company]) 
            return { code: 201, data: resolutions}
        } catch (error) {
            return { code: 501, message: "ERROR: No se trayeron las resoluciones", error: error.message}
        }
    }
}

export default InvoiceResolutionService