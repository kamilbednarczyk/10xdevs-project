import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RegisterSchema, type RegisterSchemaType } from "@/lib/schemas/auth.schema";
import { getUnknownErrorMessage, readApiErrorMessage } from "@/lib/utils";

const defaultRegisterError = "Nie udało się utworzyć konta. Spróbuj ponownie.";

export function RegisterForm() {
  const baseId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchemaType>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      if (!response.ok) {
        const apiMessage = (await readApiErrorMessage(response)) ?? defaultRegisterError;
        setServerError(apiMessage);
        return;
      }

      setServerSuccess(
        "Gotowe! Wysłaliśmy do Ciebie wiadomość z linkiem aktywacyjnym. Potwierdź adres email, aby móc się zalogować."
      );
    } catch (error) {
      setServerError(getUnknownErrorMessage(error, "Nie udało się połączyć z serwerem. Spróbuj ponownie."));
    }
  });

  const emailErrorId = `${baseId}-email-error`;
  const passwordErrorId = `${baseId}-password-error`;
  const confirmPasswordErrorId = `${baseId}-confirm-password-error`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Załóż darmowe konto</CardTitle>
        <CardDescription>Dołącz do 10xCards i przyspieszaj naukę dzięki inteligentnym fiszkom.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {serverError ? (
          <Alert variant="destructive">
            <AlertTitle>Nie udało się zarejestrować</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        {serverSuccess ? (
          <Alert variant="success">
            <AlertTitle>Witamy na pokładzie!</AlertTitle>
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
              autoComplete="new-password"
              placeholder="Minimum 6 znaków"
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

          <div className="space-y-2">
            <Label htmlFor={`${baseId}-confirm-password`} isRequired>
              Powtórz hasło
            </Label>
            <Input
              id={`${baseId}-confirm-password`}
              type="password"
              autoComplete="new-password"
              placeholder="Potwierdź hasło"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-errormessage={errors.confirmPassword ? confirmPasswordErrorId : undefined}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p id={confirmPasswordErrorId} className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">
            Rejestrując się, akceptujesz{" "}
            <a className="text-primary hover:underline" href="/terms">
              regulamin
            </a>{" "}
            oraz{" "}
            <a className="text-primary hover:underline" href="/privacy">
              politykę prywatności
            </a>
            .
          </p>

          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting} aria-live="polite">
            {isSubmitting ? "Tworzenie konta..." : "Zarejestruj się"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p className="text-center">
          Masz już konto?{" "}
          <a className="font-medium text-primary hover:underline" href="/login">
            Zaloguj się
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}

export default RegisterForm;
