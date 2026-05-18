declare module 'bcryptjs' {
  export function genSalt(rounds?: number): Promise<string>;
  export function hash(data: string, salt: string): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;

  const bcrypt: {
    genSalt: typeof genSalt;
    hash: typeof hash;
    compare: typeof compare;
  };

  export default bcrypt;
}

declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
  }

  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: string,
    options?: SignOptions
  ): string;

  export function verify(token: string, secretOrPublicKey: string): any;
  export function decode(token: string): null | string | object;

  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
    decode: typeof decode;
  };

  export default jwt;
}
