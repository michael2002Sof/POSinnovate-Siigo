import PaymentSiigoService from "../services/payment.siigo.service.js"

const PaymentSiigoController = {
    async method (req, res) {
        const {company} = req.params
        const response = await PaymentSiigoService.method(company)
        res.status(response.code).json(response)
    }
}

export default PaymentSiigoController