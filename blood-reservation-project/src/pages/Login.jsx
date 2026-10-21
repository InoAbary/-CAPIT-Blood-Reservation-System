import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";



export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { user, login, logout } = useAuth();   // ← shared auth state
  const navigate = useNavigate();
  const location = useLocation();

  // Where to send the user after login (ProtectedRoute passes this in)


  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loggedInUser = await login(email, password, "donor");
      setPassword("");

      const dest = "/DonorDashboard";

      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || "Cannot connect to the login server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setError("");
    try {
      await logout();
    } catch (err) {
      setError(err.message || "Logout failed.");
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">✚</div>
        <h1>Blood Reservation System</h1>
        <p className="login-subtitle">
          {user ? "You are signed in" : "Sign in to your account"}
        </p>

        {user ? (
          <div className="login-result" role="status">
            <strong>Login successful!</strong>
            <p>
              Signed in as{" "}
              {user.firstName
                ? `${user.firstName} ${user.lastName || ""}`
                : user.email}
            </p>
            <p>Email: {user.email}</p>
            {user.role && <p>Role: {user.role}</p>}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/DonorDashboard",
                  { replace: true }
                )
              }
            >
              Go to dashboard
            </button>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="juan.delacruz@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>
        )}

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        {!user && (
          <p className="login-note">
            No account? <a href="/Register">Register</a>
          </p>
        )}
        
      </section>
    </main>
  );
}