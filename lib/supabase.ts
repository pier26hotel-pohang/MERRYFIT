// Supabase 클라이언트 (환경변수 설정 후 사용)
// .env.local 에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 넣으면 활성화됩니다.
// 현재 앱은 아직 파일 저장소(lib/store.ts)를 사용하며, 이 파일은 이전(migration) 준비용입니다.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

// 서버 전용(service role) 클라이언트 — 예약/관리 로직에서 사용
export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수가 없습니다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 설정하세요."
    );
  }
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

// 환경변수 준비 여부 (이전 스위치용)
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
