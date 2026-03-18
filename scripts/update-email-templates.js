const PROJECT_ID = 'itzohkwuqmkzatmbrfgr'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!ACCESS_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

const BASE_URL = `https://api.supabase.com/v1/projects/${PROJECT_ID}/config/auth`

const styles = `
  body { margin:0; padding:0; background:#f4f4f5; font-family:'Segoe UI',Arial,sans-serif; }
  .wrapper { max-width:520px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08); }
  .header { background:#0f172a; padding:32px 40px; text-align:center; }
  .header-title { color:#ffffff; font-size:20px; font-weight:700; margin:0; letter-spacing:-0.3px; }
  .body { padding:40px; }
  .greeting { font-size:16px; color:#111827; font-weight:600; margin:0 0 12px; }
  .text { font-size:14px; color:#6b7280; line-height:1.6; margin:0 0 24px; }
  .btn { display:inline-block; background:#0f172a; color:#ffffff !important; text-decoration:none; font-size:14px; font-weight:600; padding:14px 32px; border-radius:8px; }
  .divider { border:none; border-top:1px solid #f0f0f0; margin:32px 0; }
  .note { font-size:12px; color:#9ca3af; line-height:1.5; }
  .note a { color:#6b7280; }
  .footer { background:#f9fafb; padding:20px 40px; text-align:center; font-size:12px; color:#9ca3af; border-top:1px solid #f0f0f0; }
`

const inviteSubject = 'Te han invitado a MYSAIR CRM'
const inviteBody = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invitacion</title>
<style>${styles}</style></head>
<body>
<div class="wrapper">
  <div class="header"><div class="header-title">MYSAIR CRM</div></div>
  <div class="body">
    <p class="greeting">Has sido invitado al equipo</p>
    <p class="text">
      Un administrador ha creado una cuenta para ti en <strong>MYSAIR CRM</strong>.<br>
      Haz clic en el boton de abajo para activar tu cuenta y establecer tu contrasena.
    </p>
    <p style="text-align:center;margin:0 0 28px;">
      <a href="{{ .ConfirmationURL }}" class="btn">Activar cuenta</a>
    </p>
    <hr class="divider">
    <p class="note">
      Este enlace es valido durante 24 horas. Si no esperabas esta invitacion, puedes ignorar este correo.<br>
      Si el boton no funciona, copia y pega este enlace en tu navegador:<br>
      <a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a>
    </p>
  </div>
  <div class="footer">MYSAIR CRM - Sistema de gestion de clientes y ofertas</div>
</div>
</body></html>`

const resetSubject = 'Restablecer contrasena - MYSAIR CRM'
const resetBody = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Restablecer contrasena</title>
<style>${styles}</style></head>
<body>
<div class="wrapper">
  <div class="header"><div class="header-title">MYSAIR CRM</div></div>
  <div class="body">
    <p class="greeting">Solicitud de restablecimiento de contrasena</p>
    <p class="text">
      Hemos recibido una solicitud para restablecer la contrasena de tu cuenta en <strong>MYSAIR CRM</strong>.<br>
      Haz clic en el boton de abajo para crear una nueva contrasena.
    </p>
    <p style="text-align:center;margin:0 0 28px;">
      <a href="{{ .ConfirmationURL }}" class="btn">Restablecer contrasena</a>
    </p>
    <hr class="divider">
    <p class="note">
      Este enlace es valido durante 1 hora. Si no solicitaste este cambio, ignora este correo.<br>
      Si el boton no funciona, copia y pega este enlace:<br>
      <a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a>
    </p>
  </div>
  <div class="footer">MYSAIR CRM - Sistema de gestion de clientes y ofertas</div>
</div>
</body></html>`

async function updateTemplates() {
  console.log('Updating Supabase email templates...')

  const res = await fetch(BASE_URL, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      mailer_subjects_invite: inviteSubject,
      mailer_templates_invite_content_path: inviteBody,
      mailer_subjects_recovery: resetSubject,
      mailer_templates_recovery_content_path: resetBody,
    }),
  })

  const text = await res.text()

  if (!res.ok) {
    console.error('Error updating templates:', res.status, text)
    process.exit(1)
  }

  console.log('Templates updated successfully!')
  console.log('Response:', text.substring(0, 200))
}

updateTemplates()
