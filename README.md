# Pasarela de Pagos (Orquestador)

Este servicio enruta peticiones de pago a dos mocks locales:
- Visa: http://localhost:3001
- Mastercard: http://localhost:3000

Puerto por defecto: 3002

Instalación:

```bash
npm install
```

Ejecutar:

```bash
npm start
```

Endpoint:

POST /api/v1/procesar-pago

Body esperado:

```json
{
  "tarjeta": { "numero": "4123456789012345" }
}
```
# TicketEven-PaymentGateway
Payment gateway designed for the TicketEvent platform
