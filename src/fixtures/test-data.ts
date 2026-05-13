export const users = {
  validUser: {
    email: 'user@example.com',
    password: 'SecurePassword123',
    displayName: 'User',
  },
  invalidUser: {
    email: 'user@example.com',
    password: 'WrongPassword',
  },
} as const;

export const expectedMessages = {
  welcome: 'Bem-vindo, User',
  invalidCredentials: 'Credenciais inválidas',
} as const;

export type UserFixture = (typeof users)[keyof typeof users];
