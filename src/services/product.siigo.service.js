import SiigoConfig from "../config/siigo.config.js"

const ProductSiigoService = {
      async ByName(company, name) {
        try {
            const client = await SiigoConfig.createClient(company)

            const limit = 10
            const pageSize = 100
            const delayMs = 400

            let page = 1
            let matches = []
            let hasMore = true

            while (matches.length < limit && hasMore) {

                const response = await client.get(
                    `/products?page=${page}&page_size=${pageSize}`
                )

                const products = response.data.results || []

                if (!products.length) {
                    hasMore = false
                    break
                }

                const filtered = products.filter(p =>
                    p.name?.toLowerCase().includes(name.toLowerCase())
                )

                matches.push(...filtered)

                if (products.length < pageSize) {
                    hasMore = false
                }

                page++

                // pequeña pausa para no saturar Siigo
                await new Promise(resolve => setTimeout(resolve, delayMs))
            }

            matches = matches.slice(0, limit)

            return {
                code: 200,
                data: matches
            }


        } catch (error) {
            console.log("❌ Error completo Siigo (Productos por nombre):", error.response?.data || error.message);

            let userMessage = "ERROR: No se pudieron buscar productos en Siigo.";
            const status = error.response?.status;

            switch (status) {

                case 400:
                    userMessage = "El nombre enviado para la búsqueda no es válido.";
                    break;

                case 401:
                    userMessage = "La conexión con Siigo expiró. Debes volver a iniciar sesión.";
                    break;

                case 403:
                    userMessage = "No tienes permisos suficientes en Siigo para consultar productos.";
                    break;

                case 429:
                    userMessage = "Siigo está recibiendo demasiadas peticiones. Espera unos segundos.";
                    break;

                case 500:
                case 502:
                case 503:
                case 504:
                    userMessage = "Siigo está teniendo problemas en este momento.";
                    break;

                default:
                    userMessage = "Ocurrió un error inesperado consultando productos en Siigo.";
                    break;
            }

            return {
                code: 501,
                message: userMessage,
                error: error.message,
                details: error.response?.data || null
            };
        }
    },

    async ByCode (company, code) {
        try {
            const client = await SiigoConfig.createClient(company)
            const response = await client.get(`/products?code=${code}`)
            const product = response.data.results[0] || null

            // Caso: producto no existe
            if (!product) {
                return { code: 404, message: `El producto con código ${code} no existe en Siigo.`, data: null  };
            }

            return { code: 201, data: product}
        } catch (error) {
            console.log("❌ Error completo Siigo (Producto):", error.response?.data || error.message);

            let userMessage = "ERROR: No se pudo obtener el producto desde Siigo.";
            const status = error.response?.status;

            switch (status) {

                case 400:
                    userMessage = "El código del producto no es válido o la solicitud es incorrecta.";
                    break;

                case 401:
                    userMessage = "La conexión con Siigo expiró o no está autorizada. Debes volver a iniciar sesión.";
                    break;

                case 403:
                    userMessage = "No tienes permisos suficientes en Siigo para consultar productos.";
                    break;

                case 404:
                    userMessage = `Siigo no encontró el producto con código ${code}.`;
                    break;

                case 409:
                    userMessage = "Conflicto en la solicitud a Siigo. Inténtalo nuevamente.";
                    break;

                case 429:
                    userMessage = "Siigo está recibiendo demasiadas peticiones. Espera unos segundos e inténtalo de nuevo.";
                    break;

                case 500:
                case 502:
                case 503:
                case 504:
                    userMessage = "Siigo está teniendo problemas en este momento. Inténtalo de nuevo más tarde.";
                    break;

                default:
                    userMessage = "Ocurrió un error inesperado consultando el producto en Siigo.";
                    break;
            }

            return {
                code: 501,
                message: userMessage,
                error: error.message,
                details: error.response?.data || null
            };
        }
    }
}

export default ProductSiigoService