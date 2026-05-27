import axios from 'axios';

export async function sendSMS({ to, message, senderId }) {
  const response = await axios.post(
    `${process.env.TERMII_BASE_URL}/sms/send`,
    {
      to,
      from:    senderId || process.env.TERMII_DEFAULT_SENDER,
      sms:     message,
      type:    'plain',
      channel: 'generic',
      api_key: process.env.TERMII_API_KEY,
    }
  );
  return response.data;
}
