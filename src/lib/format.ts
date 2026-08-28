const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

// Instant 는 ISO 문자열로 내려오지만, 직렬화 설정이 바뀌어 epoch 숫자가 와도 깨지지 않게 둘 다 받는다.
export function formatDate(value: string | number | null): string {
	if (value === null) {
		return "-";
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

// 저장은 숫자만 하고 표시할 때 하이픈을 넣는다. 길이·국번으로 나누는 규칙이 갈려서
// 아는 형태만 처리하고 나머지는 원본을 그대로 돌려준다(잘못 끊어 보여주는 것보다 낫다).
export function formatPhone(value: string | null): string {
	if (!value) {
		return "-";
	}
	const digits = value.replace(/\D/g, "");

	if (digits.length === 11) {
		return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
	}
	if (digits.length === 10) {
		// 서울(02)만 지역번호가 두 자리다.
		return digits.startsWith("02")
			? `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
			: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
	}
	if (digits.length === 9 && digits.startsWith("02")) {
		return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
	}
	return value;
}
