import MovementServices from "../../services/inventory/movement.service.js";

const MovementController = {
    async All(req, res) {
        const response = await MovementServices.All(req.params.company, req.query)
        return res.status(response.code).json(response)
    }
}

export default MovementController;