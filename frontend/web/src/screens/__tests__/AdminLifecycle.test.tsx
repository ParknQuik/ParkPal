import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import AcceptAdminInvitation from '../AcceptAdminInvitation';
import AdminAccess from '../AdminAccess';
import AdminMfa from '../AdminMfa';

vi.mock('../../api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('admin account screens', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts an invitation using its single-use URL token', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} } as any);
    render(<MemoryRouter initialEntries={['/accept-admin-invitation#token=single-use-secret']}><AcceptAdminInvitation /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox', { name: /Your name/ }), { target: { value: 'Alex Admin' } });
    fireEvent.change(screen.getByLabelText(/Create password/), { target: { value: 'SecurePass123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin-invitations/accept', {
      token: 'single-use-secret', name: 'Alex Admin', password: 'SecurePass123!',
    }));
    expect(await screen.findByText(/Your admin account is ready/)).toBeInTheDocument();
  });

  it('shows owner account statuses and sends a new invitation', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 1, role: 'admin', isPlatformOwner: true } } as any);
    vi.mocked(api.get).mockResolvedValue({ data: {
      admins: [{ id: 2, email: 'admin@example.com', name: 'Admin User', isActive: true, isPlatformOwner: false, mfaEnabled: false }],
      invitations: [],
    } } as any);
    vi.mocked(api.post).mockResolvedValue({ data: {} } as any);
    render(<MemoryRouter><AdminAccess /></MemoryRouter>);
    expect(await screen.findByText(/MFA setup required/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /Work email/ }), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/access/invitations', { email: 'new@example.com' }));
  });

  it('denies access management to an ordinary admin', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 3, role: 'admin', isPlatformOwner: false } } as any);
    render(<MemoryRouter><AdminAccess /></MemoryRouter>);
    expect(screen.getByText('Platform owner access required.')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('enrolls an admin in TOTP and presents one-time recovery codes', async () => {
    const admin = { id: 4, role: 'admin', email: 'owner@example.com', mfaEnabled: false };
    vi.mocked(useAuth).mockReturnValue({ user: admin, updateUser: vi.fn() } as any);
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { secret: 'ABC123', qrCode: 'data:image/png;base64,qr' } } as any)
      .mockResolvedValueOnce({ data: { token: 'verified-token', recoveryCodes: ['code-one', 'code-two'] } } as any);
    render(<MemoryRouter><AdminMfa /></MemoryRouter>);
    expect(await screen.findByAltText('Authenticator setup QR code')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enable MFA' }));
    expect(await screen.findByText(/code-one/)).toBeInTheDocument();
    expect(api.post).toHaveBeenNthCalledWith(2, '/auth/admin-mfa/verify', { code: '123456' });
  });
});
