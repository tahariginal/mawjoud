import type {
  DeleteAccountRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateMeRequest,
  VerifyEmailRequest,
} from '@mazal/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/state/session';

import { api } from './index';

function useOnSignedIn() {
  const setMe = useSession((s) => s.setMe);
  const client = useQueryClient();
  return (me: Parameters<typeof setMe>[0]) => {
    setMe(me);
    // Personalized data (favorites, orders, feed) must be refetched for the new user.
    void client.invalidateQueries();
  };
}

export function useLogin() {
  const onSignedIn = useOnSignedIn();
  return useMutation({
    mutationFn: (input: LoginRequest) => api.login(input),
    onSuccess: (result) => onSignedIn(result.me),
  });
}

export function useRegister() {
  const onSignedIn = useOnSignedIn();
  return useMutation({
    mutationFn: (input: RegisterRequest) => api.register(input),
    onSuccess: (result) => onSignedIn(result.me),
  });
}

export function useVerifyEmail() {
  const setMe = useSession((s) => s.setMe);
  return useMutation({
    mutationFn: (input: VerifyEmailRequest) => api.verifyEmail(input),
    onSuccess: (me) => setMe(me),
  });
}

export const useResendVerification = () =>
  useMutation({ mutationFn: () => api.resendVerification() });

export const useForgotPassword = () =>
  useMutation({ mutationFn: (input: ForgotPasswordRequest) => api.forgotPassword(input) });

export const useResetPassword = () =>
  useMutation({ mutationFn: (input: ResetPasswordRequest) => api.resetPassword(input) });

export function useUpdateMe() {
  const setMe = useSession((s) => s.setMe);
  return useMutation({
    mutationFn: (input: UpdateMeRequest) => api.updateMe(input),
    onSuccess: (me) => setMe(me),
  });
}

function useOnSignedOut() {
  const setMe = useSession((s) => s.setMe);
  const client = useQueryClient();
  return () => {
    setMe(null);
    client.clear();
  };
}

export function useLogout() {
  const onSignedOut = useOnSignedOut();
  return useMutation({ mutationFn: () => api.logout(), onSettled: onSignedOut });
}

export function useDeleteAccount() {
  const onSignedOut = useOnSignedOut();
  return useMutation({
    mutationFn: (input: DeleteAccountRequest) => api.deleteAccount(input),
    onSuccess: onSignedOut,
  });
}
