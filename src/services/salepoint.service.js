import { pool } from "../database/conexion.js"

const SalesPointService = {
    async RegisterSalePoint (data) {
        try {
            const {company, branch, user, name, warehouse} = data
            const [isUserSP] = await pool.query ( "SELECT * FROM sale_point WHERE seller = ?", [user])
            if (isUserSP.length > 0 ) {
                return { success: false, code: 501, message: "Error: El usuario ya tiene un punto de venta asignado!!"}
            }
            await pool.query (
                "INSERT INTO sale_point (company, branch, seller, name, warehouse) VALUES (?, ?, ?, ?, ?)",
                [company, branch, user, name, warehouse]
            )
            return { success: true, code: 201, message: "Punto de Venta registrada con exito!!"}
        } catch (error) {
            return { success: false, code: 501, message: "Error: No se pudo registrar el Punto de Venta", error: error.message}
        }
    },

    async AllSalePoint (company) {
        try {
            const [salesPoints] = await pool.query(
                `SELECT 
                    sp.id,
                    sp.name,
                    sp.status,
                    sp.warehouse,
                    sp.opened_at,
                    sp.closed_at,
                    b.id AS id_branch,
                    b.name AS branch,
                    u.id AS id_user,
                    u.name AS user
                FROM sale_point sp
                INNER JOIN branch b ON sp.branch = b.id
                INNER JOIN user u ON sp.seller = u.id
                WHERE sp.company = ?
                ORDER BY sp.id DESC`,
                [company]
            )
            return { success: true, code: 200, message: "Roles obtenidos con éxito", data: salesPoints}
            
        } catch (error) {
            return { success: false, code: 501, message: "Error: No se pudieron los datos de los Punto de Venta", error: error.message}
        }
    },

    async UpdateSalePoint (data) {
        try {
            const {id, branch, user, name, status, opened_at, closed_at} = data
            if (opened_at) {
                await pool.query(
                    "UPDATE sale_point SET branch = ?, user = ?, name = ?, status = ?, opened_at = ? WHERE id = ?",
                    [branch, user, name, status, opened_at, id]
                ) 
            } else if (closed_at){
                await pool.query(
                    "UPDATE sale_point SET branch = ?, user = ?, name = ?, status = ?, closed_at = ? WHERE id = ?",
                    [branch, user, name, status, closed_at, id]
                ) 
            }
           
            return { success: true, code: 200, message: "Sucursal Actualizada con exito"}
        } catch (error) {
            return { success: false, code: 501, message: "Error: No se pudo actualizar la sucursal", error: error.message }
        }
    }
}

export default SalesPointService