import ProductSiigoService from "../services/product.siigo.service.js"

const ProductSiigoController = {
    async ByCode (req, res) {
        const {company, code} = req.params
        const response = await ProductSiigoService.ByCode(company, code)
        res.status(response.code).json(response)
    },

    async ByName (req, res) {
        const {company, name} = req.params
        const response = await ProductSiigoService.ByName(company, name)
        return res.status(response.code).json(response)
    }
}

export default ProductSiigoController