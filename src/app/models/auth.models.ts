export interface RegisterRequest {
  email: string;
  fullName: string;
  phone: string;
  location: string;
}

export interface RegisterResponse {
  email: string;
  fullName: string;
  userId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken?: string;
  refreshToken?: string;
}

export interface CurrentUser {
  userId?: string;
  email?: string;
  role?: string;
}

export interface ForgotPasswordRequest { email: string; }
export interface VerifyOtpRequest { email: string; otp: string; }
export interface VerifyOtpResponse { resetToken: string; }
export interface ResetPasswordRequest { resetToken: string; newPassword: string; confirmPassword: string; }

/* ===== Profile / Update DTOs ===== */
export interface ProfileResponse {
  userId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  location?: string | null;
  avatar?: string | null;
  role: string;
  status: string;
}

export interface UpdateProfileRequest {
  fullName?: string | null;
  phone?: string | null;
  currentPassword?: string | null;
  newPassword?: string | null;
  location?: string | null;
  avatar?: string | null;
}