export {};

declare global {
	interface Window {
		Kakao?: {
			init(jsKey: string): void;
			isInitialized(): boolean;
			cleanup(): void;
			Auth: {
				getAppKey(): string | undefined;
				authorize(settings: { redirectUri: string; scope?: string }): void;
			};
		};
	}
}
