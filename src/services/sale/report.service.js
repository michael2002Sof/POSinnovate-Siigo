import { pool } from "../../database/conexion.js";
import moment from "moment-timezone";

async function getSessionBreakdownMap(sessionIds) {
    if (!sessionIds || sessionIds.length === 0) return new Map();

    const [rows] = await pool.query(
        `SELECT 
            cash_session,
            type,
            COUNT(*) AS count,
            IFNULL(SUM(receipt_cash), 0) AS cash,
            IFNULL(SUM(receipt_transfer), 0) AS transfer,
            IFNULL(SUM(receipt_davivienda), 0) AS davivienda,
            IFNULL(SUM(receipt_datafono), 0) AS datafono,
            IFNULL(SUM(subtotal), 0) AS subtotal,
            IFNULL(SUM(tax0), 0) AS tax0,
            IFNULL(SUM(tax5), 0) AS tax5,
            IFNULL(SUM(tax19), 0) AS tax19,
            IFNULL(SUM(total), 0) AS total
        FROM sale_invoice 
        WHERE cash_session IN (?)
        GROUP BY cash_session, type`,
        [sessionIds]
    );

    const map = new Map();

    for (const sid of sessionIds) {
        const idNum = Number(sid);
        const invRow = rows.find(r => Number(r.cash_session) === idNum && r.type === "invoice") || {};
        const cnRow = rows.find(r => Number(r.cash_session) === idNum && r.type === "credit-note") || {};

        const cashPayment = Number(invRow.cash) || 0;
        const cashCredit = Number(cnRow.cash) || 0;

        const transferPayment = Number(invRow.transfer) || 0;
        const transferCredit = Number(cnRow.transfer) || 0;

        const daviviendaPayment = Number(invRow.davivienda) || 0;
        const daviviendaCredit = Number(cnRow.davivienda) || 0;

        const datafonoPayment = Number(invRow.datafono) || 0;
        const datafonoCredit = Number(cnRow.datafono) || 0;

        const totalSalesCount = Number(invRow.count) || 0;
        const totalCreditNotesCount = Number(cnRow.count) || 0;

        const subtotal = (Number(invRow.subtotal) || 0) - (Number(cnRow.subtotal) || 0);
        const tax0 = (Number(invRow.tax0) || 0) - (Number(cnRow.tax0) || 0);
        const tax5 = (Number(invRow.tax5) || 0) - (Number(cnRow.tax5) || 0);
        const tax19 = (Number(invRow.tax19) || 0) - (Number(cnRow.tax19) || 0);
        const total = (Number(invRow.total) || 0) - (Number(cnRow.total) || 0);

        const totalReturn = Number(cnRow.total) || 0;
        const subtotalMethod = cashPayment + transferPayment + daviviendaPayment + datafonoPayment;
        const totalMethod = subtotalMethod - totalReturn;

        map.set(idNum, {
            cash: {
                payment: cashPayment,
                credit: cashCredit,
                total: cashPayment - cashCredit
            },
            transfer: {
                payment: transferPayment,
                credit: transferCredit,
                total: transferPayment - transferCredit
            },
            datafono: {
                payment: datafonoPayment,
                credit: datafonoCredit,
                total: datafonoPayment - datafonoCredit
            },
            davivienda: {
                payment: daviviendaPayment,
                credit: daviviendaCredit,
                total: daviviendaPayment - daviviendaCredit
            },
            totalSalesCount,
            totalCreditNotesCount,
            totalSales: totalSalesCount,
            dynamicTotals: {
                total_cash: cashPayment,
                total_transfer: transferPayment,
                total_davivienda: daviviendaPayment,
                total_datafono: datafonoPayment,
                total_return: totalReturn,
                subtotal_method: subtotalMethod,
                total_method: totalMethod,
                subtotal,
                tax0,
                tax5,
                tax19,
                total
            }
        });
    }

    return map;
}

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
                WHERE cs.id = ?`,
                [id]
            );

            if (!row) {
                return { code: 404, message: "Sesión de caja no encontrada" };
            }

            const breakdownMap = await getSessionBreakdownMap([id]);
            const breakdown = breakdownMap.get(Number(id)) || {};

            const session = {
                ...row,
                total_cash: breakdown.dynamicTotals?.total_cash ?? row.total_cash,
                total_transfer: breakdown.dynamicTotals?.total_transfer ?? row.total_transfer,
                total_davivienda: breakdown.dynamicTotals?.total_davivienda ?? row.total_davivienda,
                total_datafono: breakdown.dynamicTotals?.total_datafono ?? row.total_datafono,
                total_return: breakdown.dynamicTotals?.total_return ?? row.total_return,
                subtotal_method: breakdown.dynamicTotals?.subtotal_method ?? row.subtotal_method,
                total_method: breakdown.dynamicTotals?.total_method ?? row.total_method,
                subtotal: breakdown.dynamicTotals?.subtotal ?? row.subtotal,
                tax0: breakdown.dynamicTotals?.tax0 ?? row.tax0,
                tax5: breakdown.dynamicTotals?.tax5 ?? row.tax5,
                tax19: breakdown.dynamicTotals?.tax19 ?? row.tax19,
                total: breakdown.dynamicTotals?.total ?? row.total,

                cash: breakdown.cash || { payment: 0, credit: 0, total: 0 },
                transfer: breakdown.transfer || { payment: 0, credit: 0, total: 0 },
                datafono: breakdown.datafono || { payment: 0, credit: 0, total: 0 },
                davivienda: breakdown.davivienda || { payment: 0, credit: 0, total: 0 },

                totalSales: breakdown.totalSalesCount ?? 0,
                totalCreditNotes: breakdown.totalCreditNotesCount ?? 0,

                opened_at: row.opened_at 
                    ? moment(row.opened_at).format("YYYY-MM-DD HH:mm A")
                    : null,
                closed_at: row.closed_at 
                    ? moment(row.closed_at).format("YYYY-MM-DD HH:mm A")
                    : null
            };

            return { success: true, code: 201, data: session };
    
        } catch (error) {
            console.error("Error al obtener la session abierta:", error);
            return { code: 501, message: "Error al obtener la session abierta", error: error.message };
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

            const sessionIds = rows.map(s => s.id);
            const breakdownMap = await getSessionBreakdownMap(sessionIds);

            const sesiones = [];

            for (const s of rows) {
                const breakdown = breakdownMap.get(Number(s.id)) || {};

                sesiones.push({
                    ...s,
                    total_cash: breakdown.dynamicTotals?.total_cash ?? s.total_cash,
                    total_transfer: breakdown.dynamicTotals?.total_transfer ?? s.total_transfer,
                    total_davivienda: breakdown.dynamicTotals?.total_davivienda ?? s.total_davivienda,
                    total_datafono: breakdown.dynamicTotals?.total_datafono ?? s.total_datafono,
                    total_return: breakdown.dynamicTotals?.total_return ?? s.total_return,
                    subtotal_method: breakdown.dynamicTotals?.subtotal_method ?? s.subtotal_method,
                    total_method: breakdown.dynamicTotals?.total_method ?? s.total_method,
                    subtotal: breakdown.dynamicTotals?.subtotal ?? s.subtotal,
                    tax0: breakdown.dynamicTotals?.tax0 ?? s.tax0,
                    tax5: breakdown.dynamicTotals?.tax5 ?? s.tax5,
                    tax19: breakdown.dynamicTotals?.tax19 ?? s.tax19,
                    total: breakdown.dynamicTotals?.total ?? s.total,

                    cash: breakdown.cash || { payment: 0, credit: 0, total: 0 },
                    transfer: breakdown.transfer || { payment: 0, credit: 0, total: 0 },
                    datafono: breakdown.datafono || { payment: 0, credit: 0, total: 0 },
                    davivienda: breakdown.davivienda || { payment: 0, credit: 0, total: 0 },

                    totalSales: breakdown.totalSalesCount ?? 0,
                    totalCreditNotes: breakdown.totalCreditNotesCount ?? 0,

                    opened_at: s.opened_at 
                        ? moment(s.opened_at).format("YYYY-MM-DD HH:mm A")
                        : null,
                    closed_at: s.closed_at 
                        ? moment(s.closed_at).format("YYYY-MM-DD HH:mm A")
                        : null
                });
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

    async InvoiceByDate(query) {
        try {
            const page = Number(query?.page) || 1
            const pageSize = 10
            const offset = (page - 1) * pageSize

            const user = Number(query?.user) || null
            const date = query?.date || moment().format("YYYY-MM-DD")
            const company = Number(query?.company) || null
            const pos = Boolean(query?.pos) || null

            const [adminCheck] = await pool.query(`SELECT id FROM admin WHERE id = ? LIMIT 1`, [user])
            
            let whereCondition = `company = ? AND DATE(created_at) = ? AND type = ?`
            const queryParams = [company, date, 'invoice']
            if (adminCheck.length === 0) {
                whereCondition += ` AND seller = ?`
                queryParams.push(user)
            }
            if (query.pos) {
                whereCondition += ` AND code LIKE '%POS%'`
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
                    id: inv.id,
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
            console.error(error)
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