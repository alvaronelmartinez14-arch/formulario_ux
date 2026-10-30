# Formulario de paquetes turísticos

Formulario web estático para crear paquetes turísticos y guardarlos en Supabase. Requiere que el usuario inicie sesión; cada cuenta solo puede consultar y administrar sus propios paquetes.

## Funcionalidades

- Captura destino, fechas, viajeros, precio, transporte, alojamiento y descripción.
- Permite elegir servicios incluidos y agregar servicios personalizados.
- Lista los paquetes guardados y permite editarlos o eliminarlos.
- Guarda los paquetes en la tabla `public.travel_packages`.
- Sube imágenes JPG, PNG o WebP de hasta 2 MB al bucket privado `package-posters`.
- Usa Supabase Auth con correo y contraseña.
- Oculta los campos de acceso y limpia la contraseña al iniciar sesión.

## Ejecutar localmente

Desde la carpeta del proyecto, inicia un servidor estático:

```powershell
python -m http.server 5500
```

Abre <http://localhost:5500>. No abras `index.html` directamente como archivo: Auth y las redirecciones requieren un origen HTTP.

## Supabase

El proyecto está configurado en `supabase-config.js` con su URL y una clave publicable. Las claves publicables pueden estar en el código del navegador; nunca agregues una clave `service_role`, una clave secreta ni la contraseña de Postgres a este repositorio.

El esquema y las políticas se encuentran en `supabase/schema.sql`. Se aplican:

- RLS en `travel_packages`, con políticas de lectura, inserción, actualización y eliminación limitadas al propietario autenticado.
- Acceso de Data API concedido a `authenticated` y revocado a `anon`.
- Bucket privado `package-posters` con acceso por carpeta asociada al identificador del usuario.

Para crear usuarios, usa **Crear cuenta** en el formulario y confirma el correo. Si Supabase exige confirmación por correo, revisa la bandeja de entrada antes de iniciar sesión.

## GitHub Pages

El repositorio puede publicarse desde la rama `main`, carpeta `/ (root)`, en **Settings > Pages**. La URL del sitio será:

<https://alvaronelmartinez14-arch.github.io/formulario_ux/>

En Supabase, configura **Authentication > URL Configuration**:

- Site URL: `https://alvaronelmartinez14-arch.github.io/formulario_ux/`
- Redirect URL permitida: `https://alvaronelmartinez14-arch.github.io/formulario_ux/**`

Conserva también `http://localhost:5500/**` para desarrollo local. La página es estática; GitHub Pages no ejecuta backend ni protege archivos públicos. La seguridad de los datos depende de Auth, RLS y las políticas del bucket.