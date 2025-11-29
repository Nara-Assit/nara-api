import { config } from '../config/config.js';

export async function sendSms(phoneNumber: string, message: string) {
  const urlParams = new URLSearchParams({
    'mocean-from': config.SMS_FROM,
    'mocean-to': phoneNumber,
    'mocean-text': message,
  });

  const result = await fetch(config.SMS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.SMS_API_TOKEN}`,
      Accept: 'application/json',
    },
    body: urlParams.toString(),
  });

  const resultJson = (await result.json()) as {
    messages: [{ status: number; err_msg: string }];
  };

  console.log(resultJson);

  const messages = resultJson.messages;
  for (const msg of messages) {
    if (msg.status !== 0) {
      throw new Error(`Failed to send SMS: ${msg.err_msg}`);
    }
  }
}
