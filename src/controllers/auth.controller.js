import AuthService from "../services/auth.service.js"

const AuthController = {
    async Login (req, res) {
        const data = req.body
        const response = await AuthService.Login(data)
        res.status(response.code).json(response)
    }
}

export default AuthController