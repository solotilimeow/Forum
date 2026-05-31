import bcrypt from 'bcryptjs';

// security utilities - hashing, password checking, input cleaning
// using bcryptjs because it's easier to install than the native bcrypt module
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '[SCRIPT BLOCKED]')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '[JS BLOCKED]:')
    .replace(/on\w+\s*=/gi, '[EVENT BLOCKED]=')
    .trim();
}

// Content moderation filter - blocks bad words
const BAD_WORDS = [
  'spam', 'scam', 'hate', 'attack', 'kill', 'die', 'stupid', 'idiot', 'loser',
  'hack', 'crack', 'virus', 'malware', 'phishing', 'fraud'
];

export function moderateContent(content: string): { clean: string; violations: string[] } {
  const violations: string[] = [];
  let clean = content;
  
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(content)) {
      violations.push(word);
      clean = clean.replace(regex, '***');
    }
  });
  
  return { clean, violations };
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('At least 8 characters');
  }
  
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('Add uppercase letters');
  }
  
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('Add lowercase letters');
  }
  
  if (/[0-9!@#$%^&*]/.test(password)) {
    score++;
  } else {
    feedback.push('Add numbers or special characters');
  }
  
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  
  return {
    score,
    label: labels[score] || 'Very Weak',
    feedback: feedback.length > 0 ? feedback : ['Great password!']
  };
}

export function base64Decode(text: string): string {
  if (typeof window !== 'undefined') {
    return atob(text);
  }
  return Buffer.from(text, 'base64').toString();
}

// Role badge colors
export function getRoleBadgeStyle(role: string): string {
  const styles: Record<string, string> = {
    admin: 'bg-red-100 text-red-800 border-red-300',
    moderator: 'bg-blue-100 text-blue-800 border-blue-300',
    user: 'bg-gray-100 text-gray-800 border-gray-300'
  };
  return styles[role] || styles.user;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrator',
    moderator: 'Moderator',
    user: 'User'
  };
  return labels[role] || 'User';
}
