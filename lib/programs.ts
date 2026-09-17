// 수업 종류별 표시 정보 — 오픈 페이지 · 시간표 · 상담 설문이 함께 쓴다.

export interface ProgramInfo {
  name: string;
  short: string; // 좁은 칸용
  desc: string;  // 한 줄 설명
  bg: string;    // 칸 배경
  fg: string;    // 칸 글자
}

export const PROGRAMS: ProgramInfo[] = [
  { name: "바레", short: "바레", desc: "발레 동작 기반 · 라인과 하체 근력", bg: "#FBF0D4", fg: "#7A5A12" },
  { name: "필라테스", short: "필테", desc: "코어 강화 · 자세 정렬", bg: "#E2EDF8", fg: "#2B5A87" },
  { name: "필라웨이트", short: "필웨", desc: "필라테스 + 소도구 웨이트", bg: "#E1EFE4", fg: "#2B6644" },
  { name: "요가", short: "요가", desc: "유연성 · 호흡 · 균형", bg: "#DAECEC", fg: "#28696B" },
  { name: "아로마", short: "아로마", desc: "아로마와 함께하는 이완 · 회복", bg: "#EBE4F5", fg: "#5A4687" },
];

const BY_NAME = new Map(PROGRAMS.map((p) => [p.name, p]));

export function programInfo(name: string): ProgramInfo {
  return (
    BY_NAME.get(name) ?? { name, short: name, desc: "", bg: "#EEEEEE", fg: "#444444" }
  );
}

// 수업 길이 (북구점)
export const CLASS_MINUTES = 45;
