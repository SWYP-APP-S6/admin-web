import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adjustCancelCredits, deleteUser, fetchUser } from "../api/users";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime, formatPhone } from "../lib/format";
import type { AdminUserDetail, CancelCreditReason, PushState, StoreStatus, TermsType } from "../types";

const ROLE_LABEL = { CONSUMER: "소비자", OWNER: "판매자" } as const;

const STORE_STATUS_LABEL: Record<StoreStatus, string> = {
	PENDING: "심사 대기",
	APPROVED: "승인",
	REJECTED: "반려",
};

const STORE_STATUS_CLASS: Record<StoreStatus, string> = {
	PENDING: "tag tag--pending",
	APPROVED: "tag tag--owner",
	REJECTED: "tag tag--rejected",
};

const REASON_LABEL: Record<CancelCreditReason, string> = {
	CANCEL: "취소",
	NO_SHOW: "노쇼",
	REFILL: "충전",
	GIVE_BACK: "노쇼 되돌림",
	ADMIN_ADJUST: "관리자 보정",
};

const PUSH_LABEL: Record<PushState, string> = {
	PENDING: "발송 대기",
	SENT: "발송됨",
	SKIPPED: "건너뜀",
	FAILED: "실패",
};

const PUSH_CLASS: Record<PushState, string> = {
	PENDING: "tag tag--pending",
	SENT: "tag tag--completed",
	SKIPPED: "tag tag--expired",
	FAILED: "tag tag--rejected",
};

const TERMS_LABEL: Record<TermsType, string> = {
	SERVICE: "서비스 이용약관",
	PRIVACY_COLLECTION: "개인정보 수집·이용",
	LOCATION: "위치기반 서비스",
	THIRD_PARTY: "제3자 제공",
	MARKETING: "마케팅 수신",
	PRIVACY_POLICY: "개인정보 처리방침",
};

export function UserDetailPage() {
	const { id } = useParams<{ id: string }>();
	const userId = Number(id);
	const navigate = useNavigate();

	// 크레딧 보정·삭제 뒤 다시 읽기 위한 신호.
	const [reloadToken, setReloadToken] = useState(0);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const user = useAsync(() => fetchUser(userId), [userId, reloadToken]);

	async function run(action: () => Promise<unknown>, failure: string) {
		setError(null);
		setBusy(true);
		try {
			await action();
			setReloadToken((token) => token + 1);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : failure);
		} finally {
			setBusy(false);
		}
	}

	function adjust(delta: number) {
		const verb = delta > 0 ? "하나 돌려줄까요" : "하나 깎을까요";
		if (!window.confirm(`취소 가능 횟수를 ${verb}? 원장에 관리자 보정으로 남습니다.`)) {
			return;
		}
		void run(() => adjustCancelCredits(userId, delta), "취소권을 보정하지 못했습니다.");
	}

	async function remove(detail: AdminUserDetail) {
		const storeNotice = detail.store
			? `\n가게 「${detail.store.name}」와 상품, 그 가게의 찜 기록도 함께 삭제됩니다.`
			: "";
		if (!window.confirm(`「${detail.nickname}」 회원을 삭제할까요?${storeNotice}\n되돌릴 수 없습니다.`)) {
			return;
		}
		setError(null);
		setBusy(true);
		try {
			await deleteUser(userId);
			navigate("/users", { replace: true });
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "회원을 삭제하지 못했습니다.");
			setBusy(false);
		}
	}

	return (
		<section>
			<Link to="/users" className="detail__back">
				← 유저 목록
			</Link>

			{user.loading && <p className="state">불러오는 중…</p>}
			{user.error && <p className="state state--error">{user.error.message}</p>}
			{error && <p className="state state--error">{error}</p>}

			{user.data && (
				<UserDetail detail={user.data} busy={busy} onAdjust={adjust} onDelete={() => void remove(user.data!)} />
			)}
		</section>
	);
}

function UserDetail({
	detail,
	busy,
	onAdjust,
	onDelete,
}: {
	detail: AdminUserDetail;
	busy: boolean;
	onAdjust: (delta: number) => void;
	onDelete: () => void;
}) {
	const holdTotal =
		detail.holds.holding +
		detail.holds.completed +
		detail.holds.expired +
		detail.holds.canceledByUser +
		detail.holds.canceledByOwner;

	return (
		<>
			<div className="page-head">
				<h1 className="page-title">
					{detail.nickname}
					<span className="page-count"> #{detail.id}</span>
				</h1>
				<span className={detail.role === "OWNER" ? "tag tag--owner" : "tag tag--consumer"}>
					{ROLE_LABEL[detail.role]}
				</span>
				<div className="row-actions page-head__actions">
					<Link className="button button--small" to={`/holds?userId=${detail.id}`}>
						찜 목록
					</Link>
					<Link className="button button--small" to={`/events?userId=${detail.id}`}>
						행동 로그
					</Link>
					<button type="button" className="button button--small button--danger" disabled={busy} onClick={onDelete}>
						회원 삭제
					</button>
				</div>
			</div>

			<div className="detail-grid">
				<div className="panel">
					<h2 className="panel__title">기본 정보</h2>
					<dl className="kv">
						<dt>연락처</dt>
						<dd>{formatPhone(detail.phone)}</dd>
						<dt>가입 경로</dt>
						<dd>
							{detail.oauthProvider ?? "-"}
							{detail.oauthProviderId && <span className="table__muted"> · {detail.oauthProviderId}</span>}
						</dd>
						<dt>기본 동네</dt>
						<dd>
							{detail.location
								? `${detail.location.regionName} (${detail.location.latitude}, ${detail.location.longitude})`
								: "-"}
						</dd>
						<dt>마케팅 수신</dt>
						<dd>{detail.marketingOptIn ? "동의" : "미동의"}</dd>
						<dt>약관 동의 시각</dt>
						<dd>{formatDateTime(detail.termsAgreedAt)}</dd>
						<dt>가입일</dt>
						<dd>{formatDateTime(detail.createdAt)}</dd>
					</dl>
				</div>

				<div className="panel">
					<h2 className="panel__title">가게</h2>
					{detail.store ? (
						<dl className="kv">
							<dt>이름</dt>
							<dd>
								{detail.store.name}
								<span className="table__muted"> #{detail.store.id}</span>
							</dd>
							<dt>상태</dt>
							<dd>
								<span className={STORE_STATUS_CLASS[detail.store.status]}>
									{STORE_STATUS_LABEL[detail.store.status]}
								</span>
							</dd>
							<dt>등록일</dt>
							<dd>{formatDateTime(detail.store.createdAt)}</dd>
							<dt></dt>
							<dd>
								<Link className="button button--small" to={`/products?storeId=${detail.store.id}`}>
									상품 보기
								</Link>
							</dd>
						</dl>
					) : (
						<p className="table__muted">{detail.role === "OWNER" ? "가게 미등록" : "소비자 계정"}</p>
					)}
				</div>

				<div className="panel">
					<h2 className="panel__title">취소 가능 횟수</h2>
					<div className="credit-line">
						<strong className="credit-line__value">
							{detail.cancelCredits.credits} / {detail.cancelCredits.max}
						</strong>
						<span className="table__muted">
							{detail.cancelCredits.nextRefillAt
								? `다음 충전 ${formatDateTime(detail.cancelCredits.nextRefillAt)}`
								: "가득 참"}
						</span>
						<div className="row-actions">
							<button
								type="button"
								className="button button--small"
								disabled={busy || detail.cancelCredits.credits >= detail.cancelCredits.max}
								onClick={() => onAdjust(1)}
							>
								+1
							</button>
							<button
								type="button"
								className="button button--small button--danger"
								disabled={busy || detail.cancelCredits.credits <= 0}
								onClick={() => onAdjust(-1)}
							>
								−1
							</button>
						</div>
					</div>
					{detail.cancelCredits.events.length === 0 ? (
						<p className="table__muted">변동 이력이 없습니다.</p>
					) : (
						<table className="table table--compact">
							<thead>
								<tr>
									<th>시각</th>
									<th>사유</th>
									<th>변동</th>
									<th>찜</th>
								</tr>
							</thead>
							<tbody>
								{detail.cancelCredits.events.map((event) => (
									<tr key={event.id}>
										<td className="table__muted table__nowrap">{formatDateTime(event.createdAt)}</td>
										<td>{REASON_LABEL[event.reason]}</td>
										<td className={event.delta < 0 ? "credit-delta credit-delta--down" : "credit-delta"}>
											{event.delta > 0 ? `+${event.delta}` : event.delta}
										</td>
										<td>
											{event.holdId ? (
												<Link to={`/holds?userId=${detail.id}`}>#{event.holdId}</Link>
											) : (
												<span className="table__muted">-</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				<div className="panel">
					<h2 className="panel__title">찜</h2>
					<dl className="facts facts--flat">
						<div className="facts__item">
							<dt>전체</dt>
							<dd>{holdTotal}</dd>
						</div>
						<div className="facts__item">
							<dt>찜 중</dt>
							<dd>{detail.holds.holding}</dd>
						</div>
						<div className="facts__item">
							<dt>수령</dt>
							<dd>{detail.holds.completed}</dd>
						</div>
						<div className="facts__item">
							<dt>만료</dt>
							<dd>{detail.holds.expired}</dd>
						</div>
						<div className="facts__item">
							<dt>본인 취소</dt>
							<dd>{detail.holds.canceledByUser}</dd>
						</div>
						<div className="facts__item">
							<dt>점주 취소</dt>
							<dd>{detail.holds.canceledByOwner}</dd>
						</div>
					</dl>
					<p className="table__muted">찜 중은 저장된 상태 기준이라 만료 시각이 지났어도 배치 전이면 여기 셉니다.</p>
				</div>

				<div className="panel detail-grid__wide">
					<h2 className="panel__title">알림 (최근 10건 · 안 읽음 {detail.notifications.unreadCount})</h2>
					{detail.notifications.recent.length === 0 ? (
						<p className="table__muted">보낸 알림이 없습니다.</p>
					) : (
						<table className="table table--compact">
							<thead>
								<tr>
									<th>시각</th>
									<th>종류</th>
									<th>제목</th>
									<th>읽음</th>
									<th>푸시</th>
								</tr>
							</thead>
							<tbody>
								{detail.notifications.recent.map((n) => (
									<tr key={n.id}>
										<td className="table__muted table__nowrap">{formatDateTime(n.createdAt)}</td>
										<td className="table__muted">{n.type}</td>
										<td title={n.body}>{n.title}</td>
										<td className="table__muted">{n.readAt ? formatDateTime(n.readAt) : "안 읽음"}</td>
										<td>
											<span className={PUSH_CLASS[n.pushState]}>{PUSH_LABEL[n.pushState]}</span>
											{n.pushAttempts > 0 && (
												<span className="table__muted"> {n.pushAttempts}회</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				<div className="panel">
					<h2 className="panel__title">기기 토큰</h2>
					{detail.deviceTokens.length === 0 ? (
						<p className="table__muted">등록된 기기가 없습니다. 푸시가 가지 않습니다.</p>
					) : (
						<table className="table table--compact">
							<thead>
								<tr>
									<th>플랫폼</th>
									<th>토큰</th>
									<th>마지막 사용</th>
								</tr>
							</thead>
							<tbody>
								{detail.deviceTokens.map((token) => (
									<tr key={token.id}>
										<td>{token.platform}</td>
										<td className="table__muted">{token.tokenSuffix}</td>
										<td className="table__muted table__nowrap">{formatDateTime(token.lastUsedAt)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>

				<div className="panel">
					<h2 className="panel__title">약관 동의</h2>
					{detail.termsAgreements.length === 0 ? (
						<p className="table__muted">동의 기록이 없습니다.</p>
					) : (
						<table className="table table--compact">
							<thead>
								<tr>
									<th>약관</th>
									<th>판</th>
									<th>동의 시각</th>
								</tr>
							</thead>
							<tbody>
								{detail.termsAgreements.map((agreement) => (
									<tr key={`${agreement.type}-${agreement.version}`}>
										<td title={agreement.title}>{TERMS_LABEL[agreement.type] ?? agreement.type}</td>
										<td className="table__muted">v{agreement.version}</td>
										<td className="table__muted table__nowrap">{formatDateTime(agreement.agreedAt)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</>
	);
}
