import { useEffect, useState } from "react";
import { completePickup, fetchOwnerHold } from "../api/owner";
import { ErrorNote, Loading, asError, clockLabel, momentLabel, won } from "../app/shared";
import type { OwnerHoldDetail } from "../types";

const STATUS_LABEL: Record<OwnerHoldDetail["status"], string> = {
	HOLDING: "찜 진행중",
	COMPLETED: "픽업 완료",
	EXPIRED: "만료",
	CANCELED_BY_OWNER: "점주가 취소",
	CANCELED_BY_USER: "손님이 취소",
};

interface Props {
	holdId: number;
	accessToken: string;
	onChanged: () => void;
}

/**
 * O-040 찜 상세. 카운트다운은 소비자 화면과 같은 방식이다 -- 서버가 준 serverTime 을 기준으로
 * 경과 시간을 더해 센다. 단말 시계를 바꿔도 숫자가 흔들리지 않는다.
 */
export function OwnerHoldDetailScreen({ holdId, accessToken, onChanged }: Props) {
	const [state, setState] = useState<{ hold: OwnerHoldDetail; receivedAt: number } | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [busy, setBusy] = useState(false);
	const [tick, setTick] = useState(() => Date.now());

	useEffect(() => {
		let active = true;
		fetchOwnerHold(holdId, accessToken)
			.then((hold) => {
				if (active) {
					setState({ hold, receivedAt: Date.now() });
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

	if (error && !state) {
		return <ErrorNote error={error} />;
	}
	if (!state) {
		return <Loading />;
	}

	const { hold, receivedAt } = state;
	const serverNow = new Date(hold.serverTime).getTime() + (tick - receivedAt);
	const remaining = new Date(hold.expiresAt).getTime() - serverNow;
	const running = hold.status === "HOLDING" && remaining > 0;

	async function complete() {
		setBusy(true);
		setError(null);
		try {
			setState({ hold: await completePickup(holdId, accessToken), receivedAt: Date.now() });
			onChanged();
		} catch (caught) {
			setError(asError(caught));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="app-screen">
			<div className={running ? "countdown countdown--calm" : "countdown countdown--done"}>
				<div className="countdown__clock">
					{running ? clockLabel(remaining) : STATUS_LABEL[hold.status]}
				</div>
				<div className="countdown__caption">
					{momentLabel(hold.expiresAt)}까지 픽업 · {hold.nickname} 님
				</div>
			</div>

			<section className="app-store">
				<header className="app-store__head">
					<strong>🏪 {hold.storeName}</strong>
					<span>{momentLabel(hold.heldAt)}에 찜</span>
				</header>
				{hold.items.map((item) => (
					<div className="app-item" key={item.productId}>
						<img className="app-item__thumb" src={item.photoUrl} alt="" />
						<span className="app-item__body">
							<span className="app-item__name">{item.productName}</span>
							<span className="app-item__meta">
								{item.qty}개 · {won(item.lineTotal)}
							</span>
						</span>
					</div>
				))}
				<div className="phone__row">
					<strong>총 금액</strong>
					{hold.totalQty}개 · {won(hold.totalPrice)}
				</div>
				{hold.completedAt && (
					<div className="phone__row">
						<strong>수령 시각</strong>
						{momentLabel(hold.completedAt)}
					</div>
				)}
				{hold.canceledAt && (
					<div className="phone__row">
						<strong>취소</strong>
						{momentLabel(hold.canceledAt)}
						{hold.cancelReason ? ` · ${hold.cancelReason}` : ""}
					</div>
				)}
			</section>

			{error && <ErrorNote error={error} />}

			<button
				className="phone__cta"
				type="button"
				disabled={busy || (hold.status !== "HOLDING" && hold.status !== "EXPIRED")}
				onClick={complete}
			>
				{busy ? "처리 중…" : hold.status === "COMPLETED" ? "픽업 완료된 찜" : "픽업 완료했어요"}
			</button>

			<p className="app-hint">
				점주가 개별 찜을 <strong>취소</strong>하는 API 는 아직 없습니다(O-042 · O-043). 지금은
				상품의 남은 수량을 0 으로 내리면서 <code>CANCEL_ALL</code> 로 그 상품의 활성 찜을 한꺼번에
				취소하는 경로뿐입니다.
			</p>
		</div>
	);
}
