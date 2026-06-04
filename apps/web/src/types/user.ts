export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface UserOut extends User {}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
