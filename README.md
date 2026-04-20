# CRAI Frontend Dashboard

Dashboard frontend para visualizacion de 4 datasets CRAI (prestamos, encuesta, clubes y recursos digitales).

## Stack

- React + TypeScript + Vite
- Recharts
- Papa Parse

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Fuente de datos

El proyecto soporta dos fuentes:

1. `mock` (default): lee CSV locales en `public/data`
2. `api`: consulta backend

Configura con `.env` (puedes copiar desde `.env.example`):

```env
VITE_DATA_SOURCE=mock
VITE_API_BASE_URL=http://localhost:8000
VITE_API_DASHBOARD_ENDPOINT=/api/dashboard
VITE_API_FALLBACK_TO_MOCK=true
```

Si `VITE_DATA_SOURCE=api` y falla el endpoint, por defecto se activa fallback a mock.

## Contrato esperado del backend

`GET {VITE_API_BASE_URL}{VITE_API_DASHBOARD_ENDPOINT}` debe devolver JSON:

```json
{
  "loans": [
    {
      "faculty": "FACULTAD DE ...",
      "program": "INGENIERIA ...",
      "userType": "Estudiante",
      "collection": "Coleccion General",
      "loanDate": "2025-01-13T14:47:03"
    }
  ],
  "survey": [
    {
      "faculty": "...",
      "program": "...",
      "userType": "Estudiante",
      "visitFrequency": "Al menos una vez al mes",
      "satisfactionLabel": "Satisfecho",
      "satisfactionScore": 4,
      "digitalEaseLabel": "Facil",
      "submittedAt": "2025-02-03T12:39:00"
    }
  ],
  "clubs": [
    {
      "club": "Cine Foro",
      "userType": "Estudiante",
      "program": "Ingenieria Multimedia",
      "attendee": "Nombre",
      "attendanceDate": "2025-08-14T12:12:00"
    }
  ],
  "resources": [
    {
      "faculty": "FACULTAD DE ...",
      "userType": "Docente",
      "resource": "Scopus",
      "sessions": 650,
      "searches": 0,
      "downloads": 11,
      "total": 661
    }
  ]
}
```

## Notas

- Boton `Descargar reporte` exporta CSV con filtros actuales y resumen KPI.
- La app esta preparada para sustituir el repositorio mock por API sin tocar la UI.
