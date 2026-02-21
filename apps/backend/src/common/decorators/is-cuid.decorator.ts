import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsCuid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCuid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string' || !value) {
            return false;
          }

          const cuid = value.trim();
          
          const cuidV1Pattern = /^c[a-z0-9]{24}$/;
          
          return cuid.length === 25 && cuidV1Pattern.test(cuid);
        },
        
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser um CUID válido.`;
        },
      },
    });
  };
}