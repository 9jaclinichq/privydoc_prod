/**
 * PrivyDoc Clinical and Administrative Utility Functions
 */

/**
 * Calculates display age from birth year
 * Under standard clinical guidelines, consultations are strictly restricted to individuals aged 18 and older.
 */
export function calcAge(birthYear: number, currentYear: number = new Date().getFullYear()): number {
  if (!birthYear || isNaN(birthYear)) return 0;
  return currentYear - birthYear;
}

/**
 * Normalizes a phone number to standard Nigerian WhatsApp format (234XXXXXXXXXX)
 */
export function normPhone(phone: string): string {
  if (!phone) return "";
  let sanitized = phone.replace(/[\s\-\(\)\+]/g, "");
  if (sanitized.startsWith("0")) {
    sanitized = "234" + sanitized.slice(1);
  }
  return sanitized;
}

/**
 * Custom 100% pure JS, synchronous SHA-256 hashing.
 * Dependency-free and works perfectly in both browser environments and Node.js.
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const words: number[] = [];
  const asciiLength = ascii.length;
  for (let i = 0; i < asciiLength; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  const maxWords = (((asciiLength + 8) >> 6) + 1) * 16;
  while (words.length < maxWords) {
    words.push(0);
  }
  words[maxWords - 1] = asciiLength * 8;
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  for (let i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    while (w.length < 64) {
      const s0 = rightRotate(w[w.length - 15], 7) ^ rightRotate(w[w.length - 15], 18) ^ (w[w.length - 15] >>> 3);
      const s1 = rightRotate(w[w.length - 2], 17) ^ rightRotate(w[w.length - 2], 19) ^ (w[w.length - 2] >>> 10);
      w.push((w[w.length - 16] + s0 + w[w.length - 7] + s1) | 0);
    }
    
    let [a, b, c, d, e, f, g, h] = hash;
    for (let j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }
  
  return hash.map(h => {
    const hex = (h >>> 0).toString(16);
    return "00000000".substring(hex.length) + hex;
  }).join("");
}

/**
 * Calculates earnings payout split (default 70% of consultation rate is paid to clinician)
 */
export function calculatePayoutSplit(price: number, payoutPct: number = 70): number {
  if (isNaN(price) || price < 0) return 0;
  return Math.round((price * payoutPct) / 100);
}

/**
 * Counts the number of patient clarification messages after the latest doctor message.
 * Under standard platform policy, there is a clarification cap of max 3 exchanges after a doctor response.
 */
export function countClarificationsAfterLastDoctorMsg(messages: any[]): number {
  if (!messages || !Array.isArray(messages)) return 0;
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.sender === "doctor") {
      break;
    }
    if (msg.sender === "patient") {
      count++;
    }
  }
  return count;
}
