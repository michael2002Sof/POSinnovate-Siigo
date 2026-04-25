import { pool } from "../../database/conexion.js";
import moment from "moment-timezone";

const MovementServices = {
    async All(company, query) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const offset = (page - 1) * limit;

            const { from } = query;

            let filters = `
                WHERE si.company = ?
                AND si.reference_invoice IS NULL
            `;

            let params = [company];

            if (from) {
                const fromDate = from.split("T")[0];
                filters += ` AND DATE(si.created_at) = ?`;
                params.push(fromDate);
            }

            // 🔥 1. SOLO FACTURAS QUE TENGAN AL MENOS UN PRODUCTO NO DIAN
            const dianCondition = `
                EXISTS (
                    SELECT 1
                    FROM sale_invoice_item sii2
                    INNER JOIN product p2 
                        ON p2.code = sii2.product_barcode
                        AND p2.company = si.company
                    WHERE sii2.invoice = si.id
                    AND p2.dian = 0
                )
            `;

            // 🔹 TOTAL
            const [countResult] = await pool.query(
                `
                SELECT COUNT(*) AS total
                FROM sale_invoice si
                ${filters} AND ${dianCondition}
                `,
                params
            );

            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);

            // 🔹 PAGINACIÓN DE FACTURAS
            const [invoiceIdsResult] = await pool.query(
                `
                SELECT si.id
                FROM sale_invoice si
                ${filters} AND ${dianCondition}
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

            // 🔥 2. TRAER TODOS LOS ITEMS (NO SOLO NO DIAN)
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
                INNER JOIN product p 
                    ON p.code = sii.product_barcode
                    AND p.company = si.company
                WHERE si.id IN (${invoiceIds.map(() => '?').join(',')})
                ORDER BY si.id DESC
                `,
                invoiceIds
            );

            // 🔹 AGRUPAR
            const grouped = {};

            for (const row of rows) {
                if (!grouped[row.invoice_id]) {
                    grouped[row.invoice_id] = {
                        type: "sale",
                        code: row.code,
                        customer: row.customer_name || "Consumidor Final",
                        created_at: moment(row.created_at).format("YYYY-MM-DD hh:mm A"),
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

            return {
                code: 200,
                data: Object.values(grouped),
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