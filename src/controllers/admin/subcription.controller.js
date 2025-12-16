import { SubcriptionService } from "../../services/admin/subcription.service.js";

const SubcriptionController = {
  async Renovation(req, res) {
    const data = req.body;
    const voucher = req.file;

    const response = await SubcriptionService.Renovation(data, voucher);
    res.status(response.code).json(response);
  },

  async Suspend(req, res) {
    const data = req.body; // aquí vendría plan/company/admin
    const response = await SubcriptionService.Suspend(data);
    return res.status(response.code).json(response);
  },
};

export default SubcriptionController;