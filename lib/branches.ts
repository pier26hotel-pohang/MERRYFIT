// 지점 위치(지오펜스) 설정
// ⚠️ lat/lng를 실제 센터 GPS 좌표로 바꾸고, ENFORCE_GEOFENCE 를 true 로 하면
//    "센터 반경 안에서만 출석 가능"이 활성화됩니다.
//    (개발/테스트 중에는 false — 어디서든 흐름을 확인할 수 있게)

export interface BranchGeo {
  lat: number;
  lng: number;
  radiusM: number; // 허용 반경(미터)
}

export const BRANCH_GEO: Record<string, BranchGeo> = {
  // TODO: 구글맵에서 센터 위치 우클릭 → 좌표 복사해서 넣기
  "1호점": { lat: 36.0190, lng: 129.3435, radiusM: 150 }, // 포항 남구 상공로 184 (임시)
  "2호점": { lat: 36.0190, lng: 129.3435, radiusM: 150 }, // (임시)
};

// 실제 좌표 입력 후 true 로 변경하면 거리 검증이 켜집니다.
export const ENFORCE_GEOFENCE = false;

// 두 좌표 사이 거리(미터) — 하버사인 공식
export function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
