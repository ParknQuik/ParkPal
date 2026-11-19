import { useEffect, useRef, useState } from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import { Apple, Facebook, Google } from '@mui/icons-material';
import { loadProviderScript } from '../utils/socialAuthSdk';

type Provider = 'google' | 'apple' | 'facebook';

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';
const APPLE_SCRIPT = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
const FACEBOOK_SCRIPT = 'https://connect.facebook.net/en_US/sdk.js';

interface Props {
  onToken: (provider: Provider, token: string, profile?: { fullName?: string; email?: string }) => Promise<void>;
  onError: (message: string) => void;
  disabled: boolean;
}

export default function SocialSignIn({ onToken, onError, disabled }: Props) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const appleServicesId = import.meta.env.VITE_APPLE_SERVICES_ID?.trim();
  const appleRedirectUri = import.meta.env.VITE_APPLE_REDIRECT_URI?.trim();
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID?.trim();
  const googleContainer = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const disabledRef = useRef(disabled);
  const [ready, setReady] = useState({ google: false, apple: false, facebook: false });
  const [unavailable, setUnavailable] = useState({ google: false, apple: false, facebook: false });
  onTokenRef.current = onToken;
  onErrorRef.current = onError;
  disabledRef.current = disabled;

  useEffect(() => {
    let active = true;
    let googleObserver: MutationObserver | undefined;
    let googleTimeout: number | undefined;
    if (googleClientId) {
      loadProviderScript(GOOGLE_SCRIPT).then(() => {
        if (!active || !window.google || !googleContainer.current) throw new Error('Google sign-in is unavailable.');
        const container = googleContainer.current;
        const showGoogleButton = () => {
          if (!active || !container.firstElementChild) return;
          googleObserver?.disconnect();
          if (googleTimeout !== undefined) window.clearTimeout(googleTimeout);
          setReady((previous) => ({ ...previous, google: true }));
        };
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (disabledRef.current) return;
            if (!response.credential) {
              onErrorRef.current('Google did not return a sign-in token. Please try again.');
              return;
            }
            void onTokenRef.current('google', response.credential);
          },
        });
        googleObserver = new MutationObserver(showGoogleButton);
        googleObserver.observe(container, { childList: true });
        window.google.accounts.id.renderButton(container, {
          type: 'standard', theme: 'outline', size: 'large', width: 320,
        });
        if (container.firstElementChild) showGoogleButton();
        else googleTimeout = window.setTimeout(() => {
          googleObserver?.disconnect();
          if (active && !container.firstElementChild) setUnavailable((previous) => ({ ...previous, google: true }));
        }, 3000);
      }).catch(() => { if (active) setUnavailable((previous) => ({ ...previous, google: true })); });
    }
    if (appleServicesId && appleRedirectUri) {
      loadProviderScript(APPLE_SCRIPT).then(() => {
        if (!active || !window.AppleID) throw new Error('Apple sign-in is unavailable.');
        window.AppleID.auth.init({
          clientId: appleServicesId,
          scope: 'name email',
          redirectURI: appleRedirectUri,
          usePopup: true,
        });
        setReady((previous) => ({ ...previous, apple: true }));
      }).catch(() => { if (active) setUnavailable((previous) => ({ ...previous, apple: true })); });
    }
    if (facebookAppId) {
      loadProviderScript(FACEBOOK_SCRIPT).then(() => {
        if (!active || !window.FB) throw new Error('Facebook sign-in is unavailable.');
        window.FB.init({ appId: facebookAppId, cookie: false, xfbml: false, version: 'v24.0' });
        setReady((previous) => ({ ...previous, facebook: true }));
      }).catch(() => { if (active) setUnavailable((previous) => ({ ...previous, facebook: true })); });
    }
    return () => {
      active = false;
      googleObserver?.disconnect();
      if (googleTimeout !== undefined) window.clearTimeout(googleTimeout);
    };
  }, [googleClientId, appleServicesId, appleRedirectUri, facebookAppId]);

  const appleConfigured = Boolean(appleServicesId && appleRedirectUri);
  const facebookConfigured = Boolean(facebookAppId);
  const googleMessage = !googleClientId ? 'Google sign-in needs a web client ID.' : unavailable.google ? 'Google sign-in is unavailable right now.' : 'Preparing Google sign-in...';
  const appleMessage = !appleConfigured ? 'Apple sign-in needs a Services ID and return URL.' : unavailable.apple ? 'Apple sign-in is unavailable right now.' : 'Preparing Apple sign-in...';
  const facebookMessage = !facebookConfigured ? 'Facebook sign-in needs an app ID.' : unavailable.facebook ? 'Facebook sign-in is unavailable right now.' : 'Preparing Facebook sign-in...';

  const handleApple = async () => {
    try {
      if (!window.AppleID) throw new Error('Apple sign-in is unavailable.');
      const response = await window.AppleID.auth.signIn();
      const token = response.authorization?.id_token;
      if (!token) throw new Error('Apple did not return a sign-in token. Please try again.');
      const name = response.user?.name;
      await onToken('apple', token, {
        email: response.user?.email,
        fullName: [name?.firstName, name?.lastName].filter(Boolean).join(' ') || undefined,
      });
    } catch (error) {
      const details = error as { error?: string; message?: string } | null;
      const message = details?.message || details?.error || 'Apple sign-in is unavailable. Please try again.';
      onError(/cancel|closed|popup_closed_by_user/i.test(message)
        ? 'Apple sign-in was canceled. Please try again.'
        : /blocked|notallowed|popup_blocked/i.test(message)
          ? 'Your browser blocked the Apple sign-in popup. Allow popups and try again.'
          : message);
    }
  };

  const handleFacebook = () => {
    if (!window.FB) { onError('Facebook sign-in is unavailable.'); return; }
    try {
      window.FB.login((response) => {
        const token = response.authResponse?.accessToken;
        if (!token) { onError('Facebook sign-in was canceled. Please try again.'); return; }
        void onToken('facebook', token);
      }, { scope: 'email,public_profile' });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Facebook sign-in is unavailable.');
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }}><Typography variant="body2" color="text.secondary">or continue with</Typography></Divider>
      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          {(!ready.google || disabled) && <Button fullWidth variant="outlined" color="inherit" startIcon={<Google />} disabled>Continue with Google</Button>}
          <Box ref={googleContainer} data-testid="google-signin" sx={{ minHeight: ready.google && !disabled ? 40 : 0, visibility: disabled ? 'hidden' : 'visible', height: disabled ? 0 : 'auto', overflow: 'hidden' }} />
          {(!ready.google || disabled) && !disabled && <Typography variant="caption" color="text.secondary">{googleMessage}</Typography>}
        </Box>
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Button fullWidth variant="outlined" color="inherit" startIcon={<Apple />} onClick={handleApple} disabled={disabled || !ready.apple}>
            Continue with Apple
          </Button>
          {!ready.apple && !disabled && <Typography variant="caption" color="text.secondary">{appleMessage}</Typography>}
        </Box>
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Button fullWidth variant="outlined" startIcon={<Facebook />} onClick={handleFacebook} disabled={disabled || !ready.facebook}>
            Continue with Facebook
          </Button>
          {!ready.facebook && !disabled && <Typography variant="caption" color="text.secondary">{facebookMessage}</Typography>}
        </Box>
      </Box>
    </Box>
  );
}
