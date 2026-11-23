import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Lock, Mail } from "lucide-react";

import AuthLayout from "../components/AuthLayout";
import Field from "../components/Field";
import { FeedbackMessage } from "../components/Feedback";
import { login } from "../auth";

import type { Role } from "../lib/types";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const switchRole = (r: Role) => {
    setRole(r);
    setError("");
    setEmailError("");
    setPasswordError("");
    setInfo("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setInfo("");

    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setEmailError(email.trim() ? "Enter a valid email address." : "Enter your work email.");
      return;
    }

    if (!password) {
      setPasswordError("Enter your password.");
      return;
    }

    setLoading(true);

    try {
      const user = await login(email, password, role);
      navigate(user.role === "platform_admin" ? "/control-panel" : "/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not log in. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    setError("");
    setInfo("");
    navigate("/reset-password");
  };

  return (
    <AuthLayout>
      <h2 className="text-3xl font-bold tracking-tight">
        Welcome back
      </h2>

      <p className="mt-1 text-base text-slate-500">
        Log in to manage your showroom.
      </p>

      <div
        className="mt-5 grid grid-cols-3 border-b border-black/10"
        role="tablist"
      >
        {(["admin", "employee", "platform_admin"] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            onClick={() => switchRole(r)}
            className={`-mb-px border-b-2 pb-3 text-[15px] font-medium capitalize transition ${
              role === r
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500"
            }`}
          >
            {r === "platform_admin" ? "Platform Admin" : r} Login
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-5 space-y-4 rounded-2xl border border-black/10 bg-white p-6"
      >
        {error && <FeedbackMessage message={error} />}

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
          error={emailError || undefined}
          onBlur={() => setEmailError(!email.trim() ? "Enter your work email." : EMAIL_RE.test(email.trim()) ? "" : "Enter a valid email address.")}
          onChange={(e) => { const value = e.target.value; setEmail(value); setError(""); if (emailError && EMAIL_RE.test(value.trim())) setEmailError(""); }}
        />

        <div>
          <Field
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            value={password}
            error={passwordError || undefined}
            onBlur={() => setPasswordError(password ? "" : "Enter your password.")}
            onChange={(e) => { setPassword(e.target.value); setError(""); if (e.target.value) setPasswordError(""); }}
          />

          <button
            type="button"
            onClick={handleForgot}
            className="mt-3 block w-full text-right text-sm font-medium text-brand-600 hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Logging in…" : `Log in as ${role}`}
          <ChevronRight size={18} />
        </button>
      </form>

      <p className="mt-5 text-center text-slate-500">
          {role === "admin" ? (
          <>
            New dealership?{" "}
            <Link
              to="/signup"
              className="font-semibold text-brand-600"
            >
              Create an account
            </Link>
          </>
        ) : role === "employee" ? (
          "No account yet? Ask your admin to invite you."
        ) : (
          "Platform administrator accounts are provisioned by your system administrator."
        )}
      </p>
    </AuthLayout>
  );
}
