import { pool } from "../../database/conexion.js";

const MovementServices = {
    async All(company, query) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const offset = (page - 1) * limit;

            const { from } = query;

            // 🔹 Filtros base
            let filters = `
                WHERE p.company = ?
                AND p.dian = 0
                AND si.reference_invoice IS NULL
            `;

            let params = [company];

            if (from) {
                const fromDate = from.split("T")[0]; // normalizar fecha
                filters += ` AND DATE(si.created_at) = ?`;
                params.push(fromDate);
            }

            // 🔹 1. TOTAL DE FACTURAS (NO ITEMS)
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

            // 🔹 2. PAGINAR POR FACTURAS
            const [invoiceIdsResult] = await pool.query(
                `
                SELECT DISTINCT si.id
                FROM sale_invoice_item sii
                INNER JOIN sale_invoice si ON sii.invoice = si.id
                INNER JOIN product p ON p.code = sii.product_barcode
                ${filters}
                ORDER BY si.id DESC
                LIMIT ? OFFSET ?
                `,
                [...params, limit, offset]
            );

            const invoiceIds = invoiceIdsResult.map(r => r.id);

            if (invoiceIds.length === 0) {
                return {
                    code: 200,
                    data: [],
                    pages: totalPages
                };
            }

            // 🔹 3. TRAER TODOS LOS ITEMS DE ESAS FACTURAS
            const [rows] = await pool.query(
                `
                SELECT 
                    si.id AS invoice_id,
                    si.created_at,
                    si.code,
                    si.customer_name,
                    p.name AS product_name,
                    p.code AS product_code,
                    p.dian,
                    sii.quantity
                FROM sale_invoice_item sii
                INNER JOIN sale_invoice si ON sii.invoice = si.id
                INNER JOIN product p ON p.code = sii.product_barcode
                WHERE si.id IN (${invoiceIds.map(() => '?').join(',')})
                ORDER BY si.id DESC
                `,
                invoiceIds
            );

            // 🔹 4. AGRUPAR POR FACTURA
            const grouped = {};

            for (const row of rows) {
                if (!grouped[row.invoice_id]) {
                    grouped[row.invoice_id] = {
                        type: "sale",
                        code: row.code, // código de factura real
                        customer: row.customer_name || "Consumidor Final",
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

            const result = Object.values(grouped);

            return {
                code: 200,
                data: result,
                pages: totalPages,
                total
            };

        } catch (error) {
            console.error(error);
            return {
                code: 500,
                message: "Error al obtener movimientos de inventario",
                error: error.message
            };
        }
    }
};

export default MovementServices;