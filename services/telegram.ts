
import { TELEGRAM_TOKEN, CHAT_ID } from '../constants';

/**
 * Sends a notification to Telegram.
 * If a photoBlob is provided, it uses sendPhoto. Otherwise, it uses sendMessage.
 */
export const sendTelegramMessage = async (msg: string, photoBlob?: Blob) => {
  const token = TELEGRAM_TOKEN.trim();
  const chatId = CHAT_ID.trim();

  try {
    if (photoBlob) {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', photoBlob, 'signal_snapshot.png');
      formData.append('caption', msg);
      formData.append('parse_mode', 'Markdown');

      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData,
        // Note: multipart/form-data doesn't work with 'no-cors' for blobs.
        // We rely on standard browser behavior or environment settings.
      });
    } else {
      const encodedMsg = encodeURIComponent(msg);
      const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodedMsg}&parse_mode=Markdown`;
      
      await fetch(url, { 
        mode: 'no-cors',
        cache: 'no-cache'
      });
    }
  } catch (error) {
    console.error("Telegram delivery failed:", error);
  }
};
