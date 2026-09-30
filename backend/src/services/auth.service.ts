import { supabase, createUserAuthClient } from '../config/supabase';
import { prisma } from '../config/prisma';
import { AuthError } from '../utils/errors';

export class AuthService {
  async login(email: string, password: string) {
    const { data, error } = await createUserAuthClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new AuthError(error?.message ?? 'Invalid credentials');
    return data;
  }

  async refresh(refreshToken: string) {
    const { data, error } = await createUserAuthClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new AuthError(error?.message ?? 'Could not refresh');
    return data;
  }

  async signup(
    email: string,
    password: string,
    fullName: string,
    institutionId: string,
  ) {
    const { data, error } = await createUserAuthClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'student',
          institution_id: institutionId,
          full_name: fullName,
        },
      },
    });
    if (error || !data.user) throw new AuthError(error?.message ?? 'Signup failed');

    // The custom access token hook reads public.profiles, not Supabase's
    // user_metadata — without this row every subsequent request 401s with
    // "Invalid token claims" because no role/institution can be resolved.
    // Upsert: the handle_new_user DB trigger may already have inserted this
    // row when the auth user was created, and a plain create would then fail
    // with a unique violation (500).
    await prisma.profile.upsert({
      where: { id: data.user.id },
      update: { institutionId, role: 'student', fullName, email },
      create: {
        id:            data.user.id,
        institutionId,
        role:          'student',
        fullName:      fullName,
        email,
      },
    });

    return data;
  }

  async logout(accessToken: string) {
    const { error } = await supabase.auth.admin.signOut(accessToken);
    if (error) throw new AuthError(error.message);
  }
}

export const authService = new AuthService();
