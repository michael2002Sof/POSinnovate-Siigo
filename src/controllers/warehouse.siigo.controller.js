import WareHouseSiigoService from "../services/warehouse.siigo.service.js"

const WareHouseSiigoController = {
    async all (req, res) {
        const {company} = req.params
        const response = await  WareHouseSiigoService.all(company)
        res.status(response.code).json(response)
    }
}

export default WareHouseSiigoController