const PASSWORD_RULE = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PHONE_RULE = /^[6-9]\d{9}$/;
const API_BASE_URL = "";

export async function login(email, password, tab) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error("Invalid email or password");
  }

  const token = await response.text();

  if (!token) {
    throw new Error("Login failed");
  }

  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    const backendRole = payload.role?.toLowerCase();

    const allowed = tab === "admin"
      ? backendRole === "admin"
      : tab === "employee"
        ? backendRole === "sales"
        : tab === "platform_admin" && backendRole === "platform_admin";

    if (!allowed) {
      throw new Error("Invalid email or password.");
    }

    localStorage.setItem("autocrm_token", token);

    localStorage.setItem(
      "autocrm_user",
      JSON.stringify({
        userId: payload.userId,
        email: payload.sub,
        role: backendRole,
        tenantId: payload.tenantId,
      })
    );

    return {
      token,
      userId: payload.userId,
      email: payload.sub,
      role: backendRole,
      tenantId: payload.tenantId,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Invalid authentication response");
  }
}

export function logout() {
  localStorage.removeItem("autocrm_token");
  localStorage.removeItem("autocrm_user");
}

/*
 * Creates a new dealership and its first ADMIN user.
 *
 * This is different from /api/users.
 * /api/users is still used by an authenticated ADMIN
 * to create additional dealership users.
 */
export async function register({
  name,
  email,
  password,
  phone,
  showroomName,
}) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
      phone,
      showroomName,
    }),
  });

  const message = await response.text();

  if (!response.ok) {
    throw new Error(message || "Registration failed");
  }

  return message;
}

/*
 * Registration OTP functions.
 *
 * These functions are kept temporarily because the current
 * Signup page uses its own direct backend OTP calls.
 */

export async function sendEmailCode() {
  throw new Error(
    "Email verification is not connected to the backend yet."
  );
}

export async function resendEmailCode() {
  throw new Error(
    "Email verification is not connected to the backend yet."
  );
}

export async function verifyAndCreate() {
  throw new Error(
    "Registration verification is not connected to the backend yet."
  );
}

/*
 * PASSWORD RESET
 *
 * These functions connect the existing Reset Password UI
 * to the Spring Boot backend.
 */

export async function forgotPassword(email) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/forgot-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    }
  );

  const message = await response.text();

  if (!response.ok) {
    throw new Error(
      message || "Failed to send password reset code"
    );
  }

  return message;
}

export async function verifyResetOtp(email, otp) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/verify-reset-otp`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        otp,
      }),
    }
  );

  const message = await response.text();

  if (!response.ok) {
    throw new Error(
      message || "Invalid verification code"
    );
  }

  return message;
}

export async function resetPassword(email, newPassword) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/reset-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        newPassword,
      }),
    }
  );

  const message = await response.text();

  if (!response.ok) {
    throw new Error(
      message || "Password reset failed"
    );
  }

  return message;
}

export function validatePassword(password) {
  return PASSWORD_RULE.test(password);
}

export function validatePhone(phone) {
  return PHONE_RULE.test(phone);
}
