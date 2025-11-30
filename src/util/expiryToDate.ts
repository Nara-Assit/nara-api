export default function expiryToDate(expiryInSeconds: number): Date {
  return new Date(Date.now() + expiryInSeconds * 1000);
}
