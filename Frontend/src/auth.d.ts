export function login(
  email: string,
  password: string,
  tab: string
): Promise<{
  token: string;
  userId: number;
  email: string;
  role: string;
  tenantId: number;
}>;

export function logout(): void;

export function register(data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  showroomName: string;
}): Promise<string>;

export function sendEmailCode(): Promise<never>;

export function resendEmailCode(): Promise<never>;

export function verifyAndCreate(): Promise<never>;

export function forgotPassword(email: string): Promise<string>;

export function verifyResetOtp(
  email: string,
  otp: string
): Promise<string>;

export function resetPassword(
  email: string,
  newPassword: string
): Promise<string>;

export function validatePassword(password: string): boolean;

export function validatePhone(phone: string): boolean;
