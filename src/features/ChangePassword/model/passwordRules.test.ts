import { validateNewPassword } from './passwordRules';

describe('validateNewPassword', () => {
  it('требует минимум 8 символов', () => {
    expect(validateNewPassword('Ab1')).not.toBeNull();
  });

  it('требует буквы и цифры', () => {
    expect(validateNewPassword('abcdefgh')).not.toBeNull();
    expect(validateNewPassword('12345678')).not.toBeNull();
  });

  it('принимает корректный пароль', () => {
    expect(validateNewPassword('Password1')).toBeNull();
  });

  it('запрещает повтор старого пароля', () => {
    expect(validateNewPassword('Password1', 'Password1')).not.toBeNull();
  });
});
