import { useEffect, useState } from "react";

interface LazyVideoProps {
	load: () => Promise<string>;
	width: number;
	label: string;
}

// 영상은 /admin/** 이라 Authorization 헤더가 필요하고, <video src> 는 헤더를 못 붙인다.
// blob 으로 받아 object URL 로 넘기고, 사라질 때 반드시 되돌려준다 — 안 그러면 클립을 볼
// 때마다 수십 MB 가 탭에 쌓인다.
export function LazyVideo({ load, width, label }: LazyVideoProps) {
	const [url, setUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		let objectUrl: string | null = null;
		setUrl(null);
		setError(null);
		load()
			.then((next) => {
				if (cancelled) {
					URL.revokeObjectURL(next);
					return;
				}
				objectUrl = next;
				setUrl(next);
			})
			.catch((e: unknown) => {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : String(e));
				}
			});
		return () => {
			cancelled = true;
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [label]);

	if (error) {
		return <p className="state state--error">{error}</p>;
	}
	if (!url) {
		return <p className="state">{label} 불러오는 중…</p>;
	}
	return <video controls preload="metadata" src={url} style={{ width, borderRadius: 8, background: "#000" }} />;
}
