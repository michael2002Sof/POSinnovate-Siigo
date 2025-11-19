import InvoiceSiigoService from "../services/invoice.siigo.service.js"

const InvoiceSiigoController = {
    async Create (req, res) {
        const data = req.body
        const response = await InvoiceSiigoService.Create(data)
        res.status(response.code).json(response)
    },

    async CreatePOS (req, res) {
        const data = req.body
        const response = await InvoiceSiigoService.CreatePOS(data)
        res.status(response.code).json(response)
    },

    async TypeInvoice (req, res) {
        const {company} = req.params
        const response = await InvoiceSiigoService.TypeInvoice(company)
        res.status(response.code).json(response)
    }
}

export default InvoiceSiigoController