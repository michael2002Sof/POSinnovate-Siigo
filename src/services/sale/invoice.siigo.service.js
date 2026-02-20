import SiigoConfig from "../../config/siigo.config.js";
import { pool } from "../../database/conexion.js";
import moment from "moment-timezone";
import calculateSize from "../../utils/calculateZise.js";

const InvoiceSiigoService = {
    async Create (data) {
        try {
            const client = await SiigoConfig.createClient(data.company)
            const response = await client.post("invoices", data)

            const invoiceSiigo = response.data

            return { 
                code: 201, 
                message: "Factura creada en siigo",
                data: invoiceSiigo,
            }
        } catch (error) {
            console.log("Error completo Siigo:");

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

    async byCodeSiigo(params){
        try {
            const { company, code } = params
            const client = await SiigoConfig.createClient(company)
            const response = await client.get(`invoices?name=${code}`)
            const invoice = response.data
            
            return { code: 200, data: invoice }
        } catch (error) {
            return {
                code: 501,
                message: "Error: No se pudo buscar el cufe",
                error: error.message
            }
        }
    },

    // 3️⃣ Método reusable para obtener el CUFE
    async waitForCUFE(client, invoiceId) {
        const maxTotalTime = 90000;    // 90 segundos
        const interval = 3000;        // cada 3 segundos
        const startTime = Date.now();

        while (true) {
            const elapsed = Date.now() - startTime;
            //console.log(`⏳ Consultando CUFE... (${Math.floor(elapsed/1000)}s)`)

            try {
                const res = await client.get(`invoices/${invoiceId}`);
                const invoice = res.data;


                // Si ya fue aceptada → CUFE disponible
                if (invoice.stamp?.status === "Accepted" && invoice.stamp?.cufe) {
                    //console.log("✅ CUFE obtenido:", invoice.stamp.cufe);
                    return invoice;
                }
            } catch (error) {
                console.log("❌ Error consultando CUFE:", error.message);
            }

            // Si se pasó el tiempo máximo → salimos
            if (elapsed >= maxTotalTime) {
                console.log("⚠ Tiempo máximo alcanzado. CUFE no disponible aún.");
                return null;
            }

            // Esperamos antes del próximo intento
            await new Promise(res => setTimeout(res, interval));
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
                client, customerName, customerCC, customerAddress,
                subtotal, tax0, tax5, tax19, total,
                receipt_cash, receipt_transfer, receipt_datafono, total_payment, repay, cufe,
                invoiceItem
            } = data;
            const created_at = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss");

            // --------------------------------------
            // 1) Insertar factura
            // --------------------------------------
            const [invoiceResult] = await pool.query(
                `INSERT INTO sale_invoice 
                (company, code, sale_point, cash_session, seller, customer,
                subtotal, tax0, tax5, tax19, total, receipt_cash, receipt_transfer, receipt_datafono, total_payment, repay, cufe, created_at, customer_name, customer_cc, customer_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    company, code, sale_point, cash_session, seller, client,
                    subtotal, tax0, tax5, tax19, total, receipt_cash,
                    receipt_transfer, receipt_datafono, total_payment, repay, cufe, created_at,
                    customerName, customerCC, customerAddress
                ]
            );

            const invoiceId = invoiceResult.insertId;

            // --------------------------------------
            // 2) Insertar items 
            // --------------------------------------
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
            const [[salePointData]] = await pool.query(
                'SELECT name FROM sale_point WHERE id = ? LIMIT 1',
                [sale_point]
            );

            const [[sellerData]] = await pool.query(
                'SELECT name FROM user WHERE id = ? LIMIT 1',
                [seller]
            );

            // Obtener fecha real desde MySQL
            const [[invoiceCreated]] = await pool.query(
                "SELECT created_at FROM sale_invoice WHERE id = ?",
                [invoiceId]
            );

            // Estructurar JSON
            const printData = {
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
                receipt_datafono,
                total_payment,
                repay,
                cufe,
            };

            // --------------------------------------
            // Calcular peso de la factura
            // --------------------------------------
            const sizeKB = calculateSize(data, "KB");
            await pool.query(
            `UPDATE plan SET storage_used = storage_used + ? 
                WHERE id = (SELECT plan FROM company WHERE id = ?)`,
            [sizeKB, data.company]
            );

            return { code: 201, message: "Factura creada en POS", data: printData };

        } catch (error) {
            return {
                code: 501,
                message: "ERROR: No se pudo crear la factura en el POS",
                error: error.message,
                details: error
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
    },

}

export default InvoiceSiigoService