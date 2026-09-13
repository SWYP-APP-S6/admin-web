import { fetchActiveHold } from "../api/holds";
import { fetchMe } from "../api/me";
import { useAsync } from "../hooks/useAsync";
import { ErrorNote, Loading, momentLabel } from "../app/shared";
import { ROLE_LABEL } from "./session";

/** 서버 정책(hold.cancel-credit-max)과 같은 값. 점 개수를 그리는 데만 쓴다. */
const MAX_CANCEL_CREDITS = 3;

interface Props {
	accessToken: string;
	reloadKey: number;
	via: "kakao" | "dev";
	onSignOut: () => void;
}

/** C-050. 앱은 스플래시에서도 이 요청으로 토큰을 검증한다 -- 위치 권한 없이 부를 수 있는 첫 조회다. */
export function MyScreen({ accessToken, reloadKey, via, onSignOut }: Props) {
	const me = useAsync(() => fetchMe(accessToken), [accessToken, reloadKey]);
	const active = useAsync(() => fetchActiveHold(accessToken), [accessToken, reloadKey]);

	if (me.loading) {
		return <Loading />;
	}
	if (me.error) {
		return <ErrorNote error={me.error} />;
	}
	if (!me.data) {
		return null;
	}

	const profile = me.data;
	return (
		<div className="app-screen">
			<div className="app-profile">
				<div className="app-profile__name">{profile.nickname}</div>
				<div className="app-item__meta">
					{ROLE_LABEL[profile.role]} · #{profile.id}
					{via === "dev" && " · 테스트 계정"}
				</div>
			</div>

			<section className="app-store">
				<header className="app-store__head">
					<strong>취소 가능 횟수</strong>
				</header>
				{active.data ? (
					<>
						<div className="credits">
							{Array.from({ length: MAX_CANCEL_CREDITS }, (_, index) => (
								<span
									key={index}
									className={
										index < active.data!.cancelsLeft
											? "credits__dot credits__dot--left"
											: "credits__dot"
									}
								/>
							))}
							<strong>{active.data.cancelsLeft}회 남음</strong>
						</div>
						<p className="app-hint">
							{active.data.nextCancelCreditAt
								? `하루에 1회씩 최대 ${MAX_CANCEL_CREDITS}회까지 채워집니다. 다음 충전 ${momentLabel(
										active.data.nextCancelCreditAt,
									)}`
								: "가득 차 있습니다. 취소하거나 노쇼가 확정되면 한 칸씩 줄어듭니다."}
						</p>
					</>
				) : (
					<Loading label="확인 중…" />
				)}
			</section>

			<section className="app-store">
				<header className="app-store__head">
					<strong>내 정보</strong>
				</header>
				<div className="phone__row">
					<strong>전화번호</strong>
					{profile.phone ?? "없음"}
				</div>
				<div className="phone__row">
					<strong>마케팅 수신</strong>
					{profile.marketingOptIn ? "동의" : "미동의"}
				</div>
				<div className="phone__row">
					<strong>약관 동의</strong>
					{momentLabel(profile.termsAgreedAt)}
				</div>
				<div className="phone__row">
					<strong>가입</strong>
					{momentLabel(profile.joinedAt)}
				</div>
				<p className="app-hint">
					약관은 항목별로 저장하지 않습니다 — 필수 전건에 동의한 시각 하나뿐입니다.
				</p>
			</section>

			<button className="phone__cta phone__cta--ghost" type="button" onClick={onSignOut}>
				로그아웃
			</button>
		</div>
	);
}
