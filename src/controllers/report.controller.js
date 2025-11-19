import ReportService from "../services/report.service.js";

export const ReportController = {
    async SaleSessionById (req, res) {
        const {id} = req.params
        const response = await ReportService.SaleSessionById(id)
        res.status(response.code).json(response)
    },
    async SaleInvoiceByCode (req, res) {
        const {code} = req.params
        const response = await ReportService.SaleInvoiceByCode(code)
        res.status(response.code).json(response)
    },
    async SalesByDate (req, res) {
        const {date} = req.params
        const response = await ReportService.SalesByDate(date)
        res.status(response.code).json(response)
    },
};

export default ReportController;