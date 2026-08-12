import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  formatPasswordPolicyErrors,
  isPasswordPolicyValid,
} from '../utils/password-policy.util';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: unknown): boolean {
    if (typeof password !== 'string') {
      return false;
    }

    return isPasswordPolicyValid(password);
  }

  defaultMessage(args: ValidationArguments): string {
    const password = args.value;
    if (typeof password !== 'string') {
      return 'Password must be at least 8 characters.';
    }

    return formatPasswordPolicyErrors(password) || 'Password does not meet policy requirements.';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function registerStrongPasswordDecorator(
    object: object,
    propertyName: string,
  ): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
