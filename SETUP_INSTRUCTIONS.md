# Instrucciones de Configuración - Usuario Administrador

## Problema Identificado

No es posible insertar usuarios directamente en la tabla `auth.users` de Supabase mediante scripts SQL. La tabla de autenticación está gestionada por el sistema de autenticación de Supabase y requiere el uso de la API de administración.

## Solución Implementada

He creado una página de configuración que utiliza la API de administración de Supabase (con el service role key) para crear el usuario administrador programáticamente.

## Pasos para Crear el Usuario Administrador

### Opción 1: Usar la Página de Setup (Recomendado)

1. Visita la página: `/setup`
2. Haz clic en el botón "Crear Usuario Administrador"
3. Espera a que se complete el proceso
4. Una vez creado, haz clic en "Ir a Login"
5. Usa las credenciales:
   - **Email:** admin@waterpolostats.com
   - **Password:** Admin123!

### Opción 2: Llamar a la API Directamente

Puedes hacer una petición POST a `/api/setup-admin`:

```bash
curl -X POST http://localhost:3000/api/setup-admin
```

## Credenciales del Administrador

- **Email:** admin@waterpolostats.com
- **Contraseña:** Admin123!
- **Rol:** Super Admin
- **Permisos:** Acceso completo a todos los clubes

## Características del Usuario Administrador

- `is_super_admin: true` - Puede ver datos de todos los clubes
- `role: 'admin'` - Tiene permisos de administración
- `club_id: null` - No está asociado a un club específico
- Email confirmado automáticamente (no requiere verificación)

## Seguridad

⚠️ **IMPORTANTE:** Después de crear el usuario administrador en producción:

1. Cambia la contraseña inmediatamente
2. Considera eliminar o proteger la ruta `/setup` y `/api/setup-admin`
3. El service role key solo debe usarse en el servidor, nunca en el cliente

## Verificación

Para verificar que el usuario se creó correctamente, puedes ejecutar esta consulta SQL:

```sql
SELECT 
  p.email,
  p.full_name,
  p.role,
  p.is_super_admin,
  p.club_id
FROM profiles p
WHERE p.email = 'admin@waterpolostats.com';
```

## Troubleshooting

Si encuentras errores:

1. **"Admin user already exists"** - El usuario ya fue creado, puedes ir directamente a login
2. **Error de permisos** - Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurado correctamente
3. **Error de conexión** - Verifica que `NEXT_PUBLIC_SUPABASE_URL` sea correcto

## Próximos Pasos

Una vez que el usuario administrador esté creado:

1. Inicia sesión en `/auth/login`
2. Accede al panel de administración en `/admin`
3. Desde ahí podrás crear usuarios para cada club
