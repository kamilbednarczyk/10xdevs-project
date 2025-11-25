import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UpdatePasswordSchema, type UpdatePasswordSchemaType } from "@/lib/schemas/auth.schema";
import { getUnknownErrorMessage, readApiErrorMessage } from "@/lib/utils";

const defaultUpdateError = "Nie udało się ustawić nowego hasła. Spróbuj ponownie.";

export function UpdatePasswordForm() {
  const baseId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UpdatePasswordSchemaType>({
    resolver: zodResolver(UpdatePasswordSchema),
    defaultValues: {
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
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: values.password }),
      });

      if (!response.ok) {
        const apiMessage = (await readApiErrorMessage(response)) ?? defaultUpdateError;
        setServerError(apiMessage);
        return;
      }

      setServerSuccess("Hasło zostało zmienione. Przekierujemy Cię do logowania...");
      reset();

      window.setTimeout(() => {
        window.location.assign("/login?status=password-updated");
      }, 1200);
    } catch (error) {
      setServerError(getUnknownErrorMessage(error, defaultUpdateError));
    }
  });

  const passwordErrorId = `${baseId}-password-error`;
  const confirmPasswordErrorId = `${baseId}-confirm-password-error`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ustaw nowe hasło</CardTitle>
        <CardDescription>Wprowadź nowe hasło, którego będziesz używać do logowania.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {serverError ? (
          <Alert variant="destructive">
            <AlertTitle>Nie udało się zaktualizować hasła</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        {serverSuccess ? (
          <Alert variant="success">
            <AlertTitle>Gotowe!</AlertTitle>
            <AlertDescription>{serverSuccess}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-5" noValidate onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-password`} isRequired>
              Nowe hasło
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
              placeholder="Powtórz hasło"
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

          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting} aria-live="polite">
            {isSubmitting ? "Aktualizujemy hasło..." : "Zapisz nowe hasło"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground">
        <a className="text-primary hover:underline" href="/login">
          Wróć do logowania
        </a>
      </CardFooter>
    </Card>
  );
}

export default UpdatePasswordForm;
