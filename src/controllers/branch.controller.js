import BranchService from "../services/branch.service.js"

const BranchController = {
    async Create (req, res) {
        const data = req.body
        const response = await BranchService.Create(data)
        res.status(response.code).json(response)
    },

    async All (req, res) {
        const {company} = req.params
        const response = await BranchService.All(company)
        res.status(response.code).json(response)
    },

    async UpdateBranch (req, res) {
        const data = req.body
        const response = await BranchService.UpdateBranch(data)
        res.status(response.code).json(response)
    },

    async DeleteBranch (req, res) {
        const {id} = req.params
        const response = await BranchService.DeleteBranch(id)
        res.status(response.code).json(response)
    }
}

export default BranchController