-- ============================================================
--  Orquestador de Pagos — Schema inicial
-- ============================================================

CREATE TYPE franquicia_enum AS ENUM ('VISA', 'MASTERCARD');
CREATE TYPE estado_enum     AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'FALLIDO');

CREATE TABLE transacciones (
  id                 SERIAL          PRIMARY KEY,
  id_pedido          VARCHAR(100)    NOT NULL,
  monto              NUMERIC(12, 2)  NOT NULL CHECK (monto > 0),
  franquicia         franquicia_enum NOT NULL,
  tarjeta_enmascarada VARCHAR(8)     NOT NULL,          -- ej. ****1234
  estado             estado_enum     NOT NULL DEFAULT 'PENDIENTE',
  codigo_respuesta   VARCHAR(20),                        -- V-0000 / MC-9999 / NULL si falló antes
  fecha_creacion     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Índices de consulta frecuente
CREATE INDEX idx_transacciones_id_pedido      ON transacciones (id_pedido);
CREATE INDEX idx_transacciones_estado         ON transacciones (estado);
CREATE INDEX idx_transacciones_fecha_creacion ON transacciones (fecha_creacion DESC);