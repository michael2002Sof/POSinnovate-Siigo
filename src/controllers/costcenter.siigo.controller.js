import CostCenterSiigoService from "../services/costcenter.siigo.service.js"

const CostCenterSiigoController = {
    async all (req, res) {
        const {company} = req.params
        const response = await CostCenterSiigoService.all(company)
        res.status(response.code).json(response)
    }
}

export default CostCenterSiigoController