import { pool } from "../database/conexion.js";

const ReportService = {
    async SaleSessionById(id) {
        try {
            console.log("id de la session", id)
            const [rows] = await pool.query(
            `SELECT * FROM cash_session 
            WHERE id = ? LIMIT 1`,
            [id]
            );
            return {success: true, code:201, data: rows[0]};
    
        } catch (error) {
            console.error("Error al obtener facturas:", error);
            return { code: 501, message: "Error al obtener facturas", error: error.message }
        }
    },
    async SaleInvoiceByCode(code) {
        try {
            console.log("codigo de la factura", code)
            // 🔹 1. Buscar la factura principal
            const [rows] = await pool.query(
            `SELECT * FROM sales_invoice WHERE code = ? LIMIT 1`,
            [code]
            );

            if (rows.length === 0) {
            return { success: false, code: 404, message: "Factura no encontrada" };
            }

            const invoice = rows[0];

             // 🔹 2. Buscar los ítems de esa factura (por ID)
            const [itemsProduct] = await pool.query(
            `SELECT 
                id,
                product_name,
                product_barcode,
                quantity,
                unit_price,
                discount,
                tax0,
                tax5,
                tax19,
                total
                FROM sales_invoice_item
                WHERE invoice = ?`,
            [invoice.id]
            );
            
            // 🔹 3. Unir datos de cabecera e ítems
            const invoiceData = {
            ...invoice,
            itemsProduct,
            };

            return {success: true, code:201, data: invoiceData};
    
        } catch (error) {
            console.error("Error al obtener facturas:", error);
            return { code: 501, message: "Error al obtener facturas", error: error.message }
        }
    },
    async SalesByDate(date) {
        try {
            // Normalizamos el formato de la fecha (YYYY-MM-DD)
            const formattedDate = date.split('T')[0]; 

            // Consulta: busca sesiones de caja del día especificado
            const [rows] = await pool.query(
            `SELECT 
                cs.id,
                cs.sale_point,
                sp.name AS sales_point_name,
                b.name AS branch_name,
                u1.name AS opened_by,
                u2.name AS closed_by,
                cs.status,
                cs.opened_at,
                cs.closed_at,
                cs.initial_cash,
                cs.total_cash,
                cs.total_transfer,
                cs.subtotal_method,
                cs.total_return,
                cs.total_method,
                cs.subtotal,
                cs.tax0,
                cs.tax5,
                cs.tax19,
                cs.total
                FROM cash_session cs
                INNER JOIN sale_point sp ON sp.id = cs.sale_point
                INNER JOIN user u1 ON u1.id = cs.opened_by
                INNER JOIN branch b ON b.id = sp.branch
                LEFT JOIN user u2 ON u2.id = cs.closed_by
                WHERE DATE(cs.opened_at) = ?
                ORDER BY cs.opened_at ASC`,
            [formattedDate]
            );

            return {
            success: true,
            code: 200,
            message: `Sesiones encontradas para la fecha ${formattedDate}`,
            data: rows
            };

        } catch (error) {
            console.error("Error en SalesByDate:", error);
            return {
            success: false,
            code: 500,
            message: "Error al obtener las sesiones de caja por fecha",
            error: error.message
            };
        }
    },
};

export default ReportService;