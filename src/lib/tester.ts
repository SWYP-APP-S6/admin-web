import type { UserRole } from "../types";

interface TesterSubject {
	nickname: string;
	role: UserRole;
	testerAllowed: boolean;
	tester: boolean;
}

export function testerTag(user: TesterSubject): { label: string; className: string } | null {
	if (user.tester) {
		return { label: "테스트 모드", className: "tag tag--tester" };
	}
	if (user.testerAllowed) {
		return { label: "테스트 허가", className: "tag tag--tester-allowed" };
	}
	return null;
}

export function testerState(user: TesterSubject): string {
	if (!user.testerAllowed) {
		return "허가 안 됨";
	}
	if (!user.tester) {
		return "허가됨 · 앱에서 테스트 모드 꺼짐";
	}
	return user.role === "OWNER"
		? "허가됨 · 테스트 모드 켜짐 (가게가 테스터에게만 보임)"
		: "허가됨 · 테스트 모드 켜짐 (테스트 가게만 봄)";
}

// 허가는 앱 마이페이지에 스위치를 여는 것까지다. 모드는 본인이 켠다.
export function confirmPermissionChange(user: TesterSubject): boolean {
	const lines = user.testerAllowed
		? [
				`「${user.nickname}」 계정의 테스트 허가를 거둘까요?`,
				user.tester ? "켜져 있는 테스트 모드도 함께 꺼집니다." : "앱 마이페이지의 테스트 모드 스위치가 사라집니다.",
			]
		: [
				`「${user.nickname}」 계정에 테스트를 허가할까요?`,
				user.role === "OWNER"
					? "앱 마이페이지에 테스트 모드 스위치가 생깁니다. 본인이 켜면 가게와 상품이 실사용자에게 숨겨지고 테스터에게만 보입니다."
					: "앱 마이페이지에 테스트 모드 스위치가 생깁니다. 본인이 켜면 테스트 가게만 보입니다.",
				"같은 사람의 소비자·판매자 계정은 따로 허가해야 합니다.",
			];
	return window.confirm(lines.join("\n"));
}
