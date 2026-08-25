# Configuración de recuperación de contraseña

La aplicación envía el enlace de recuperación mediante Supabase Auth y, si el
correo pertenece a un perfil real, avisa al administrador mediante Resend. La
respuesta pública es siempre genérica para no revelar qué usuarios existen.

## Variables de entorno en Vercel

```text
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
RESEND_API_KEY=re_...
PASSWORD_RESET_NOTIFICATION_FROM=Waterpolo Stats <noreply@tu-dominio-verificado.com>
PASSWORD_RESET_NOTIFICATION_TO=sergirojasnavarro@gmail.com
```

`PASSWORD_RESET_NOTIFICATION_TO` es opcional: el código ya utiliza
`sergirojasnavarro@gmail.com` como destinatario predeterminado. No expongas
`RESEND_API_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` como variables `NEXT_PUBLIC_*`.
La service role se usa solo en el servidor para verificar que el correo pertenece
a un perfil real antes de enviar el aviso administrativo.

## URLs permitidas en Supabase

En **Authentication > URL Configuration** configura:

- Site URL: `https://tu-dominio.com`
- Redirect URL de producción: `https://tu-dominio.com/auth/callback`
- Redirect URL local: `http://localhost:3000/auth/callback`

Si usas dominios de preview de Vercel, añade también el patrón permitido que
corresponda a esos despliegues.

## Correo de recuperación

Para producción configura un SMTP propio en **Authentication > SMTP Settings**.
El SMTP de prueba de Supabase tiene límites bajos y no es apropiado para usuarios
reales. Resend puede utilizarse tanto como SMTP de Supabase para el enlace como
para la notificación independiente al administrador.

## Comprobación final

1. Solicita el enlace desde `/auth/forgot-password` con un usuario existente.
2. Confirma que el usuario recibe el correo de Supabase.
3. Confirma que `sergirojasnavarro@gmail.com` recibe el aviso administrativo.
4. Abre el enlace, cambia la contraseña e inicia sesión con la nueva.
5. Repite con un email inexistente y comprueba que la interfaz no revela que no
   existe y que el administrador no recibe una notificación.
