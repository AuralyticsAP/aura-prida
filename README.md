# Prida App — Sistema de Recolección de Datos Agrícolas

Desarrollado por **NexoBit** para **Prida**.

## Descripción

Aplicación web para registrar cosechas y ventas diarias. Incluye:

- Registro de cosecha del día (producto, cantidad, unidad, notas)
- Registro de ventas (producto, cliente, precio, total automático)
- Vista de todos los registros del día
- Exportación a CSV
- Actualización en tiempo real (Supabase Realtime)

---

## Requisitos previos

- Node.js 18 o superior
- Una cuenta en [Supabase](https://supabase.com)

---

## Configuración de Supabase

### 1. Crear las tablas

1. Abrí tu proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor**
3. Copiá el contenido de `supabase/schema.sql` y ejecutalo

### 2. Habilitar Realtime (si no se hizo automáticamente)

En Supabase → **Database** → **Replication** → activar las tablas `cosechas` y `ventas`.

---

## Instalación local

```bash
# 1. Clonar o descomprimir el proyecto
cd prida-app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abrir en el navegador: `http://localhost:5173`

---

## Variables de entorno

Crear un archivo `.env` en la raíz con:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

> Nunca subas el archivo `.env` a Git. Ya está incluido en `.gitignore`.

---

## Build para producción

```bash
npm run build
```

Los archivos quedan en la carpeta `dist/`.

---

## Estructura del proyecto

```
prida-app/
├── src/
│   ├── components/
│   │   ├── FormCosecha.jsx     # Formulario de cosecha
│   │   ├── FormVenta.jsx       # Formulario de venta
│   │   └── RegistrosHoy.jsx    # Vista de registros del día
│   ├── lib/
│   │   ├── supabase.js         # Cliente de Supabase
│   │   ├── constants.js        # Productos, clientes, unidades
│   │   └── csv.js              # Utilidad de exportación CSV
│   ├── App.jsx
│   └── App.css
├── supabase/
│   └── schema.sql              # Ejecutar en Supabase SQL Editor
├── .env                        # Credenciales (NO subir a Git)
├── .env.example                # Plantilla
└── README.md
```

---

## Contacto

**NexoBit** · luismhdev01@gmail.com
