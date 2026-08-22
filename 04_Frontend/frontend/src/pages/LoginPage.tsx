/**
 * FINAL LOCKED LOGIN PAGE — DO NOT MODIFY WITHOUT EXPLICIT USER APPROVAL
 *
 * This file is the approved Login Page baseline. Do not change markup, copy,
 * layout, styling hooks, assets, or login behavior unless the user explicitly
 * requests a specific Login Page change.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  Images,
  Lock,
  LogIn,
  Mail,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth-service';
import { getLoginErrorMessage } from '@/utils/api-error';
import {
  resolvePostLoginPath,
  peekRememberedPostLoginPath,
  clearRememberedPostLoginPath,
} from '@/utils/post-login-path';
import './login-page.css';

const REMEMBER_KEY = 'dhara-login-remember';

const FEATURES = [
  { icon: CalendarDays, label: 'કૅલેન્ડર બુકિંગ મેનેજમેન્ટ' },
  { icon: Users, label: 'ક્લાયન્ટ સંબંધ વ્યવસ્થાપન' },
  { icon: FileText, label: 'ઇન્વોઇસ અને પેમેન્ટ' },
  { icon: Images, label: 'ગેલેરી મેનેજમેન્ટ' },
  { icon: BarChart3, label: 'રિપોર્ટ્સ અને એનાલિટિક્સ' },
  { icon: Settings, label: 'સેટિંગ્સ અને કસ્ટમાઇઝેશન' },
] as const;

const loginSchema = z.object({
  companyCode: z.string().trim().min(1, 'Studio code is required').max(64, 'Studio code is too long'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

function readRememberedCredentials(): Pick<LoginForm, 'companyCode' | 'email'> & { remember: boolean } {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) {
      return { remember: false, companyCode: '', email: '' };
    }
    const parsed = JSON.parse(raw) as { companyCode?: string; email?: string };
    return {
      remember: true,
      companyCode: parsed.companyCode ?? '',
      email: parsed.email ?? '',
    };
  } catch {
    return { remember: false, companyCode: '', email: '' };
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const remembered = readRememberedCredentials();
  const [rememberMe, setRememberMe] = useState(remembered.remember);
  const [forgotHint, setForgotHint] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const postLoginPath = resolvePostLoginPath(
    (location.state as { from?: { pathname?: string; search?: string } } | null)?.from ??
      peekRememberedPostLoginPath(),
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      companyCode: remembered.companyCode,
      email: remembered.email,
      password: '',
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(postLoginPath, { replace: true });
    }
  }, [isAuthenticated, navigate, postLoginPath]);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      clearRememberedPostLoginPath();
      navigate(postLoginPath, { replace: true });
    },
  });

  return (
    <div className="dhara-login">
      <div className="dhara-login__background" aria-hidden />
      <div className="dhara-login__frame" aria-hidden />
      <span className="dhara-login__corner dhara-login__corner--tl" aria-hidden />
      <span className="dhara-login__corner dhara-login__corner--tr" aria-hidden />
      <span className="dhara-login__corner dhara-login__corner--bl" aria-hidden />
      <span className="dhara-login__corner dhara-login__corner--br" aria-hidden />

      <div className="dhara-login__content">
        <section className="dhara-login__brand" aria-label="Dhara Photography branding">
          <p className="dhara-login__kicker">|| યાદે કૃષ્ણ: ||</p>
          <h1 className="dhara-login__title">
            ધારા
            <br />
            ફોટોગ્રાફી
          </h1>
          <p className="dhara-login__erp">ERP PRO</p>
          <div className="dhara-login__rule dhara-login__rule--short" aria-hidden />
          <p className="dhara-login__tagline">તમારું સ્ટુડિયો, અમારી ટેકનોલોજી</p>
          <p className="dhara-login__desc">
            બુકિંગ, ક્લાયન્ટ, ઇન્વોઇસ, ગેલેરી, એકાઉન્ટ્સ અને
            <br />
            અન્ય સ્ટુડિયો મેનેજમેન્ટ માટે સંપૂર્ણ ERP સોલ્યુશન.
          </p>

          <ul className="dhara-login__features">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label}>
                <span className="dhara-login__feature-icon" aria-hidden>
                  <Icon />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <div className="dhara-login__rule" aria-hidden />
          <p className="dhara-login__credit">
            © 2025 Dhara Photography Patan
            <br />
            All rights reserved.
          </p>
        </section>

        <div className="dhara-login__stage" aria-hidden />

        <section className="dhara-login__panel" aria-label="Login">
          <div className="dhara-login__card">
            <span className="dhara-login__card-corner dhara-login__card-corner--tl" aria-hidden />
            <span className="dhara-login__card-corner dhara-login__card-corner--tr" aria-hidden />
            <span className="dhara-login__card-corner dhara-login__card-corner--bl" aria-hidden />
            <span className="dhara-login__card-corner dhara-login__card-corner--br" aria-hidden />

            <div className="dhara-login__card-ornament" aria-hidden>
              <span />
              ◆
              <span />
            </div>
            <h2 className="dhara-login__card-title">સ્વાગત છે</h2>
            <p className="dhara-login__card-sub">કૃપા કરીને તમારા સ્ટુડિયો એકાઉન્ટમાં સાઇન ઇન કરો</p>

            <form
              onSubmit={handleSubmit((data) => {
                if (rememberMe) {
                  localStorage.setItem(
                    REMEMBER_KEY,
                    JSON.stringify({ companyCode: data.companyCode, email: data.email }),
                  );
                } else {
                  localStorage.removeItem(REMEMBER_KEY);
                }
                loginMutation.mutate(data);
              })}
            >
              <div>
                <label htmlFor="companyCode">સ્ટુડિયો કોડ</label>
                <div className="dhara-login__input-wrap">
                  <Building2 className="dhara-login__input-icon" aria-hidden />
                  <input
                    id="companyCode"
                    type="text"
                    autoComplete="organization"
                    className="input-field"
                    placeholder="DHARA-PATAN"
                    {...register('companyCode')}
                  />
                </div>
                {errors.companyCode && (
                  <p className="mt-1 text-xs text-red-400">{errors.companyCode.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email">ઈમેઈલ</label>
                <div className="dhara-login__input-wrap">
                  <Mail className="dhara-login__input-icon" aria-hidden />
                  <input
                    id="email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    className="input-field"
                    placeholder="admin@dharaphotography.local"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password">પાસવર્ડ</label>
                <div className="dhara-login__input-wrap">
                  <Lock className="dhara-login__input-icon" aria-hidden />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="input-field"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              <div className="dhara-login__row">
                <label className="dhara-login__remember" htmlFor="rememberMe">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  મને યાદ રાખો
                </label>
                <button
                  type="button"
                  className="dhara-login__forgot"
                  onClick={() => setForgotHint(true)}
                >
                  પાસવર્ડ ભૂલી ગયા?
                </button>
              </div>
              {forgotHint && (
                <p className="dhara-login__forgot-hint">
                  પાસવર્ડ રીસેટ માટે સ્ટુડિયો એડમિનનો સંપર્ક કરો.
                </p>
              )}

              {loginMutation.isError && (
                <div className="dhara-login__error" role="alert">
                  {getLoginErrorMessage(loginMutation.error)}
                </div>
              )}

              <button type="submit" disabled={loginMutation.isPending} className="btn-primary w-full">
                <LogIn aria-hidden />
                {loginMutation.isPending ? 'Signing in...' : 'સાઇન ઇન કરો'}
              </button>
            </form>

            <p className="dhara-login__secure">
              <ShieldCheck aria-hidden />
              તમારી માહિતી સુરક્ષિત અને ગુપ્ત રાખવામાં આવે છે.
            </p>
            <div className="dhara-login__card-ornament dhara-login__card-ornament--footer" aria-hidden>
              <span />
              ◆
              <span />
            </div>
          </div>
        </section>
      </div>

      <p className="dhara-login__quote">
        <span className="dhara-login__quote-flourish" aria-hidden />
        <span className="dhara-login__quote-text">|| કર્મણ્યેવાધિકારસ્તે મા ફલેષુ કદાચન ||</span>
        <span className="dhara-login__quote-flourish" aria-hidden />
      </p>
    </div>
  );
}
