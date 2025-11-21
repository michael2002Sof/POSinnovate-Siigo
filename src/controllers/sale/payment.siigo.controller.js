import PaymentSiigoService from "../../services/sale/payment.siigo.service.js"

const PaymentSiigoController = {
    async All (req, res) {
        const {company} = req.params
        const response = await PaymentSiigoService.All(company)
        res.status(response.code).json(response)
    },

    async CreatePOS (req, res) {
        const data = req.body
        const response = await PaymentSiigoService.CreatePOS(data)
        res.status(response.code).json(response)
    },

    async AllPOS (req, res) {
        const {company} = req.params
        const response = await PaymentSiigoService.AllPOS(company)
        res.status(response.code).json(response)
    }
}

export default PaymentSiigoController