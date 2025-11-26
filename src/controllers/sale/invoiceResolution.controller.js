import InvoiceResolutionService from "../../services/sale/invoiceResolution.service.js"

const InvoiceResolutionController = {
    async Create (req, res) {
        const data = req.body
        const response = await InvoiceResolutionService.Create(data)
        res.status(response.code).json(response)
    },
    
    async AllPOS (req, res) {
        const {company} = req.params
        const response = await InvoiceResolutionService.AllPOS(company)
        res.status(response.code).json(response)
    }
}

export default InvoiceResolutionController