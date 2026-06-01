// Auth API shapes (Express /api/auth). Mirrors backend/models/User.js +
// what authController returns on login/signup.
import { z } from 'zod';

export const userSchema = z
  .object({
    _id: z.string().optional(),
    username: z.string(),
    email: z.string(),
    profilePic: z.string().optional().default(''),
  })
  .passthrough();

// login / signup response: { token, user? }  (controller may inline user fields)
export const authResponseSchema = z
  .object({
    token: z.string(),
    user: userSchema.optional(),
  })
  .passthrough();

// ── Client-side FORM schemas (used by react-hook-form + zodResolver in B1) ──
export const loginFormSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupFormSchema = z
  .object({
    username: z.string().min(2, 'Username is too short'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
