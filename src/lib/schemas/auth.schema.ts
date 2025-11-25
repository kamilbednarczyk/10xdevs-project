import { z } from "zod";

const emailField = z.string().min(1, "Email jest wymagany").email("Podaj prawidłowy adres email");

const passwordField = z.string().min(6, "Hasło musi mieć co najmniej 6 znaków");

export const LoginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Hasło jest wymagane"),
});

export const RegisterSchema = z
  .object({
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "Potwierdź hasło"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

export const ResetPasswordSchema = z.object({
  email: emailField,
});

export const UpdatePasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, "Potwierdź hasło"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

export type LoginSchemaType = z.infer<typeof LoginSchema>;
export type RegisterSchemaType = z.infer<typeof RegisterSchema>;
export type ResetPasswordSchemaType = z.infer<typeof ResetPasswordSchema>;
export type UpdatePasswordSchemaType = z.infer<typeof UpdatePasswordSchema>;
