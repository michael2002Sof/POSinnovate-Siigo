import {pool} from "../../database/conexion.js"

const CompanyService = {
    async Data(company) {
        try {
            const [[companyData]] = await pool.query( `SELECT * FROM company WHERE id = ?`, [company]);
            return { code: 200, data: companyData };
        } catch (error) {
            return { code: 500, message: "ERROR: No se trayeron los datos de la empresa", error: error.message };
        }
    }
};

export default CompanyService;