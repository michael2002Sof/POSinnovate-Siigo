import SiigoConfig from "../config/siigo.config.js"

const CustomerSiigoService = {
    async ByIdentification (company, identification) {
        try {
            const client = await SiigoConfig.createClient(company)
            const response = await client.get(`customers?identification=${identification}`);
            const customer = response.data.results

            return {code: 201, data: customer}
        } catch (error) {
            // 1. Error de respuesta de la API de Siigo (El servidor respondió con un status != 2xx)
            if (error.response) {
                console.error("Error de Siigo API:", error.response.data);
                
                // Siigo suele estructurar sus errores con un array de 'Errors' o un 'Message'
                const siigoErrors = error.response.data.Errors || error.response.data.message;
                
                return { 
                    code: error.response.status, 
                    message: "Error al consultar en Siigo",
                    details: siigoErrors 
                }
            }
            return { code: 501, message: "ERROR: No se pudo traer el cliente de siigo"}
        }
    }
}

export default CustomerSiigoService