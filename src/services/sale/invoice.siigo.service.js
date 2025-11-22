import SiigoConfig from "../../config/siigo.config.js";
import { pool } from "../../database/conexion.js";
import moment from "moment-timezone";

const InvoiceSiigoService = {
    async Create (data) {
        try {
            const client = await SiigoConfig.createClient(data.company)
            const response = await client.post("invoices", data)
            const invoiceSiigo = response.data
            console.log("Facura inmediata", invoiceSiigo)
            const invoiceId = invoiceSiigo.id;

            // 2️⃣ Esperar CUFE usando polling
            const invoiceWithCufe = await this.waitForCUFE(client, invoiceId);
            console.log(invoiceWithCufe)

            return { code: 201, message: "Factura creada en siigo", data: invoiceWithCufe}
        } catch (error) {
            console.log("❌ Error completo Siigo:");

            if (error.response) {
                console.log("Status:", error.response.status);
                console.log("Headers:", error.response.headers);
                console.log("Data:", JSON.stringify(error.response.data, null, 2)); 
            } else if (error.request) {
                // La petición se hizo pero no hubo respuesta
                console.log("No response received:", error.request);
            } else {
                console.log("Error en configuración:", error.message);
            }

             // Detectar códigos comunes de Siigo
            let userMessage = "ERROR: No se pudo crear la factura en Siigo.";

            const status = error.response?.status;

            switch (status) {
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
                    userMessage = "Error inesperado en Siigo. Inténtalo nuevamente.";
                    break;
            }

            return { 
                code: 501, 
                message: userMessage, 
                error: error.message,
                details: error.response?.data || null
            }
        }

    },

      // 3️⃣ Método reusable para obtener el CUFE
    async waitForCUFE(client, invoiceId) {
        const maxAttempts = 10;   // ~ 30 segundos máximo
        const delay = 3000;       // 3s entre intentos

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`⏳ Esperando CUFE... intento ${attempt}/${maxAttempts}`);

            const res = await client.get(`invoices/${invoiceId}`);
            const invoice = res.data;

            if (invoice.stamp?.status === "Accepted" && invoice.stamp?.cufe) {
                console.log("✅ CUFE obtenido:", invoice.stamp.cufe);
                return invoice;
            }

            // esperar antes del próximo intento
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log("⚠ No se obtuvo CUFE dentro del tiempo esperado.");
        return null;
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
                receipt_cash, receipt_transfer, total_payment, repay, cufe,
                invoiceItem
            } = data;
            const created_at = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss");

            // Insertar factura
            const [invoiceResult] = await pool.query(
                `INSERT INTO sale_invoice 
                (company, code, sale_point, cash_session, seller, customer,
                subtotal, tax0, tax5, tax19, total, receipt_cash, receipt_transfer, total_payment, repay, cufe, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    company, code, sale_point, cash_session, seller, client,
                    subtotal, tax0, tax5, tax19, total, receipt_cash,
                    receipt_transfer, total_payment, repay, cufe, created_at
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
                        item.quantity, item.unit_price, 0, item.tax5,
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
                created_at: moment(invoiceCreated.created_at).format("YYYY-MM-DD hh:mm A"),
                expire_at: moment(invoiceCreated.created_at).format("YYYY-MM-DD hh:mm A"),
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
                cufe,
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
            //console.log("Tipos de factura de siigo", typeInvoice.data)

            return { code: 201, data: typeInvoice.data}   
        } catch (error) {
            return { code: 501, message: "ERROR: No se pudieron traer los tipos de factura de siigo", error: error.message}
        }
    }

}

export default InvoiceSiigoService