import {
  registerDecorator,
  type ValidationOptions,
  type ValidationArguments,
} from 'class-validator';
import { isCountryCode } from './countries';

/**
 * Accepts only a real ISO 3166-1 alpha-2 code. Length(2,2) alone would let
 * "XX" through and quietly pollute the admin per-country breakdown.
 */
export function IsCountryCode(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCountryCode',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isCountryCode(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid two-letter country code.`;
        },
      },
    });
  };
}
