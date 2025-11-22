export default function generateOtp(length = 6): string {
  let otp = '';
  const digits = '0123456789';
  const digitsLength = digits.length;
  for (let i = 0; i < length; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digitsLength));
  }
  return otp;
}
