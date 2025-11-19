import SiigoConfig from "../config/siigo.config.js"

const ProductSiigoService = {
    async ByCode (company, code) {
        try {
            const client = await SiigoConfig.createClient(company)
            const response = await client.get(`/products?code=${code}`)
            const product = response.data.results[0]

            return { code: 201, data: product}
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudo encontrar el producto de siigo", error: error.message}
        }
    }
}

export default ProductSiigoService