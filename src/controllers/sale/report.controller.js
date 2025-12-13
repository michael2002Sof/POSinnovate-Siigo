import ReportService from "../../services/sale/report.service.js";

export const ReportController = {
    async SaleSessionById (req, res) {
        const {id} = req.params
        const response = await ReportService.SaleSessionById(id)
        res.status(response.code).json(response)
    },

    async SessionByDate (req, res) {
        const {date, company} = req.params
        const response = await ReportService.SessionByDate(date, company)
        res.status(response.code).json(response)
    },

    async SessionStatistic (req, res) {
        const {company, from, to} = req.params
        const response = await ReportService.SessionStatistic(company, from, to)
        res.status(response.code).json(response)
    },

    async InvoiceByDate (req, res) {
        const {date, company, user, page} = req.params
        const response = await ReportService.InvoiceByDate(date, company, user, page)
        res.status(response.code).json(response)
    },

    async InvoiceToExport (req, res) {
        const {date, company, user} = req.params
        const response = await ReportService.InvoiceToExport(date, company, user)
        res.status(response.code).json(response)
    }
};

export default ReportController;