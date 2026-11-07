import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleMode = (registerMode) => {
    setIsRegister(registerMode);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegister) {
      if (name.trim().length < 2) {
        setError("Name must contain at least 2 characters.");
        return;
      }
      if (password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        navigate("/dashboard", { replace: true });
      } else {
        await login({
          email: email.trim(),
          password,
        });
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        (err.response?.data?.errors &&
          err.response.data.errors.map((e) => e.message).join(", ")) ||
        (isRegister
          ? "Unable to create account. Please try again."
          : "Unable to sign in. Please try again.");

      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <ShieldCheck size={30} className="text-white" />
          </div>

          <h1 className="text-3xl font-extrabold text-white">
            Reconcile<span className="text-blue-400">X</span>
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Financial reconciliation & dispute management platform.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {/* Mode Switcher Tabs */}
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => toggleMode(false)}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                !isRegister
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              type="button"
              onClick={() => toggleMode(true)}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                isRegister
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <UserPlus size={15} /> Create Account
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>

          <p className="mb-6 mt-1 text-xs text-slate-500">
            {isRegister
              ? "Register a new finance executive account saved directly to the database."
              : "Sign in with your email and password to access your workspace."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Full name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Naik"
                  required
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Email address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    isRegister
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                  required
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isRegister && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Must be at least 8 characters long.
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
              >
                <p>{error}</p>
                {!isRegister && error.toLowerCase().includes("invalid") && (
                  <button
                    type="button"
                    onClick={() => toggleMode(true)}
                    className="mt-1 font-semibold text-blue-600 underline hover:text-blue-800"
                  >
                    Don't have an account? Click here to register.
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? isRegister
                  ? "Creating account..."
                  : "Signing in..."
                : isRegister
                ? "Create Account & Sign In"
                : "Sign In"}
            </button>
          </form>

          {/* Bottom Switcher Link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {isRegister ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => toggleMode(false)}
                  className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Sign in here
                </button>
              </p>
            ) : (
              <p>
                Don't have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => toggleMode(true)}
                  className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Create one now
                </button>
              </p>
            )}
          </div>

          <p className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
            Secure access · ReconcileX Finance Platform
          </p>
        </div>
      </div>
    </div>
  );
}
