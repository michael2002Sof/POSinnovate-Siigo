import SalesPointService from "../services/salepoint.service.js";

const SalePointController = {

    async RegisterSalePoint (req, res) {
        const data = req.body
        const response = await SalesPointService.RegisterSalePoint(data)
        return res.status(response.code).json(response)
    },

    async AllSalePoint (req, res) {
        const { company } = req.params
        const response = await SalesPointService.AllSalePoint(company)
        return res.status(response.code).json(response)
    },

    async UpdateSalePoint (req, res) {
        const data = req.body
        const response = await SalesPointService.UpdateSalePoint(data)
        return res.status(response.code).json(response)
    }
}

export default SalePointController