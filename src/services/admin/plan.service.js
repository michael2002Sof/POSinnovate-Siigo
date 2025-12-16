import moment from "moment-timezone";
import {pool} from "../../database/conexion.js"

const PlanService = {
    async Data(admin) {
        try {
            const [[planData]] = await pool.query( `SELECT * FROM plan WHERE admin = ?`, [admin]);
            const [[technical_support]] = await pool.query( `SELECT * FROM technical_support WHERE id = ?`, [planData.technical_support]);
            const plan = {
                ...planData,
                technical_support: technical_support,
                start_date: moment(planData.start_date).format("YYYY-MM-DD"),
                payment_notice: moment(planData.payment_notice).format("YYYY-MM-DD"),
                end_date: moment(planData.end_date).format("YYYY-MM-DD"),
            }
            return { code: 200, data: plan };
        } catch (error) {
            return { code: 500, message: "ERROR: No se trayeron los datos del plan", error: error.message };
        }
    }

    
};

export default PlanService;