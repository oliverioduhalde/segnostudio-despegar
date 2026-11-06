# segnostudio-despegar

Promo navideña: elegí destino → 3 preguntas → ruleta de vouchers.

| Dirección | Qué es |
|---|---|
| `/` | Juego libre (se puede jugar las veces que quieras) |
| `/qr` | Juego seguro: solo se entra con un QR de la pantalla y se juega una vez por celular |
| `/pantalla?k=CLAVE` | Pantalla del stand: QR que cambia cada 20 s y al instante cuando alguien lo escanea |
| `/afiche` | Afiche imprimible con QR fijo al juego libre |
| `/api/voucher?k=CLAVE&code=...` | Verificar un código de voucher |

## Seguridad del modo `/qr`
- Cada QR trae un pase de un solo uso (vence a los 45 s). El link se borra de la barra al entrar.
- El celular se identifica con cookie del servidor + id local + huella del dispositivo combinada con la IP.
- El premio lo sortea el servidor. Si el celular ya ganó, se le muestra siempre el mismo voucher.

## Configuración en Vercel
- Base de datos: Upstash Redis (Storage → Upstash for Redis), conectada al proyecto.
- Variable `QR_KEY`: clave del staff para `/pantalla` y `/api/voucher`.
- Para probar local: `DQ_DEV_MEMORY=1 QR_KEY=algo` usa una base en memoria.
