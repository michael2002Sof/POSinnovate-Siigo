import { pool } from "../../database/conexion.js"
import SiigoConfig from "../../config/siigo.config.js"
import moment from "moment-timezone"

const WarehouseSiigoService = {
    async All(company) {
        try {
            const client = await SiigoConfig.createClient(company)
            const response = await client.get("warehouses")
            const warehouses = response.data

            return { code: 201, data: warehouses }
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudieron traer las bodegas de siigo", error: error.message}
        }
    },

    async CreatePOS (data) {
        try {
            const {id, company, name, active, has_movements} = data
            const created_at = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss")

            await pool.query (`
                INSERT INTO warehouse (id, company, name, active, has_movements, created_at)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [id, company, name, active, has_movements, created_at]
            )

            return { code: 201, message: "Bodega registrada con exito"}
        } catch (error) {
            return { code: 501, message: "ERROR: No se registro la bodega", error: error.message}
        }
    },

    async AllPOS (company) {
        try {
            const [warehouses] = await pool.query (`SELECT * FROM warehouse WHERE company = ?`, [company])
            return { code: 201, data: warehouses}
        } catch (error) {
            console.log(error)
            return { code: 501, message: "ERROR: No se registro la bodega", error: error.message}
        }
    }
}

export default WarehouseSiigoService