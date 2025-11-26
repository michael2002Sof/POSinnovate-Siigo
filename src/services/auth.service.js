import {pool} from "../database/conexion.js"
import jwt  from "jsonwebtoken"
import bcrypt from "bcrypt"

const SECRET_KEY = process.env.JWT_SECRET 

const AuthService = {

    // Generar token
    generateToken(payload) {
        return jwt.sign(payload, SECRET_KEY, { expiresIn: "8h" }) // duración ajustable
    },

    async Login (data) {
        try {
            const {email, password} = data
            const [admin] = await pool.query(
                "SELECT * FROM admin WHERE email = ? LIMIT 1",
                [email]
            )
            const [user] = await pool.query(
                "SELECT * FROM user WHERE email = ? LIMIT 1",
                [email]
            )
            if (admin.length === 0 && user.length === 0) {
                return { success: false, code: 501, message: "Error: El usuario no existe" }
            }
            if (admin.length > 0 && password !== admin[0].password) {
                return { success: false, code: 401, message: "Contraseña incorrecta" }
            }
            else if (user.length > 0) {
            const validPassword = await bcrypt.compare(password, user[0].password)
            if (!validPassword) return { success: false, code: 401, message: "Contraseña incorrecta" }
            }
            if (admin.length > 0) {
                const [company] = await pool.query( "SELECT * FROM company WHERE owner = ? LIMIT 1", [admin[0].id])
                const token = AuthService.generateToken({ id: admin[0].id, rol: admin[0].rol, company: company[0].id})
                return { success: true, code: 201, message: "Inicio de sesión exitoso", token }
            } else {
                const token = AuthService.generateToken({ id: user[0].id, rol: user[0].rol, company: user[0].company})
                return { success: true, code: 201, message: "Inicio de sesión exitoso", token }
            }

        } catch (error) {
            return { success: false, code: 501, message: "ERROR en el servidor", error: error.message }
        }
    }
}

export default AuthService