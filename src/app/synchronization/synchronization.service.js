import { pool } from "../../database/conexion.js"
import moment from "moment-timezone"
import SiigoConfig from "../../config/siigo.config.js"

const siigoSchema = {
    document: { id: 40417 },
    date: "2026-06-12",
    customer:  { 
        person_type: "Person", 
        id_type: "13", 
        identification: "222222222222",
        branch_office: 0,
        name: [ "Consumidor", "Final" ],
        address: { 
            address: "Sin Dirección", 
            city: {}, 
            postal_code: null 
        },
        phones: [
            { indicative: null, number: null, extension: null }
        ],
        contacts: [ 
            {
                first_name: "Consumidor",
                last_name: "Final",
                email: null,
                phone:  { indicative: null, number: null, extension: null },
            }
        ],
    },
    cost_center: 1163,
    stamp: { send: true },
    mail: { send: true},
    observations: "Venta realizada en punto de venta",
    items: [
        { code: "000001", description: "CARNE DE ASAR", discount: 0, price: 30000, quantity: 1, taxes: [{ id: 14033 }], warehouse: 26 }
    ],
    payments: [
        { id: 10779, value: 20000, due_date: "2026-06-12" }
    ],
    globaldiscounts: [
        {
            id: "",
            percentage: "",
            value: ""
        }
    ],
    additional_fields: {}
}

const synchronizationService = {
    async synchInvoices (invoicesIds) {
        try {
            const [invoiceRows] = await pool.query(
                `SELECT * FROM sale_invoice WHERE id IN (?)`,
                [invoicesIds]
            )
            const [itemRows] = await pool.query(
                `SELECT * FROM sale_invoice_item WHERE invoice IN (?)`,
                [invoicesIds]
            )

            const itemsByInvoice = itemRows.reduce((acc, item) => {
                if(!acc[item.invoice]) {
                    acc[item.invoice] = []
                }

                acc[item.invoice].push(item)

                return acc
            }, {})

            const client = await SiigoConfig.createClient(1)
            const results = []

            for (const invoice of invoiceRows) {
                try {
                    const invoiceItems = 
                        itemsByInvoice[invoice.id] || []
                    const date = moment().format('YYYY-MM-DD')
                    const payments = []

                    if(Number(invoice.receipt_cash) > 0) {
                        payments.push({
                            id: 10780,
                            value: Number(invoice.receipt_cash),
                            due_date: date
                        });
                    }

                    if (Number(invoice.receipt_transfer) > 0) {
                        payments.push({
                            id: 7057,
                            value: Number(invoice.receipt_transfer),
                            due_date: date
                        });
                    }

                    if (Number(invoice.receipt_datafono) > 0) {
                        payments.push({
                            id: 10821,
                            value: Number(invoice.receipt_datafono),
                            due_date: date
                        });
                    }

                    if (Number(invoice.receipt_davivienda) > 0) {
                        payments.push({
                            id: 7095,
                            value: Number(invoice.receipt_davivienda),
                            due_date: date
                        });
                    }

                    const payload = {
                        document: { id: 40416 },
                        date,
                        customer: {
                            person_type: "Person",
                            id_type: "13",
                            identification: "222222222222",
                            branch_office: 0,
                            name: ["Consumidor", "Final"],
                            address: {
                                address: "Sin Dirección"
                            }
                        },
                        cost_center: 1167,
                        seller: 959,
                        stamp: {
                            send: true
                        },

                        mail: {
                            send: false
                        },

                        observations:
                            `Factura POS ${invoice.code}`,
                        
                        items: invoiceItems.map(item => ({
                            code: item.product_barcode,
                            description: item.product_name,
                            quantity: Number(item.quantity),
                            price: Number(item.unit_price),
                            discount: Number(item.discount),

                            taxes: [
                                {
                                    id: Number(item.tax19) === 0 ? 14033 : 7822
                                }
                            ],

                            warehouse: 28
                        })),

                        payments,

                        additional_fields: {}
                    }

                    const { data } = await client.post('invoices', payload)

                    const newCode = data?.name || invoice.code
                    const newCufe = data?.stamp?.cufe || invoice.cufe

                    await pool.query(
                        `UPDATE sale_invoice
                        SET
                            code = ?,
                            cufe = ?
                        WHERE id = ?
                        `,
                        [newCode, newCufe, invoice.id]
                    );
                } catch (error) {
                    console.error(
                        `Error factura ${invoice.code}`,
                        error.response?.data || error.message
                    );
                }
            }

            return { code: 201, message: "Sincronización de facturas con éxito" }
        } catch (error) {
            return {
                code: 501,
                message: "Error no se pudieron sincronizar las facturas",
                error
            }
        }
    }
}

export default synchronizationService;