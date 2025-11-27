import RoleService from "../../services/user/role.service.js"

const RoleController = {
    async RegisterRole (req, res) {
        const data = req.body
        const response = await RoleService.RegisterRole(data)
        res.status(response.code).json(response)
    },
    async AllRole (req, res) {
        const {company} = req.params
        const response = await RoleService.AllRole(company)
        res.status(response.code).json(response)
    },
    async UpdateRole (req, res) {
        const data = req.body
        const response = await RoleService.UpdateRole(data)
        res.status(response.code).json(response)
    }
}

export default RoleController