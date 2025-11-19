import SiigoConfig from "../config/siigo.config.js"

const PaymentSiigoService = {
    async method (company) {
        try {
            const client = await SiigoConfig.createClient(company)
            const response = await client.get("payment-types?document_type=FV")
            const paymentMethods = response.data

            return { code: 201, message: "Metodos de pago de siigo", data: paymentMethods}
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudieron traer los metodos de pago de siigo"}
        }
    }
}

export default PaymentSiigoService