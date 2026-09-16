import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { updateStoreStatus } from "../api/stores";
import { deleteUser, fetchUsers } from "../api/users";
import { useAsync } from "../hooks/useAsync";
import { formatDate, formatPhone } from "../lib/format";
import type { StoreStatus, UserRole, UserSummary } from "../types";

const PAGE_SIZE = 20;

const ROLE_FILTERS: { value: "" | UserRole; label: string }[] = [
	{ value: "", label: "전체" },
	{ value: "CONSUMER", label: "소비자" },
	{ value: "OWNER", label: "판매자" },
];

const ROLE_LABEL: Record<UserRole, string> = {
	CONSUMER: "소비자",
	OWNER: "판매자",
};

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

export function UserListPage() {
	// 필터·페이지를 URL 에 둔다 — 새로고침과 뒤로가기가 그대로 동작하고 링크로 공유된다.
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page") ?? "0");
	const role = (searchParams.get("role") ?? "") as "" | UserRole;

	// 승인·삭제 뒤 목록을 다시 읽기 위한 신호. useAsync 는 deps 가 바뀔 때만 다시 부른다.
	const [reloadToken, setReloadToken] = useState(0);
	const [busyUserId, setBusyUserId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const users = useAsync(
		() => fetchUsers({ page, size: PAGE_SIZE, role: role || undefined }),
		[page, role, reloadToken],
	);

	async function run(userId: number, action: () => Promise<void>, failure: string) {
		setError(null);
		setBusyUserId(userId);
		try {
			await action();
			setReloadToken((token) => token + 1);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : failure);
		} finally {
			setBusyUserId(null);
		}
	}

	function changeStoreStatus(user: UserSummary, next: StoreStatus) {
		if (!user.store) {
			return;
		}
		const storeId = user.store.id;
		void run(user.id, () => updateStoreStatus(storeId, next), "가게 상태를 바꾸지 못했습니다.");
	}

	function removeUser(user: UserSummary) {
		const storeNotice = user.store
			? `\n가게 「${user.store.name}」와 상품, 그 가게의 찜 기록도 함께 삭제됩니다.`
			: "";
		// 되돌릴 수 없는 삭제라 한 번 더 묻는다.
		if (!window.confirm(`「${user.nickname}」 회원을 삭제할까요?${storeNotice}\n되돌릴 수 없습니다.`)) {
			return;
		}
		void run(user.id, () => deleteUser(user.id), "회원을 삭제하지 못했습니다.");
	}

	function selectRole(next: "" | UserRole) {
		const params = new URLSearchParams();
		if (next) {
			params.set("role", next);
		}
		setSearchParams(params);
	}

	function goToPage(next: number) {
		const params = new URLSearchParams(searchParams);
		params.set("page", String(next));
		setSearchParams(params);
	}

	return (
		<section>
			<div className="page-head">
				<h1 className="page-title">유저</h1>
				{users.data && (
					<span className="page-count">총 {users.data.totalElements.toLocaleString()}명</span>
				)}
			</div>

			<div className="filters">
				{ROLE_FILTERS.map((filter) => (
					<button
						key={filter.value}
						type="button"
						className={role === filter.value ? "chip chip--active" : "chip"}
						onClick={() => selectRole(filter.value)}
					>
						{filter.label}
					</button>
				))}
			</div>

			{error && <p className="state state--error">{error}</p>}
			{users.loading && <p className="state">불러오는 중…</p>}
			{users.error && <p className="state state--error">{users.error.message}</p>}

			{users.data && (
				<>
					{users.data.content.length === 0 ? (
						<p className="state">가입한 유저가 없습니다.</p>
					) : (
						<div className="table-wrap">
							<table className="table">
								<thead>
									<tr>
										<th>닉네임</th>
										<th>구분</th>
										<th>연락처</th>
										<th>기본 동네</th>
										<th>가입 경로</th>
										<th>마케팅 수신</th>
										<th>가입일</th>
										<th>가게</th>
										<th>관리</th>
									</tr>
								</thead>
								<tbody>
									{users.data.content.map((user) => (
										<tr key={user.id}>
											<td>{user.nickname}</td>
											<td>
												<span
													className={
														user.role === "OWNER" ? "tag tag--owner" : "tag tag--consumer"
													}
												>
													{ROLE_LABEL[user.role]}
												</span>
											</td>
											<td className="table__muted">{formatPhone(user.phone)}</td>
											<td className="table__muted">{user.regionName ?? "-"}</td>
											<td className="table__muted">{user.oauthProvider ?? "-"}</td>
											<td className="table__muted">{user.marketingOptIn ? "동의" : "미동의"}</td>
											<td className="table__muted">{formatDate(user.createdAt)}</td>
											<td>
												{user.store ? (
													<div className="row-actions">
														<span className={STORE_STATUS_CLASS[user.store.status]}>
															{STORE_STATUS_LABEL[user.store.status]}
														</span>
														{user.store.status === "PENDING" && (
															<>
																<button
																	type="button"
																	className="button button--small"
																	disabled={busyUserId === user.id}
																	onClick={() => changeStoreStatus(user, "APPROVED")}
																>
																	승인
																</button>
																<button
																	type="button"
																	className="button button--small button--danger"
																	disabled={busyUserId === user.id}
																	onClick={() => changeStoreStatus(user, "REJECTED")}
																>
																	반려
																</button>
															</>
														)}
													</div>
												) : (
													<span className="table__muted">
														{user.role === "OWNER" ? "가게 미등록" : "-"}
													</span>
												)}
											</td>
											<td>
												<button
													type="button"
													className="button button--small button--danger"
													disabled={busyUserId === user.id}
													onClick={() => removeUser(user)}
												>
													삭제
												</button>
											</td>
										</tr>
									))}
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
							{users.data.page + 1} / {Math.max(users.data.totalPages, 1)}
						</span>
						<button
							type="button"
							className="button"
							disabled={users.data.last}
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
