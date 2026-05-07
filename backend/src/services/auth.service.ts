import { supabase } from '../config/supabase';
import { AuthError } from '../utils/errors';

export class AuthService {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new AuthError(error?.message ?? 'Invalid credentials');
    return data;
  }

  async refresh(refreshToken: string) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new AuthError(error?.message ?? 'Could not refresh');
    return data;
  }

  async logout(accessToken: string) {
    const { error } = await supabase.auth.admin.signOut(accessToken);
    if (error) throw new AuthError(error.message);
  }
}

export const authService = new AuthService();
