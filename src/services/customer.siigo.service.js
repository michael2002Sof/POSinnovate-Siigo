import SiigoConfig from "../config/siigo.config.js"

const CustomerSiigoService = {
    async ByIdentification (company, identification) {
        try {
            const client = await SiigoConfig.createClient(company)
            const response = await client.get(`customers?identification=${identification}`);
            const customer = response.data.results

            return {code: 201, data: customer}
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudo traer el cliente de siigo"}
        }
    }
}

export default CustomerSiigoService