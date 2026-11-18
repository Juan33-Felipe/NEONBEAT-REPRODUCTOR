// Escenario 1: Línea base con 1 usuario virtual (duración mínima por defecto: 5m)
__ENV.SCENARIO = "baseline";
__ENV.VUS = "1";
__ENV.DURATION = __ENV.DURATION || "5m";

export { options, setup, default, handleSummary } from "./neonbeat-load.js";
