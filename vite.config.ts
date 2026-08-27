import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 개발 중에는 이 프록시를 거쳐 백엔드를 부르므로 브라우저 입장에서 동일 오리진이 된다
// (CORS 설정 없이도 작업 가능). 배포 빌드는 VITE_API_BASE_URL 로 실제 API 주소를 받는다.
export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			"/api": {
				target: process.env.VITE_PROXY_TARGET ?? "http://localhost:8080",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
});
