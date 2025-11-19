import SiigoConfig from "../config/siigo.config.js"

const CostCenterSiigoService = {
    async all (company) {
        try {
            const client = await SiigoConfig.createClient(company)
            const response = await client.get("cost-centers")
            const costCenters = response.data

            return { code: 201, message: "Centro de Costos traidos de siigo", data: costCenters}
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudo traer los centros de costo de siigo", error: error.message}
        }
    }
}

export default CostCenterSiigoService