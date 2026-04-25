import { pool } from "../../database/conexion.js";

const MovementServices = {
    async All(company, query) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const offset = (page - 1) * limit;

            console.log(company, query)

            const { from } = query;

            let filters = `
                WHERE p.company = ?
                AND p.dian = 0
                AND si.reference_invoice IS NULL
            `;

            let params = [company];

            // Filtro por fechas
            if (from) {
                filters += ` AND DATE(si.created_at) = ?`;
                params.push(from);
            }

            const [countResult] = await pool.query(
                `
                SELECT COUNT(DISTINCT si.id) AS total
                FROM sale_invoice_item sii
                INNER JOIN sale_invoice si ON sii.invoice = si.id
                INNER JOIN product p ON p.code = sii.product_barcode
                ${filters}
                `,
                params
            );

            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);

            const [rows] = await pool.query(
                `
                SELECT 
                    si.id AS invoice_id,
                    si.created_at,
                    si.customer_name,
                    sii.product_barcode,
                    sii.quantity,
                    p.name AS product_name,
                    p.code AS product_code,
                    p.dian
                FROM sale_invoice_item sii
                INNER JOIN sale_invoice si ON sii.invoice = si.id
                INNER JOIN product p ON p.code = sii.product_barcode
                ${filters}
                ORDER BY si.id DESC
                LIMIT ? OFFSET ?
                `,
                [...params, limit, offset]
            );

            // 🔥 Agrupar por factura
            const grouped = {};

            for (const row of rows) {
                if (!grouped[row.invoice_id]) {
                    grouped[row.invoice_id] = {
                        type: "sale",
                        code: row.invoice_id,
                        customer: row.customer_name || "N/A",
                        created_at: row.created_at,
                        items: []
                    };
                }

                grouped[row.invoice_id].items.push({
                    name: row.product_name,
                    code: row.product_code,
                    quantity: Number(row.quantity),
                    dian: Boolean(row.dian)
                });
            }

            // Convertir a array
            const result = Object.values(grouped);

            return {
                code: 200,
                data: result,
                pages: totalPages
                
            };

        } catch (error) {
            console.error(error);
            return {
                code: 501,
                message: "No se pudo traer la informacion de movimiento",
                error: error.message
            }
        }
    }
};

export default MovementServices;