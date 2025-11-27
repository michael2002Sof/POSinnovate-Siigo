import SiigoConfig from "../../config/siigo.config.js";
import bcrypt from "bcrypt"
import { pool } from "../../database/conexion.js";


const  UserSiigoService = {
  async all (company) {
    try {
      const client = await SiigoConfig.createClient(company)
      const users = await client.get("users");
      return {code: 201, data: users.data.results}
    } catch (error) {
      return { code: 501, message: "ERROR: No se pudieron traer los usuarios de siigo"}
    }
  },

  async CreatePOS (data) {
    try {
      const {id, company, rol, name, email, password} = data

      //1. Obtener los límites del plan
      const [[plan]] = await pool.query(
        `SELECT * FROM plan 
        WHERE id = (SELECT plan FROM company WHERE id = ?) LIMIT 1`,
        [company]
      )
      console.log(plan)

      // 2. VERIFICACIÓN DE LÍMITE DE USUARIO
      if (plan.user_count >= plan.user_limit) {
        return { 
          success: false, 
          code: 403, 
          message: `El límite de ${plan.user_limit} usuarios para este plan ha sido alcanzado. No se puede registrar un nuevo usuario.` 
        }
      }

      // 3. VERIFICACIÓN DE EXISTENCIA EN TABLA 'user'
      const [exists] = await pool.query(
        "SELECT id FROM user WHERE id = ?",
        [id]
      )
      if (exists.length > 0) {
        return { success: false, code: 409, message: "El correo ya está registrado." }
      }

      // 4. VERIFICACIÓN DE EXISTENCIA EN TABLA 'admin' (¡NUEVA VERIFICACIÓN!)
      const [adminExists] = await pool.query(
        "SELECT id FROM admin WHERE id = ?",
        [id]
      )
      if (adminExists.length > 0) {
        return { success: false, code: 409, message: "El usuario ya está registrado como administrador del sistema." }
      }

      // Encriptar contraseña antes de guardar
      const hashedPassword = await bcrypt.hash(password, 10)

      // Registrar usuario
      await pool.query(
        `INSERT INTO user (id, company, rol, name, email, password) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, company, rol, name, email, hashedPassword]
      )

      await pool.query(
      `UPDATE plan SET user_count = user_count + 1 
        WHERE id = ?`,
      [plan.id]
      );

      return { success: true, code: 201, message: "Usuario registrado con éxito!" }
    } catch (error) {
      return { code: 500, message: "Error al registrar el usuario.", error: error.message }
    }
  },

  async allPOS (company) {
    try {
      const [users] = await pool.query(
        `SELECT u.id, u.company, u.rol, r.name AS rol_name, u.name, u.email, u.status, u.created_at
          FROM user u
          LEFT JOIN role r ON u.rol = r.id
          WHERE u.company = ?
          ORDER BY u.id DESC`,
        [company]
      )
      return { code: 200, data: users }
    } catch (error) {
      return { code: 500, message: "ERROR: No se pudieron obtener los usuarios.", error: error.message }
    }
  },
}

export default UserSiigoService