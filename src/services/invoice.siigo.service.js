import SiigoConfig from "../config/siigo.config.js";
import { pool } from "../database/conexion.js";

const InvoiceSiigoService = {
    async Create (data) {
        try {
            const client = await SiigoConfig.createClient(data.company)
            const response = await client.post("invoices", data)
            const invoiceSiigo = response.data

            return { code: 201, message: "Factura creada en siigo", data: invoiceSiigo}
        } catch (error) {
            console.log(" Error completo Siigo:");
    
            if (error.response) {
                console.log(" Status:", error.response.status);
                console.log(" Headers:", error.response.headers);
                console.log(" Data:", error.response.data); 
            } else {
                console.log(" Error sin response:", error.message);
            }
            return { code: 501, message: "ERROR: No se pudo crear la factura en siigo", error: error.message }
        }
    },

    async CreatePOS(data) {
        try {
            // Validación mínima
            if (!data || !data.invoiceItem || !Array.isArray(data.invoiceItem)) {
                return { code: 400, message: "Datos incompletos o inválidos" };
            }

            const {
                company, code, sale_point, cash_session, seller,
                client, subtotal, tax0, tax5, tax19, total,
                receipt_cash, receipt_transfer, total_payment, repay, 
                invoiceItem
            } = data;

            // Insertar factura
            const [invoiceResult] = await pool.query(
                `INSERT INTO sale_invoice 
                (company, code, sale_point, cash_session, seller, customer,
                subtotal, tax0, tax5, tax19, total, receipt_cash, receipt_transfer, total_payment, repay)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    company, code, sale_point, cash_session, seller, client,
                    subtotal, tax0, tax5, tax19, total, receipt_cash,
                    receipt_transfer, total_payment, repay
                ]
            );

            const invoiceId = invoiceResult.insertId;

            // Insertar items (opcional: bulk insert)
            for (const item of invoiceItem) {
                await pool.query(
                    `INSERT INTO sale_invoice_item 
                    (invoice, company, product_name, product_barcode, quantity,
                    unit_price, tax0, tax5, tax19, total)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        invoiceId, company, item.product_name, item.product_barcode,
                        item.quantity, item.unit_price, item.tax0, item.tax5,
                        item.tax19, item.total
                    ]
                );
            }

            // Consultas necesarias
            const [[companyData]] = await pool.query(
                'SELECT nit, logo, address, city, cell FROM company WHERE id = ? LIMIT 1',
                [company]
            );

            const [[salePointData]] = await pool.query(
                'SELECT name FROM sale_point WHERE id = ? LIMIT 1',
                [sale_point]
            );

            const [[sellerData]] = await pool.query(
                'SELECT name FROM user WHERE id = ? LIMIT 1',
                [seller]
            );

            // Consultar cliente en Siigo UNA vez
            const clientAxios = await SiigoConfig.createClient(company);
            const { data: customer } = await clientAxios.get(`customers/${client}`);

            const customerName = customer?.name?.join(" ") || "Sin nombre";
            const customerCC = customer?.identification || "N/A";
            const customerAddress = customer?.address?.address || "Sin dirección";

            // Obtener fecha real desde MySQL
            const [[invoiceCreated]] = await pool.query(
                "SELECT created_at FROM sale_invoice WHERE id = ?",
                [invoiceId]
            );

            // Estructurar JSON
            const printData = {
                logo: companyData.logo,
                company: companyData.company,
                nit: companyData.nit,
                address: companyData.address,
                city: companyData.city,
                cell: companyData.cell,
                code,
                caja: salePointData.name,
                created_at: new Date(invoiceCreated.created_at).toLocaleString("es-CO"),
                expire_at: new Date(invoiceCreated.created_at).toLocaleString("es-CO"),
                client: customerName,
                cc: customerCC,
                address_client: customerAddress,
                vendedor: sellerData.name,
                subtotal,
                descuento: 0,
                tax0,
                tax5,
                tax19,
                total,
                receipt_cash,
                receipt_transfer,
                total_payment,
                repay,
            };

            return { code: 201, message: "Factura creada en POS", data: printData };

        } catch (error) {
            return {
                code: 501,
                message: "ERROR: No se pudo crear la factura en el POS",
                error: error.message,
                sql: error.sqlMessage || null
            };
        }
    },

    async TypeInvoice (company) {
        try {
            const client = await SiigoConfig.createClient(company)
            const typeInvoice = await client.get("document-types?type=FV")

            return { code: 201, data: typeInvoice.data}   
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudieron traer los tipos de factura de siigo", error: error.message}
        }
    }

}

export default InvoiceSiigoService