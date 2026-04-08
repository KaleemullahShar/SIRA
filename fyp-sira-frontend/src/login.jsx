import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", JSON.stringify(data.data.user));

        // Check if admin
        if (data.data.user.role === "admin") {
          localStorage.setItem("isAdmin", "true");
          navigate("/admin/dashboard");
        } else {
          localStorage.removeItem("isAdmin");
          navigate("/dashboard");
        }
      } else {
        setError(data.error?.message || "Invalid username or password");
      }
    } catch (err) {
      setError("Unable to connect to server. Please make sure backend is running.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-container-new">
      <div className="login-card-new">

        <div className="shield-icon">
          <img src="/shield.png" alt="SIRA Logo" style={{ width: "50px", height: "50px" }} />
        </div>

        <h2 className="login-title">Smart Investigation & Record Analyzer</h2>
        <p className="login-subtitle">Law Enforcement Portal</p>

        <form onSubmit={handleLogin} className="login-form-new">
          {error && <p className="login-error">{error}</p>}

          <label>Username</label>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <button type="submit" className="login-btn-new" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="demo-text" style={{ fontSize: '0.85rem', color: '#64748b' }}>
            First-time user? Register via backend API or contact admin
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

