import path from 'path';
import { readJsonFile, writeJsonFile } from './jsonStore';

const dataDir = path.join(process.cwd(), 'data');
const NEWSLETTER_FILE = path.join(dataDir, 'newsletter.json');
const CONTACT_FILE = path.join(dataDir, 'contact.json');

export interface Subscriber { email: string; locale: string; source: string; createdAt: string }
export interface ContactMessage {
  id: string; name: string; email: string; company: string; need: string; message: string;
  locale: string; createdAt: string;
}

export function getSubscribers(): Subscriber[] {
  return readJsonFile<Subscriber[]>(NEWSLETTER_FILE, []);
}

/** Retourne false si l'adresse est déjà inscrite (sans rien révéler à l'utilisateur). */
export function addSubscriber(s: Omit<Subscriber, 'createdAt'>): boolean {
  const list = getSubscribers();
  const email = s.email.toLowerCase();
  if (list.some(x => x.email === email)) return false;
  list.push({ ...s, email, createdAt: new Date().toISOString() });
  writeJsonFile(NEWSLETTER_FILE, list);
  return true;
}

export function getMessages(): ContactMessage[] {
  return readJsonFile<ContactMessage[]>(CONTACT_FILE, []);
}

export function addMessage(m: Omit<ContactMessage, 'id' | 'createdAt'>): void {
  const list = getMessages();
  list.push({ ...m, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), createdAt: new Date().toISOString() });
  writeJsonFile(CONTACT_FILE, list);
}

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
