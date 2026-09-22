// 지점 위치(지오펜스) 설정
// 좌표는 구글 지도에서 도로명 주소로 검색해 확인한 값이다.
// 거리 검증은 환경변수 ENFORCE_GEOFENCE=true 일 때만 켜진다 —
// 오픈 직후 GPS 오차로 실제 회원이 막히면 코드 수정 없이 바로 끌 수 있게 했다.

export interface BranchGeo {
  lat: number;
  lng: number;
  radiusM: number; // 허용 반경(미터)
}

// 반경은 200m. 건물 안(특히 2층)에서는 휴대폰 GPS가 수십~100m 넘게 튀기 때문에
// 너무 좁게 잡으면 센터에 와 있는 회원이 출석에 실패한다.
export const BRANCH_GEO: Record<string, BranchGeo> = {
  "1호점": { lat: 36.0217495, lng: 129.3658125, radiusM: 200 }, // 포항 남구 상공로 184
  "2호점": { lat: 36.0549294, lng: 129.3628948, radiusM: 200 }, // 포항 북구 우현동 646 (새천년대로933번길 5) 2층
};

export const ENFORCE_GEOFENCE = process.env.ENFORCE_GEOFENCE === "true";

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
