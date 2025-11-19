import CreditNoteSiigoService from "../services/creditnote.siigo.service.js"

const CreditNoteSiigoController = {
    async CreatePOS (req, res) {
        const company = req.body
        const response = await CreditNoteSiigoService.CreatePOS(company)
        res.status(response.code).json(response)
    },

    async ByDate (req, res) {
        const {company, date} = req.params
        const response = await CreditNoteSiigoService.ByDate(company, date)
        res.status(response.code).json(response)
    }
}

export default CreditNoteSiigoController