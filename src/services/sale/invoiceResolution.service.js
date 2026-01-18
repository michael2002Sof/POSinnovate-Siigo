import { pool } from "../../database/conexion.js"

const InvoiceResolutionService = {
    async Create (data) {
        try {
            const {siigo_id, company, sale_point, cost_center_default, code, name, type, electronic_type, active, description} = data

            await pool.query (`
                INSERT INTO invoice_resolution (siigo_id, company, sale_point, cost_center, code, name, type, electronic_type, active, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [siigo_id, company, sale_point, cost_center_default, code, name, type, electronic_type, active, description]
            )
            return {code: 200, message: "Resolución registrada con Exito"}
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudo crear la resolucion", error: error.message}
        }
    },
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