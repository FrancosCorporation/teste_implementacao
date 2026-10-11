import { loadRealtimeDatabase } from './firebase';
import type { AppUser, Question, Room, RoomLikes } from '../types';
import type { Unsubscribe } from 'firebase/database';

type DatabaseSdk = typeof import('firebase/database');

interface DemoData {
  rooms: Record<string, Room>;
  questions: Record<string, Record<string, Question>>;
  likes: Record<string, RoomLikes>;
}

const DEMO_DATA_KEY = 'letmeask.demo.data.v1';
const demoSubscribers = new Set<() => void>();

function emptyDemoData(): DemoData {
  return { rooms: {}, questions: {}, likes: {} };
}

function readDemoData(): DemoData {
  try {
    const raw = localStorage.getItem(DEMO_DATA_KEY);
    if (!raw) return emptyDemoData();
    const data = JSON.parse(raw) as Partial<DemoData>;
    return {
      rooms: data.rooms ?? {},
      questions: data.questions ?? {},
      likes: data.likes ?? {},
    };
  } catch {
    return emptyDemoData();
  }
}

function notifyDemoSubscribers() {
  for (const subscriber of demoSubscribers) subscriber();
}

function saveDemoData(data: DemoData) {
  localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
  notifyDemoSubscribers();
}

function subscribeToDemo(selector: (data: DemoData) => void, onChange: () => void): Unsubscribe {
  const refresh = () => {
    selector(readDemoData());
    onChange();
  };
  demoSubscribers.add(refresh);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === DEMO_DATA_KEY) refresh();
  };
  window.addEventListener('storage', handleStorage);
  refresh();
  return () => {
    demoSubscribers.delete(refresh);
    window.removeEventListener('storage', handleStorage);
  };
}

function subscribeRemote(
  setup: (database: import('firebase/database').Database, sdk: DatabaseSdk) => Unsubscribe,
  onError: (error: Error) => void,
): Unsubscribe {
  let unsubscribe: Unsubscribe | undefined;
  let cancelled = false;
  void loadRealtimeDatabase().then(({ database, sdk }) => {
    if (!cancelled) unsubscribe = setup(database, sdk);
  }).catch((error: unknown) => {
    if (!cancelled) onError(error instanceof Error ? error : new Error('Firebase indisponível.'));
  });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

function sortRooms(rooms: Room[]) {
  return rooms.sort((left, right) => right.createdAt - left.createdAt);
}

export function subscribeToMyRooms(
  user: AppUser,
  onChange: (rooms: Room[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (user.isDemo) {
    let rooms: Room[] = [];
    return subscribeToDemo(
      (data) => { rooms = Object.values(data.rooms).filter((room) => room.ownerId === user.uid); },
      () => onChange(sortRooms(rooms)),
    );
  }

  return subscribeRemote((database, sdk) => {
    const roomsQuery = sdk.query(sdk.ref(database, 'rooms'), sdk.orderByChild('ownerId'), sdk.equalTo(user.uid));
    return sdk.onValue(roomsQuery, (snapshot) => {
      const rooms: Room[] = [];
      snapshot.forEach((child) => {
        if (child.key) rooms.push({ id: child.key, ...child.val() } as Room);
      });
      onChange(sortRooms(rooms));
    }, onError);
  }, onError);
}

export function subscribeToRoom(
  roomId: string,
  isDemo: boolean,
  onChange: (room: Room | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (isDemo) {
    let room: Room | null = null;
    return subscribeToDemo(
      (data) => { room = data.rooms[roomId] ?? null; },
      () => onChange(room),
    );
  }

  return subscribeRemote((database, sdk) => sdk.onValue(sdk.ref(database, `rooms/${roomId}`), (snapshot) => {
    onChange(snapshot.exists() ? { id: snapshot.key ?? roomId, ...snapshot.val() } as Room : null);
  }, onError), onError);
}

export function subscribeToQuestions(
  roomId: string,
  isDemo: boolean,
  onChange: (questions: Question[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (isDemo) {
    let questions: Question[] = [];
    return subscribeToDemo(
      (data) => { questions = Object.values(data.questions[roomId] ?? {}); },
      () => onChange([...questions].sort((left, right) => left.createdAt - right.createdAt)),
    );
  }

  return subscribeRemote((database, sdk) => sdk.onValue(sdk.ref(database, `questions/${roomId}`), (snapshot) => {
    const questions: Question[] = [];
    snapshot.forEach((child) => {
      if (child.key) questions.push({ id: child.key, ...child.val() } as Question);
    });
    onChange(questions.sort((left, right) => left.createdAt - right.createdAt));
  }, onError), onError);
}

export function subscribeToLikes(
  roomId: string,
  isDemo: boolean,
  onChange: (likes: RoomLikes) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (isDemo) {
    let likes: RoomLikes = {};
    return subscribeToDemo(
      (data) => { likes = data.likes[roomId] ?? {}; },
      () => onChange(likes),
    );
  }

  return subscribeRemote((database, sdk) => sdk.onValue(sdk.ref(database, `likes/${roomId}`), (snapshot) => {
    onChange(snapshot.val() ?? {});
  }, onError), onError);
}

export async function createRoom(name: string, user: AppUser): Promise<string> {
  const roomName = name.trim();
  if (user.isDemo) {
    const data = readDemoData();
    const id = `demo-${crypto.randomUUID().slice(0, 8)}`;
    data.rooms[id] = { id, name: roomName, ownerId: user.uid, ownerName: user.displayName, createdAt: Date.now() };
    data.questions[id] = {};
    data.likes[id] = {};
    saveDemoData(data);
    return id;
  }

  const { database, sdk } = await loadRealtimeDatabase();
  const roomRef = sdk.push(sdk.ref(database, 'rooms'));
  if (!roomRef.key) throw new Error('Não foi possível gerar o código da sala.');
  await sdk.set(roomRef, {
    name: roomName,
    ownerId: user.uid,
    ownerName: user.displayName,
    createdAt: sdk.serverTimestamp(),
  });
  return roomRef.key;
}

export async function createQuestion(roomId: string, text: string, user: AppUser) {
  const content = text.trim();
  if (user.isDemo) {
    const data = readDemoData();
    const id = crypto.randomUUID();
    data.questions[roomId] ??= {};
    data.questions[roomId][id] = {
      id,
      text: content,
      authorId: user.uid,
      authorName: user.displayName,
      createdAt: Date.now(),
      answered: false,
    };
    saveDemoData(data);
    return;
  }

  const { database, sdk } = await loadRealtimeDatabase();
  const questionRef = sdk.push(sdk.ref(database, `questions/${roomId}`));
  await sdk.set(questionRef, {
    text: content,
    authorId: user.uid,
    authorName: user.displayName,
    createdAt: sdk.serverTimestamp(),
    answered: false,
  });
}

export async function setQuestionAnswered(roomId: string, questionId: string, answered: boolean, isDemo: boolean) {
  if (isDemo) {
    const data = readDemoData();
    const question = data.questions[roomId]?.[questionId];
    if (question) question.answered = answered;
    saveDemoData(data);
    return;
  }
  const { database, sdk } = await loadRealtimeDatabase();
  await sdk.set(sdk.ref(database, `questions/${roomId}/${questionId}/answered`), answered);
}

export async function deleteQuestion(roomId: string, questionId: string, isDemo: boolean) {
  if (isDemo) {
    const data = readDemoData();
    delete data.questions[roomId]?.[questionId];
    delete data.likes[roomId]?.[questionId];
    saveDemoData(data);
    return;
  }
  const { database, sdk } = await loadRealtimeDatabase();
  await sdk.remove(sdk.ref(database, `questions/${roomId}/${questionId}`));
}

export async function setQuestionLike(roomId: string, questionId: string, uid: string, liked: boolean, isDemo: boolean) {
  if (isDemo) {
    const data = readDemoData();
    const roomLikes = data.likes[roomId] ??= {};
    const questionLikes = roomLikes[questionId] ??= {};
    if (liked) questionLikes[uid] = true;
    else delete questionLikes[uid];
    saveDemoData(data);
    return;
  }
  const { database, sdk } = await loadRealtimeDatabase();
  await sdk.set(sdk.ref(database, `likes/${roomId}/${questionId}/${uid}`), liked ? true : null);
}
