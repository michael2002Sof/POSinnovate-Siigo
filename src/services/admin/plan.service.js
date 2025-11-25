import {pool} from "../../database/conexion.js"

const PlanService = {
    async Data(admin) {
        try {
            const [[planData]] = await pool.query( `SELECT * FROM plan WHERE admin = ?`, [admin]);
            return { code: 200, data: planData };
        } catch (error) {
            return { code: 500, message: "ERROR: No se trayeron los datos del plan", error: error.message };
        }
    }
};

export default PlanService;