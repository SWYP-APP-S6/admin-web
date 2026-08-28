import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchUsers } from "../api/users";
import { useAsync } from "../hooks/useAsync";
import { formatDate, formatPhone } from "../lib/format";
import type { UserRole } from "../types";

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

export function UserListPage() {
	// 필터·페이지를 URL 에 둔다 — 새로고침과 뒤로가기가 그대로 동작하고 링크로 공유된다.
	const [searchParams, setSearchParams] = useSearchParams();
	const page = Number(searchParams.get("page") ?? "0");
	const role = (searchParams.get("role") ?? "") as "" | UserRole;

	const users = useAsync(
		useCallback(
			() => fetchUsers({ page, size: PAGE_SIZE, role: role || undefined }),
			[page, role],
		),
		[page, role],
	);

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
