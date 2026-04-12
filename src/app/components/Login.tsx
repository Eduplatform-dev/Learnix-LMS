import { useState, useEffect } from "react";
import { loginUser, registerUser } from "../../app/services/authService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { User, Lock, Mail, Hash } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/* ── Inline SVG illustrations ── */
const LoginIllustration = () => (
  <svg viewBox="0 0 200 160" className="login-panel-image" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="15" width="150" height="110" rx="10" fill="rgba(255,255,255,0.18)" />
    <rect x="40" y="30" width="90" height="10" rx="5" fill="rgba(255,255,255,0.85)" />
    <rect x="40" y="48" width="120" height="7" rx="3.5" fill="rgba(255,255,255,0.55)" />
    <rect x="40" y="61" width="100" height="7" rx="3.5" fill="rgba(255,255,255,0.55)" />
    <rect x="40" y="74" width="110" height="7" rx="3.5" fill="rgba(255,255,255,0.55)" />
    <rect x="40" y="87" width="80"  height="7" rx="3.5" fill="rgba(255,255,255,0.55)" />
    <circle cx="155" cy="120" r="22" fill="rgba(255,255,255,0.22)" />
    <text x="155" y="127" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">L</text>
  </svg>
);

const RegisterIllustration = () => (
  <svg viewBox="0 0 200 160" className="login-panel-image" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="52" r="32" fill="rgba(255,255,255,0.18)" />
    <circle cx="100" cy="45" r="16" fill="rgba(255,255,255,0.75)" />
    <path d="M60 98 Q100 80 140 98 L140 130 Q100 145 60 130Z" fill="rgba(255,255,255,0.45)" />
    <circle cx="158" cy="28" r="14" fill="rgba(255,255,255,0.3)" />
    <line x1="158" y1="21" x2="158" y2="35" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="151" y1="28" x2="165" y2="28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// Login with enrollment number — calls a custom endpoint
async function loginWithEnrollment(enrollmentNumber: string, password: string) {
  const res  = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ enrollmentNumber, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Invalid credentials");
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user",  JSON.stringify(data.user));
  }
  return { user: data.user, token: data.token };
}

export function Login() {
  const navigate = useNavigate();
  const { setAuthUser, user, loading: authLoading } = useAuth();

  const [isSignUpMode,    setIsSignUpMode]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [useEnrollment,   setUseEnrollment]   = useState(false);  // ← NEW

  const [signInData, setSignInData] = useState({ email: "", enrollmentNumber: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    username: "", email: "", password: "",
    role: "student" as "student" | "instructor",
  });

  useEffect(() => {
    if (authLoading || !user) return;
    if      (user.role === "admin")      navigate("/admin/dashboard",     { replace: true });
    else if (user.role === "instructor") navigate("/instructor/dashboard", { replace: true });
    else                                 navigate("/dashboard",            { replace: true });
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError(null);
    try {
      let result;
      if (useEnrollment && signInData.enrollmentNumber) {
        result = await loginWithEnrollment(signInData.enrollmentNumber.trim(), signInData.password);
      } else {
        result = await loginUser(signInData.email, signInData.password);
      }
      setAuthUser(result.user, result.token);
    } catch (err: any) {
      setError(err?.message || "Invalid credentials.");
    } finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (signUpData.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError(null);
    try {
      const { user, token } = await registerUser(
        signUpData.email, signUpData.password, signUpData.username, signUpData.role
      );
      setAuthUser(user, token);
    } catch (err: any) {
      setError(err?.message || "Registration failed.");
    } finally { setLoading(false); }
  };

  const switchMode = (signUp: boolean) => { setIsSignUpMode(signUp); setError(null); };

  return (
    <div className={`login-container ${isSignUpMode ? "sign-up-mode" : ""}`}>
      <div className="login-circle-bg" />

      <section className="login-forms-container">
        <div className="login-signin-signup">

          {/* ── Sign In ── */}
          <form onSubmit={handleSignIn} className={`login-form ${!isSignUpMode ? "active" : ""}`}>
            <h2 className="login-title">Sign In</h2>

            {error && !isSignUpMode && (
              <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "8px", textAlign: "center" }}>{error}</p>
            )}

            {/* Toggle: email vs enrollment */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <button type="button"
                style={{
                  flex: 1, padding: "7px 0", borderRadius: "40px", border: "2px solid",
                  fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                  backgroundColor: !useEnrollment ? "#5995fd" : "transparent",
                  borderColor: "#5995fd",
                  color: !useEnrollment ? "#fff" : "#5995fd",
                  transition: "all 0.2s",
                }}
                onClick={() => setUseEnrollment(false)}>
                📧 Email Login
              </button>
              <button type="button"
                style={{
                  flex: 1, padding: "7px 0", borderRadius: "40px", border: "2px solid",
                  fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                  backgroundColor: useEnrollment ? "#5995fd" : "transparent",
                  borderColor: "#5995fd",
                  color: useEnrollment ? "#fff" : "#5995fd",
                  transition: "all 0.2s",
                }}
                onClick={() => setUseEnrollment(true)}>
                🎓 Enrollment ID
              </button>
            </div>

            {useEnrollment ? (
              <div className="login-input-field">
                <Hash className="login-input-icon" size={20} />
                <input
                  type="text"
                  placeholder="Enrollment Number"
                  value={signInData.enrollmentNumber}
                  onChange={e => setSignInData({ ...signInData, enrollmentNumber: e.target.value })}
                  required
                  autoComplete="username"
                />
              </div>
            ) : (
              <div className="login-input-field">
                <Mail className="login-input-icon" size={20} />
                <input
                  type="email"
                  placeholder="Email address"
                  value={signInData.email}
                  onChange={e => setSignInData({ ...signInData, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
            )}

            <div className="login-input-field">
              <Lock className="login-input-icon" size={20} />
              <input
                type="password"
                placeholder="Password"
                value={signInData.password}
                onChange={e => setSignInData({ ...signInData, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-btn solid" disabled={loading}>
              {loading ? "Signing in…" : "Login"}
            </button>

            {useEnrollment && (
              <p style={{ fontSize: "0.72rem", color: "#aaa", textAlign: "center", marginTop: "8px" }}>
                Students: use your enrollment number assigned by admin
              </p>
            )}
          </form>

          {/* ── Sign Up ── */}
          <form onSubmit={handleSignUp} className={`login-form ${isSignUpMode ? "active" : ""}`}>
            <h2 className="login-title">Sign Up</h2>
            {error && isSignUpMode && (
              <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "8px", textAlign: "center" }}>{error}</p>
            )}
            <div className="login-input-field">
              <User className="login-input-icon" size={20} />
              <input type="text" placeholder="Username" value={signUpData.username}
                onChange={e => setSignUpData({ ...signUpData, username: e.target.value })}
                required autoComplete="username" />
            </div>
            <div className="login-input-field">
              <Mail className="login-input-icon" size={20} />
              <input type="email" placeholder="Email address" value={signUpData.email}
                onChange={e => setSignUpData({ ...signUpData, email: e.target.value })}
                required autoComplete="email" />
            </div>
            <div className="login-input-field">
              <Lock className="login-input-icon" size={20} />
              <input type="password" placeholder="Password (min. 6 chars)" value={signUpData.password}
                onChange={e => setSignUpData({ ...signUpData, password: e.target.value })}
                required autoComplete="new-password" />
            </div>
            <select className="login-role-select" value={signUpData.role}
              onChange={e => setSignUpData({ ...signUpData, role: e.target.value as "student" | "instructor" })}>
              <option value="student">👩‍🎓 Student</option>
              <option value="instructor">👨‍🏫 Instructor</option>
            </select>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>
        </div>
      </section>

      {/* Side panels */}
      <section className="login-panels-container">
        <div className={`login-panel left-panel ${isSignUpMode ? "hidden-panel" : ""}`}>
          <div className="login-panel-content">
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "6px" }}>New here?</h3>
            <p style={{ opacity: 0.88, fontSize: "0.9rem", marginBottom: "20px" }}>
              Create an account and start learning for free.
            </p>
            <button className="login-btn transparent" onClick={() => switchMode(true)}>Sign Up</button>
          </div>
          <LoginIllustration />
        </div>

        <div className={`login-panel right-panel ${!isSignUpMode ? "hidden-panel" : ""}`}>
          <div className="login-panel-content">
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "6px" }}>Already a member?</h3>
            <p style={{ opacity: 0.88, fontSize: "0.9rem", marginBottom: "20px" }}>
              Sign in to continue your journey.
            </p>
            <button className="login-btn transparent" onClick={() => switchMode(false)}>Sign In</button>
          </div>
          <RegisterIllustration />
        </div>
      </section>
    </div>
  );
}
