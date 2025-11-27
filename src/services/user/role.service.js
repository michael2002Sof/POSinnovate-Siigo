import {pool} from "../../database/conexion.js"

const RoleService = {
    async RegisterRole (data) {
        try {
            const {company, name, modules, permissions} = data

            await pool.query(
                "INSERT INTO role (company, name, modules, permissions) VALUES (?, ?, ?, ?)",
                [company, name, JSON.stringify(modules), JSON.stringify(permissions)]
            )

            return { success: true, code: 201, message: "Rol registrado con exito!!"}
        } catch (error) {
            return { success: false, code: 501, message: "Error: No se pudo registrar el rol", error: error.message}
        }

    },

    async AllRole (company){
        try {
            const [rows] = await pool.query(
                "SELECT * FROM role WHERE company = ? ORDER BY id DESC",
                [company]
            )
            
            return { success: true, code: 200, message: "Roles obtenidos con éxito", data: rows }
        } catch (error) {
            return { success: false, code: 501, message: "No se pudieron traer los roles!!", error: error.message}
        }
    },

    async UpdateRole (data) {
        try {
            const { id, name, modules, permissions } = data

            await pool.query(
            "UPDATE role SET name = ?, modules = ?, permissions = ? WHERE id = ?",
            [name, JSON.stringify(modules), JSON.stringify(permissions), id]
            )

            return { success: true, code: 200, message: "Rol actualizado con éxito" }
        } catch (error) {
            return { success: false, code: 500, message: "Error: Rol no se actualizo", error: error.message }
        }
    }
}


export default RoleService