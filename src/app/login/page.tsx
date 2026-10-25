"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function Login() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="login">
      <div className="panel">
        <div className="brand" style={{ color: "#103641" }}>
          Recy<span>Track</span>
        </div>
        <h1>Sign in</h1>
        <p className="muted">Secure operations portal</p>

        <form className="form" action={formAction}>
          {state.error && (
            <div className="error" role="alert">
              {state.error}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              disabled={pending}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={pending}
            />
          </div>

          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
