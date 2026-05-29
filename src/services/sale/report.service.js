import { pool } from "../../database/conexion.js";
import moment from "moment-timezone";

const ReportService = {
    async SaleSessionById(id) {
        try {
            const [[row]] = await pool.query(
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
                cs.total_datafono,
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
                WHERE cs.id = ?`,
                [id]
            );
               // Convertir fechas a "America/Bogota" ANTES de enviarlas al frontend
            const [[totalSales]] = await pool.query(`SELECT COUNT(id) AS count FROM sale_invoice WHERE cash_session = ?`, id)
            const session = {
                ...row,
                totalSales: totalSales.count,
                opened_at: row.opened_at 
                    ? moment(row.opened_at).format("YYYY-MM-DD HH:mm A")
                    : null,
                closed_at: row.closed_at 
                    ? moment(row.closed_at).format("YYYY-MM-DD HH:mm A")
                    : null
            }
            return {success: true, code:201, data: session};
    
        } catch (error) {
            console.error("Error al obtener la session abierta:", error);
            return { code: 501, message: "Error al obtener la session abierta", error: error.message }
        }
    },

    async SessionByDate(date, company) {
        try {

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
                cs.total_davivienda,
                cs.total_datafono,
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
                WHERE DATE(cs.opened_at) = ? AND cs.company = ?
                ORDER BY cs.opened_at ASC`,
            [date, company]
            );

            // Convertir fechas a "America/Bogota" ANTES de enviarlas al frontend
            const sesiones = []

            for (const s of rows) {
                const [[totalSales]] = await pool.query(
                    `SELECT COUNT(id) AS count
                    FROM sale_invoice
                    WHERE cash_session = ?`,
                    [s.id]
                )
            
                sesiones.push({
                    ...s,
                    opened_at: s.opened_at 
                        ? moment(s.opened_at).format("YYYY-MM-DD HH:mm A")
                        : null,
                    closed_at: s.closed_at 
                        ? moment(s.closed_at).format("YYYY-MM-DD HH:mm A")
                        : null,
                    totalSales: totalSales.count  
                })
            }


            return { code: 200, data: sesiones };

        } catch (error) {
            return { code: 500, message: "Error al obtener las sesiones de caja por fecha", error: error.message };
        }
    },

    async SessionStatistic (company, from, to) {
        try {
            const [rows] = await pool.query (`
                SELECT
                    DATE(cs.opened_at) AS period,
                    sp.name AS sale_point,
                    
                    SUM(cs.total_cash) AS total_cash,
                    SUM(cs.total_transfer) AS total_transfer,
                    SUM(cs.total_davivienda) AS total_davivienda,
                    SUM(cs.total_datafono) AS total_datafono,
                    SUM(cs.total_return) AS total_return,
                    SUM(cs.total) AS total_sales,

                    SUM(inv.total_invoices) AS total_invoices
                FROM cash_session cs
                INNER JOIN sale_point sp ON sp.id = cs.sale_point
                LEFT JOIN (
                    SELECT cash_session, COUNT(*) AS total_invoices
                    FROM sale_invoice
                    GROUP BY cash_session
                ) inv ON inv.cash_session = cs.id
                WHERE cs.company = ?
                AND cs.opened_at BETWEEN ? AND ?
                AND cs.status = 'finalized'
                GROUP BY period, cs.sale_point
                ORDER BY period ASC;
                `,
                [company, from, to]
            )

            return {code: 200, data: rows}
            
        } catch (error) {
            return {
                code: 500,
                message: "Error al generar dashboard",
                error: error.message,
                details: error
            };
        }
    },

    async InvoiceByDate(date, company, user, page) {
        try {
            const pageSize = 7
            const offset = (page - 1) * pageSize

            const [adminCheck] = await pool.query(`SELECT id FROM admin WHERE id = ? LIMIT 1`, [user])
            
            let whereCondition = `company = ? AND DATE(created_at) = ? AND type = ?`
            const queryParams = [company, date, 'invoice']
            if (adminCheck.length === 0) {
                whereCondition += ` AND seller = ?`
                queryParams.push(user)
            }
            const [invoices] = await pool.query(
                `SELECT * FROM sale_invoice WHERE ${whereCondition} ORDER BY id DESC LIMIT ${pageSize} OFFSET ${offset}`, queryParams
            );
            if (invoices.length === 0) {
                return { code: 200, data: [], message: "No hay facturas para la fecha indicada" };
            }

            const [[count]] = await pool.query(`SELECT COUNT(id) AS totalCount FROM sale_invoice WHERE ${whereCondition}`, queryParams)
            const totalPages = Math.ceil(count.totalCount/pageSize)

            const result = [];
            for (const inv of invoices) {

                // 4.2 Obtener info del punto de venta
                const [[salePointData]] = await pool.query(
                    `SELECT name FROM sale_point WHERE id = ? LIMIT 1`,
                    [inv.sale_point]
                );

                // 4.3 Obtener vendedor
                const [[sellerData]] = await pool.query(
                    `SELECT name FROM user WHERE id = ? LIMIT 1`,
                    [inv.seller]
                );

                // 4.4 Obtener items de la factura
                const [items] = await pool.query(
                    `SELECT product_name, product_barcode, quantity, unit_price, tax0, tax5, tax19, total
                    FROM sale_invoice_item
                    WHERE invoice = ?`,
                    [inv.id]
                );

                // 4.5 Construir estructura EXACTA como CreatePOS
                result.push({
                    code: inv.code,
                    caja: salePointData.name,
                    created_at: moment(inv.created_at).format("YYYY-MM-DD hh:mm A"),
                    expire_at: moment(inv.created_at).format("YYYY-MM-DD hh:mm A"),
                    client: inv.customer_name || "Consumidor Final",
                    cc: inv.customer_cc || "222222222222",
                    address_client: inv.customer_address || "Sin Dirección",
                    vendedor: sellerData.name,
                    subtotal: inv.subtotal,
                    descuento: 0,
                    tax0: inv.tax0,
                    tax5: inv.tax5,
                    tax19: inv.tax19,
                    total: inv.total,
                    receipt_cash: inv.receipt_cash,
                    receipt_transfer: inv.receipt_transfer,
                    total_payment: inv.total_payment,
                    repay: inv.repay,
                    cufe: inv.cufe,
                    status: inv.status,
                    invoiceItem: items
                });
            }

            return { 
                code: 200, 
                data: {
                    invoices: result,
                    totalCount: count.totalCount,
                    totalPages
                } 
            };
        } catch (error) {
            return { code: 500, message: "Error al obtener las facturas por fecha", error: error.message };
        }
    },

    async InvoiceToExport (date, company, user) {
        try {

            const [[companyData]] = await pool.query(
                `SELECT name, nit, address, city, cell, logo FROM company WHERE id = ? LIMIT 1`,
                [company]
            );

            const [adminCheck] = await pool.query(`SELECT id FROM admin WHERE id = ? LIMIT 1`, [user])
            
            let whereCondition = `company = ? AND DATE(created_at) = ? AND type = ?`
            const queryParams = [company, date, 'invoice']
            if (adminCheck.length === 0) {
                whereCondition += ` AND seller = ?`
                queryParams.push(user)
            }

            const [invoices] = await pool.query(
                `SELECT * FROM sale_invoice WHERE ${whereCondition} ORDER BY id DESC`, queryParams
            );
          
            if (invoices.length === 0) {
                return { code: 200, data: [], message: "No hay facturas para la fecha indicada" };
            }

            const result = [];
            for (const inv of invoices) {

                // 4.2 Obtener info del punto de venta
                const [[salePointData]] = await pool.query(
                    `SELECT name FROM sale_point WHERE id = ? LIMIT 1`,
                    [inv.sale_point]
                );

                // 4.3 Obtener vendedor
                const [[sellerData]] = await pool.query(
                    `SELECT name FROM user WHERE id = ? LIMIT 1`,
                    [inv.seller]
                );

                // 4.4 Obtener items de la factura
                const [items] = await pool.query(
                    `SELECT product_name, product_barcode, quantity, unit_price, tax0, tax5, tax19, total
                    FROM sale_invoice_item
                    WHERE invoice = ?`,
                    [inv.id]
                );

                // 4.5 Construir estructura EXACTA como CreatePOS
                result.push({
                    logo: companyData.logo,
                    company: companyData.name,
                    nit: companyData.nit,
                    address: companyData.address,
                    city: companyData.city,
                    cell: companyData.cell,
                    code: inv.code,
                    caja: salePointData.name,
                    created_at: moment(inv.created_at).format("YYYY-MM-DD hh:mm A"),
                    expire_at: moment(inv.created_at).format("YYYY-MM-DD hh:mm A"),
                    client: inv.customer_name || "Consumidor Final",
                    cc: inv.customer_cc || "222222222222",
                    address_client: inv.customer_address,
                    vendedor: sellerData.name,
                    subtotal: inv.subtotal,
                    descuento: 0,
                    tax0: inv.tax0,
                    tax5: inv.tax5,
                    tax19: inv.tax19,
                    total: inv.total,
                    receipt_cash: inv.receipt_cash,
                    receipt_transfer: inv.receipt_transfer,
                    total_datafono: inv.total_datafono,
                    total_payment: inv.total_payment,
                    repay: inv.repay,
                    cufe: inv.cufe,
                    status: inv.status,
                    invoiceItem: items
                });
            }
            return { 
                code: 200, 
                data: result
            };

        } catch (error) {
            return { code: 500, message: "Error al obtener las facturas por fecha", error: error.message };
        }
    }
};

export default ReportService;