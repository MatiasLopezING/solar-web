#!/bin/bash
# update_tunnel.sh — Actualiza la URL del túnel en app.js y hace git push
# Uso: bash update_tunnel.sh
# Requiere que cloudflared esté corriendo y tunnel.log exista

LOGFILE="$(dirname "$0")/tunnel.log"
APPJS="$(dirname "$0")/app.js"

# Extraer la URL más reciente del log
NEW_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOGFILE" | tail -1)

if [ -z "$NEW_URL" ]; then
    echo "❌ No se encontró URL en $LOGFILE"
    echo "   Asegurate de que cloudflared esté corriendo y el log tenga contenido."
    exit 1
fi

echo "🔗 URL detectada: $NEW_URL"

# Reemplazar en app.js
sed -i "s|https://[a-z0-9-]*\.trycloudflare\.com|$NEW_URL|g" "$APPJS"

echo "✅ app.js actualizado"

# Commit y push
cd "$(dirname "$0")"
git add app.js
git commit -m "chore: update cloudflare tunnel URL to $NEW_URL"
git push origin main

echo "🚀 Push completado. La nueva URL estará activa en ~1 minuto (GitHub Pages)"
