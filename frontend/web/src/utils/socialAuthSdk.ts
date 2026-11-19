const scriptLoads = new Map<string, Promise<void>>();

export function loadProviderScript(src: string): Promise<void> {
  if (scriptLoads.has(src)) return scriptLoads.get(src)!;

  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    const timeout = window.setTimeout(() => reject(new Error('Sign-in service is unavailable. Please try again.')), 10000);
    script.onload = () => { window.clearTimeout(timeout); resolve(); };
    script.onerror = () => { window.clearTimeout(timeout); reject(new Error('Sign-in service is unavailable. Please try again.')); };
    document.head.appendChild(script);
  });
  scriptLoads.set(src, load);
  load.catch(() => scriptLoads.delete(src));
  return load;
}

export interface GoogleIdentity {
  accounts: { id: {
    initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
    renderButton: (element: HTMLElement, options: { type: string; theme: string; size: string; width: number }) => void;
  } };
}

export interface AppleIdentity {
  auth: {
    init: (options: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
    signIn: () => Promise<{ authorization?: { id_token?: string }; user?: { email?: string; name?: { firstName?: string; lastName?: string } } }>;
  };
}

export interface FacebookIdentity {
  init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (callback: (response: { authResponse?: { accessToken?: string }; status?: string }) => void, options: { scope: string }) => void;
}

declare global {
  interface Window {
    google?: GoogleIdentity;
    AppleID?: AppleIdentity;
    FB?: FacebookIdentity;
  }
}
