import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import forms from "../styles/forms.module.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(username, email, password);
      navigate("/documents");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((d) => d.msg).join(" ")
        : detail;
      setError(message || "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout eyebrow="Get started" title="Create your account">
      <form onSubmit={handleSubmit} noValidate>
        {error && <div className={forms.error}>{error}</div>}

        <div className={forms.field}>
          <label className={forms.label} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            className={forms.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className={forms.field}>
          <label className={forms.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={forms.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className={forms.field}>
          <label className={forms.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className={forms.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <span className={forms.hint}>
            At least 8 characters, with an uppercase letter, a lowercase letter,
            and a symbol.
          </span>
        </div>

        <button className={forms.submit} type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className={forms.switchLine}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
