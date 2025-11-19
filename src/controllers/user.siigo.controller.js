import UserSiigoService from "../services/user.siigo.service.js"

const UserSiigoController = {
    async all (req, res) {
        const {company} = req.params
        const response = await UserSiigoService.all(company)
        res.status(response.code).json(response)
    },
    async CreatePOS (req, res) {
        const data = req.body
        const response = await UserSiigoService.CreatePOS(data)
        res.status(response.code).json(response)
    },
    async allPOS (req, res) {
        const {company} = req.params
        const response = await UserSiigoService.allPOS(company)
        res.status(response.code).json(response)
    }
}

export default  UserSiigoController