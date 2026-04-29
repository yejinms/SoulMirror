import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDoc,
  deleteDoc,
  arrayUnion
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: any;
}

export interface Session {
  id: string;
  userId: string;
  title?: string;
  messages: Message[];
  status: 'active' | 'completed';
  report?: string;
  createdAt: any;
  updatedAt: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/sessions`;
    const q = query(
      collection(db, path),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const createSession = async () => {
    if (!user) return null;
    const path = `users/${user.uid}/sessions`;
    const now = new Date();
    const title = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} 저널링`;
    
    try {
      const sessionRef = await addDoc(collection(db, path), {
        userId: user.uid,
        title,
        messages: [],
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return sessionRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/sessions/${sessionId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return { sessions, loading, createSession, deleteSession };
}

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/notes`;
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const deleteNote = async (noteId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/notes/${noteId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return { notes, loading, deleteNote };
}

export function useSession(sessionId: string | null) {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    const path = `users/${user.uid}/sessions/${sessionId}`;
    const unsubscribe = onSnapshot(doc(db, path), (doc) => {
      if (doc.exists()) {
        setSession({ id: doc.id, ...doc.data() } as Session);
      } else {
        setSession(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user, sessionId]);

  const addMessage = async (content: string, role: 'user' | 'model') => {
    if (!user || !sessionId || !session) return;
    const path = `users/${user.uid}/sessions/${sessionId}`;
    const sessionRef = doc(db, path);
    const newMessage = {
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    
    try {
      await updateDoc(sessionRef, {
        messages: arrayUnion(newMessage),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const endSession = async (report: string) => {
    if (!user || !sessionId) return;
    const sessionPath = `users/${user.uid}/sessions/${sessionId}`;
    const notesPath = `users/${user.uid}/notes`;
    const sessionRef = doc(db, sessionPath);
    
    // Parse keywords and summary from report
    const keywordsMatch = report.match(/\[핵심 키워드\]\s*:\s*(.+)/);
    const summaryMatch = report.match(/\[한 줄 요약\]\s*:\s*(.+)/);
    
    const keywords = keywordsMatch ? keywordsMatch[1].trim() : "";
    const summary = summaryMatch ? summaryMatch[1].trim() : "";

    try {
      await updateDoc(sessionRef, {
        status: 'completed',
        report,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, notesPath), {
        userId: user.uid,
        sessionId,
        title: `저널 리포트 (${new Date().toLocaleDateString()})`,
        content: report,
        keywords,
        summary,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, sessionPath);
    }
  };

  return { session, loading, addMessage, endSession };
}
