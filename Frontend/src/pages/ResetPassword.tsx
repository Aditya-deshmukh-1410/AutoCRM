
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Lock, Mail } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import { FeedbackMessage } from "../components/Feedback";
import {
  forgotPassword,
  verifyResetOtp,
  resetPassword
} from "../auth";

const PASSWORD_RE = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function ResetPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [info, setInfo] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    setError("");
    setInfo("");

    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setEmailError(email.trim() ? "Enter a valid email address." : "Enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(email.trim());

      setOtpSent(true);
      setOtpVerified(false);

      setInfo("Password reset code sent to your email.");
    } catch (err) {
      setOtpSent(false);
      setOtpVerified(false);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to send password reset code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setInfo("");

    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setEmailError(email.trim() ? "Enter a valid email address." : "Enter your email address.");
      return;
    }

    if (!otp.trim()) {
      setError("Enter the verification code.");
      return;
    }

    setLoading(true);

    try {
      await verifyResetOtp(email.trim(), otp.trim());

      setOtpVerified(true);

      setInfo(
        "Verification successful. You can now create a new password."
      );
    } catch (err) {
      setOtpVerified(false);

      setError(
        err instanceof Error
          ? err.message
          : "Invalid verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setError("");
    setInfo("");

    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setEmailError(email.trim() ? "Enter a valid email address." : "Enter your email address.");
      return;
    }

    if (!otpSent) {
      setError("Send the verification code first.");
      return;
    }

    if (!otpVerified) {
      setError("Verify the verification code first.");
      return;
    }

    if (!PASSWORD_RE.test(password)) {
      setError(
        "Password must be at least 8 characters with one number and one symbol."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email.trim(), password);

      setInfo(
        "Password reset successful. Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Password reset failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold tracking-tight">
        Reset your password
      </h2>

      <p className="mt-1 text-base text-slate-500">
        Verify your email before creating a new password.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-4 rounded-2xl border border-black/10 bg-white p-6"
      >
        {error && !["Enter your email address.", "Enter the verification code.", "Password must be at least 8 characters with one number and one symbol.", "Passwords do not match."].includes(error) && <FeedbackMessage message={error} />}

        {info && (
          <FeedbackMessage message={info} tone="info" />
        )}

        <Field
          label="Work Email"
          type="email"
          required
          autoComplete="email"
          placeholder="john@showroom.com"
          icon={<Mail size={18} />}
          value={email}
          error={emailError || (error === "Enter your email address." ? error : undefined)}
          onBlur={() => setEmailError(!email.trim() ? "Enter your email address." : EMAIL_RE.test(email.trim()) ? "" : "Enter a valid email address.")}
          onChange={(event) => { const value = event.target.value; setEmail(value); setError(""); if (EMAIL_RE.test(value.trim())) setEmailError(""); }}
        />

        <button
          type="button"
          onClick={handleSendOtp}
          disabled={loading}
          className="w-full rounded-lg border border-brand-600 px-4 py-3 font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {otpSent ? "OTP Sent" : "Send verification OTP"}
        </button>

        <Field
          label="Verification Code"
          type="text"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Enter OTP"
          icon={<Lock size={18} />}
          value={otp}
          error={error === "Enter the verification code." ? error : undefined}
          onChange={(event) =>
            setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
        />

        <button
          type="button"
          onClick={handleVerifyOtp}
          disabled={loading || !otp}
          className="w-full rounded-lg border border-black/10 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Verify OTP
        </button>

        <Field
          label="New Password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          icon={<Lock size={18} />}
          value={password}
          error={error === "Password must be at least 8 characters with one number and one symbol." ? error : undefined}
          onChange={(event) => { setPassword(event.target.value); setError(""); }}
        />

        <p className="text-xs text-slate-500">
          Password must contain at least 8 characters, one number and one
          symbol.
        </p>

        <Field
          label="Confirm New Password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          icon={<Lock size={18} />}
          value={confirmPassword}
          error={error === "Passwords do not match." ? error : undefined}
          onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }}
        />

        <button
          type="submit"
          disabled={loading || !otpVerified}
          className="btn-primary w-full"
        >
          {loading ? "Resetting…" : "Reset password"}
          <ChevronRight size={18} />
        </button>
      </form>

      <p className="mt-5 text-center text-slate-500">
        Remember your password?{" "}
        <Link
          to="/login"
          className="font-semibold text-brand-600 hover:underline"
        >
          Back to login
        </Link>
      </p>

      <button
        type="button"
        onClick={() => navigate("/login")}
        className="mx-auto mt-3 block text-sm text-slate-500 hover:underline"
      >
        Return to login
      </button>
    </AuthLayout>
  );
}
