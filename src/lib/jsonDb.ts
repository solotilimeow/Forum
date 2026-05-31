import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJson<T>(filename: string): T {
  const file = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

function writeJson<T>(filename: string, data: T): void {
  const file = path.join(DATA_DIR, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  is_locked: boolean;
  lock_until: string | null;
  created_at: string;
  totp_secret?: string;
  totp_enabled?: boolean;
}

export interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  username: string;
  role: string;
}

export interface Comment {
  id: number;
  post_id: number;
  parent_id: number | null;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  role: string;
}

export interface Session {
  token: string;
  user_id: number;
  last_activity: string;
  ip_address?: string;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  details: string;
  ip_address: string;
  timestamp: string;
}

export interface LoginAttempt {
  username: string;
  count: number;
  last_attempt: string;
}

const loginAttempts = new Map<string, LoginAttempt>();

export const db = {
  // --- Users ---
  getUsers(): User[] {
    return readJson<User[]>('users.json');
  },

  findUserByUsername(username: string): User | undefined {
    return this.getUsers().find(u => u.username === username);
  },

  findUserById(id: number): User | undefined {
    return this.getUsers().find(u => u.id === id);
  },

  findUserByUsernameOrEmail(username: string, email: string): User | undefined {
    return this.getUsers().find(u => u.username === username || u.email === email);
  },

  createUser(username: string, email: string, password_hash: string): User {
    const users = this.getUsers();
    const user: User = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      username,
      email,
      password_hash,
      role: 'user',
      is_locked: false,
      lock_until: null,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    writeJson('users.json', users);
    return user;
  },

  // --- Posts ---
  getPosts(): (Post & { comment_count: number })[] {
    const posts = readJson<Post[]>('posts.json');
    const comments = readJson<Comment[]>('comments.json');
    const users = this.getUsers();
    return [...posts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(p => {
        const author = users.find(u => u.id === p.user_id);
        const isBanned = author?.is_locked ?? false;
        return {
          ...p,
          username: isBanned ? '[banned user]' : p.username,
          comment_count: comments.filter(c => c.post_id === p.id).length,
        };
      });
  },

  getPostById(id: number): Post | undefined {
    const post = readJson<Post[]>('posts.json').find(p => p.id === id);
    if (!post) return undefined;
    const author = this.findUserById(post.user_id);
    return { ...post, username: author?.is_locked ? '[banned user]' : post.username };
  },

  createPost(userId: number, title: string, content: string, imageUrl?: string): Post {
    const posts = readJson<Post[]>('posts.json');
    const user = this.findUserById(userId)!;
    const post: Post = {
      id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
      user_id: userId,
      title,
      content,
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
      username: user.username,
      role: user.role,
    };
    posts.push(post);
    writeJson('posts.json', posts);
    return post;
  },

  // --- Comments ---
  getCommentsByPostId(postId: number): Comment[] {
    const users = this.getUsers();
    return readJson<Comment[]>('comments.json')
      .filter(c => c.post_id === postId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(c => {
        const author = users.find(u => u.id === c.user_id);
        const isBanned = author?.is_locked ?? false;
        return { ...c, username: isBanned ? '[banned user]' : c.username };
      });
  },

  createComment(postId: number, userId: number, content: string, parentId: number | null): Comment {
    const comments = readJson<Comment[]>('comments.json');
    const user = this.findUserById(userId)!;
    const comment: Comment = {
      id: comments.length > 0 ? Math.max(...comments.map(c => c.id)) + 1 : 1,
      post_id: postId,
      parent_id: parentId,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
      username: user.username,
      role: user.role,
    };
    comments.push(comment);
    writeJson('comments.json', comments);
    return comment;
  },

  // --- Sessions ---
  createSession(userId: number, ipAddress?: string): string {
    const sessions = readJson<Session[]>('sessions.json');
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessions.push({ token, user_id: userId, last_activity: new Date().toISOString(), ip_address: ipAddress });
    writeJson('sessions.json', sessions);
    return token;
  },

  checkSessionIp(token: string, requestIp: string): void {
    const session = this.getSession(token);
    if (!session || !session.ip_address) return;
    const sessionIp = session.ip_address;
    if (sessionIp !== requestIp && sessionIp !== 'unknown' && requestIp !== 'unknown') {
      const user = this.findUserById(session.user_id);
      this.logAudit(
        session.user_id,
        'SUSPICIOUS_IP_CHANGE',
        `Session IP mismatch: expected ${sessionIp}, got ${requestIp}`,
        requestIp,
      );
    }
  },

  getSession(token: string): Session | undefined {
    return readJson<Session[]>('sessions.json').find(s => s.token === token);
  },

  updateSessionActivity(token: string): void {
    const sessions = readJson<Session[]>('sessions.json');
    const s = sessions.find(s => s.token === token);
    if (s) {
      s.last_activity = new Date().toISOString();
      writeJson('sessions.json', sessions);
    }
  },

  invalidateSession(token: string): void {
    const sessions = readJson<Session[]>('sessions.json').filter(s => s.token !== token);
    writeJson('sessions.json', sessions);
  },

  // --- Audit Log ---
  logAudit(userId: number | null, action: string, details: string, ip: string): void {
    const log = readJson<AuditEntry[]>('audit.json');
    const user = userId ? this.findUserById(userId) : null;
    log.unshift({
      id: log.length > 0 ? Math.max(...log.map(e => e.id)) + 1 : 1,
      user_id: userId,
      username: user?.username || null,
      action,
      details,
      ip_address: ip,
      timestamp: new Date().toISOString(),
    });
    writeJson('audit.json', log);
  },

  getAuditLog(): AuditEntry[] {
    return readJson<AuditEntry[]>('audit.json');
  },

  // --- Moderation ---
  deletePost(postId: number): void {
    const posts = readJson<Post[]>('posts.json').filter(p => p.id !== postId);
    writeJson('posts.json', posts);
    const comments = readJson<Comment[]>('comments.json').filter(c => c.post_id !== postId);
    writeJson('comments.json', comments);
  },

  deleteComment(commentId: number): void {
    const comments = readJson<Comment[]>('comments.json');
    const toDelete = new Set<number>();
    const collect = (id: number) => {
      toDelete.add(id);
      comments.filter(c => c.parent_id === id).forEach(c => collect(c.id));
    };
    collect(commentId);
    writeJson('comments.json', comments.filter(c => !toDelete.has(c.id)));
  },

  // --- User Management (admin only) ---
  getAllUsers(): User[] {
    return this.getUsers();
  },

  banUser(userId: number): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.is_locked = true;
      user.lock_until = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
      writeJson('users.json', users);
    }
  },

  unbanUser(userId: number): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.is_locked = false;
      user.lock_until = null;
      writeJson('users.json', users);
    }
  },

  // --- TOTP 2FA ---
  setTotpSecret(userId: number, secret: string): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.totp_secret = secret;
      user.totp_enabled = false;
      writeJson('users.json', users);
    }
  },

  enableTotp(userId: number): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.totp_enabled = true;
      writeJson('users.json', users);
    }
  },

  disableTotp(userId: number): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.totp_enabled = false;
      user.totp_secret = undefined;
      writeJson('users.json', users);
    }
  },

  setUserRole(userId: number, role: string): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.role = role;
      writeJson('users.json', users);
    }
  },

  // --- Login Attempts (in-memory, resets on restart) ---
  checkLoginAttempts(username: string): { allowed: boolean; remaining: number } {
    const MAX = 3;
    const LOCKOUT_MS = 15 * 60 * 1000;
    const attempt = loginAttempts.get(username);
    if (!attempt) return { allowed: true, remaining: MAX };
    const expired = Date.now() - new Date(attempt.last_attempt).getTime() > LOCKOUT_MS;
    if (expired) {
      loginAttempts.delete(username);
      return { allowed: true, remaining: MAX };
    }
    const remaining = Math.max(0, MAX - attempt.count);
    return { allowed: remaining > 0, remaining };
  },

  recordLoginAttempt(username: string, success: boolean): void {
    if (success) { loginAttempts.delete(username); return; }
    const existing = loginAttempts.get(username);
    if (existing) {
      existing.count++;
      existing.last_attempt = new Date().toISOString();
    } else {
      loginAttempts.set(username, { username, count: 1, last_attempt: new Date().toISOString() });
    }
  },
};
