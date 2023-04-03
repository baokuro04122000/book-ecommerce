export interface ITokenPayload {
  token: string;
  key: string;
}

export type UserLoginPayload = {
  userId?: string;
  name: string;
  avatar: string;
  nickName?: string;
  role: string;
  gender: string;
  typeLogin: string;
  seller?: any;
  special?: Array<any>;
  accessToken: string;
  refreshToken: string;
};
