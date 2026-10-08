import type { UserRole } from "../types";

interface TesterSubject {
	nickname: string;
	role: UserRole;
	testerAllowed: boolean;
	testMode: boolean;
	tester: boolean;
}

// 테스트 계정은 같은 카카오 계정의 별도 행이다. 허가·모드는 실제 계정 행에만 있다.
export function testerTag(user: TesterSubject): { label: string; className: string } | null {
	if (user.tester) {
		return { label: "테스트 계정", className: "tag tag--tester" };
	}
	if (user.testerAllowed) {
		return {
			label: user.testMode ? "테스트 허가 · 모드 켜짐" : "테스트 허가",
			className: "tag tag--tester-allowed",
		};
	}
	return null;
}

export function testerState(user: TesterSubject): string {
	if (user.tester) {
		return user.role === "OWNER"
			? "테스트 계정 · 이 계정의 가게와 상품은 테스트 계정에게만 보임"
			: "테스트 계정 · 테스트 가게만 봄";
	}
	if (!user.testerAllowed) {
		return "허가 안 됨";
	}
	return user.testMode
		? "허가됨 · 테스트 모드 켜짐 (로그인하면 테스트 계정으로 들어감)"
		: "허가됨 · 테스트 모드 꺼짐";
}

export function canChangePermission(user: TesterSubject): boolean {
	return !user.tester;
}

export function confirmPermissionChange(user: TesterSubject): boolean {
	const lines = user.testerAllowed
		? [
				`「${user.nickname}」 계정의 테스트 허가를 거둘까요?`,
				user.testMode
					? "테스트 모드가 꺼지고, 테스트 계정으로 로그인 중이면 최대 30분 안에 로그아웃됩니다."
					: "앱 마이페이지의 테스트 모드 스위치가 사라집니다.",
				"테스트 계정과 그 가게·데이터는 테스트 쪽에 그대로 남고 실사용자에게 보이지 않습니다.",
			]
		: [
				`「${user.nickname}」 계정에 테스트를 허가할까요?`,
				"앱 마이페이지에 테스트 모드 스위치가 생깁니다. 켜면 별도의 테스트 계정으로 바뀌어 테스트 가게와 테스트 데이터만 보이고, 끄면 실제 계정으로 돌아옵니다.",
				"같은 사람의 소비자·판매자 계정은 따로 허가해야 합니다.",
			];
	return window.confirm(lines.join("\n"));
}
