import AdminService from "../../services/admin/admin.service.js"

const AdminController = {
    async Data (req, res) {
        const {admin} = req.params
        const response = await AdminService.Data(admin)
        return res.status(response.code).json(response)
    }    
}

export default AdminController