// Auth API (Express /api/auth). Thin wrapper over request() + auth schemas.
import { ENDPOINTS } from '../config/api';
import { request } from './httpClient';
import { authResponseSchema, userSchema } from '../schemas';

const BASE = ENDPOINTS.auth;

export const authService = {
  /** GET /profile — current user from a stored token. */
  getProfile: () =>
    request({ method: 'get', url: `${BASE}/profile` }, { schema: userSchema, label: 'auth/profile' }),

  /** POST /login → { token, user }. */
  login: (email, password) =>
    request(
      { method: 'post', url: `${BASE}/login`, data: { email, password } },
      { schema: authResponseSchema, label: 'auth/login' },
    ),

  /** POST /signup → { token, user }. */
  signup: (username, email, password) =>
    request(
      { method: 'post', url: `${BASE}/signup`, data: { username, email, password } },
      { schema: authResponseSchema, label: 'auth/signup' },
    ),

  /** PUT /profile/picture — multipart upload, returns the updated user. */
  updateProfilePic: (file) => {
    const formData = new FormData();
    formData.append('profileImage', file);
    return request(
      {
        method: 'put',
        url: `${BASE}/profile/picture`,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
      { schema: userSchema, label: 'auth/profile-picture' },
    );
  },
};

export default authService;
