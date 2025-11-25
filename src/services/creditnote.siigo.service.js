import SiigoConfig from "../config/siigo.config.js"
import { pool } from "../database/conexion.js"
import moment from "moment-timezone"

/// -----------------------------------------------------------
/// Función para determinar tax0, tax5, tax19 por porcentaje
/// -----------------------------------------------------------
function getTaxValues(item) {
    let tax0 = 0, tax5 = 0, tax19 = 0;

    const tax = item.taxes?.[0];

    if (!tax) return { tax0, tax5, tax19 };

    const amount = Number(tax.value);
    const percentage = Number(tax.percentage);

    if (percentage === 0) tax0 = isNaN(amount) ? 0 : amount;
    if (percentage === 5) tax5 = isNaN(amount) ? 0 : amount;
    if (percentage === 19) tax19 = isNaN(amount) ? 0 : amount;

    return { tax0, tax5, tax19 };
}


/// -----------------------------------------------------------
/// Calcula totales generales de la NC
/// -----------------------------------------------------------
function calculateTotals(items) {
    let subtotal = 0, tax0 = 0, tax5 = 0, tax19 = 0;

    for (const item of items) {
        subtotal += item.price * item.quantity;

        const t = getTaxValues(item);
        tax0 += t.tax0;
        tax5 += t.tax5;
        tax19 += t.tax19;
    }

    return { subtotal, tax0, tax5, tax19 };
}

function num(n) {
    return (typeof n === "number" && !isNaN(n) && isFinite(n)) ? n : 0;
}


const CreditNoteSiigoService = {
    async CreatePOS (company) {
        try {
            const date = moment().tz("America/Bogota").format("YYYY-MM-DD");
            const created_at = moment().tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss");

            const client = await SiigoConfig.createClient(company)
            const response = await client.get(`credit-notes?created_start=${date}`)
            const creditNotes = response.data.results
            //console.log("Notas de credito de siigo", creditNotes)

            if (creditNotes.length === 0) {
                return { code: 201, message: "No hay notas nuevas hoy." };
            }



           /// ------------------------------
            /// 3. Procesar cada nota
            /// ------------------------------
            for (const creditNote of creditNotes) {

                // 1. Evitar duplicados
                const [exists] = await pool.query(
                    "SELECT id FROM sale_invoice WHERE code = ? LIMIT 1",
                    [creditNote.name]
                );

                if (exists.length > 0) continue;

                /// ------------------------------
                /// Buscar factura original
                /// ------------------------------
                const [original] = await pool.query(
                    "SELECT * FROM sale_invoice WHERE code = ? LIMIT 1",
                    [creditNote.invoice.name]
                );

                if (!original.length) {
                    console.warn("⚠ Factura original no encontrada:", creditNote.invoice.name);
                    continue;
                }

                const originalInvoice = original[0];

                ///------------------------------
                /// Totales de la nota
                ///------------------------------
                const totals = calculateTotals(creditNote.items);

                /// ------------------------------
                /// 4. Insertar nota de crédito en sale_invoice
                /// ------------------------------
                const [insertResult] = await pool.query(
                    `INSERT INTO sale_invoice (
                        company, type, reference_invoice, code,
                        sale_point, cash_session, seller, customer,
                        subtotal, tax0, tax5, tax19, total,
                        receipt_cash, total_payment, reason, cufe, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        originalInvoice.company,
                        "credit-note",
                        creditNote.invoice.name,
                        creditNote.name,
                        originalInvoice.sale_point,
                        originalInvoice.cash_session,
                        originalInvoice.seller,
                        originalInvoice.customer,
                        num(totals.subtotal),
                        num(totals.tax0),
                        num(totals.tax5),
                        num(totals.tax19),
                        num(creditNote.total),
                        num(creditNote.total),
                        num(creditNote.total),
                        creditNote.reason,
                        "No aplica",
                        created_at
                    ]
                );

                const creditId = insertResult.insertId;

                // ---- Calcular peso de la nota ----
                const [[creditSize]] = await pool.query(
                    "SELECT ROUND((LENGTH(JSON_OBJECT(*))/1024), 2) AS kb FROM sale_invoice WHERE id = ?",
                    [creditId]
                );

                await pool.query(
                    "UPDATE plan SET storage_used = storage_used + ? WHERE id = (SELECT plan FROM company WHERE id = ?)",
                    [creditSize.kb, originalInvoice.company]
                );


                /// ------------------------------
                /// 5. Insertar ítems negativos
                /// ------------------------------
                for (const item of creditNote.items) {
                    const taxes = getTaxValues(item);

                    await pool.query(
                        `INSERT INTO sale_invoice_item (
                            company, invoice, product_name, product_barcode, quantity,
                            unit_price, tax0, tax5, tax19, total
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            originalInvoice.company,
                            creditId,
                            item.description,
                            item.code,
                            -Math.abs(item.quantity),
                            item.price,
                            0,
                            -Math.abs(taxes.tax5),
                            -Math.abs(taxes.tax19),
                            -Math.abs(item.total)
                        ]
                    );

                    const itemId = itemInsert.insertId;

                    // ---- Calcular peso del item ----
                    const [[itemSize]] = await pool.query(
                        "SELECT ROUND((LENGTH(JSON_OBJECT(*))/1024), 2) AS kb FROM sale_invoice_item WHERE id = ?",
                        [itemId]
                    );

                    await pool.query(
                        "UPDATE plan SET storage_used = storage_used + ? WHERE id = (SELECT plan FROM company WHERE id = ?)",
                        [itemSize.kb, originalInvoice.company]
                    );
                }

                /// ------------------------------
                /// 6. Cambiar la factura original a "credited"
                /// ------------------------------
                await pool.query(
                    "UPDATE sale_invoice SET status = 'credited' WHERE id = ?",
                    [originalInvoice.id]
                );
            }

            return {code: 201, message: "Notas de Credito registradas en el POS"}
        } catch (error) {

            // Detectar código HTTP de Siigo
            const status = error.response?.status;

            let userMessage = "Siigo está presentando problemas técnicos. No reinicies la aplicación.";

            switch (status) {

                case 429:
                    userMessage = 
                        "Siigo está recibiendo demasiadas peticiones en este momento. " +
                        "Tu solicitud fue recibida, pero Siigo está limitando el tráfico. " +
                        "No reinicies el sistema. Espera unos segundos e inténtalo de nuevo.";
                    break;

                case 500:
                case 502:
                case 503:
                case 504:
                    userMessage =
                        "Siigo está experimentando fallas en su servicio. " +
                        "Tu sistema funciona correctamente. Solo debes esperar a que el servicio de Siigo se estabilice.";
                    break;

                default:
                    userMessage = 
                        "Ocurrió un error inesperado al comunicarse con Siigo. " +
                        "Tu sistema está funcionando bien, es un problema del servicio de Siigo.";
                    break;
            }

            console.error("🔥 ERROR COMPLETO:", {
                message: error.message,
                stack: error.stack,
                siigoStatus: status,
                siigoResponse: error.response?.data,
            });

            return {
                code: 501,
                message: userMessage,
                error: error.message,
                details: error.response?.data || null
            };
        }
    },

    async ByDate (company, date) {
        try {
            console.log("Filtros: ", company, date)
            // Traer todas las notas de crédito
            const [notes] = await pool.query(`
                SELECT 
                si.id,
                si.code,
                si.reference_invoice,
                si.company,
                si.sale_point,
                si.cash_session,
                si.seller,
                si.customer,
                si.subtotal,
                si.tax0,
                si.tax5,
                si.tax19,
                si.total,
                si.reason,
                si.status,
                si.created_at,
                si.updated_at,
                sp.name AS sales_point_name,
                u.name AS seller_name
                FROM sale_invoice si
                LEFT JOIN sale_point sp ON sp.id = si.sale_point
                LEFT JOIN user u ON u.id = si.seller
                WHERE si.type = ? AND si.company = ? AND DATE(si.created_at) = ?
                ORDER BY si.created_at DESC
            `, ['credit-note', company, date]);

            // 🔹 Traer los items de cada nota
            for (const note of notes) {
                const [items] = await pool.query(
                `SELECT product_name, product_barcode, quantity, unit_price, discount, tax0, tax5, tax19, total
                FROM sale_invoice_item
                WHERE invoice = ?`,
                [note.id]
                );
                note.items = items;
            }

            return { code: 201, data: notes}

            
        } catch (error) {
            return { code: 501, message: "Error no se pudieron traer las notas de credito", error: error.message}
        }
    }
}

export default CreditNoteSiigoService