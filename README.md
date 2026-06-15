# MOA App Web

Sistema Educativo Web reconstruido con **Qwik City**, basado en el esquema `moa-v7-final.sql` y en los patrones de [acupatas-main](../acupatas-main).

## Funcionalidades

- **Login** con sesión por cookie (`moa_session`)
- **Activación de cuenta** vía lista blanca (registro controlado)
- **Panel estudiante**: competencias, lecciones, segmentos *presentation / practice / use*, progreso y rachas
- **Panel profesor**: vista inicial del flujo de gestión de contenido
- **Panel admin**: usuarios y lista blanca

## Stack

- Qwik City + Vite SSR
- Tailwind CSS v4
- libSQL / Turso (SQLite local `dev.db` por defecto)

## Desarrollo

```bash
cd moa-app-web
yarn install
yarn dev
```

Abre `http://localhost:5173`.

### Credenciales demo

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin` | `admin123` | admin |

### Activar cuenta (lista blanca precargada)

| Nombres | Apellidos | Rol |
|---------|-----------|-----|
| Ana | García | estudiante |
| Carlos | Pérez | profesor |

## Base de datos (Turso)

### 1. Configura `.env`

```bash
cp .env.example .env
```

En [turso.tech](https://turso.tech) crea la base, copia la **URL** (`libsql://...`) y genera un **token**. Pégalos en `.env`:

```env
PRIVATE_TURSO_DATABASE_URL=libsql://db-moa-app-golfredo.aws-us-east-1.turso.io
PRIVATE_TURSO_AUTH_TOKEN=eyJ...
PORT=5173
```

### 2. Aplica el schema (tablas + datos demo)

```bash
yarn db:seed
```

Esto crea grados, 16 competencias, 128 lecciones, lista blanca y el usuario `admin`.

### 3. Arranca la app

```bash
yarn dev
```

Sin variables Turso en `.env`, la app usa SQLite local (`file:dev.db`). El schema también se aplica solo al primer request.

## Producción

```bash
yarn build
yarn serve
```

## Estructura

```
src/
  lib/          # db, auth, schema, progress, whitelist, lesson-content
  routes/
    auth/       # login y activación
    dashboard/  # estudiante, profesor, admin
```

## Reglas de negocio (desde SQL)

- Máximo **125 puntos** por lección (`MAX_POINTS_PER_LESSON`)
- Progreso con `GREATEST` — nunca empeora el mejor puntaje
- Competencia completada cuando las 8 lecciones están completadas
- Rachas: +1 si estudió ayer, reset si pasó más de un día
