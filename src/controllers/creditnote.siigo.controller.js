import CreditNoteSiigoService from "../services/creditnote.siigo.service.js"

const CreditNoteSiigoController = {
    async CreatePOS (req, res) {
        const company = req.body
        const response = await CreditNoteSiigoService.CreatePOS(company)
        res.status(response.code).json(response)
    }
}

export default CreditNoteSiigoController