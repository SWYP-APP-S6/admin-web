import { useState } from "react";
import { createSourceFromUrl, registerMedia } from "../api/shorts";
import { Modal } from "./Modal";
import type { ShortsJob, ShortsMediaItem } from "../types";

interface Props {
	open: boolean;
	onClose: () => void;
	unregistered: ShortsMediaItem[];
	onStarted: (job: ShortsJob) => void;
}

function mb(bytes: number): string {
	return bytes >= 1 << 30
		? `${(bytes / (1 << 30)).toFixed(1)}GB`
		: `${Math.round(bytes / (1 << 20))}MB`;
}

export function NewSourceModal({ open, onClose, unregistered, onStarted }: Props) {
	const [url, setUrl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function start(run: () => Promise<ShortsJob>) {
		setBusy(true);
		setError(null);
		try {
			onStarted(await run());
			setUrl("");
			onClose();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}

	return (
		<Modal open={open} title="새로 만들기" onClose={onClose}>
			{error && <p className="state state--error">{error}</p>}

			<div className="field">
				<label className="field__label" htmlFor="source-url">
					유튜브 URL — 서버가 직접 받습니다
				</label>
				<input
					id="source-url"
					className="field__input"
					placeholder="https://www.youtube.com/watch?v=..."
					value={url}
					onChange={(event) => setUrl(event.target.value)}
				/>
			</div>
			<div className="sm-actions" style={{ marginTop: 10 }}>
				<button
					type="button"
					className="button button--small sm-go"
					disabled={busy || !url.trim()}
					onClick={() => start(() => createSourceFromUrl(url.trim()))}
				>
					받아서 등록
				</button>
				<span className="sm-meta">유튜브 주소만 받습니다</span>
			</div>

			{unregistered.length > 0 && (
				<>
					<h3 className="section-title">서버에 있는 영상</h3>
					<p className="sm-meta">등록되지 않은 파일입니다. 등록하면 단계 진행이 가능합니다.</p>
					{unregistered.map((item) => (
						<div className="sm-actions" key={item.name} style={{ marginTop: 8 }}>
							<span>{item.name}</span>
							<span className="sm-meta">{mb(item.sizeBytes)}</span>
							<span className="sm-actions sm-actions--end">
								<button
									type="button"
									className="button button--small"
									disabled={busy}
									onClick={() => start(() => registerMedia(item.name, item.name))}
								>
									등록
								</button>
							</span>
						</div>
					))}
				</>
			)}
		</Modal>
	);
}
