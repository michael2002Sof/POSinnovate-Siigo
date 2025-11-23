import {pool} from "../../database/conexion.js"
import moment from "moment-timezone";

const CashService = {
    async CashSessionOpen (data) {
        try {
            const { sale_point, branch, opened_by, initial_cash, company } = data
            console.log(data)
            const opened_at = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss");
            const date_today = moment().tz("America/Bogota").format("YYYY-MM-DD");

            // 1. Verificar si ya existe una sesión abierta HOY para este punto de venta
            const [existing] = await pool.query(
                `SELECT id, opened_at, closed_at 
                 FROM cash_session 
                 WHERE sale_point = ? 
                 AND DATE(opened_at) = ?`,
                [sale_point, date_today]
            );

            if (existing.length > 0) {
                return { code: 409, message: "ERROR: Ya existe una sesión de caja abierta para el día de hoy.",};
            }

            // Registrar nueva sesión
            const [insert] = await pool.query(
                `INSERT INTO cash_session (sale_point, branch, opened_by, initial_cash, company, opened_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [sale_point, branch, opened_by, initial_cash, company, opened_at]
            )

            // Actualizar estado de la caja
            await pool.query(
                `UPDATE sale_point 
                 SET status = ?, opened_at = ?
                 WHERE id = ?`,
                ['open', opened_at, sale_point]
            )
            
            return { success: true, code: 201, message: "Caja abierta exitosamente.", data: { session: insert.insertId } }
            
        } catch (error) {
            return { success: false, code: 500, message: "Error al abrir la caja.", error: error.message }
        }
    },

    async CashId (company, point) {
        try {
            const opened_at = moment().tz("America/Bogota").format("YYYY-MM-DD");
            const [rows] = await pool.query (`
                SELECT id 
                FROM cash_session 
                WHERE company = ? AND sale_point = ? AND DATE(opened_at) = ? AND status = ? LIMIT 1`,
                [company, point, opened_at, 'in progress']
            )

            if (rows.length === 0) {
                return { code: 404, message: "No existe una sesión de caja abierta hoy para este punto de venta." };
            }

            return { code: 201, data: rows[0].id}
        } catch (error) {
            return { code: 501, message: "ERROR: No se obtuvo el id de sesion", error: error.message}
        }
    },

    async CashSessionClose (data) {
        try {
            const { cash_session, closed_by, sales_point } = data
            const closed_at = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss");

            await pool.query(
            `UPDATE cash_session 
                SET closed_at = ?, 
                    status = ?,
                    closed_by = ?
                WHERE id = ?`,
            [closed_at, 'finalized', closed_by, cash_session]
            );


            // Actualizar estado de la caja
            await pool.query(
                `UPDATE sale_point 
                 SET status = ?,  closed_at = ?
                 WHERE id = ?`,
                ['closed', closed_at, sales_point]
            )
            
            return { code: 201, message: "Caja cerrada exitosamente."}
            
        } catch (error) {
            return { code: 500, message: "Error al Cerrar la caja.", error: error.message }
        }
    },
};

export default CashService;