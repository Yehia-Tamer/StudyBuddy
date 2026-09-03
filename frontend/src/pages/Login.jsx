import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import forms from '../styles/forms.module.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/documents');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Incorrect username or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout eyebrow="Welcome back" title="Log in to StudyBuddy">
      <form onSubmit={handleSubmit} noValidate>
        {error && <div className={forms.error}>{error}</div>}

        <div className={forms.field}>
          <label className={forms.label} htmlFor="username">Username</label>
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
          <label className={forms.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className={forms.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button className={forms.submit} type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className={forms.switchLine}>
        Don't have an account? <Link to="/register">Create one</Link>
      </p>
    </AuthLayout>
  );
}