import {pool} from "../../database/conexion.js"

const AdminService = {
    async Data(admin) {
        try {
            const [[adminData]] = await pool.query( `SELECT * FROM admin WHERE id = ?`, [admin]);
            console.log(adminData);
            return { code: 200, data: adminData };
        } catch (error) {
            return { code: 500, message: "ERROR: No se trayeron los datos de admin", error: error.message };
        }
    }
};

export default AdminService;