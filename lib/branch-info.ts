// 회원에게 보여줄 지점 정보 (안내 패널 · 오시는 길)
// 좌표(지오펜스)는 lib/branches.ts, 여기는 안내 문구 전용.

export interface BranchInfo {
  name: string;
  address: string;
  landmark?: string;
  parking?: string;
  tel: string;
  mapUrl: string;
}

export const BRANCH_INFO: BranchInfo[] = [
  {
    name: "2호점 (우현동)",
    address: "포항시 북구 새천년대로933번길 5, 2층",
    landmark: "다이소 맞은편 · 여성아이병원 옆",
    parking: "여성아이병원 주차장 이용 (무료)",
    tel: "054-247-3978",
    mapUrl: "https://map.naver.com/p/search/포항 새천년대로933번길 5",
  },
  {
    name: "1호점 (상공로)",
    address: "포항시 남구 상공로 184",
    tel: "054-247-3978",
    mapUrl: "https://map.naver.com/p/search/포항 상공로 184",
  },
];
