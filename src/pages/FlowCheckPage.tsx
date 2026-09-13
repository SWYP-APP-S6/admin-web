import { useCallback, useEffect, useState } from "react";
import { FRAMES, SCREENS, lookUp } from "../flow/spec";
import type { FieldSpec, ScreenSpec } from "../flow/spec";
import { prepare, run } from "../flow/runner";
import type { Probe, ScreenResult } from "../flow/runner";

type Results = Record<string, ScreenResult>;

type FieldState = "present" | "empty" | "absent" | "norows";

function fieldState(payload: unknown, field: FieldSpec): FieldState {
	const found = lookUp(payload, field.path);
	if (found.kind === "noRows") {
		// 볼 행이 없는 것뿐이다. 서버가 필드를 안 주는 것과 섞으면 멀쩡한 API 를 결함으로 읽는다.
		return "norows";
	}
	if (found.kind === "blank") {
		// Jackson 이 null 을 지워 보내므로, 없는 것과 비어 있는 것은 응답만으로 구분되지 않는다.
		return field.optional ? "empty" : "absent";
	}
	return "present";
}

function screenStage(screen: ScreenSpec, result: ScreenResult | undefined) {
	if (!result || result.status !== "ok") {
		return { label: result?.status === "failed" ? "실패" : "확인 전", tone: "tag--pending" };
	}
	const states = (screen.fields ?? []).map((field) => fieldState(result.payload, field));
	const missing = states.filter((state) => state === "absent").length;
	if (missing > 0) {
		return { label: `필드 ${missing}개 없음`, tone: "tag--rejected" };
	}
	if (states.some((state) => state === "norows")) {
		return { label: "데이터 없음", tone: "tag--pending" };
	}
	if ((screen.gaps ?? []).length > 0) {
		return { label: "값은 옴 · 갭 있음", tone: "tag--pending" };
	}
	return { label: "준비됨", tone: "tag--completed" };
}

export function FlowCheckPage() {
	const [probe, setProbe] = useState<Probe | null>(null);
	const [results, setResults] = useState<Results>({});
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [open, setOpen] = useState<string | null>(null);

	const check = useCallback(async () => {
		setRunning(true);
		setError(null);
		try {
			const ready = await prepare();
			setProbe(ready);
			const next: Results = {};
			for (const screen of SCREENS) {
				next[screen.id] = await run(screen, ready);
			}
			setResults(next);
		} catch (caught) {
			setError(caught instanceof Error ? caught : new Error("점검에 실패했습니다"));
		} finally {
			setRunning(false);
		}
	}, []);

	useEffect(() => {
		void check();
	}, [check]);

	const ok = SCREENS.filter((s) => screenStage(s, results[s.id]).label === "준비됨").length;
	const gaps = SCREENS.flatMap((s) => (s.gaps ?? []).map((gap) => ({ id: s.id, gap })));

	return (
		<>
			<div className="page-head">
				<h1 className="page-title">소비자 플로우 점검</h1>
				<span className="page-count">
					{running ? "확인 중…" : `${ok} / ${SCREENS.length} 화면 준비됨 · 갭 ${gaps.length}건`}
				</span>
			</div>

			<p className="notice">
				피그마 「소비자용 플로우」의 화면을 그대로 옮겨 두고, <strong>실제 API 를 호출해</strong>{" "}
				그 화면이 필요로 하는 값이 응답에 들어 있는지 확인합니다. 앱이 할 일(딥링크 · 클립보드 ·
				지도 렌더 · 푸시 수신)은 여기 없습니다 — 서버가 값을 주는지만 봅니다.{" "}
				<strong>점검은 찜을 만들지 않습니다</strong>(재고가 움직이고 취소권이 깎입니다).
			</p>

			<div className="row-actions" style={{ marginBottom: 16 }}>
				<button className="button button--primary" type="button" disabled={running} onClick={check}>
					{running ? "확인 중…" : "다시 점검"}
				</button>
			</div>

			{error && <p className="state state--error">{error.message}</p>}
			{probe?.blocker && <p className="state state--error">{probe.blocker}</p>}

			{FRAMES.map((frame) => (
				<section key={frame} style={{ marginBottom: 24 }}>
					<h2 className="panel__title" style={{ marginBottom: 8 }}>
						{frame}
					</h2>
					<div className="flow-board">
						{SCREENS.filter((screen) => screen.frame === frame).map((screen) => {
							const result = results[screen.id];
							const stage = screenStage(screen, result);
							const expanded = open === screen.id;
							return (
								<article className="flow-card" key={screen.id}>
									<button
										className="flow-card__head"
										type="button"
										onClick={() => setOpen(expanded ? null : screen.id)}
									>
										<span>
											<code>{screen.id}</code> {screen.name}
										</span>
										<span className={`tag ${stage.tone}`}>{stage.label}</span>
									</button>

									<div className="flow-card__apis">
										{screen.apis.map((api) => (
											<code key={api}>{api}</code>
										))}
									</div>

									{result?.status === "skipped" && (
										<p className="flow-card__skip">{result.reason}</p>
									)}
									{result?.status === "failed" && (
										<p className="state state--error" style={{ margin: 0 }}>
											{result.reason}
										</p>
									)}

									{result?.status === "ok" && (screen.fields ?? []).length > 0 && (
										<ul className="flow-fields">
											{screen.fields!.map((field) => {
												const state = fieldState(result.payload, field);
												return (
													<li className={`flow-field flow-field--${state}`} key={field.path}>
														<span>
															{state === "present"
																? "✓"
																: state === "absent"
																	? "✗"
																	: state === "norows"
																		? "?"
																		: "–"}
														</span>
														<span>{field.label}</span>
														<code>{field.path}</code>
													</li>
												);
											})}
										</ul>
									)}

									{screen.gaps?.map((gap) => (
										<p className="flow-gap" key={gap}>
											⬜ {gap}
										</p>
									))}
									{screen.notes?.map((note) => (
										<p className="flow-note" key={note}>
											· {note}
										</p>
									))}

									{expanded && result?.payload !== undefined && (
										<pre className="flow-raw">{JSON.stringify(result.payload, null, 2)}</pre>
									)}
								</article>
							);
						})}
					</div>
				</section>
			))}

			<section>
				<h2 className="panel__title" style={{ marginBottom: 8 }}>
					서버가 아직 못 주는 것 {gaps.length}건
				</h2>
				<ul className="flow-summary">
					{gaps.map(({ id, gap }) => (
						<li key={`${id}-${gap}`}>
							<code>{id}</code> {gap}
						</li>
					))}
				</ul>
			</section>
		</>
	);
}
