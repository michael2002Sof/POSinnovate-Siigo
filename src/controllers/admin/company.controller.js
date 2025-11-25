import CompanyService from "../../services/admin/company.service.js"

const CompanyController = {
    async Data (req, res) {
        const {company} = req.params
        const response = await CompanyService.Data(company)
        return res.status(response.code).json(response)
    }    
}

export default CompanyController