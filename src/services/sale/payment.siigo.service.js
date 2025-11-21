import SiigoConfig from "../../config/siigo.config.js"
import { pool } from "../../database/conexion.js"
import moment from "moment-timezone"

const PaymentSiigoService = {
    async All (company) {
        try {
            const client = await SiigoConfig.createClient(company)
            const response = await client.get("payment-types?document_type=FV")
            const paymentMethods = response.data

            return { code: 201, message: "Metodos de pago de siigo", data: paymentMethods}
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudieron traer los metodos de pago de siigo", error: error.message}
        }
    },

    async CreatePOS (data) {
        try {
            const {id, company, name, type, active, due_date} = data
            const created_at = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss")

            await pool.query(`
                INSERT INTO payment_method (id, company, name, type, active, due_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, company, name, type, active, due_date, created_at]
            )

            return { code: 201, message: "Metodo de pago creado exitosamente"}
        } catch (error) {
            return { code: 501, message: "ERROR: No se creo el metodo de pago", error: error.message}
        }
    },

    async AllPOS (company) {
        try {
            const [paymentMethods] = await pool.query(`SELECT * FROM payment_method WHERE company = ?`, [company])
            console.log(paymentMethods)
            return { code: 201, data: paymentMethods}
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudieron obtener los metodos de pago"}
        }
    }
}

export default PaymentSiigoService