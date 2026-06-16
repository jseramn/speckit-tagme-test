# Test Safari iOS NFC — TR-08 (T109)

**Objetivo**: Apertura `/s/{slug}` ≤3s en dispositivo físico iOS Safari.

## Protocolo

1. Tarjeta NFC staff física programada con URL `https://{APP_URL}/s/{slug}`.
2. iPhone con Safari como navegador predeterminado para NFC.
3. Registrar 10 toques consecutivos; medir tiempo hasta pantalla `/capture/{token}`.
4. Documentar: modelo iPhone, versión iOS, red (WiFi hotel / 4G).

## Plantilla de resultados

| Toque | Tiempo (s) | Redirect OK | Notas |
|-------|------------|-------------|-------|
| 1 | | | |
| … | | | |
| 10 | | | |

**Pass**: ≥9/10 ≤3s.

## Estado implementación M6

- **Automatizado**: no ejecutable en CI (requiere hardware).
- **Preparación**: URLs seed disponibles (`caribe-staff-*`); flujo `/s/` implementado M1.
- **Acción piloto**: ejecutar este protocolo en sitio antes de semana piloto (T114).

## Hallazgos conocidos (literatura)

- iOS puede mostrar diálogo de confirmación NFC — contar desde aceptación.
- Primera apertura del día puede ser más lenta (cold start PWA/CDN).