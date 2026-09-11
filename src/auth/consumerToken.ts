const KEY = "swyp.consumer.accessToken";

// 관리자 토큰과 분리해 둔다. 찜은 REALM_USER + ROLE_CONSUMER 를 요구하므로 관리자 토큰으로는
// 호출할 수 없고, 이 도구는 소비자 앱의 흐름을 재현하는 것이 목적이다.
export function getConsumerToken(): string | null {
	return localStorage.getItem(KEY);
}

export function storeConsumerToken(accessToken: string): void {
	localStorage.setItem(KEY, accessToken);
}

export function clearConsumerToken(): void {
	localStorage.removeItem(KEY);
}
