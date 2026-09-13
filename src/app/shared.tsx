import { ApiError } from "../api/client";

export function won(value: number): string {
	return `${value.toLocaleString("ko-KR")}원`;
}

/** 남은 시간을 mm:ss 로. 카운트다운은 서버가 준 expiresAt 과 serverTime 의 차로 화면이 센다. */
export function clockLabel(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** pickupEndAt 은 LocalDateTime(오프셋 없음)이라 문자열에서 그대로 꺼낸다. */
export function localTimeLabel(isoLocalDateTime: string): string {
	return isoLocalDateTime.slice(11, 16);
}

/** heldAt·notifiedAt 은 Instant 라 문자열을 자르면 UTC 가 나온다 -- 브라우저 시간대로 옮긴다. */
export function momentLabel(instant: string): string {
	return new Date(instant).toLocaleString("ko-KR", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function deadlineLabel(isoLocalDateTime: string): string {
	const minutes = Math.round(
		(new Date(isoLocalDateTime).getTime() - Date.now()) / 60000,
	);
	if (minutes <= 0) {
		return "마감";
	}
	if (minutes < 60) {
		return `${minutes}분 뒤 마감`;
	}
	return `${Math.floor(minutes / 60)}시간 뒤 마감`;
}

export function asError(caught: unknown): Error {
	return caught instanceof Error ? caught : new Error("알 수 없는 오류");
}

export function codeOf(error: Error): string | null {
	return error instanceof ApiError ? error.code : null;
}

/** 비회원이 회원 전용 기능에 닿으면 서버가 이 코드를 준다. 앱은 이걸 보고 가입 안내로 분기한다. */
export function isLoginRequired(error: Error): boolean {
	return codeOf(error) === "LOGIN_REQUIRED";
}

export function ErrorNote({ error }: { error: Error }) {
	const code = codeOf(error);
	return (
		<p className="state state--error">
			{code && <code>{code}</code>} {error.message}
		</p>
	);
}

export function Loading({ label = "불러오는 중…" }: { label?: string }) {
	return <p className="state">{label}</p>;
}
