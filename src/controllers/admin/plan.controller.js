import PlanService from "../../services/admin/plan.service.js"

const PlanController = {
    async Data (req, res) {
        const {admin} = req.params
        const response = await PlanService.Data(admin)
        return res.status(response.code).json(response)
    }    
}

export default PlanController