// src/utils/calculateZise

export default function calculateSize(data, unit = "KB", decimals = 2) {
    const json = JSON.stringify(data);
    const bytes = Buffer.byteLength(json, "utf8");

    const units = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
    };

    if (!units[unit]) throw new Error("Unidad inválida: B, KB, MB, GB");

    return Number((bytes / units[unit]).toFixed(decimals));
}

