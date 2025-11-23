import { pool } from "../../database/conexion.js";
import SiigoConfig from "../../config/siigo.config.js";
import moment from "moment-timezone";

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
            console.log(rows)

            // Convertir fechas a "America/Bogota" ANTES de enviarlas al frontend
            const sesiones = rows.map(s => ({
                ...s,
                opened_at: s.opened_at 
                    ? moment(s.opened_at).format("YYYY-MM-DD HH:mm A")
                    : null,
                closed_at: s.closed_at 
                    ? moment(s.closed_at).format("YYYY-MM-DD HH:mm A")
                    : null
            }));


            return { code: 200, data: sesiones };

        } catch (error) {
            return { code: 500, message: "Error al obtener las sesiones de caja por fecha", error: error.message };
        }
    },

    async InvoiceByDate(date, company) {
        try {
            console.log("Fecha recibida:", date, "Compañía:", company);

            const [[companyData]] = await pool.query(
                `SELECT name, nit, address, city, cell, logo FROM company WHERE id = ? LIMIT 1`,
                [company]
            );
            console.log("Datos de la compañía:", companyData);

            const [invoices] = await pool.query(
                `SELECT * FROM sale_invoice WHERE company = ? AND DATE(created_at) = ? AND type = ? ORDER BY id ASC`,
                [company, date, 'invoice']
            ); 
            if (invoices.length === 0) {
                return { code: 200, data: [], message: "No hay facturas para la fecha indicada" };
            }

            const clientAxios = await SiigoConfig.createClient(company);
            const result = [];
            for (const inv of invoices) {

                // 4.1 Obtener cliente de Siigo
                let customerName = "Sin nombre";
                let customerCC = "N/A";
                let customerAddress = "Sin dirección";

                try {
                    const { data: customer } = await clientAxios.get(`customers/${inv.customer}`);
                    customerName = customer?.name?.join(" ") || "Sin nombre";
                    customerCC = customer?.identification || "N/A";
                    customerAddress = customer?.address?.address || "Sin dirección";
                } catch (err) {
                    console.log("Cliente no encontrado en Siigo:", inv.customer);
                }

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
                    client: customerName,
                    cc: customerCC,
                    address_client: customerAddress,
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

            return { code: 200, data: result };
        } catch (error) {
            return { code: 500, message: "Error al obtener las facturas por fecha", error: error.message };
        }
    }
};

export default ReportService;