import { pool } from "../database/conexion.js"

const BranchService = {
    async Create (data) {
        try {
            const {company, name, address, city, department, country} = data

            const [exist] = await pool.query (`SELECT * FROM branch WHERE name = ? LIMIT 1`, [name])
            if (exist.length > 0) {
                return { code: 500, message: "ERROR: La sucusal ya existe"}
            }

            await pool.query (
                "INSERT INTO branch (company, name, address, city, department, country) VALUES (?, ?, ?, ?, ?, ?)",
                [company, name, address, city, department, country]
            )

            return { success: true, code: 201, message: "Sucursal registrada con exito!!"}
        } catch (error) {
            return { success: false, code: 501, message: "Error: No se pudo rehistrar la sucursal", error: error.message}
        }
    },

    async All (company) {
        try {
            const [branchs] = await pool.query(
                "SELECT id, name, address, city, department, country FROM branch WHERE company = ? ORDER BY id DESC",
                [company]
            )
            return { success: true, code: 200, message: "Roles obtenidos con éxito", data: branchs}
            
        } catch (error) {
            return { success: false, code: 501, message: "Error: No se pudieron los datos de las sucursales", error: error.message}
        }
    },

    async UpdateBranch (data) {
        try {
            const {id, name, address, city, department, country} = data
            await pool.query(
                "UPDATE branch SET name = ?, address = ?, city = ?, department = ?, country = ? WHERE id = ?",
                [name, address, city, department, country, id]
            )
            return { success: true, code: 200, message: "Sucursal Actualizada con exito"}
        } catch (error) {
            return { success: false, code: 501, message: "Error: No se pudo actualizar la sucursal", error: error.message }
        }
    },

    async DeleteBranch (id) {
        try {
            await pool.query ( "DELETE FROM branch WHERE id = ?", [id] )
            return { success: true, code: 200, message: "Sucursal eliminada con exito!" }
        } catch (error) {
            return { success: false, code: 200, message: "Error: No se pudo eliminar la sucursal!", error: error.message }
        }
    }
}

export default BranchService