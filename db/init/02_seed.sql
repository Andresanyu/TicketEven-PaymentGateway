-- ============================================================
--  Datos de ejemplo (desarrollo / QA)
-- ============================================================

INSERT INTO transacciones (id_pedido, monto, franquicia, tarjeta_enmascarada, estado, codigo_respuesta)
VALUES
  ('PEDIDO-001', 15000.00, 'VISA',       '****1111', 'APROBADO',  'V-0000'),
  ('PEDIDO-002', 32500.50, 'MASTERCARD', '****5559', 'APROBADO',  'MC-9999'),
  ('PEDIDO-003',  8900.00, 'VISA',       '****4242', 'RECHAZADO', 'V-100'),
  ('PEDIDO-004', 21000.00, 'MASTERCARD', '****0004', 'FALLIDO',   'DECLINED_MC'),
  ('PEDIDO-005',  5000.00, 'VISA',       '****9999', 'PENDIENTE', NULL);