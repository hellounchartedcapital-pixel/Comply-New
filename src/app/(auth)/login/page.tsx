import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <>
      {/* Mobile logo */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.svg" alt="SmartCOI" className="h-9 w-9" />
        <span className="text-lg font-bold text-foreground">SmartCOI</span>
      </div>

      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
