import crypto from 'crypto';

// 构造待签名字符串：按参数名 ASCII 升序，过滤空值以及 sign、sign_type 字段
export const buildSignContent = (params: Record<string, any>): string => {
  const filtered: Record<string, string> = {};

  Object.keys(params).forEach((key) => {
    if (key === 'sign' || key === 'sign_type') return;
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    filtered[key] = String(value);
  });

  const sortedKeys = Object.keys(filtered).sort();

  return sortedKeys
    .map((key) => `${key}=${filtered[key]}`)
    .join('&');
};

const normalizePrivateKey = (key: string): string =>
  key.includes('BEGIN') ? key : `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;

const normalizePublicKey = (key: string): string =>
  key.includes('BEGIN') ? key : `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;

export const rsaSign = (params: Record<string, any>, rawPrivateKey: string): string => {
  const content = buildSignContent(params);
  const privateKey = normalizePrivateKey(rawPrivateKey.replace(/\\n/g, '\n'));

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(content, 'utf8');
  signer.end();

  return signer.sign(privateKey, 'base64');
};

export const rsaVerify = (
  params: Record<string, any>,
  sign: string,
  rawPublicKey: string
): boolean => {
  const content = buildSignContent(params);
  const publicKey = normalizePublicKey(rawPublicKey.replace(/\\n/g, '\n'));

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(content, 'utf8');
  verifier.end();

  try {
    return verifier.verify(publicKey, sign, 'base64');
  } catch {
    return false;
  }
};

