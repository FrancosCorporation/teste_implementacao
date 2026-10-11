import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import {
  createQuestion,
  createRoom,
  deleteQuestion,
  setQuestionAnswered,
  setQuestionLike,
  subscribeToLikes,
  subscribeToMyRooms,
  subscribeToQuestions,
  subscribeToRoom,
} from './services/data';
import { isFirebaseConfigured } from './services/firebase';
import type { AppUser, Question, Room, RoomLikes } from './types';
import './App.css';

const QUESTION_LIMIT = 350;
const ROOM_CODE_PATTERN = /^[A-Za-z0-9_-]{5,40}$/;

function getErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';
  if (code.includes('popup-closed-by-user')) return 'A janela de login foi fechada antes de concluir.';
  if (code.includes('unauthorized-domain')) return 'Este domínio ainda não está autorizado no Firebase Authentication.';
  if (code.includes('permission-denied')) return 'O Firebase recusou a ação. Confira as regras do Realtime Database.';
  return 'Não foi possível concluir agora. Tente novamente em instantes.';
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'L';
}

function formatDate(timestamp: number) {
  if (!Number.isFinite(timestamp)) return 'agora';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(timestamp);
}

function Avatar({ user, size = 'normal' }: { user: Pick<AppUser, 'displayName' | 'photoURL'>; size?: 'normal' | 'small' }) {
  return user.photoURL
    ? <img className={`avatar avatar-${size}`} src={user.photoURL} alt="" referrerPolicy="no-referrer" />
    : <span className={`avatar avatar-${size} avatar-fallback`} aria-hidden="true">{initials(user.displayName)}</span>;
}

function ErrorNotice({ children }: { children: string }) {
  return <p className="error-notice" role="alert">{children}</p>;
}

function AppShell() {
  const { user, ready, logout } = useAuth();
  const [logoutError, setLogoutError] = useState('');

  async function handleLogout() {
    setLogoutError('');
    try {
      await logout();
    } catch (error) {
      setLogoutError(getErrorMessage(error));
    }
  }

  return (
    <div className="app-frame">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="LetMeAsk, início">
          <span className="brand-mark" aria-hidden="true">?</span>
          <span>letmeask<span className="brand-period">.</span></span>
        </Link>
        <div className="header-actions">
          <span className={`connection-chip${isFirebaseConfigured ? ' connection-live' : ''}`}>
            <span aria-hidden="true" />
            {isFirebaseConfigured ? 'Firebase conectado' : 'Modo demonstração'}
          </span>
          {user && (
            <div className="profile-menu">
              <Avatar user={user} size="small" />
              <span className="profile-name">{user.displayName}</span>
              <button className="text-button" type="button" onClick={handleLogout}>Sair</button>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        {logoutError && <ErrorNotice>{logoutError}</ErrorNotice>}
        {!ready ? (
          <div className="loading-state" role="status"><span className="spinner" />Carregando sua sessão…</div>
        ) : (
          <Routes>
            <Route path="/" element={user ? <Dashboard user={user} /> : <LandingPage />} />
            <Route path="/sala/:roomId" element={user ? <RoomPage user={user} /> : <LandingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>

      <footer className="site-footer">
        <Link className="footer-brand" to="/">letmeask.</Link>
        <span>Perguntas melhores começam com espaço para conversar.</span>
        <span>React · Firebase</span>
      </footer>
    </div>
  );
}

function LandingPage() {
  const { signInWithGoogle, enterDemo } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleGoogleSignIn() {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  }

  function handleDemoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Digite seu nome para entrar na demonstração.');
      return;
    }
    enterDemo(name.trim().slice(0, 60));
  }

  return (
    <section className="landing-grid">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-line" />CONVERSAS QUE APROXIMAM</p>
        <h1>Uma boa pergunta pode <span>mudar a conversa.</span></h1>
        <p className="hero-description">
          Crie uma sala, compartilhe o convite e deixe as perguntas abrirem espaço para novas ideias.
        </p>
        <div className="hero-points" aria-label="Como funciona">
          <span><b>01</b> Crie sua sala</span>
          <span><b>02</b> Convide pessoas</span>
          <span><b>03</b> Converse melhor</span>
        </div>
        <div className="hero-decoration" aria-hidden="true">
          <span>“</span><span>perguntar é o começo</span><span>de toda boa ideia.</span>
        </div>
      </div>

      <div className="entry-card">
        <div className="entry-card-heading">
          <span className="entry-icon" aria-hidden="true">✳</span>
          <p className="eyebrow">SEU ESPAÇO DE CONVERSA</p>
        </div>
        <h2>Vamos começar?</h2>
        <p className="entry-description">
          {isFirebaseConfigured
            ? 'Entre com sua conta Google para criar salas e acompanhar perguntas em tempo real.'
            : 'Entre na demonstração local e experimente criar salas e conversar. Seus dados ficam neste navegador.'}
        </p>

        {isFirebaseConfigured ? (
          <button className="google-button" type="button" onClick={handleGoogleSignIn} disabled={busy}>
            <span className="google-mark" aria-hidden="true">G</span>
            {busy ? 'Conectando…' : 'Continuar com Google'}
            <span className="button-arrow" aria-hidden="true">↗</span>
          </button>
        ) : (
          <form className="demo-form" onSubmit={handleDemoSubmit}>
            <label htmlFor="demo-name">Como podemos chamar você?</label>
            <input
              autoComplete="name"
              id="demo-name"
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              value={name}
            />
            <button className="primary-button" type="submit">
              Entrar na demonstração <span aria-hidden="true">→</span>
            </button>
          </form>
        )}
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <div className="entry-divider"><span>SEGURO E SIMPLES</span></div>
        <p className="entry-footnote">
          {isFirebaseConfigured
            ? 'Sua conta é autenticada pelo Firebase Authentication.'
            : 'Nenhuma conta é criada. O modo demonstração funciona sem configurar o Firebase.'}
        </p>
      </div>
    </section>
  );
}

function Dashboard({ user }: { user: AppUser }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);

  useEffect(() => subscribeToMyRooms(user, (nextRooms) => {
    setRooms(nextRooms);
    setRoomsLoading(false);
  }, () => {
    setError('Não foi possível carregar suas salas. Confira a conexão e as regras do Firebase.');
    setRoomsLoading(false);
  }), [user]);

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = roomName.trim();
    if (name.length < 3 || name.length > 80) {
      setError('O nome da sala precisa ter entre 3 e 80 caracteres.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const id = await createRoom(name, user);
      navigate(`/sala/${encodeURIComponent(id)}`);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setBusy(false);
    }
  }

  function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = roomCode.trim();
    if (!ROOM_CODE_PATTERN.test(code)) {
      setError('Digite um código de sala válido.');
      return;
    }
    setError('');
    navigate(`/sala/${encodeURIComponent(code)}`);
  }

  return (
    <section className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEU PAINEL</p>
          <h1>Bom ter você aqui, <span>{user.displayName.split(' ')[0]}.</span></h1>
          <p>Crie uma sala ou entre em uma conversa que já começou.</p>
        </div>
        {user.isDemo && <span className="demo-badge">DADOS LOCAIS</span>}
      </div>

      {user.isDemo && (
        <div className="demo-banner">
          <span className="demo-banner-icon" aria-hidden="true">i</span>
          <p><strong>Modo demonstração.</strong> Salas e perguntas ficam salvas neste navegador.</p>
        </div>
      )}

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="dashboard-grid">
        <section className="panel create-panel" aria-labelledby="create-title">
          <div className="panel-kicker"><span className="panel-icon" aria-hidden="true">＋</span> NOVA CONVERSA</div>
          <h2 id="create-title">Crie uma sala</h2>
          <p>Escolha um nome que ajude todo mundo a entrar no assunto.</p>
          <form className="stacked-form" onSubmit={handleCreateRoom}>
            <label htmlFor="room-name">Nome da sala</label>
            <input
              id="room-name"
              maxLength={80}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Ex.: Ideias para o próximo encontro"
              value={roomName}
            />
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? 'Criando sala…' : 'Criar minha sala'} <span aria-hidden="true">→</span>
            </button>
          </form>
          <div className="panel-footnote"><span className="tiny-lock" aria-hidden="true">◆</span> Só você pode moderar as perguntas da sua sala.</div>
        </section>

        <section className="panel join-panel" aria-labelledby="join-title">
          <div className="panel-kicker"><span className="panel-icon panel-icon-light" aria-hidden="true">↗</span> JÁ TEM UM CONVITE?</div>
          <h2 id="join-title">Entre em uma sala</h2>
          <p>Use o código que a pessoa anfitriã compartilhou com você.</p>
          <form className="stacked-form" onSubmit={handleJoinRoom}>
            <label htmlFor="room-code">Código da sala</label>
            <div className="join-input-row">
              <input
                autoCapitalize="none"
                autoComplete="off"
                id="room-code"
                maxLength={40}
                onChange={(event) => setRoomCode(event.target.value)}
                placeholder="Cole o código aqui"
                value={roomCode}
              />
              <button className="icon-submit" type="submit" aria-label="Entrar na sala">→</button>
            </div>
          </form>
          <div className="panel-footnote">O código também está no final do link de convite.</div>
        </section>
      </div>

      <section className="rooms-section" aria-labelledby="rooms-title">
        <div className="rooms-heading">
          <div><p className="eyebrow">CONTINUE DE ONDE PAROU</p><h2 id="rooms-title">Suas salas</h2></div>
          <span className="room-count">{rooms.length.toString().padStart(2, '0')} SALAS</span>
        </div>
        {roomsLoading ? (
          <div className="loading-inline" role="status"><span className="spinner" />Carregando salas…</div>
        ) : rooms.length ? (
          <div className="room-list">
            {rooms.map((room) => <RoomCard key={room.id} room={room} />)}
          </div>
        ) : (
          <div className="empty-rooms">
            <span className="empty-rooms-mark" aria-hidden="true">✳</span>
            <div><strong>Sua primeira conversa começa aqui.</strong><p>Crie uma sala ou use um código de convite para participar.</p></div>
          </div>
        )}
      </section>
    </section>
  );
}

function RoomCard({ room }: { room: Room }) {
  return (
    <Link className="room-card" to={`/sala/${encodeURIComponent(room.id)}`}>
      <span className="room-card-icon" aria-hidden="true">✳</span>
      <span className="room-card-copy"><strong>{room.name}</strong><small>Criada em {formatDate(room.createdAt)}</small></span>
      <span className="room-card-arrow" aria-hidden="true">↗</span>
    </Link>
  );
}

function RoomPage({ user }: { user: AppUser }) {
  const { roomId = '' } = useParams();
  const validRoomId = ROOM_CODE_PATTERN.test(roomId);
  const navigate = useNavigate();
  const [roomResult, setRoomResult] = useState<{ id: string; room: Room | null } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [likes, setLikes] = useState<RoomLikes>({});
  const [questionText, setQuestionText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!validRoomId) return;
    return subscribeToRoom(roomId, user.isDemo, (nextRoom) => {
      setRoomResult({ id: roomId, room: nextRoom });
    }, () => {
      setError('Não foi possível abrir esta sala. Confira sua conexão e as regras do Firebase.');
      setRoomResult({ id: roomId, room: null });
    });
  }, [roomId, user.isDemo, validRoomId]);

  useEffect(() => {
    if (!validRoomId) return;
    return subscribeToQuestions(roomId, user.isDemo, setQuestions, () => {
      setError('Não foi possível atualizar as perguntas desta sala.');
    });
  }, [roomId, user.isDemo, validRoomId]);

  useEffect(() => {
    if (!validRoomId) return;
    return subscribeToLikes(roomId, user.isDemo, setLikes, () => {
      setError('Não foi possível atualizar as reações desta sala.');
    });
  }, [roomId, user.isDemo, validRoomId]);

  const roomLoading = roomResult?.id !== roomId;
  const room = roomResult?.id === roomId ? roomResult.room : null;
  const isOwner = room?.ownerId === user.uid;
  const orderedQuestions = useMemo(() => [...questions].sort((left, right) => {
    if (left.answered !== right.answered) return left.answered ? 1 : -1;
    const likeDifference = Object.keys(likes[right.id] ?? {}).length - Object.keys(likes[left.id] ?? {}).length;
    return likeDifference || left.createdAt - right.createdAt;
  }), [likes, questions]);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = questionText.trim();
    if (text.length < 4 || text.length > QUESTION_LIMIT) {
      setError(`Sua pergunta precisa ter entre 4 e ${QUESTION_LIMIT} caracteres.`);
      return;
    }
    setError('');
    setBusy(true);
    try {
      await createQuestion(roomId, text, user);
      setQuestionText('');
    } catch (askError) {
      setError(getErrorMessage(askError));
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Não foi possível copiar o link. Copie o endereço da barra do navegador.');
    }
  }

  async function handleLike(question: Question) {
    const liked = Boolean(likes[question.id]?.[user.uid]);
    try {
      await setQuestionLike(roomId, question.id, user.uid, !liked, user.isDemo);
    } catch (likeError) {
      setError(getErrorMessage(likeError));
    }
  }

  async function handleAnswered(question: Question) {
    try {
      await setQuestionAnswered(roomId, question.id, !question.answered, user.isDemo);
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function handleDelete(question: Question) {
    try {
      await deleteQuestion(roomId, question.id, user.isDemo);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  if (!validRoomId) return <NotFound />;
  if (roomLoading) return <div className="loading-state" role="status"><span className="spinner" />Abrindo sua sala…</div>;
  if (!room) {
    return (
      <section className="not-found-card">
        <span className="not-found-symbol" aria-hidden="true">?</span>
        <p className="eyebrow">SALA NÃO ENCONTRADA</p>
        <h1>Este convite não abriu uma sala.</h1>
        <p>Confira o código ou peça um novo link para quem criou a conversa.</p>
        {error && <ErrorNotice>{error}</ErrorNotice>}
        <button className="primary-button" type="button" onClick={() => navigate('/')}>Voltar às minhas salas <span aria-hidden="true">→</span></button>
      </section>
    );
  }

  return (
    <section className="room-page">
      <Link className="back-link" to="/">← Voltar às minhas salas</Link>
      <div className="room-hero">
        <div>
          <p className="eyebrow">SALA DE CONVERSA <span className="room-code-label">· {room.id}</span></p>
          <h1>{room.name}</h1>
          <p className="room-byline">Criada por <strong>{room.ownerName}</strong> · {formatDate(room.createdAt)}</p>
        </div>
        <button className="share-button" type="button" onClick={copyInvite}>
          <span aria-hidden="true">↗</span> {copied ? 'Link copiado' : 'Compartilhar sala'}
        </button>
      </div>

      {user.isDemo && <div className="demo-banner"><span className="demo-banner-icon" aria-hidden="true">i</span><p><strong>Modo demonstração.</strong> Convide pessoas usando este navegador.</p></div>}
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="room-content-grid">
        <section className="panel ask-panel" aria-labelledby="ask-title">
          <div className="panel-kicker"><span className="panel-icon" aria-hidden="true">?</span> PARTICIPE DA CONVERSA</div>
          <h2 id="ask-title">O que você quer perguntar?</h2>
          <form className="question-form" onSubmit={handleAsk}>
            <label className="sr-only" htmlFor="question-text">Sua pergunta</label>
            <textarea
              id="question-text"
              maxLength={QUESTION_LIMIT}
              onChange={(event) => setQuestionText(event.target.value)}
              placeholder="Escreva sua pergunta com calma…"
              rows={4}
              value={questionText}
            />
            <div className="question-form-footer">
              <span>{questionText.length}/{QUESTION_LIMIT}</span>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar pergunta'} <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
          <p className="panel-footnote">Sua pergunta aparece para todas as pessoas nesta sala.</p>
        </section>

        <aside className="room-aside">
          <div className="room-aside-number">{questions.length.toString().padStart(2, '0')}</div>
          <p>perguntas nesta conversa</p>
          <span className="aside-divider" />
          <p className="room-aside-tip">As perguntas mais curtidas aparecem primeiro. Ajude a conversa a encontrar seu caminho.</p>
          {isOwner && <span className="host-label">VOCÊ É A PESSOA ANFITRIÃ</span>}
        </aside>
      </div>

      <section className="questions-section" aria-labelledby="questions-title">
        <div className="rooms-heading">
          <div><p className="eyebrow">A CONVERSA ACONTECE AQUI</p><h2 id="questions-title">Perguntas</h2></div>
          <span className="room-count">{questions.length.toString().padStart(2, '0')} NO TOTAL</span>
        </div>
        {orderedQuestions.length ? (
          <div className="question-list">
            {orderedQuestions.map((question) => {
              const questionLikes = likes[question.id] ?? {};
              const canDelete = isOwner || question.authorId === user.uid;
              return (
                <article className={`question-card${question.answered ? ' question-answered' : ''}`} key={question.id}>
                  <div className="question-card-topline">
                    <Avatar user={{ displayName: question.authorName, photoURL: null }} size="small" />
                    <strong>{question.authorName}</strong>
                    <span>{formatDate(question.createdAt)}</span>
                    {question.answered && <span className="answered-tag">RESPONDIDA</span>}
                  </div>
                  <p className="question-text">{question.text}</p>
                  <div className="question-actions">
                    <button
                      className={`reaction-button${questionLikes[user.uid] ? ' reaction-active' : ''}`}
                      type="button"
                      aria-pressed={Boolean(questionLikes[user.uid])}
                      onClick={() => void handleLike(question)}
                    >
                      <span aria-hidden="true">{questionLikes[user.uid] ? '♥' : '♡'}</span>
                      {Object.keys(questionLikes).length} {Object.keys(questionLikes).length === 1 ? 'apoio' : 'apoios'}
                    </button>
                    {isOwner && (
                      <button className="text-button" type="button" onClick={() => void handleAnswered(question)}>
                        {question.answered ? 'Reabrir pergunta' : 'Marcar respondida'}
                      </button>
                    )}
                    {canDelete && <button className="delete-button" type="button" onClick={() => void handleDelete(question)}>Excluir</button>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-questions">
            <span aria-hidden="true">✳</span>
            <strong>A primeira pergunta ainda está por vir.</strong>
            <p>Comece a conversa enviando uma pergunta acima.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function NotFound() {
  return (
    <section className="not-found-card">
      <span className="not-found-symbol" aria-hidden="true">404</span>
      <p className="eyebrow">CAMINHO NÃO ENCONTRADO</p>
      <h1>Vamos voltar para a conversa?</h1>
      <Link className="primary-button button-link" to="/">Ir para o início <span aria-hidden="true">→</span></Link>
    </section>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
