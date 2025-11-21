import WarehouseSiigoService from "../../services/inventory/warehouse.siigo.service.js"

const WarehouseSiigoController = {
    async All (req, res) {
        const {company} = req.params
        const response = await WarehouseSiigoService.All(company)
        res.status(response.code).json(response)
    },

    async CreatePOS (req, res) {
        const data = req.body
        const response = await WarehouseSiigoService.CreatePOS(data)
        res.status(response.code).json(response)
    },

    async AllPOS (req, res) {
        const {company} = req.params
        const response = await WarehouseSiigoService.AllPOS(company)
        res.status(response.code).json(response)
    }
}

export default WarehouseSiigoController