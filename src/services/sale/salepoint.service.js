import { pool } from "../../database/conexion.js"

const SalesPointService = {
    async CreatePOS (data) {
        try {
            const {company, branch, user, name, warehouse, cost_center, methods} = data

            // 1. Validar que el usuario no tenga ya una caja
            const [isUserSP] = await pool.query ( "SELECT * FROM sale_point WHERE seller = ?", [user])
            if (isUserSP.length > 0 ) {
                return { success: false, code: 501, message: "Error: El usuario ya tiene un punto de venta asignado!!"}
            }

            // 2. Registrar el punto de venta
            const [insert] = await pool.query (
                "INSERT INTO sale_point (company, branch, seller, name, warehouse, cost_center) VALUES (?, ?, ?, ?, ?, ?)",
                [company, branch, user, name, warehouse, cost_center]
            )

            const salePointID = insert.insertId  // ← ID del punto recién creado

               // 3. Registrar métodos de pago permitidos para este punto de venta
            if (methods && methods.length > 0) {
                const values = methods.map(pmID => [company, salePointID, pmID])

                await pool.query(
                    `INSERT INTO sale_point_payment_method (company, sale_point, payment_method)
                    VALUES ?`,
                    [values]
                )
            }
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
                    wh.name AS warehouse_name,
                    sp.cost_center,
                    cc.name AS cost_center_name,
                    sp.opened_at,
                    sp.closed_at,
                    b.id AS branch,
                    b.name AS branch_name,
                    u.id AS user,
                    u.name AS user_name
                FROM sale_point sp
                INNER JOIN branch b ON sp.branch = b.id
                INNER JOIN user u ON sp.seller = u.id
                INNER JOIN warehouse wh ON sp.warehouse = wh.id
                INNER JOIN cost_center cc ON sp.cost_center = cc.id
                WHERE sp.company = ?
                ORDER BY sp.id DESC`,
                [company]
            )

            // Traer métodos de pago de todos los puntos
            const salePointIDs = salesPoints.map(sp => sp.id)
            if (salePointIDs.length === 0){ return { success: true, code: 200, data: [] } }

            const [methods] = await pool.query(
                `SELECT 
                    spp.sale_point,
                    pm.id,
                    pm.name
                FROM sale_point_payment_method spp
                INNER JOIN payment_method pm ON pm.id = spp.payment_method
                WHERE spp.sale_point IN (?)
                AND spp.company = ?`,
                [salePointIDs, company]
            )

            // Agregar methods: [{id, name}] a cada sale_point
            const formatted = salesPoints.map(sp => ({
                ...sp,
                methods: methods
                    .filter(m => m.sale_point === sp.id)
                    .map(m => ({ id: m.id, name: m.name }))
            }))

            return { success: true, code: 200, message: "Roles obtenidos con éxito", data: formatted}
        } catch (error) {
            return { success: false, code: 501, message: "Error: No se pudieron los datos de los Punto de Venta", error: error.message}
        }
    },

    async UpdateSalePoint (data) {
        try {
            const {id, branch, user, name, warehouse, cost_center} = data

            await pool.query(
                "UPDATE sale_point SET branch = ?, seller = ?, name = ?, warehouse = ?, cost_center = ? WHERE id = ?",
                [branch, user, name, warehouse, cost_center, id]
            ) 

            return { success: true, code: 200, message: "Sucursal Actualizada con exito"}
        } catch (error) {
            return { success: false, code: 501, message: "Error: No se pudo actualizar la sucursal", error: error.message }
        }
    }
}

export default SalesPointService