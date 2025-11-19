import CustomerSiigoService from "../services/customer.siigo.service.js"

const CustomerSiigoController = {
    async ByIdentification (req, res) {
        const {company, identification} = req.params
        const response = await CustomerSiigoService.ByIdentification(company, identification)
        res.status(response.code).json(response)
    }
}

export default  CustomerSiigoController