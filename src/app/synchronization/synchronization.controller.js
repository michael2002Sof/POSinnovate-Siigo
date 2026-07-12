import synchronizationService from "./synchronization.service.js";

const synchronizationController = {
    async synchInvoices (req, res) {
        const response = await synchronizationService.synchInvoices(req.body)
        return res.status(response.code).json(response)
    }
}

export default synchronizationController;