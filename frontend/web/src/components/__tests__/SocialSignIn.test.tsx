import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SocialSignIn from '../SocialSignIn';
import { loadProviderScript } from '../../utils/socialAuthSdk';

vi.mock('../../utils/socialAuthSdk', () => ({ loadProviderScript: vi.fn().mockResolvedValue(undefined) }));

describe('SocialSignIn', () => {
  const onToken = vi.fn().mockResolvedValue(undefined);
  const onError = vi.fn();
  const renderButtons = () => render(<SocialSignIn onToken={onToken} onError={onError} disabled={false} />);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'google-web-id');
    vi.stubEnv('VITE_APPLE_SERVICES_ID', 'apple-services-id');
    vi.stubEnv('VITE_APPLE_REDIRECT_URI', 'https://example.com/apple/return');
    vi.stubEnv('VITE_FACEBOOK_APP_ID', 'facebook-app-id');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.google = undefined as unknown as typeof window.google;
    delete window.AppleID;
    delete window.FB;
  });

  it('shows disabled setup states when public configuration is absent', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    vi.stubEnv('VITE_APPLE_SERVICES_ID', '');
    vi.stubEnv('VITE_APPLE_REDIRECT_URI', '');
    vi.stubEnv('VITE_FACEBOOK_APP_ID', '');
    renderButtons();
    for (const provider of ['Google', 'Apple', 'Facebook']) {
      const button = screen.getByRole('button', { name: `Continue with ${provider}` });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(screen.getByText(/Google sign-in needs a web client ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Apple sign-in needs a Services ID and return URL/i)).toBeInTheDocument();
    expect(screen.getByText(/Facebook sign-in needs an app ID/i)).toBeInTheDocument();
    expect(loadProviderScript).not.toHaveBeenCalled();
    expect(onToken).not.toHaveBeenCalled();
  });

  it('keeps Apple disabled when its registered return URL is missing', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    vi.stubEnv('VITE_APPLE_REDIRECT_URI', '');
    vi.stubEnv('VITE_FACEBOOK_APP_ID', '');
    renderButtons();
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeDisabled();
    expect(screen.getByText(/Apple sign-in needs a Services ID and return URL/i)).toBeInTheDocument();
  });

  it('shows a disabled state when a provider SDK fails', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    vi.stubEnv('VITE_FACEBOOK_APP_ID', '');
    vi.mocked(loadProviderScript).mockRejectedValueOnce(new Error('Sign-in service is unavailable. Please try again.'));
    renderButtons();
    expect(await screen.findByText('Apple sign-in is unavailable right now.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeDisabled();
    expect(onToken).not.toHaveBeenCalled();
  });

  it('sends the Google ID token from the GIS button callback', async () => {
    let credentialCallback: ((response: { credential?: string }) => void) | undefined;
    window.google = { accounts: { id: {
      initialize: vi.fn((options) => { credentialCallback = options.callback; }),
      renderButton: vi.fn((element: HTMLElement) => { element.appendChild(document.createElement('iframe')); }),
    } } } as unknown as typeof window.google;
    renderButtons();
    await waitFor(() => expect(window.google?.accounts.id.renderButton).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
    credentialCallback!({ credential: 'google-id-token' });
    expect(onToken).toHaveBeenCalledWith('google', 'google-id-token');
  });

  it('does not accept a Google callback while another sign-in is loading', async () => {
    let credentialCallback: ((response: { credential?: string }) => void) | undefined;
    window.google = { accounts: { id: {
      initialize: vi.fn((options) => { credentialCallback = options.callback; }),
      renderButton: vi.fn((element: HTMLElement) => { element.appendChild(document.createElement('iframe')); }),
    } } } as unknown as typeof window.google;
    const view = renderButtons();
    await waitFor(() => expect(window.google?.accounts.id.renderButton).toHaveBeenCalled());
    view.rerender(<SocialSignIn onToken={onToken} onError={onError} disabled />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
    credentialCallback!({ credential: 'google-id-token' });
    expect(onToken).not.toHaveBeenCalled();
  });

  it('keeps the Google fallback when GIS does not insert a button', async () => {
    vi.stubEnv('VITE_APPLE_SERVICES_ID', '');
    vi.stubEnv('VITE_FACEBOOK_APP_ID', '');
    window.google = { accounts: { id: {
      initialize: vi.fn(),
      renderButton: vi.fn(),
    } } } as unknown as typeof window.google;
    renderButtons();
    await waitFor(() => expect(window.google?.accounts.id.renderButton).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
    expect(await screen.findByText('Google sign-in is unavailable right now.', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
    expect(onToken).not.toHaveBeenCalled();
  });

  it('sends Apple identity token and first-use profile, and reports cancellation', async () => {
    const signIn = vi.fn().mockResolvedValueOnce({
      authorization: { id_token: 'apple-id-token' },
      user: { email: 'apple@example.com', name: { firstName: 'Pat', lastName: 'Driver' } },
    }).mockRejectedValueOnce({ error: 'popup_closed_by_user' })
      .mockRejectedValueOnce({ error: 'popup_blocked' });
    window.AppleID = { auth: { init: vi.fn(), signIn } };
    renderButtons();
    const button = await screen.findByRole('button', { name: /continue with apple/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => expect(onToken).toHaveBeenCalledWith('apple', 'apple-id-token', { email: 'apple@example.com', fullName: 'Pat Driver' }));
    fireEvent.click(button);
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Apple sign-in was canceled. Please try again.'));
    fireEvent.click(button);
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Your browser blocked the Apple sign-in popup. Allow popups and try again.'));
  });

  it('sends Facebook access token and reports denied or canceled login', async () => {
    const login = vi.fn((callback) => callback({ authResponse: { accessToken: 'facebook-access-token' } }));
    window.FB = { init: vi.fn(), login };
    renderButtons();
    const button = await screen.findByRole('button', { name: /continue with facebook/i });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    expect(onToken).toHaveBeenCalledWith('facebook', 'facebook-access-token');
    login.mockImplementationOnce((callback) => callback({ status: 'unknown' }));
    fireEvent.click(button);
    expect(onError).toHaveBeenCalledWith('Facebook sign-in was canceled. Please try again.');
  });
});
