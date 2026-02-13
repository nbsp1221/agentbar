import type { Provider } from "../store/types";

type ProviderCapabilities = {
  supportsCliActivation: boolean;
};

const PROVIDER_CAPABILITIES: Record<Provider, ProviderCapabilities> = {
  codex: {
    supportsCliActivation: true
  },
  copilot: {
    supportsCliActivation: false
  }
};

function isKnownProvider(provider: string): provider is Provider {
  return provider in PROVIDER_CAPABILITIES;
}

export function providerSupportsCliActivation(provider: string): boolean {
  return isKnownProvider(provider) && PROVIDER_CAPABILITIES[provider].supportsCliActivation;
}
