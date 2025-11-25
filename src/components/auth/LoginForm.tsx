import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoginSchema, type LoginSchemaType } from "@/lib/schemas/auth.schema";
import { getUnknownErrorMessage, readApiErrorMessage } from "@/lib/utils";

const defaultLoginError = "Nieprawidłowy email lub hasło. Spróbuj ponownie.";

export function LoginForm() {
  const baseId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const apiMessage = (await readApiErrorMessage(response)) ?? defaultLoginError;
        setServerError(apiMessage);
        return;
      }

      setServerSuccess("Logowanie zakończone sukcesem. Przekierowujemy Cię do panelu...");

      window.setTimeout(() => {
        window.location.assign("/");
      }, 800);
    } catch (error) {
      setServerError(getUnknownErrorMessage(error, "Nie udało się połączyć z serwerem. Spróbuj ponownie."));
    }
  });

  const emailErrorId = `${baseId}-email-error`;
  const passwordErrorId = `${baseId}-password-error`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zaloguj się</CardTitle>
        <CardDescription>Połącz się ze swoim kontem i kontynuuj naukę.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {serverError ? (
          <Alert variant="destructive">
            <AlertTitle>Nie udało się zalogować</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        {serverSuccess ? (
          <Alert variant="success">
            <AlertTitle>Witaj ponownie!</AlertTitle>
            <AlertDescription>{serverSuccess}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-5" noValidate onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-email`} isRequired>
              Adres email
            </Label>
            <Input
              id={`${baseId}-email`}
              type="email"
              autoComplete="email"
              placeholder="ola@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-errormessage={errors.email ? emailErrorId : undefined}
              {...register("email")}
            />
            {errors.email ? (
              <p id={emailErrorId} className="text-sm text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${baseId}-password`} isRequired>
              Hasło
            </Label>
            <Input
              id={`${baseId}-password`}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              aria-errormessage={errors.password ? passwordErrorId : undefined}
              {...register("password")}
            />
            {errors.password ? (
              <p id={passwordErrorId} className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting} aria-live="polite">
            {isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 text-sm text-muted-foreground">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
          <a className="font-medium text-primary hover:underline" href="/forgot-password">
            Nie pamiętam hasła
          </a>
          <a className="font-medium text-primary hover:underline" href="/register">
            Nie masz konta? Zarejestruj się
          </a>
        </div>
        <p className="text-center text-xs">
          Masz problem z logowaniem?{" "}
          <a className="font-medium text-primary hover:underline" href="mailto:support@10xdevs.com">
            Skontaktuj się z nami
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}

export default LoginForm;
