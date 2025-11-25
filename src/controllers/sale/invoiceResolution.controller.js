import InvoiceResolutionService from "../../services/sale/invoiceResolution.service.js"

const InvoiceResolutionController = {
    async AllPOS (req, res) {
        const {company} = req.params
        const response = await InvoiceResolutionService.AllPOS(company)
        res.status(response.code).json(response)
    }
}

export default InvoiceResolutionController