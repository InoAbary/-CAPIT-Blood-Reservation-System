import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    async function handleLogin(event) {
        event.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || `Login failed (HTTP ${response.status})`);
            }

            // Assumes the login API returns { user: { ... } }.

            setUser(data.user || { email });
            setPassword("");
            navigate("/Dashboard", { replace: true });
        } catch (err) {
            setError(err.message || "Cannot connect to the login server.");
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        setError("");
        try {
            const response = await fetch(`${API_URL}/api/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
            if (!response.ok) throw new Error("Logout failed.");
            setUser(null);
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <main className="login-page">
        <section className="login-card">
        <div className="login-brand">✚</div>
        <h1>Blood Reservation System</h1>
        <p className="login-subtitle">Sign in to test your account</p>

        {user ? (
            <div className="login-result" role="status">
            <strong>Login successful!</strong>
            <p>Signed in as {user.firstName ? `${user.firstName} ${user.lastName || ""}` : user.email}</p>
            <p>Email: {user.email || email}</p>
            {user.role && <p>Role: {user.role}</p>}
            <button type="button" onClick={handleLogout}>Log out</button>
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
            onChange={(event) => setEmail(event.target.value)}
            required
            />

            <label htmlFor="login-password">Password</label>
            <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            />

            <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Log in"}
            </button>
            </form>
        )}

        {error && <p className="login-error" role="alert">{error}</p>}
        <p className="login-note">Development test page · API: {API_URL}</p>
        </section>
        </main>
    );
}
