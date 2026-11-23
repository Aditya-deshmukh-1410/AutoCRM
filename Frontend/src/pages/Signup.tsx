import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Lock, Mail, Phone, User } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import { FeedbackMessage } from "../components/Feedback";
import { register, validatePassword, validatePhone } from "../auth";

const STEPS = ["Personal Details", "Business Profile", "Verification"];

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const API_BASE_URL = "";

export default function Signup() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);

  // Personal details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Business details
  const [showroomName, setShowroomName] = useState("");

  // OTP / verification
  const [otp, setOtp] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  // UI state
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer <= 0) return;

    const interval = window.setInterval(() => {
      setTimer((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timer]);

  const clearMessages = () => {
    setError("");
    setInfo("");
    setVerificationMessage("");
  };

  const validatePersonalDetails = (): boolean => {
    if (!name.trim()) {
      setError("Enter your full name.");
      return false;
    }

    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setEmailError(email.trim() ? "Enter a valid email address." : "Enter your email address.");
      setError("Enter a valid email address.");
      return false;
    }

    setEmailError("");

    if (!validatePhone(phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return false;
    }

    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters with one number and one symbol.");
      setError(
        "Password must be at least 8 characters with one number and one symbol."
      );
      return false;
    }

    setPasswordError("");

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      setError("Passwords do not match.");
      return false;
    }

    setConfirmPasswordError("");

    return true;
  };

  const validateBusinessDetails = (): boolean => {
    if (!showroomName.trim()) {
      setError("Enter your showroom name.");
      return false;
    }

    return true;
  };

  const handleNext = () => {
    clearMessages();

    if (step === 0) {
      if (!validatePersonalDetails()) return;
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!validateBusinessDetails()) return;

      setStep(2);
      setOtp("");
      setOtpVerified(false);
      setVerificationMessage("");
    }
  };

  const handleBack = () => {
    clearMessages();

    if (step > 0) {
      setStep((current) => current - 1);
    }
  };

  const handleSendOtp = async () => {
    clearMessages();

    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      const message = email.trim() ? "Enter a valid email address." : "Enter your email address.";
      setEmailError(message);
      setError(message);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          showroomName: showroomName.trim(),
        }),
      });

      const message = await response.text();

      if (!response.ok) {
        throw new Error(message || "Failed to send verification code.");
      }

      setVerificationMessage(
        "Verification code sent to your email. Please check your inbox."
      );

      setTimer(60);
      setOtp("");
      setOtpVerified(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    clearMessages();

    if (!otp.trim()) {
      setError("Enter the verification code.");
      return;
    }

    if (otp.trim().length !== 6) {
      setError("Verification code must contain 6 digits.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
        }),
      });

      const message = await response.text();

      if (!response.ok) {
        throw new Error(message || "Invalid verification code.");
      }

      setOtpVerified(true);
      setVerificationMessage(
        message || "Email verified successfully."
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

  const registerAccount = async () => {
    clearMessages();

    if (!validatePersonalDetails()) {
      setStep(0);
      return;
    }

    if (!validateBusinessDetails()) {
      setStep(1);
      return;
    }

    if (!otpVerified) {
      setError("Please verify your email before creating your account.");
      setStep(2);
      return;
    }

    setLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        showroomName: showroomName.trim(),
      });

      setInfo("Registration successful. You can now log in.");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    clearMessages();

    if (step < 2) {
      handleNext();
      return;
    }

    await registerAccount();
  };

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold tracking-tight">
        Create your dealership account
      </h2>

      <p className="mt-1 text-base text-slate-500">
        Set up your AutoCRM dealership workspace.
      </p>

      {/* Step indicator */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {STEPS.map((stepName, index) => (
          <div key={stepName}>
            <div
              className={`h-1.5 rounded-full ${
                index <= step ? "bg-brand-600" : "bg-slate-200"
              }`}
            />

            <p
              className={`mt-2 text-xs font-medium ${
                index === step ? "text-brand-600" : "text-slate-500"
              }`}
            >
              {index + 1}. {stepName}
            </p>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-4 rounded-2xl border border-black/10 bg-white p-6"
      >
        {error && !["Enter your full name.", "Enter a valid email address.", "Enter a valid 10-digit Indian mobile number.", "Password must be at least 8 characters with one number and one symbol.", "Passwords do not match.", "Enter your showroom name.", "Enter the verification code.", "Verification code must contain 6 digits."].includes(error) && <FeedbackMessage message={error} />}

        {info && (
          <FeedbackMessage message={info} tone="success" />
        )}

        {verificationMessage && (
          <FeedbackMessage message={verificationMessage} tone="info" />
        )}

        {/* STEP 1 */}
        {step === 0 && (
          <>
            <Field
              label="Full Name"
              type="text"
              required
              autoComplete="name"
              placeholder="John Smith"
              icon={<User size={18} />}
              value={name}
              error={error === "Enter your full name." ? error : undefined}
              onBlur={() => { if (!name.trim()) setError("Enter your full name."); }}
              onChange={(event) => { setName(event.target.value); if (event.target.value.trim() && error === "Enter your full name.") setError(""); }}
            />

            <Field
              label="Work Email"
              type="email"
              required
              autoComplete="email"
              placeholder="john@showroom.com"
              icon={<Mail size={18} />}
              value={email}
              error={emailError || (error === "Enter a valid email address." ? error : undefined)}
              onBlur={() => setEmailError(!email.trim() ? "Enter your email address." : EMAIL_RE.test(email.trim()) ? "" : "Enter a valid email address.")}
              onChange={(event) => { const value = event.target.value; setEmail(value); if (EMAIL_RE.test(value.trim())) { setEmailError(""); if (["Enter a valid email address.", "Enter your email address."].includes(error)) setError(""); } }}
            />

            <Field
              label="Phone Number"
              type="tel"
              required
              pattern="[6-9][0-9]{9}"
              autoComplete="tel"
              placeholder="9876543210"
              icon={<Phone size={18} />}
              value={phone}
              error={error === "Enter a valid 10-digit Indian mobile number." ? error : undefined}
              onBlur={() => { if (!validatePhone(phone.trim())) setError("Enter a valid 10-digit Indian mobile number."); }}
              onChange={(event) => { const value = event.target.value; setPhone(value); if (validatePhone(value.trim()) && error === "Enter a valid 10-digit Indian mobile number.") setError(""); }}
            />

            <Field
              label="Password"
              type="password"
              required
              pattern="(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}"
              title="Use at least 8 characters, one number, and one symbol."
              autoComplete="new-password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              value={password}
              error={passwordError || (error === "Password must be at least 8 characters with one number and one symbol." ? error : undefined)}
              onBlur={() => setPasswordError(!password ? "Enter your password." : validatePassword(password) ? "" : "Password must be at least 8 characters with one number and one symbol.")}
              onChange={(event) => { const value = event.target.value; setPassword(value); if (validatePassword(value)) { setPasswordError(""); if (error === "Password must be at least 8 characters with one number and one symbol.") setError(""); } if (confirmPasswordError && value === confirmPassword) setConfirmPasswordError(""); }}
            />

            <p className="text-xs text-slate-500">
              Password must contain at least 8 characters, one number and one
              symbol.
            </p>

            <Field
              label="Confirm Password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              value={confirmPassword}
              error={confirmPasswordError || (error === "Passwords do not match." ? error : undefined)}
              onBlur={() => setConfirmPasswordError(!confirmPassword ? "Confirm your password." : confirmPassword === password ? "" : "Passwords do not match.")}
              onChange={(event) => { const value = event.target.value; setConfirmPassword(value); if (value && value === password) { setConfirmPasswordError(""); if (error === "Passwords do not match.") setError(""); } }}
            />
          </>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <>
            <Field
              label="Showroom Name"
              type="text"
              required
              autoComplete="organization"
              placeholder="ABC Motors"
              icon={<User size={18} />}
              value={showroomName}
              error={error === "Enter your showroom name." ? error : undefined}
              onChange={(event) =>
                setShowroomName(event.target.value)
              }
            />

            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Your dealership will become a tenant in AutoCRM and your
              account will be created as the dealership{" "}
              <strong>ADMIN</strong>.
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <strong>Email verification:</strong> A verification code
              will be sent to your work email before your account is
              created.
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Verify your email
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                We will send a one-time verification code to{" "}
                <strong>{email}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={timer > 0 || loading || otpVerified}
              className="w-full rounded-lg border border-brand-600 px-4 py-3 font-medium text-brand-600 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {otpVerified
                ? "Email Verified"
                : timer > 0
                ? `Resend OTP in ${timer}s`
                : loading
                ? "Sending..."
                : "Send verification OTP"}
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
              error={error === "Enter the verification code." || error === "Verification code must contain 6 digits." ? error : undefined}
              onChange={(event) =>
                setOtp(
                  event.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
            />

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={!otp || loading || otpVerified}
              className="w-full rounded-lg border border-black/10 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {otpVerified
                ? "Email Verified ✓"
                : loading
                ? "Verifying..."
                : "Verify OTP"}
            </button>

            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {otpVerified
                ? "Your email has been verified. You can now create your AutoCRM account."
                : "Enter the 6-digit code sent to your email."}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          )}

          {step < 2 && (
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              Continue
              <ChevronRight size={18} />
            </button>
          )}

          {step === 2 && (
            <button
              type="submit"
              disabled={loading || !otpVerified}
              className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create account"}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </form>

      <p className="mt-5 text-center text-slate-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-brand-600 hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
