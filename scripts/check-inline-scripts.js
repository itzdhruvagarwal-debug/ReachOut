const http = require('http');
const crypto = require('crypto');

http.get('http://localhost:3000', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const regex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(body)) !== null) {
      const attrs = match[1];
      const content = match[2];
      if (content.trim()) {
        const hash = crypto.createHash('sha256').update(content).digest('base64');
        console.log('--- INLINE SCRIPT ---');
        console.log('Attrs:', attrs);
        console.log('Hash: sha256-' + hash);
        console.log('Content (first 100 chars):', content.trim().substring(0, 100));
      }
    }
  });
});
