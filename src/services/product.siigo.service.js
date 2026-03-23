import SiigoConfig from "../config/siigo.config.js"
import { pool } from "../database/conexion.js"

const ProductSiigoService = {
    async create(company) {
        try {
            const client = await SiigoConfig.createClient(company)

            const pageSize = 100
            const delayMs = 800

            let page = 1
            let hasMore = true

            const values = []

            while (hasMore) {

                const response = await client.get(
                    `/products?page=${page}&page_size=${pageSize}`
                )

                const products = response.data.results || []

                if (!products.length) {
                    hasMore = false
                    break
                }

                for (const p of products) {
                    // ✅ solo productos activos
                    if (!p.active) continue

                    // 💰 precios
                    const priceList = p.prices?.[0]?.price_list || []

                    const price1 = priceList.find(pr => pr.position === 1)?.value || 0
                    const price2 = priceList.find(pr => pr.position === 2)?.value || 0

                    // 📦 unidad
                    const unit = p.unit_label || "UND"

                    // 🧾 impuesto (solo porcentaje)
                    const tax_id = p.taxes?.[0]?.id || 0
                    const tax = p.taxes?.[0]?.percentage || 0


                    const updated_at = p.metadata?.last_updated 
                        ? new Date(p.metadata.last_updated)
                        : new Date()

                    values.push([
                        p.id,
                        company, // ✅ IMPORTANTE
                        p.code,
                        p.name,
                        price1,
                        price2,
                        unit,
                        tax_id,
                        tax,
                        updated_at
                    ])
                }

                // si ya no hay más páginas
                if (products.length < pageSize) {
                    hasMore = false
                }
                

                page++

                // evitar rate limit
                await new Promise(resolve => setTimeout(resolve, delayMs))
            }

            // 🚫 evitar query vacía
            if (!values.length) {
                return {
                    message: "No hay productos activos para registrar"
                }
            }

            // ✅ insertar en lote
            await pool.query(
                `INSERT INTO product 
                (id, company, code, name, price1, price2, unit, tax_id, tax, updated_at)
                VALUES ?
                ON DUPLICATE KEY UPDATE
                    code = VALUES(code),
                    name = VALUES(name),
                    price1 = VALUES(price1),
                    price2 = VALUES(price2),
                    unit = VALUES(unit),
                    tax_id = VALUES(tax_id),
                    tax = VALUES(tax),
                    updated_at = VALUES(updated_at)`,
                [values]
            )
            
            return { code: 201, message: `Productos sincronizados con éxito, total: ${values.length}`}
        } catch (error) {
            return {
                code: 501,
                message: "No se pudieron sincronizar los productos",
                error: error
            }
        }
    },

    async all(company, query) {
        try {
            let { page = 1, limit = 20, name = "", code = "" } = query

            // 🔒 asegurar límites
            page = parseInt(page)
            limit = Math.min(parseInt(limit), 20)

            const offset = (page - 1) * limit

            let where = ["company = ?"] // ✅ CLAVE MULTIEMPRESA
            let params = [company]

            // 🔍 prioridad: búsqueda exacta por código
            if (code) {
                where.push("code = ?")
                params.push(code)
            } 
            // 🔍 búsqueda por nombre (LIKE)
            else if (name) {
                where.push("LOWER(name) LIKE ?")
                params.push(`%${name.toLowerCase()}%`)
            }

            const whereSql = `WHERE ${where.join(" AND ")}` 

            // 📦 obtener productos
            const [rows] = await pool.query(
                `SELECT id, code, name, price1, price2, unit, tax
                FROM product
                ${whereSql}
                ORDER BY name ASC
                LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            )

            // 📊 total para paginación
            const [totalResult] = await pool.query(
                `SELECT COUNT(*) as total
                FROM product
                ${whereSql}`,
                params
            )

            const total = totalResult[0].total

            return {
                code: 200,
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                data: rows
            }

        } catch (error) {
            console.error("GET PRODUCTS ERROR:", error)

            return {
                code: 501,
                message: "Error obteniendo productos",
                error: error.message
            }
        }
    },

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