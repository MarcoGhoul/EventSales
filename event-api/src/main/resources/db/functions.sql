-- Spring ejecuta estas funciones después de crear las tablas y cargar los ejemplos.

-- HU-06 Reporte de ventas: columnas [0] event_name, [1] tickets_sold, [2] total_revenue
CREATE OR REPLACE FUNCTION report_tickets_by_event(p_event_id BIGINT)
RETURNS TABLE (
    event_name    VARCHAR,
    tickets_sold  BIGINT,
    total_revenue NUMERIC
)
LANGUAGE sql
STABLE
AS '
    SELECT
        CAST(e.name AS VARCHAR),
        COUNT(t.id),
        CAST(COALESCE(SUM(t.price_paid), 0) AS NUMERIC)
    FROM events e
    JOIN tickets t ON t.event_id = e.id
    WHERE e.id = p_event_id
      AND t.status = ''PAID''
    GROUP BY e.name
';

-- HU-07 Historial de compras: columnas [0] event_name, [1] ticket_status, [2] price_paid
CREATE OR REPLACE FUNCTION report_tickets_by_participant(p_participant_id BIGINT)
RETURNS TABLE (
    event_name    VARCHAR,
    ticket_status VARCHAR,
    price_paid    NUMERIC
)
LANGUAGE sql
STABLE
AS '
    SELECT
        CAST(e.name AS VARCHAR),
        CAST(t.status AS VARCHAR),
        CAST(t.price_paid AS NUMERIC)
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE t.participant_id = p_participant_id
    ORDER BY e.date DESC
';

-- Prueba rápida (cambia los ids por unos existentes):
-- SELECT * FROM report_tickets_by_event(1);
-- SELECT * FROM report_tickets_by_participant(1);
