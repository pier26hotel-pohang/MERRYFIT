import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더(C:\Users\jsh79)에도 package-lock.json 이 있어서 Next 가 워크스페이스
  // 루트를 잘못 잡는 문제가 있다. 이 프로젝트 폴더를 루트로 고정한다.
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
