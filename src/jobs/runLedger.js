// jobs/runLedger.js
import cron from "node-cron";
import MovementServices from "../services/inventory/movement.service.js";

const timezone = "America/Bogota";

// 1. INICIO: Todos los días a las 00:01 AM (Crea el registro con opening_stock)
cron.schedule("1 0 * * *", async () => {
    console.log(`[CRON] InitLedger ejecutándose: ${new Date().toISOString()}`);
    try {
        await MovementServices.InitLedger();
        console.log("[CRON] InitLedger completado");
    } catch (error) {
        console.error("[CRON] Error:", error);
    }
}, { timezone });