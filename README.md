# NeonBeat Reproductor — Full-Stack Audio Streaming Platform

Aplicación completa de reproducción y streaming de música con **Frontend (React + TypeScript + Vite)**, **Backend REST API (Node.js + TypeScript + Express)**, **Base de Datos (SQLite + Prisma ORM)**, almacenamiento persistente de archivos de audio con streaming **HTTP Range (`206 Partial Content`)**, contenedorización con **Docker / Docker Compose**, pruebas de carga con **k6** y recolección de métricas del sistema.

---

## 1. Arquitectura y Estructura del Proyecto

Para conservar intacto el historial de Git y evitar riesgos innecesarios al mover la configuración original de Vite, el código fuente del **frontend** permanece en la raíz del repositorio (`src/`, `index.html`, `vite.config.js`), mientras que los artefactos de contenedorización del frontend se ubican en `/frontend`.

```text
NEONBEAT-REPRODUCTOR/
├── src/                          # Código fuente del Frontend React + TypeScript
│   ├── components/               # UI Glassmórfica (MusicPlayer, AllTracksList, QueuePanel, PlayerControls, Bars, Ring, ParticleCanvas)
│   ├── core/Sequence.ts          # Lista doblemente enlazada para la cola de reproducción
│   ├── engine/Player.ts          # Servicio singleton HTMLAudioElement + Web Audio AnalyserNode
│   ├── library/Scanner.ts        # Selección de archivos/carpetas y modo de respaldo local
│   ├── services/api.ts           # Capa centralizada para consumir la API REST y streaming
│   ├── services/moodDetector.ts  # Detección visual de ambiente según el título
│   └── shared/Models.ts          # Modelos TypeScript compartidos (Track, PlayerState)
├── frontend/                     # Configuración Docker y Nginx del contenedor Frontend
│   ├── Dockerfile                # Construcción multi-etapa (Node 20 Alpine -> Nginx Alpine)
│   └── nginx.conf                # Servidor SPA y proxy inverso para /api
├── backend/                      # Servidor API REST, Prisma ORM y streaming HTTP Range
│   ├── prisma/
│   │   ├── schema.prisma         # Esquema de datos (Track y PlaybackEvent)
│   │   └── migrations/           # Migraciones SQLite generadas con Prisma
│   ├── storage/audio/            # Almacenamiento físico de archivos de audio subidos
│   ├── src/
│   │   ├── app.ts                # Configuración de Express, CORS y manejo global de errores JSON
│   │   ├── index.ts              # Punto de entrada del servidor HTTP
│   │   ├── config.ts             # Variables de entorno y límites
│   │   ├── prisma.ts             # Instancia singleton de PrismaClient
│   │   ├── seed.ts               # Generador de pistas WAV válidas para pruebas iniciales
│   │   ├── resetDb.ts            # Limpieza de base de datos y archivos entre experimentos
│   │   ├── routes/               # Endpoints (/api/health, /api/tracks, /api/playback-events, /api/stats)
│   │   └── utils/audioValidation.ts # Validación de formatos/MIME, sanitización y anti-path-traversal
│   ├── tests/api.test.ts         # Suite de pruebas automatizadas (Vitest + Supertest)
│   ├── Dockerfile                # Imagen del backend con ejecución automática de migraciones
│   └── docker-entrypoint.sh      # Script de arranque del contenedor backend
├── load-tests/                   # Scripts reproducibles de pruebas de carga con k6
│   ├── neonbeat-load.js          # Script principal parametrizable (catálogo, Range 206, play, eventos)
│   ├── scenario-1-baseline.js    # Escenario 1: Línea base con 1 usuario virtual (5 min)
│   ├── scenario-2-sustained.js   # Escenario 2: Carga sostenida concurrente (5 min)
│   └── scenario-3-ramp-saturation.js # Escenario 3: Rampa gradual hasta saturación (>= 5 min)
├── measurements/                 # Scripts de recolección periódica de métricas del sistema
│   ├── collect-metrics.mjs       # Recolector multiplataforma (CPU total/núcleo, RAM, Disco, IOPS, Red, Docker)
│   ├── run-experiment.ps1        # Orquestador en PowerShell (métricas + k6 correlacionados)
│   ├── run-experiment.sh         # Orquestador en Bash (métricas + k6 correlacionados)
│   └── results/                  # Directorio de salida para CSV y JSON crudos (ignorado en Git)
├── docker-compose.yml            # Orquestación de contenedores y límites de CPU/Memoria
└── README.md                     # Documentación completa
```

---

## 2. Requisitos

- **Node.js** >= 20.x y **npm** >= 10.x (para ejecución local sin Docker).
- **Docker** >= 24.x y **Docker Compose** v2+ (para ejecución contenedorizada y límites de recursos).
- **k6** (instalado localmente o ejecutado mediante la imagen oficial `grafana/k6` con Docker).
- No requiere servicios externos ni conexión a internet después de instalar las dependencias.

---

## 3. Instalación (Sin Docker)

1. **Instalar dependencias del frontend (raíz):**
   ```bash
   npm install
   ```

2. **Instalar dependencias del backend:**
   ```bash
   cd backend
   npm install
   ```

3. **Configurar variables de entorno:**
   - En la raíz existe `.env` (basado en `.env.example`):
     ```env
     VITE_API_URL=http://localhost:3001
     ```
   - En `backend/.env` (basado en `backend/.env.example`):
     ```env
     PORT=3001
     DATABASE_URL="file:./dev.db"
     STORAGE_DIR="./storage/audio"
     MAX_FILE_SIZE_BYTES=52428800
     CORS_ORIGIN="*"
     ```

---

## 4. Variables de Entorno

### Frontend (`.env`)
| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL base del backend consumida por la capa API | `http://localhost:3001` |

### Backend (`backend/.env`)
| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP del servidor Express | `3001` |
| `DATABASE_URL` | Cadena de conexión de SQLite para Prisma | `"file:./dev.db"` |
| `STORAGE_DIR` | Ruta donde se almacenan los archivos de audio | `"./storage/audio"` |
| `MAX_FILE_SIZE_BYTES` | Tamaño máximo permitido por archivo subido (en bytes) | `52428800` (50 MB) |
| `CORS_ORIGIN` | Orígenes permitidos para CORS y Web Audio API | `"*"` |

---

## 5. Migraciones y Gestión de Base de Datos

Desde la carpeta `backend/` (o usando los scripts desde la raíz):

- **Generar cliente Prisma y aplicar migraciones en desarrollo:**
  ```bash
  cd backend
  npx prisma generate
  npx prisma migrate dev
  ```
  *(O desde la raíz: `npm run backend:migrate`)*

- **Aplicar migraciones en producción:**
  ```bash
  cd backend
  npx prisma migrate deploy
  ```

- **Poblar catálogo con pistas de audio WAV de prueba (opcional):**
  ```bash
  npm run backend:seed
  ```

- **Reiniciar la base de datos y limpiar los audios almacenados entre pruebas:**
  ```bash
  npm run backend:reset
  ```
  Si se ejecuta con Docker Compose:
  ```bash
  docker compose exec backend npx tsx src/resetDb.ts
  ```
  O para recrear completamente el volumen desde cero:
  ```bash
  docker compose down -v
  ```

---

## 6. Ejecución Sin Docker

1. **Iniciar el Backend (Terminal 1):**
   ```bash
   npm run backend:dev
   ```
   El servidor quedará escuchando en `http://localhost:3001`. Puedes verificar su estado en `http://localhost:3001/api/health`.

2. **Iniciar el Frontend (Terminal 2):**
   ```bash
   npm run dev
   ```
   Abre `http://localhost:5173` en el navegador.

3. **Compilar para producción (Verificación TypeScript):**
   ```bash
   npm run backend:build
   npm run build
   ```

---

## 7. Cómo Cargar Canciones

1. **Desde la interfaz web:**
   - Haz clic en el botón **Archivos** (barra superior) o **Añadir Canciones** (barra lateral izquierda) para seleccionar uno o varios archivos (`MP3, WAV, OGG, FLAC, AAC, M4A, OPUS, WEBM`).
   - Haz clic en **Carpeta** para importar un directorio completo de canciones.
   - **Arrastra y suelta (Drag & Drop)** archivos de audio directamente sobre la ventana del reproductor.
   - Los archivos se envían mediante `multipart/form-data` a `POST /api/tracks`, se almacenan físicamente en `backend/storage/audio` con nombre único UUID y sus metadatos persisten en SQLite.
   - Si el backend estuviera apagado, la aplicación activa automáticamente el **Modo Respaldo Local**, identificándolo con una insignia ámbar (`Modo Local`) en la barra superior.

2. **Mediante API REST (`curl`):**
   ```bash
   curl -X POST http://localhost:3001/api/tracks \
     -F "files=@/ruta/a/cancion.mp3"
   ```

3. **Mediante el generador automático de semillas (`seed`):**
   ```bash
   npm run backend:seed
   ```

---

## 8. Ejecución con Docker Compose y Límites de Recursos

### Ejecución estándar (límites por defecto: Backend 0.50 CPU / 512 MB RAM)
```bash
docker compose up --build -d
```
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:3001/api/health`
- Al iniciar, el contenedor `neonbeat-backend` ejecuta automáticamente `npx prisma migrate deploy`, inicializa el catálogo si está vacío y monta el volumen persistente para SQLite y `backend/storage/audio`.

### Ejecución especificando límites explícitos de CPU (0.50) y Memoria (512 MB)
En **PowerShell**:
```powershell
$env:BACKEND_CPU_LIMIT="0.50"; $env:BACKEND_MEM_LIMIT="512M"; docker compose up --build -d
```
En **Bash / Linux / macOS**:
```bash
BACKEND_CPU_LIMIT=0.50 BACKEND_MEM_LIMIT=512M docker compose up --build -d
```

### Ejecución con límites alternativos para comparaciones de rendimiento
- **Configuración restringida (0.25 CPU / 256 MB RAM):**
  ```powershell
  # PowerShell
  $env:BACKEND_CPU_LIMIT="0.25"; $env:BACKEND_MEM_LIMIT="256M"; docker compose up -d
  ```
  ```bash
  # Bash
  BACKEND_CPU_LIMIT=0.25 BACKEND_MEM_LIMIT=256M docker compose up -d
  ```

- **Configuración holgada (1.00 CPU / 1024 MB RAM):**
  ```powershell
  # PowerShell
  $env:BACKEND_CPU_LIMIT="1.00"; $env:BACKEND_MEM_LIMIT="1024M"; docker compose up -d
  ```
  ```bash
  # Bash
  BACKEND_CPU_LIMIT=1.00 BACKEND_MEM_LIMIT=1024M docker compose up -d
  ```

---

## 9. Pruebas Automáticas

La suite de pruebas automatizadas (`backend/tests/api.test.ts`) verifica:
1. Health check (`GET /api/health`).
2. Creación multipart y listado de pistas (`POST /api/tracks`, `GET /api/tracks`, `GET /api/tracks/:id`).
3. Edición de favoritos, título y artista (`PATCH /api/tracks/:id`).
4. Rechazo de formatos y tipos MIME no autorizados (`400 INVALID_FILE_TYPE`).
5. Streaming de audio completo (`GET /api/tracks/:id/stream` -> `200 OK`).
6. Streaming parcial con `Range` (`206 Partial Content`, `Accept-Ranges: bytes`, `Content-Range`, `Content-Length`) y rechazo de rangos inválidos (`416 Range Not Satisfiable`).
7. Incremento del contador de reproducciones (`POST /api/tracks/:id/play`), registro de eventos (`POST /api/playback-events`) y estadísticas (`GET /api/stats`).
8. Eliminación de pistas en base de datos y disco (`DELETE /api/tracks/:id`).
9. Persistencia tras reiniciar la conexión/instancia del backend.

**Comando para ejecutar las pruebas:**
```bash
npm test
```
*(O directamente desde `backend/`: `cd backend && npm test`)*

---

## 10. Pruebas de Carga con k6

Los scripts en `/load-tests` consultan el catálogo, seleccionan una pista, registran la reproducción, solicitan fragmentos parciales mediante `Range: bytes=...` (`206 Partial Content`, sin descargar siempre el archivo entero) e incluyen pausas realistas. Si el catálogo está vacío, la función `setup()` sube automáticamente una pista WAV válida antes de iniciar la prueba.

### Variables de entorno configurables en k6
- `BASE_URL`: URL del backend (por defecto `http://localhost:3001`).
- `SCENARIO`: `baseline` | `sustained` | `ramp`.
- `DURATION`: Duración del escenario (por defecto `5m`).
- `VUS`: Usuarios virtuales concurrentes en carga sostenida (por defecto `15` o `20`).
- `MAX_VUS`: Pico de usuarios virtuales en rampa hasta saturación (por defecto `80`).
- `RANGE_CHUNK_BYTES`: Tamaño de fragmento solicitado por `Range` (por defecto `65536` bytes = 64 KB).
- `SUMMARY_FILE`: Ruta donde guardar el resumen JSON de k6.

### Escenario 1: Línea base con 1 usuario (5 minutos)
```bash
k6 run load-tests/scenario-1-baseline.js
```
O con Docker si no tienes `k6` instalado en el host:
```bash
docker run --rm -i -v "${PWD}:/work" -w /work -e BASE_URL=http://host.docker.internal:3001 grafana/k6:latest run /work/load-tests/scenario-1-baseline.js
```

### Escenario 2: Carga sostenida (5 minutos, ej. 20 VUs)
```bash
k6 run -e VUS=20 -e DURATION=5m load-tests/scenario-2-sustained.js
```

### Escenario 3: Aumento gradual hasta saturación (>= 5 minutos)
```bash
k6 run -e MAX_VUS=80 load-tests/scenario-3-ramp-saturation.js
```

---

## 11. Recolección de Métricas del Sistema y Correlación Temporal

El script `/measurements/collect-metrics.mjs` registra periódicamente:
- Uso total de CPU (`cpuTotalPercent`) y uso por cada núcleo (`cpuPerCorePercent`).
- Memoria residente del proceso o contenedor (`residentMemoryMB`) y memoria del host.
- Lecturas y escrituras de disco (`diskReadBytesPerSec`, `diskWriteBytesPerSec`).
- IOPS de lectura, escritura y totales (`diskReadIops`, `diskWriteIops`, `diskTotalIops`).
- Tráfico de red recibido y enviado (`netRxBytesPerSec`, `netTxBytesPerSec`).
- Métricas de contenedores Docker (`docker stats`: CPU %, RAM, Net I/O, Block I/O).
- Marca de tiempo ISO 8601 (`timestamp`) y milisegundos epoch (`epochMs`) en cada muestra.

### Ejecución combinada (Métricas del Sistema + k6 sincronizados)
En **Windows (PowerShell)**:
```powershell
.\measurements\run-experiment.ps1 -Scenario baseline -Duration 5m
.\measurements\run-experiment.ps1 -Scenario sustained -Duration 5m -Vus 20
.\measurements\run-experiment.ps1 -Scenario ramp -MaxVus 80
```
En **Linux / macOS / Git Bash**:
```bash
SCENARIO=baseline DURATION=5m bash ./measurements/run-experiment.sh
SCENARIO=sustained DURATION=5m VUS=20 bash ./measurements/run-experiment.sh
SCENARIO=ramp MAX_VUS=80 bash ./measurements/run-experiment.sh
```

### Ejecución manual del recolector de métricas
```bash
node measurements/collect-metrics.mjs --label prueba-sostenida --interval 2000 --duration 300
```

### ¿Dónde quedan los datos crudos?
Todos los archivos crudos se guardan automáticamente en **`/measurements/results/`**:
- `measurements/results/system-metrics-<etiqueta>-<timestamp>.csv`
- `measurements/results/system-metrics-<etiqueta>-<timestamp>.json`
- `measurements/results/k6-<etiqueta>-summary.json`

Cada muestra del sistema incluye `timestamp` (UTC ISO 8601) y `epochMs`, lo que permite cruzar exactamente la ventana de tiempo con los campos `startedAt` / `completedAt` del reporte de `k6`. Los resultados generados están excluidos en `.gitignore` para no versionar datos artificiales.

---

## 12. Endpoints de la API REST

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servidor, conexión SQLite y directorio de almacenamiento |
| `GET` | `/api/tracks` | Lista el catálogo de pistas (soporta `?search=` y `?favorite=true/false`) |
| `GET` | `/api/tracks/:id` | Obtiene el detalle de una pista por ID |
| `POST` | `/api/tracks` | Carga `multipart/form-data` de uno o varios archivos de audio (`files`) |
| `PATCH` | `/api/tracks/:id` | Edita `title`, `artist` o `favorite` de una pista |
| `DELETE` | `/api/tracks/:id` | Elimina la pista de SQLite y borra de forma segura su archivo físico |
| `POST` | `/api/tracks/:id/play` | Incrementa `playCount` y registra el evento de inicio de reproducción |
| `POST` | `/api/playback-events` | Registra un evento (`play`, `pause`, `seek`, `ended`, `skip`) con `positionSeconds` |
| `GET` | `/api/tracks/:id/stream` | Transmite el audio mediante streams de Node con soporte de `Range` (`206` / `200` / `416`) |
| `GET` | `/api/stats` | Devuelve `totalTracks`, `totalSizeBytes`, `totalPlays`, `totalFavorites` y `totalPlaybackEvents` |

---

## 13. Limitaciones Conocidas

- **Concurrencia de escritura en SQLite:** SQLite utiliza bloqueo a nivel de archivo durante transacciones de escritura (`POST /api/tracks/:id/play`, `POST /api/playback-events`). Bajo cargas de escritura extremadamente altas (cientos de escrituras concurrentes por segundo), la latencia p99 de escritura puede incrementarse frente a motores cliente-servidor como PostgreSQL, aunque las lecturas y el streaming `Range` desde disco continúan operando mediante streams asíncronos de Node.js.
- **Almacenamiento en sistema de archivos local:** Los archivos de audio se guardan en el directorio local/volumen `backend/storage/audio`, pensado para un despliegue de nodo único o contenedores que comparten el volumen.
- **Extracción de metadatos:** El título y artista iniciales se infieren a partir del nombre del archivo subido (`Artista - Título.ext`) y pueden editarse posteriormente mediante `PATCH /api/tracks/:id` o desde el modal de edición de la interfaz.
