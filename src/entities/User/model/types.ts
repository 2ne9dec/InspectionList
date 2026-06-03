export interface User {
  id: string;
  username: string;
  displayName: string;
  filialId: number | null; // null = admin (все филиалы)
  role: 'admin' | 'user';
}

export interface UserSchema {
  authData?: User;
  _inited: boolean;
}
