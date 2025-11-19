import SiigoConfig from "../config/siigo.config.js"

const WareHouseSiigoService = {
    async all(company) {
        try {
            console.log("empresa", company)
            const client = await SiigoConfig.createClient(company)
            const response = await client.get("warehouses")
            const warehouses = response.data

            return { code: 201, data: warehouses }
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudieron traer las bodegas de siigo", error: error.message}
        }
    },
}

export default WareHouseSiigoService