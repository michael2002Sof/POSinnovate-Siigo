import {pool} from "../../database/conexion.js";
import { mailer } from "../../config/nodemailer.config.js";


export const SubcriptionService = {
  async Renovation(data, voucher) {
    try {
      const { admin, company, plan, amount, start_date, end_date, payment_notice } = data;

      // Validaciones mínimas
      if (!admin || !company || !plan || !amount || !start_date || !end_date) {
        return {
          code: 400,
          message: "Faltan campos requeridos (admin, company, plan, amount, start_date, end_date).",
        };
      }

      if (!voucher || !voucher.buffer) {
        return {
          success: false,
          code: 400,
          message: 'El comprobante es requerido (campo "voucher").',
        };
      }

      // 1) Enviar correo a correo oficial (MAIL_TO)
      const info = await mailer.sendMail({
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO,
        subject: `Pago de suscripción - ${company}`,
        text:
          `La suscripción ha sido pagada.\n` +
          `Usuario (admin): ${admin}\n` +
          `Empresa: ${company}\n` +
          `Plan ID: ${plan}\n` +
          `Monto: ${amount}\n` +
          `Vigencia: ${start_date} -> ${end_date}\n` +
          `Nota: ${payment_notice ?? ""}\n`,
        html: `
          <h3>Pago de suscripción recibido</h3>
          <ul>
            <li><b>Usuario (admin):</b> ${admin}</li>
            <li><b>Empresa:</b> ${company}</li>
            <li><b>Plan ID:</b> ${plan}</li>
            <li><b>Monto:</b> ${amount}</li>
            <li><b>Vigencia:</b> ${start_date} → ${end_date}</li>
            <li><b>Nota:</b> ${payment_notice ?? ""}</li>
          </ul>
          <p>Se adjunta el comprobante.</p>
        `,
        attachments: [
          {
            filename: voucher.originalname || "voucher",
            content: voucher.buffer,
            contentType: voucher.mimetype,
          },
        ],
      });

      if (info?.rejected?.length) {
        return {
          success: false,
          code: 502,
          message: `SMTP rechazó el envío a: ${info.rejected.join(", ")}`,
          meta: { messageId: info.messageId, response: info.response },
        };
      }

      //2) Actualizar plan del admin
      await pool.query(`
        UPDATE plan 
        SET status = 'active', start_date = ?, end_date = ?, payment_notice = ? 
        WHERE admin = ? AND id = ?
        `, [start_date, end_date, payment_notice, admin, plan]
      )


      await pool.query(`UPDATE company SET status = 'active' WHERE id = ?`, [company] );
      await pool.query(`UPDATE user SET status = 'active' WHERE company = ?`, [company] );
      await pool.query(`UPDATE admin SET status = 'active' WHERE id = ?`, [admin] );

      return {
        code: 201,
        message: "Subscription renovada, tu pago será verificado pronto.",
      };
    } catch (error) {
      return {
        code: 500,
        message: "Error interno del servidor.",
        error: error.message,
      };
    }
  },

  async Suspend(data) {
    try {
      const {company} = data;
      console.log("Suspending subscription for company:", company);

      const [[companyData]] = await pool.query(`SELECT * FROM company WHERE id = ?`, [company] );

      //1) Actualizar estado del plan a 'suspended'
      await pool.query(`
        UPDATE plan 
        SET status = 'suspended' 
        WHERE id = ?
        `, [companyData.plan]
      );
      // 2) Inactivar empresa
      await pool.query(`UPDATE company SET status = 'inactive' WHERE id = ?`, [company] );
      // 3) Inactivar todos los usuarios de la empresa
      await pool.query(`UPDATE user SET status = 'inactive' WHERE company = ?`, [company]);

      // 4) Inactivar admin owner de la empresa
      await pool.query(`UPDATE admin SET status = 'inactive' WHERE id = ?`, [companyData.owner] );

      return {
        code: 200,
        message: "Subscription suspendida, debido a falta de renovación.",
      };

    } catch (error) {
      return {
        code: 500,
        message: "Error interno del servidor.",
        error: error.message,
      };
    }
  },
};
