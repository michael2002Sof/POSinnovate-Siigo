import { pool } from "../../database/conexion.js";
import moment from "moment-timezone";

const MovementServices = {
    async All(company, query) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const offset = (page - 1) * limit;

            const { from } = query;

            // 🔹 TOTAL
            const total = 10;
            const totalPages = Math.ceil(total / limit);

            const [rows] = await pool.query(`
                SELECT 
                    si.id AS invoice_id, 
                    si.created_at, 
                    si.code, 
                    si.customer_name, 
                    p.name AS product_name, 
                    p.code AS product_code, 
                    p.dian, 
                    u.name AS seller,
                    sii.quantity
                FROM sale_invoice_item sii
                INNER JOIN sale_invoice si ON sii.invoice = si.id
                INNER JOIN user u ON u.id = si.seller 
                INNER JOIN product p ON p.code = sii.product_barcode
                WHERE si.company = ? AND DATE(si.created_at) = ? AND p.dian = 0 AND si.reference_invoice IS NULL
                LIMIT ?
                OFFSET ?
            `, [company, from, limit, offset])


            // 🔹 AGRUPAR
            const grouped = {};

            for (const row of rows) {
                if (!grouped[row.invoice_id]) {
                    grouped[row.invoice_id] = {
                        type: "sale",
                        code: row.code,
                        seller: row.seller,
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
    },

    async AllProduct(company, query) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const offset = (page - 1) * limit;

            const { from } = query;

            // 🔹 1. TOTAL REAL
            const [[{ total }]] = await pool.query(`
                SELECT COUNT(*) AS total
                FROM inventory_ledger il
                WHERE il.company = ? AND il.date = ?
            `, [company, from]);

            const totalPages = Math.ceil(total / limit);

            const [rows] = await pool.query(`
                SELECT 
                    il.date,
                    il.opening_stock AS start,
                    il.entries,
                    il.exits,
                    il.closing_stock AS end,
                    p.name,
                    p.code,
                    w.name AS warehouse
                FROM inventory_ledger il
                INNER JOIN product p ON p.id = il.product
                INNER JOIN warehouse w ON w.id = il.warehouse
                WHERE il.company = ? AND il.date = ?
                LIMIT ?
                OFFSET ?
            `, [company, from, limit, offset])

            return {
                code: 200,
                data: rows,
                pages: totalPages,
                total
            }
        } catch (error) {
            console.error(error);
            return {
                code: 500,
                message: "Error al obtener movimientos por producto",
                error: error.message
            };
        }
    },

    async InitLedger() {
        try {
            // Insertamos el stock actual como inicial del día
            await pool.query(`
            INSERT INTO inventory_ledger 
                (company, warehouse, product, date, opening_stock, closing_stock)
            SELECT 
                p.company, 
                wp.warehouse, 
                wp.product, 
                CURDATE(), 
                wp.stock, 
                wp.stock
            FROM warehouse_product wp
            INNER JOIN product p 
                ON p.id = wp.product 
            WHERE p.dian = 0
            ON DUPLICATE KEY UPDATE
                opening_stock = VALUES(opening_stock),
                closing_stock = VALUES(closing_stock)
            `);
        } catch (error) {
            console.error("Error al iniciar ledger:", error);
        }
    }
};

export default MovementServices;