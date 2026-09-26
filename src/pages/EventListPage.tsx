import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchEvents } from "../api/events";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime } from "../lib/format";
import type { DomainEvent, DomainEventType } from "../types";

const PAGE_SIZE = 30;

const TYPE_LABEL: Record<DomainEventType, string> = {
	APP_OPEN: "앱 실행",
	PRODUCT_LIST_VIEW: "상품 목록 조회",
	PRODUCT_DETAIL_VIEW: "상품 상세 조회",
	RECIPE_IMPRESSION: "레시피 노출",
	HOLD_CREATE: "찜 생성",
	HOLD_FAIL: "찜 실패",
	NOTIFICATION_PERMISSION_RESULT: "알림 권한 응답",
	HOLD_CANCEL: "찜 취소",
	HOLD_EXPIRE: "찜 만료",
	PICKUP_COMPLETE: "수령 완료",
	STOCK_RECONFIRM_TRIGGER: "재고 재확인 요청",
	STOCK_RECONFIRM_YES: "재고 확인 · 맞음",
	STOCK_RECONFIRM_NO: "재고 확인 · 다름",
	STOCK_RECONFIRM_DEFER: "재고 확인 보류",
	STOCK_ADJUST: "재고 조정",
	OVERSELL_DETECTED: "초과 판매 감지",
	RECIPE_VIEW: "레시피 조회",
	RECIPE_FEEDBACK: "레시피 피드백",
	PRODUCT_REGISTER: "상품 등록",
	PRODUCT_SOLD_OUT: "품절",
	STORE_REGISTER: "가게 등록",
};

// 서버가 실제로 남기는 종류만 고를 수 있게 둔다. 나머지는 앱 쪽 이벤트라 골라도 항상 비어 있다.
const SELECTABLE_TYPES: DomainEventType[] = [
	"HOLD_CREATE",
	"HOLD_FAIL",
	"HOLD_CANCEL",
	"HOLD_EXPIRE",
	"PICKUP_COMPLETE",
	"STOCK_RECONFIRM_TRIGGER",
	"STOCK_RECONFIRM_YES",
	"STOCK_RECONFIRM_NO",
	"STOCK_ADJUST",
	"OVERSELL_DETECTED",
	"PRODUCT_REGISTER",
	"PRODUCT_SOLD_OUT",
	"STORE_REGISTER",
];

const TYPE_CLASS: Partial<Record<DomainEventType, string>> = {
	HOLD_FAIL: "tag tag--rejected",
	OVERSELL_DETECTED: "tag tag--rejected",
	HOLD_CANCEL: "tag tag--expired",
	HOLD_EXPIRE: "tag tag--expired",
	PRODUCT_SOLD_OUT: "tag tag--expired",
	HOLD_CREATE: "tag tag--owner",
	PICKUP_COMPLETE: "tag tag--completed",
	PRODUCT_REGISTER: "tag tag--completed",
	STORE_REGISTER: "tag tag--completed",
};

// 이름은 각 칸에 따로 보여주므로 내용 칸에서는 뺀다.
const NAME_KEYS = new Set(["nickname", "storeName", "productName"]);

const ID_FILTERS = [
	{ key: "userId", label: "유저 id" },
	{ key: "storeId", label: "가게 id" },
	{ key: "productId", label: "상품 id" },
	{ key: "holdId", label: "찜 id" },
] as const;

type IdFilterKey = (typeof ID_FILTERS)[number]["key"];

interface Draft {
	type: string;
	userId: string;
	storeId: string;
	productId: string;
	holdId: string;
	from: string;
	to: string;
}

function draftFrom(params: URLSearchParams): Draft {
	return {
		type: params.get("type") ?? "",
		userId: params.get("userId") ?? "",
		storeId: params.get("storeId") ?? "",
		productId: params.get("productId") ?? "",
		holdId: params.get("holdId") ?? "",
		from: params.get("from") ?? "",
		to: params.get("to") ?? "",
	};
}

function numberOrUndefined(value: string): number | undefined {
	return value === "" ? undefined : Number(value);
}

function renderValue(value: unknown): string {
	if (value === null || value === undefined) {
		return "-";
	}
	if (typeof value === "boolean") {
		return value ? "예" : "아니오";
	}
	if (Array.isArray(value)) {
		return value.map(renderValue).join(", ");
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}

function nameOf(event: DomainEvent, key: string): string | null {
	const value = event.payload[key];
	return typeof value === "string" ? value : null;
}

// 입력 중인 값은 URL 과 따로 둔다. 글자마다 요청을 보내지 않고 「적용」에서만 반영한다.
// 부모가 URL 문자열을 key 로 주므로 뒤로가기로 URL 이 바뀌면 새 초기값으로 다시 만들어진다.
function EventFilters({ initial, onApply }: { initial: Draft; onApply: (next: Draft) => void }) {
	const [draft, setDraft] = useState<Draft>(initial);

	function submit(event: FormEvent) {
		event.preventDefault();
		onApply(draft);
	}

	function reset() {
		onApply({ type: "", userId: "", storeId: "", productId: "", holdId: "", from: "", to: "" });
	}

	return (
	<form className="filters filters--form" onSubmit={submit}>
			<label className="field field--inline">
				<span className="field__label">종류</span>
				<select
					className="field__input"
					value={draft.type}
					onChange={(e) => setDraft({ ...draft, type: e.target.value })}
				>
					<option value="">전체</option>
					{SELECTABLE_TYPES.map((type) => (
						<option key={type} value={type}>
							{TYPE_LABEL[type]}
						</option>
					))}
				</select>
			</label>
			{ID_FILTERS.map((filter) => (
				<label key={filter.key} className="field field--inline">
					<span className="field__label">{filter.label}</span>
					<input
						className="field__input field__input--short"
						type="number"
						min={1}
						value={draft[filter.key]}
						onChange={(e) => setDraft({ ...draft, [filter.key]: e.target.value })}
					/>
				</label>
			))}
			<label className="field field--inline">
				<span className="field__label">시작일</span>
				<input
					className="field__input"
					type="date"
					value={draft.from}
					onChange={(e) => setDraft({ ...draft, from: e.target.value })}
				/>
			</label>
			<label className="field field--inline">
				<span className="field__label">종료일</span>
				<input
					className="field__input"
					type="date"
					value={draft.to}
					onChange={(e) => setDraft({ ...draft, to: e.target.value })}
				/>
			</label>
			<div className="row-actions">
				<button type="submit" className="button button--primary">
					적용
				</button>
				<button type="button" className="button" onClick={reset}>
					초기화
				</button>
			</div>
		</form>
	);
}

export function EventListPage() {
	// 필터·페이지를 URL 에 둔다 — 새로고침과 뒤로가기가 그대로 동작하고 링크로 공유된다.
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page") ?? "0");
	const applied = draftFrom(searchParams);

	const events = useAsync(
		() =>
			fetchEvents({
				page,
				size: PAGE_SIZE,
				type: (applied.type || undefined) as DomainEventType | undefined,
				userId: numberOrUndefined(applied.userId),
				storeId: numberOrUndefined(applied.storeId),
				productId: numberOrUndefined(applied.productId),
				holdId: numberOrUndefined(applied.holdId),
				from: applied.from || undefined,
				to: applied.to || undefined,
			}),
		[searchParams.toString()],
	);

	function apply(next: Draft) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(next)) {
			if (value) {
				params.set(key, value);
			}
		}
		setSearchParams(params);
	}

	// 칸의 id 를 누르면 그 대상으로 좁힌다. 「이 손님이 뭘 했나」를 한 번의 클릭으로 본다.
	function narrowTo(key: IdFilterKey, id: number) {
		apply({ ...applied, [key]: String(id) });
	}

	function goToPage(next: number) {
		const params = new URLSearchParams(searchParams);
		params.set("page", String(next));
		setSearchParams(params);
	}

	function idCell(key: IdFilterKey, id: number | null, name: string | null) {
		if (id === null) {
			return <span className="table__muted">-</span>;
		}
		return (
			<button
				type="button"
				className="link-button"
				title={`이 ${ID_FILTERS.find((f) => f.key === key)?.label}로 좁히기`}
				onClick={() => narrowTo(key, id)}
			>
				{name ?? ""}
				<span className="table__muted"> #{id}</span>
			</button>
		);
	}

	return (
		<section>
			<div className="page-head">
				<h1 className="page-title">행동 로그</h1>
				{events.data && (
					<span className="page-count">총 {events.data.totalElements.toLocaleString()}건</span>
				)}
			</div>

			<EventFilters key={searchParams.toString()} initial={applied} onApply={apply} />

			{events.loading && <p className="state">불러오는 중…</p>}
			{events.error && <p className="state state--error">{events.error.message}</p>}

			{events.data && (
				<>
					{events.data.content.length === 0 ? (
						<p className="state">조건에 맞는 로그가 없습니다.</p>
					) : (
						<div className="table-wrap">
							<table className="table">
								<thead>
									<tr>
										<th>시각</th>
										<th>이벤트</th>
										<th>유저</th>
										<th>가게</th>
										<th>상품</th>
										<th>찜</th>
										<th>내용</th>
									</tr>
								</thead>
								<tbody>
									{events.data.content.map((event) => {
										const details = Object.entries(event.payload).filter(
											([key]) => !NAME_KEYS.has(key),
										);
										return (
											<tr key={event.id}>
												<td className="table__muted table__nowrap">
													{formatDateTime(event.createdAt)}
												</td>
												<td>
													<span className={TYPE_CLASS[event.eventType] ?? "tag tag--pending"}>
														{TYPE_LABEL[event.eventType] ?? event.eventType}
													</span>
												</td>
												<td>{idCell("userId", event.userId, nameOf(event, "nickname"))}</td>
												<td>{idCell("storeId", event.storeId, nameOf(event, "storeName"))}</td>
												<td>{idCell("productId", event.productId, nameOf(event, "productName"))}</td>
												<td>{idCell("holdId", event.holdId, null)}</td>
												<td className="event-details">
													{details.length === 0 ? (
														<span className="table__muted">-</span>
													) : (
														details.map(([key, value]) => (
															<span key={key} className="event-details__item">
																<span className="table__muted">{key}</span> {renderValue(value)}
															</span>
														))
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}

					<div className="pager">
						<button
							type="button"
							className="button"
							disabled={page <= 0}
							onClick={() => goToPage(page - 1)}
						>
							이전
						</button>
						<span className="pager__status">
							{events.data.page + 1} / {Math.max(events.data.totalPages, 1)}
						</span>
						<button
							type="button"
							className="button"
							disabled={events.data.last}
							onClick={() => goToPage(page + 1)}
						>
							다음
						</button>
					</div>
				</>
			)}
		</section>
	);
}
