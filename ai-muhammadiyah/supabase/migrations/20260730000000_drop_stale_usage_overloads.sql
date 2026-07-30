-- Hotfix Langkah 37: hapus overload draf lama check_usage_limits /
-- increment_usage yang memakai p_cost_units.
--
-- Draf awal migrasi 20260729 (sistem unit) sempat ter-apply ke produksi
-- sebelum direvisi jadi meteran token dengan signature asli. `create or
-- replace` pada versi final TIDAK menghapus varian lama yang parameternya
-- berbeda, sehingga dua overload hidup berdampingan dan SEMUA panggilan RPC
-- kuota gagal ambigu (PostgREST PGRST203) -> chat/upload/research mati dengan
-- "Limit penggunaan belum bisa dicek".
--
-- Dua drop ini hanya membuang varian p_cost_units; fungsi final (signature
-- 20260530) tidak tersentuh. Idempoten via `if exists`.

drop function if exists public.check_usage_limits(public.usage_action, text, integer, integer, uuid);
drop function if exists public.increment_usage(public.usage_action, text, integer, integer, integer, jsonb, uuid);
