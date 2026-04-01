-- Adiciona coluna read_at para rastreamento de leitura de notificacoes pelo usuario
ALTER TABLE public.notification_queue
ADD COLUMN IF NOT EXISTS read_at timestamptz null;

-- Indice para consultas de notificacoes nao lidas por usuario
CREATE INDEX IF NOT EXISTS idx_notif_queue_user_read
  ON public.notification_queue (user_id, read_at)
  WHERE user_id IS NOT NULL;

-- Indice para contagem rapida de nao-lidas
CREATE INDEX IF NOT EXISTS idx_notif_queue_user_unread
  ON public.notification_queue (user_id)
  WHERE user_id IS NOT NULL AND read_at IS NULL;
