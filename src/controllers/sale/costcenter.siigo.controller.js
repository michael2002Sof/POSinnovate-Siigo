import CostCenterSiigoService from "../../services/sale/costcenter.siigo.service.js"

const CostCenterSiigoController = {
    async All (req, res) {
        const {company} = req.params
        const response = await CostCenterSiigoService.All(company)
        res.status(response.code).json(response)
    },

    async CreatePOS (req, res) {
        const data = req.body
        const response = await CostCenterSiigoService.CreatePOS(data)
        res.status(response.code).json(response)
    },

    async AllPOS (req, res) {
        const { company } = req.params
        const response = await CostCenterSiigoService.AllPOS(company)
        res.status(response.code).json(response)
    }
}

export default CostCenterSiigoController