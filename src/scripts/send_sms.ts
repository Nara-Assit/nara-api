import { sendSms } from '../services/smsService.js';

const phoneNumber = '201018709745';
const message = 'Hello from NARA!';

try {
  await sendSms(phoneNumber, message);
} catch (error) {
  console.error('Error sending SMS:', error);
}
