// Escenario 2: Carga sostenida con usuarios concurrentes configurables (duración mínima por defecto: 5m)
__ENV.SCENARIO = "sustained";
__ENV.VUS = __ENV.VUS || "20";
__ENV.DURATION = __ENV.DURATION || "5m";

export { options, setup, default, handleSummary } from "./neonbeat-load.js";
