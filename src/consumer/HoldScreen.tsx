import { useEffect, useState } from "react";
import { cancelHold, fetchHold } from "../api/holds";
import type { HoldDetail } from "../types";
import { ErrorNote, Loading, asError, clockLabel, momentLabel, won } from "../app/shared";

/** 화면이 분홍으로 바뀌는 지점. 서버가 단계를 계산해 내리면 응답을 받은 순간 이미 낡는다. */
const HURRY_MS = 5 * 60 * 1000;

function settled(hold: HoldDetail): { clock: string; caption: string } {
	switch (hold.status) {
		case "COMPLETED":
			return { clock: "완료", caption: "수령이 완료됐어요" };
		case "CANCELED":
			return {
				clock: "취소",
				caption:
					hold.canceledBy === "OWNER"
						? `${hold.store.name}에서 준비가 어려워졌어요`
						: "찜을 취소했어요",
			};
		default:
			return { clock: "00:00", caption: "시간이 지나 자동 취소 됐어요" };
	}
}

interface Props {
	holdId: number;
	accessToken: string;
	onChanged: () => void;
	onBrowse: () => void;
}

/**
 * C-022. 카운트다운은 폴링하지 않는다 -- 서버가 준 serverTime 과 응답을 받은 순간의 차를
 * 오프셋으로 잡아 두고, 그 뒤로는 단말 시계가 아니라 경과 시간으로 센다. 단말 시계를 바꿔도
 * 숫자가 흔들리지 않는다.
 */
export function HoldScreen({ holdId, accessToken, onChanged, onBrowse }: Props) {
	const [hold, setHold] = useState<{ detail: HoldDetail; receivedAt: number } | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [busy, setBusy] = useState(false);
	const [tick, setTick] = useState(() => Date.now());

	useEffect(() => {
		let active = true;
		setError(null);
		fetchHold(holdId, accessToken)
			.then((detail) => {
				if (active) {
					setHold({ detail, receivedAt: Date.now() });
				}
			})
			.catch((caught) => {
				if (active) {
					setError(asError(caught));
				}
			});
		return () => {
			active = false;
		};
	}, [holdId, accessToken]);

	useEffect(() => {
		const timer = window.setInterval(() => setTick(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	if (error) {
		return <ErrorNote error={error} />;
	}
	if (!hold) {
		return <Loading />;
	}

	const { detail, receivedAt } = hold;
	const serverNow = new Date(detail.serverTime).getTime() + (tick - receivedAt);
	const remaining = new Date(detail.expiresAt).getTime() - serverNow;
	const running = detail.status === "HOLDING" && remaining > 0;

	async function cancel() {
		setBusy(true);
		setError(null);
		try {
			setHold({ detail: await cancelHold(holdId, accessToken), receivedAt: Date.now() });
			onChanged();
		} catch (caught) {
			setError(asError(caught));
			try {
				setHold({ detail: await fetchHold(holdId, accessToken), receivedAt: Date.now() });
			} catch {
				// 재조회까지 실패하면 위의 오류를 그대로 보여준다.
			}
		} finally {
			setBusy(false);
		}
	}

	async function refresh() {
		setBusy(true);
		setError(null);
		try {
			setHold({ detail: await fetchHold(holdId, accessToken), receivedAt: Date.now() });
			onChanged();
		} catch (caught) {
			setError(asError(caught));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="app-screen">
			{running ? (
				<div className={remaining <= HURRY_MS ? "countdown countdown--hurry" : "countdown countdown--calm"}>
					<div className="countdown__clock">{clockLabel(remaining)}</div>
					<div className="countdown__caption">
						{remaining <= HURRY_MS ? "서둘러주세요" : "여유있어요"} · 찜 종료{" "}
						{new Date(detail.expiresAt).toLocaleTimeString("ko-KR", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				</div>
			) : (
				<div className="countdown countdown--done">
					<div className="countdown__clock">{settled(detail).clock}</div>
					<div className="countdown__caption">{settled(detail).caption}</div>
				</div>
			)}

			<section className="app-store">
				<header className="app-store__head">
					<strong>{detail.store.name}</strong>
					<span>{detail.store.openNow ? "영업 중" : "영업 종료"}</span>
				</header>
				{detail.items.map((item) => (
					<div className="app-item" key={item.productId}>
						<img className="app-item__thumb" src={item.photoUrl} alt="" />
						<span className="app-item__body">
							<span className="app-item__name">{item.name}</span>
							<span className="app-item__meta">
								{item.qty}개 · {won(item.lineTotal)}
							</span>
						</span>
					</div>
				))}
				<div className="phone__row">
					<strong>합계</strong>
					{detail.totalQty}개 · {won(detail.totalPrice)}
				</div>
				<div className="phone__row">
					<strong>찜한 시각</strong>
					{momentLabel(detail.heldAt)}
				</div>
				<div className="phone__row">
					<strong>주소</strong>
					{detail.store.address}
					{detail.store.addressDetail ? ` ${detail.store.addressDetail}` : ""}
				</div>
				<div className="phone__row">
					<strong>전화</strong>
					{detail.store.phone}
				</div>
			</section>

			{error && <ErrorNote error={error} />}

			{running ? (
				<button className="phone__cta phone__cta--ghost" type="button" disabled={busy} onClick={cancel}>
					{busy ? "취소 중…" : "찜 취소 (전체)"}
				</button>
			) : (
				<>
					<button className="phone__cta" type="button" onClick={onBrowse}>
						다른 상품 보기
					</button>
					{detail.status === "HOLDING" && (
						<button
							className="phone__cta phone__cta--ghost"
							type="button"
							disabled={busy}
							onClick={refresh}
						>
							{busy ? "확인 중…" : "서버 상태 확인"}
						</button>
					)}
				</>
			)}
		</div>
	);
}
