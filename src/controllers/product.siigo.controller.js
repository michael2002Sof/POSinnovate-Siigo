import ProductSiigoService from "../services/product.siigo.service.js"

const ProductSiigoController = {
    async create (req, res) {
        const response = await ProductSiigoService.create(req.body.company)
        return res.status(response.code).json(response)
    },

    async all(req, res) {
        const response = await ProductSiigoService.all(req.params.company, req.query)
        return res.status(response.code).json(response)
    },
    async ByCode (req, res) {
        const {company, code} = req.params
        const response = await ProductSiigoService.ByCode(company, code)
        res.status(response.code).json(response)
    },

    async ByName (req, res) {
        const {company, name} = req.params
        const response = await ProductSiigoService.ByName(company, name)
        return res.status(response.code).json(response)
    },

    async update (req, res) {
        const response = await ProductSiigoService.update(req.body)
        return res.status(response.code).json(response)
    }
}

export default ProductSiigoController