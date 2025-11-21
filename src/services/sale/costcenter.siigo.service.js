import SiigoConfig from "../../config/siigo.config.js"
import { pool } from "../../database/conexion.js"
import moment from "moment-timezone"

const CostCenterSiigoService = {
    async All (company) {
        try {
            const client = await SiigoConfig.createClient(company)
            const response = await client.get("cost-centers")
            const costCenters = response.data

            return { code: 201, message: "Centro de Costos traidos de siigo", data: costCenters}
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudo traer los centros de costo de siigo", error: error.message}
        }
    },

    async CreatePOS (data) {
        try {
            const {id, company, name, code, active} = data
            const created_at = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss")

            const [exist] = await pool.query(`SELECT * FROM cost_center WHERE id = ? LIMIT 1`, [id])
            if(exist.length > 0) {
                return { code: 501, message: "ERROR: El centro de costos ya existe"}
            }

            await pool.query(`
                INSERT INTO cost_center (id, company, name, code, active, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [id, company, name, code, active, created_at]
            )

            return { code: 201, message: "Centro de costos registrado con exito"}
        } catch (error) {
            return { code: 501, message: "ERROR: No se creo el centro de costo", error: error.message}
        }
    },

    async AllPOS (company) {
        try {
            const [cost_centers] = await pool.query(`SELECT * FROM cost_center WHERE company = ?`, [company])
            return { code: 201, data: cost_centers}
        } catch (error) {
            return { code: 501, message: "ERROR: No se obtuvieron los centros de costo", error: error.message}
        }
    }
}

export default CostCenterSiigoService