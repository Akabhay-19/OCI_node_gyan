import bcrypt from 'bcryptjs';

const password = 'Gyan_ai_1';
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);

console.log('--- HASH START ---');
console.log(hash);
console.log('--- HASH END ---');
