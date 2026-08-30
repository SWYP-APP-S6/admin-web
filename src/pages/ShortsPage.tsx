import { useCallback, useEffect, useRef, useState } from "react";
import {
	fetchClipObjectUrl,
	fetchJob,
	fetchSegmentPreviewUrl,
	fetchShortsHealth,
	fetchShortsSource,
	fetchShortsSources,
	fetchUtterances,
	renderClip,
	reviewClip,
	runCut,
	runPipeline,
	runSegment,
	runStt,
} from "../api/shorts";
import { LazyVideo } from "../components/LazyVideo";
import { useAsync } from "../hooks/useAsync";
import type {
	ShortsClip,
	ShortsCost,
	ShortsHealth,
	ShortsJob,
	ShortsSegment,
	ShortsSourceDetail,
	ShortsUtterance,
} from "../types";

const DEFAULT_CRITERIA = "한 문장으로 인용할 만한 핵심 논지";

const STAGE_LABEL: Record<string, string> = {
	pipeline: "전체 실행",
	segment: "주제 분할",
	rank: "구간 선정",
	cut: "구간 자르기",
	render: "렌더",
	stt: "음성 인식",
	chunk: "구간 추출",
};

function time(seconds: number): string {
	const total = Math.round(seconds);
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function elapsed(since: string): string {
	return `${Math.max(0, Math.round((Date.now() - new Date(since).getTime()) / 1000))}초`;
}

export function ShortsPage() {
	// 선택값은 고르기 전까지 없다. effect 로 첫 항목을 심으면 렌더가 한 번 더 돌아서 렌더 중 파생한다.
	const [picked, setPicked] = useState<number | null>(null);
	const [reloadToken, setReloadToken] = useState(0);
	const [job, setJob] = useState<ShortsJob | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
	const [openPreview, setOpenPreview] = useState<number | null>(null);
	const [transcript, setTranscript] = useState<ShortsUtterance[] | null>(null);
	const pollRef = useRef<number | null>(null);

	const health = useAsync<ShortsHealth>(fetchShortsHealth, [reloadToken]);
	const sources = useAsync(fetchShortsSources, [reloadToken]);
	const sourceId = picked ?? sources.data?.[0]?.id ?? null;
	const detail = useAsync<ShortsSourceDetail | null>(
		() => (sourceId === null ? Promise.resolve(null) : fetchShortsSource(sourceId)),
		[sourceId, reloadToken],
	);

	const busy = job !== null && job.status !== "DONE" && job.status !== "FAILED";

	// 잡이 끝날 때까지만 폴링하고 멈춘다. 끝나면 화면을 다시 읽는다.
	useEffect(() => {
		if (!job || !busy) {
			return;
		}
		pollRef.current = window.setTimeout(async () => {
			try {
				const next = await fetchJob(job.id);
				setJob(next);
				if (next.status === "DONE" || next.status === "FAILED") {
					setReloadToken((n) => n + 1);
					setError(next.error);
				}
			} catch (e: unknown) {
				setError(e instanceof Error ? e.message : String(e));
			}
		}, 2000);
		return () => {
			if (pollRef.current) {
				window.clearTimeout(pollRef.current);
			}
		};
	}, [job, busy]);

	const submit = useCallback(async (start: () => Promise<ShortsJob>) => {
		setError(null);
		try {
			setJob(await start());
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}, []);

	const act = useCallback(async (run: () => Promise<unknown>) => {
		setError(null);
		try {
			await run();
			setReloadToken((n) => n + 1);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}, []);

	const data = detail.data;
	const geminiReady = health.data?.geminiKey === true;
	const segments: ShortsSegment[] = data ? data.chunks.flatMap((c) => c.segments) : [];
	const latestRun = data?.runs[0] ?? null;
	const ranked = latestRun?.ranked?.ranked ?? [];
	const excluded = latestRun?.ranked?.excluded ?? [];
	const clipBySegment = new Map<number, ShortsClip>();
	for (const clip of data?.clips ?? []) {
		const segment = segments.find((s) => s.id === clip.segment_id);
		if (segment) {
			clipBySegment.set(segment.idx, clip);
		}
	}

	return (
		<>
			<div className="page-head">
				<h1 className="page-title">숏폼 생성 (베타)</h1>
				{data && (
					<span className="sm-meta">
						발화 {data.chunks.reduce((n, c) => n + c.utteranceCount, 0)} · 구간 {segments.length} ·
						클립 {data.clips.length}
					</span>
				)}
			</div>

			{health.error && (
				<div className="notice">
					파이프라인 서비스에 연결할 수 없습니다. shorts_maker(`sm serve`)가 떠 있는지 확인하세요.
				</div>
			)}
			{health.data && !geminiReady && (
				<div className="notice">GEMINI_API_KEY 가 없어 실행할 수 없습니다.</div>
			)}
			{error && <p className="state state--error">{error}</p>}

			{sources.data && sources.data.length > 1 && (
				<div className="filters">
					{sources.data.map((source) => (
						<button
							key={source.id}
							type="button"
							className={source.id === sourceId ? "chip chip--active" : "chip"}
							onClick={() => {
								setPicked(source.id);
								setTranscript(null);
								setOpenPreview(null);
							}}
						>
							{source.title}
						</button>
					))}
				</div>
			)}

			{sources.data?.length === 0 && (
				<p className="state">등록된 원본이 없습니다. shorts_maker 에서 먼저 등록하세요.</p>
			)}

			{data && (
				<>
					{/* 실행 — 기준을 눈으로 보면서 고칠 수 있어야 한다. prompt() 로는 이전 값이 안 보인다. */}
					<section className="sm-panel">
						<div className="field">
							<label className="field__label" htmlFor="criteria">
								기준 프롬프트 — 무엇을 좋게 볼 것인가
							</label>
							<input
								id="criteria"
								className="field__input"
								value={criteria}
								placeholder="비우면 기준 없이 자립성만 봅니다"
								onChange={(event) => setCriteria(event.target.value)}
							/>
						</div>
						<div className="sm-actions" style={{ marginTop: 12 }}>
							<button
								type="button"
								className="button button--small sm-go"
								disabled={busy || !geminiReady}
								onClick={() =>
									submit(() => runPipeline(data.source.id, criteria.trim() || null, false))
								}
							>
								{segments.length > 0 ? "이 기준으로 다시 선정" : "실행"}
							</button>
							<button
								type="button"
								className="button button--small"
								disabled={busy || !geminiReady}
								onClick={() => submit(() => runPipeline(data.source.id, criteria.trim() || null, true))}
							>
								구간부터 다시 나누기
							</button>
							{segments.length > 0 && (
								<span className="sm-meta">구간은 그대로 두고 선정만 다시 합니다</span>
							)}
						</div>
						{busy && job && (
							<p className="notice" style={{ marginTop: 12 }}>
								{STAGE_LABEL[job.kind] ?? job.kind} 진행 중… ({elapsed(job.createdAt)} 경과) · 이
								작업이 끝날 때까지 다른 실행은 대기합니다
							</p>
						)}
					</section>

					{/* 결과 — 화면의 주인공 */}
					<h2 className="section-title">
						선정 결과
						{latestRun?.criteria_prompt && (
							<span className="sm-meta"> · 기준: {latestRun.criteria_prompt}</span>
						)}
					</h2>
					{latestRun?.error && <p className="state state--error">{latestRun.error}</p>}
					{ranked.length === 0 && !latestRun && (
						<p className="state">아직 실행하지 않았습니다. 위에서 기준을 정하고 실행하세요.</p>
					)}

					{ranked.map((entry, rank) => {
						const segment = segments.find((s) => s.idx === entry.idx);
						const clip = clipBySegment.get(entry.idx);
						return (
							<article className="sm-item" key={entry.idx}>
								<div className="sm-item__head">
									<span className="sm-item__rank">#{rank + 1}</span>
									<span className="sm-score">{entry.score}점</span>
									{segment && (
										<span className="sm-meta">
											{time(segment.start_sec)}~{time(segment.end_sec)} ·{" "}
											{Math.round((segment.end_sec - segment.start_sec) / 60)}분
										</span>
									)}
									{clip && (
										<span className="sm-badge">
											클립 {clip.id} · {Math.round(clip.end_sec - clip.start_sec)}초
										</span>
									)}
									<span className="sm-actions sm-actions--end">
										{segment && (
											<button
												type="button"
												className="button button--small"
												onClick={() =>
													setOpenPreview(openPreview === segment.id ? null : segment.id)
												}
											>
												{openPreview === segment.id ? "미리보기 닫기" : "미리보기"}
											</button>
										)}
										{segment && (
											<button
												type="button"
												className={clip ? "button button--small" : "button button--small sm-go"}
												disabled={busy || !geminiReady}
												onClick={() => submit(() => runCut(latestRun!.id, segment.id, Boolean(clip)))}
											>
												{clip ? "다시 만들기" : "클립 만들기"}
											</button>
										)}
									</span>
								</div>

								{segment?.description && <p className="sm-item__title">{segment.description}</p>}
								<p className="sm-item__reason">{entry.reason}</p>

								{segment && openPreview === segment.id && (
									<div style={{ marginTop: 12 }}>
										<LazyVideo
											label="구간 미리보기"
											width={420}
											load={() => fetchSegmentPreviewUrl(segment.id)}
										/>
										<p className="sm-meta">
											원본 화면비 그대로입니다. 시작 지점이 몇 초 앞당겨질 수 있습니다.
										</p>
									</div>
								)}
							</article>
						);
					})}

					{excluded.length > 0 && (
						<details className="sm-fold">
							<summary>자립성 관문에서 제외된 구간 {excluded.length}개</summary>
							<ul>
								{excluded.map((entry) => {
									const segment = segments.find((s) => s.idx === entry.idx);
									return (
										<li key={entry.idx} style={{ marginTop: 8 }}>
											{segment && (
												<span className="sm-meta">
													{time(segment.start_sec)}~{time(segment.end_sec)}{" "}
												</span>
											)}
											{segment?.description}
											<div className="sm-meta">{entry.reason}</div>
										</li>
									);
								})}
							</ul>
						</details>
					)}

					{/* 완성 클립 */}
					{data.clips.length > 0 && (
						<>
							<h2 className="section-title">완성 클립</h2>
							{data.clips.map((clip) => (
								<section className="sm-panel sm-clip" key={clip.id}>
									{clip.rendered ? (
										<LazyVideo
											label={`클립 ${clip.id}`}
											width={220}
											load={() => fetchClipObjectUrl(clip.id)}
										/>
									) : (
										<button
											type="button"
											className="button button--small"
											disabled={busy}
											onClick={() => submit(() => renderClip(clip.id))}
										>
											렌더하기
										</button>
									)}
									<div style={{ flex: 1, minWidth: 0 }}>
										<div>
											<strong>클립 {clip.id}</strong>{" "}
											<span className="sm-meta">
												{time(clip.start_sec)}~{time(clip.end_sec)} ·{" "}
												{Math.round(clip.end_sec - clip.start_sec)}초
												{clip.score !== null && ` · ${clip.score}점`}
											</span>
										</div>
										<p>{clip.reason}</p>
										<div className="sm-actions">
											<button
												type="button"
												className="button button--small"
												onClick={() => act(() => reviewClip(clip, "OK"))}
											>
												쓸만함
											</button>
											<button
												type="button"
												className="button button--small button--danger"
												onClick={() => act(() => reviewClip(clip, "NG"))}
											>
												아님
											</button>
											{clip.reviews.length > 0 && (
												<span className="sm-meta">
													평가 {clip.reviews.map((r) => r.verdict).join(", ")}
												</span>
											)}
										</div>
									</div>
								</section>
							))}
						</>
					)}

					{/* 참고 자료 — 접어둔다. 결과를 밀어내면 안 된다. */}
					<h2 className="section-title">참고</h2>

					<details className="sm-fold">
						<summary>전사 {data.chunks.reduce((n, c) => n + c.utteranceCount, 0)}발화</summary>
						<div className="sm-actions" style={{ margin: "12px 0" }}>
							{data.chunks.map((chunk) => (
								<button
									key={chunk.id}
									type="button"
									className="button button--small"
									onClick={() =>
										transcript
											? setTranscript(null)
											: act(async () => setTranscript(await fetchUtterances(chunk.id)))
									}
								>
									{transcript ? "닫기" : "불러오기"}
								</button>
							))}
							{data.chunks.map((chunk) => (
								<button
									key={`stt-${chunk.id}`}
									type="button"
									className="button button--small"
									disabled={busy}
									onClick={() => submit(() => runStt(chunk.id))}
								>
									음성 인식 다시
								</button>
							))}
							{data.chunks.map((chunk) => (
								<button
									key={`seg-${chunk.id}`}
									type="button"
									className="button button--small"
									disabled={busy || !geminiReady}
									onClick={() => submit(() => runSegment(chunk.id))}
								>
									주제 분할만 다시
								</button>
							))}
						</div>
						{transcript && (
							<div className="table-wrap" style={{ maxHeight: 320, overflow: "auto" }}>
								<table className="table">
									<tbody>
										{transcript.map((u) => (
											<tr key={u.idx}>
												<td style={{ width: 56 }} className="sm-meta">
													{time(u.start_sec)}
												</td>
												<td>{u.text}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</details>

					<details className="sm-fold">
						<summary>
							API 비용 (추정) — {data.cost.krw.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}원
						</summary>
						<CostDetail cost={data.cost} />
					</details>

					<details className="sm-fold">
						<summary>단계 기록 {data.stageCalls.length}건</summary>
						<div className="table-wrap" style={{ maxHeight: 280, overflow: "auto" }}>
							<table className="table">
								<thead>
									<tr>
										<th>단계</th>
										<th>모델</th>
										<th>토큰</th>
										<th>소요</th>
									</tr>
								</thead>
								<tbody>
									{data.stageCalls.map((call) => (
										<tr key={call.id}>
											<td>
												{STAGE_LABEL[call.stage] ?? call.stage}
												{call.error && <span className="tag tag--rejected">실패</span>}
											</td>
											<td className="sm-meta">{call.model ?? "-"}</td>
											<td className="sm-meta">
												{call.input_tokens === null
													? "-"
													: `in ${call.input_tokens} / out ${call.output_tokens} / think ${call.thinking_tokens ?? 0}`}
											</td>
											<td className="sm-meta">
												{call.latency_ms === null ? "-" : `${(call.latency_ms / 1000).toFixed(1)}s`}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</details>
				</>
			)}
		</>
	);
}

// 🔴 추정이다. 단가는 모델마다 다르고 자주 바뀌므로 계산에 쓴 단가를 함께 보여준다.
// thinking 토큰은 출력 단가로 과금돼 비용이 여기서 튄다 — 그래서 따로 보여준다.
function CostDetail({ cost }: { cost: ShortsCost }) {
	return (
		<>
			<div className="table-wrap">
				<table className="table">
					<tbody>
						<tr>
							<td>LLM 호출</td>
							<td>{cost.llmCalls}회</td>
						</tr>
						<tr>
							<td>입력 토큰</td>
							<td>{cost.inputTokens.toLocaleString()}</td>
						</tr>
						<tr>
							<td>출력 토큰</td>
							<td>{cost.outputTokens.toLocaleString()}</td>
						</tr>
						<tr>
							<td>사고(thinking) 토큰</td>
							<td>
								{cost.thinkingTokens.toLocaleString()}{" "}
								<span className="sm-meta">출력 단가로 과금됩니다</span>
							</td>
						</tr>
						<tr>
							<td>합계</td>
							<td>
								<strong>
									{cost.krw.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}원
								</strong>{" "}
								<span className="sm-meta">${cost.usd.toFixed(4)}</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p className="sm-meta">
				{cost.rate.model} · 입력 ${cost.rate.inputUsdPer1M}/1M · 출력 ${cost.rate.outputUsdPer1M}/1M ·
				₩{cost.rate.usdKrw}/$ 기준
			</p>
		</>
	);
}
