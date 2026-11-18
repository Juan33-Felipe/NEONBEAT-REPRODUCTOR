param(
  [string]$Scenario = "baseline",
  [string]$Duration = "5m",
  [int]$Vus = 15,
  [int]$MaxVus = 80,
  [string]$BaseUrl = "http://localhost:3001",
  [int]$SampleIntervalMs = 2000
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ResultsDir = Join-Path $PSScriptRoot "results"

if (-not (Test-Path $ResultsDir)) {
  New-Item -ItemType Directory -Path $ResultsDir | Out-Null
}

$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH-mm-ssZ")
$Label = "${Scenario}-${Timestamp}"
$SummaryFile = "measurements/results/k6-${Label}-summary.json"

Write-Host "[Experimento] Iniciando recolector de métricas del sistema ($Label)..." -ForegroundColor Cyan
$CollectorProc = Start-Process -FilePath "node" `
  -ArgumentList "`"$PSScriptRoot\collect-metrics.mjs`" --label `"$Label`" --interval $SampleIntervalMs" `
  -WorkingDirectory $RepoRoot `
  -PassThru -NoNewWindow

try {
  Start-Sleep -Seconds 2
  Write-Host "[Experimento] Ejecutando k6 (Escenario=$Scenario, Duración=$Duration, VUs=$Vus)..." -ForegroundColor Green

  if (Get-Command "k6" -ErrorAction SilentlyContinue) {
    k6 run `
      -e BASE_URL=$BaseUrl `
      -e SCENARIO=$Scenario `
      -e DURATION=$Duration `
      -e VUS=$Vus `
      -e MAX_VUS=$MaxVus `
      -e SUMMARY_FILE=$SummaryFile `
      "$RepoRoot\load-tests\neonbeat-load.js"
  } else {
    $DockerBaseUrl = $BaseUrl -replace "localhost", "host.docker.internal" -replace "127\.0\.0\.1", "host.docker.internal"
    docker run --rm -i `
      -v "${RepoRoot}:/work" -w /work `
      -e BASE_URL=$DockerBaseUrl `
      -e SCENARIO=$Scenario `
      -e DURATION=$Duration `
      -e VUS=$Vus `
      -e MAX_VUS=$MaxVus `
      -e SUMMARY_FILE=$SummaryFile `
      grafana/k6:latest run /work/load-tests/neonbeat-load.js
  }
} finally {
  Write-Host "[Experimento] Deteniendo recolector de métricas..." -ForegroundColor Cyan
  if ($CollectorProc -and -not $CollectorProc.HasExited) {
    Stop-Process -Id $CollectorProc.Id -Force -ErrorAction SilentlyContinue
  }
  Write-Host "[Experimento] Resultados guardados en: $ResultsDir" -ForegroundColor Green
}
