// Escenario 3: Aumento gradual hasta saturación (duración total por defecto: 5m30s)
__ENV.SCENARIO = "ramp";
__ENV.MAX_VUS = __ENV.MAX_VUS || "80";

export { options, setup, default, handleSummary } from "./neonbeat-load.js";
