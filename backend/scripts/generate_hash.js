import bcrypt from 'bcryptjs';

const password = 'Gyan_ai_1';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('Password:', password);
console.log('Hash:', hash);
