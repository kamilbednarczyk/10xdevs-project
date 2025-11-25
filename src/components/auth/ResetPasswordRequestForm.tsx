import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResetPasswordSchema, type ResetPasswordSchemaType } from "@/lib/schemas/auth.schema";
import { getUnknownErrorMessage, readApiErrorMessage } from "@/lib/utils";

const defaultResetError = "Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.";

export function ResetPasswordRequestForm() {
  const baseId = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setServerSuccess(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const apiMessage = (await readApiErrorMessage(response)) ?? defaultResetError;
        setServerError(apiMessage);
        return;
      }

      setServerSuccess(
        "Jeżeli podany adres istnieje w naszej bazie, wyślemy na niego instrukcję resetu hasła w ciągu kilku chwil."
      );
      reset();
    } catch (error) {
      setServerError(getUnknownErrorMessage(error, defaultResetError));
    }
  });

  const emailErrorId = `${baseId}-email-error`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Odzyskaj dostęp</CardTitle>
        <CardDescription>Wpisz adres email, a wyślemy link do ustawienia nowego hasła.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {serverError ? (
          <Alert variant="destructive">
            <AlertTitle>Nie udało się wysłać wiadomości</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        {serverSuccess ? (
          <Alert variant="info">
            <AlertTitle>Sprawdź skrzynkę odbiorczą</AlertTitle>
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

          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting} aria-live="polite">
            {isSubmitting ? "Wysyłamy link..." : "Wyślij link resetujący"}
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

export default ResetPasswordRequestForm;
