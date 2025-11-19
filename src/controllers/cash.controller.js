import CashService from "../services/cash.service.js"

const CashController = {
    async CashSessionOpen (req, res) {
        const data = req.body
        const response = await CashService.CashSessionOpen(data)
        res.status(response.code).json(response)
    },
    async RegisterSaleInvoice (req, res) {
        const data = req.body
        const response = await CashService.RegisterSaleInvoice(data)
        res.status(response.code).json(response)
    },
    async CashSessionClose (req, res) {
        const data = req.body
        const response = await CashService.CashSessionClose(data)
        res.status(response.code).json(response)
    },
}

export default CashController