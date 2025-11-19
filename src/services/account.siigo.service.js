import {pool} from "../database/conexion.js"

const AccountSiigoService = {
  async CreatePOS (data)  {
        try {
            const { company, email, api_key, client_id, client_secret, refresh_token, provider } = data;
            // Verificar si ya existe una cuenta Siigo para esa empresa
            const [existing] = await pool.query(
                "SELECT id FROM account WHERE company = ? AND provider = ?",
                [company, provider || 'siigo']
            );
            if (existing.length > 0) {
                return { success: false, code: 400, message: 'ERROR: Ya existe una cuenta Siigo para esta empresa' }
            }

            await pool.query(
                `INSERT INTO account (company, email, api_key, client_id, client_secret, refresh_token, provider)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [company, email, api_key, client_id, client_secret, refresh_token, provider || 'siigo']
            );
            return { code: 201, message: 'Cuenta registrada exitosamente'}
        } catch (error) {
            return { code: 500, message: 'ERROR: No se pudo registrar la cuenta', error: error.message  }
        }
  },

  async AllPOS (company) {
    try {
        const [rows] = await pool.query("SELECT * FROM account WHERE company = ?", [company]);
        return { success: true, code: 200, data: rows };
    } catch (error) {
        return { success: false, code: 500, message: 'ERROR: No se pudieron traer las cuentas', error: error.message  }
    }
  },

  async UpdatePOS (data) {
    try {
        const { id, email, api_key, client_id, client_secret, refresh_token } = data;
        await pool.query(
            `UPDATE account 
            SET email= ?, api_key=?, client_id=?, client_secret=?, refresh_token=? 
            WHERE id=?`,
            [email, api_key, client_id, client_secret, refresh_token, id]
        );
        return { success: true, code: 201, message: 'Cuenta actualizada exitosamente'}
    } catch (error) {
        return { success: false, code: 500, message: 'ERROR: No se pudo actualizar la cuenta', error: error.message  }
    }
  }
};

export default AccountSiigoService