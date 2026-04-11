# NeoFrame.ai — AI Video Studio

Plataforma completa para generar videos con IA y crear clips/shorts.

## Funcionalidades

- **Generación de video real** con IA (Canvas + MediaRecorder → WebM descargable)
- **Creador de clips** desde videos subidos
- **Sistema de autenticación** (registro/login con Firebase)
- **Sistema de créditos** (cobro por video generado)
- **Panel de administración** (gestión de usuarios, créditos, roles)

## Configuración Paso a Paso

### 1. Crear proyecto en Firebase (GRATIS)

1. Ve a https://console.firebase.google.com
2. Clic en "Agregar proyecto" → nombre: `neoframe-ai` → Crear
3. En el dashboard, clic en el ícono web `</>` para agregar una app web
4. Nombre: `neoframe-ai` → Registrar app
5. **COPIA las credenciales** que te muestra (apiKey, authDomain, etc.)

### 2. Activar Authentication

1. En Firebase, menú izquierdo → Authentication → Comenzar
2. Pestaña "Sign-in method" → activa **Email/Password**

### 3. Activar Firestore

1. En Firebase, menú izquierdo → Firestore Database → Crear base de datos
2. Selecciona "Comenzar en modo de prueba" → Siguiente → Crear

### 4. Configurar las credenciales

Abre `src/lib/firebase.js` y reemplaza los valores del objeto `firebaseConfig` con los que copiaste en el paso 1.

### 5. Hacer tu cuenta Admin

1. Regístrate normalmente en la app
2. Ve a Firebase Console → Firestore → colección "users"
3. Busca tu usuario y cambia el campo `role` de `"user"` a `"admin"`
4. Refresca la app — verás el botón "⚙ Admin" en el header

### 6. Deploy en Vercel

1. Sube este proyecto a GitHub
2. Ve a https://vercel.com → Sign up con GitHub
3. Import el repo → Deploy
4. ¡Listo! Tu URL será algo como `neoframe-ai.vercel.app`

## Tabla de Costos (créditos)

| Acción | Costo |
|--------|-------|
| Video 5s | 1 crédito |
| Video 10s | 2 créditos |
| Video 15s | 3 créditos |
| Video 30s | 5 créditos |
| Video 60s | 8 créditos |
| Clip (cada uno) | 2 créditos |

Nuevos usuarios reciben **10 créditos gratis** al registrarse.

## Preparado para APIs Externas

El archivo `src/lib/videoEngine.js` está preparado para conectar APIs como:
- **Runway ML** (gen-3)
- **Stability AI** (Stable Video)
- **OpenAI Sora**
- **Replicate**

Solo necesitas agregar la llamada API correspondiente en el engine.

## Desarrollo local

```bash
npm install
npm run dev
```
