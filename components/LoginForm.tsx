"use client";

import { useState, FormEvent } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { setUser } from "@/features/authSlice";
import { useAppDispatch } from "@/lib/hooks";
import toast from "react-hot-toast";


interface LoginFormProps {
  role: "admin" | "user";
  redirectTo: string;
}

export default function LoginForm({ role, redirectTo }: LoginFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Minimum 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back! Redirecting…");
      router.push(redirectTo);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        toast.error("Invalid email or password.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Signed in with Google!");
      router.push(redirectTo);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {role === "user" && (
        <>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-100 rounded-2xl bg-white hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <FcGoogle size={20} />
            <span className="text-xs font-black uppercase tracking-widest text-gray-700">
              Continue with Google
            </span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-50"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="px-3 bg-white text-gray-300">Or use email</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          id="login-email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          icon={<FiMail size={16} />}
          autoComplete="email"
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPw ? "text" : "password"}
            id="login-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            icon={<FiLock size={16} />}
            autoComplete="current-password"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
          >
            {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          className="w-full justify-center mt-2"
          id="login-submit-btn"
        >
          {loading ? "Signing in…" : `Sign in as ${role === "admin" ? "Admin" : "Employee"}`}
        </Button>

        <p className="text-center text-xs text-gray-400 pt-1">
          {role === "admin"
            ? "Admin & IRO People portal access only."
            : "Employee access for ordering tea & snacks."}
        </p>
      </form>
    </div>
  );
}
