import { useState, type FormEvent } from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';
import { login, register } from '../services/api';

interface Props {
  onClose: () => void;
  onAuthenticated: (user: { id: string; username: string; displayName: string }) => void;
}

export function AuthDialog({ onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const username = String(data.get('username'));
      const password = String(data.get('password'));
      const user = mode === 'register'
        ? await register({ username, password, displayName: String(data.get('displayName')) })
        : await login({ username, password });
      onAuthenticated(user);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败');
    } finally { setBusy(false); }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="关闭"><X /></button>
        <div className="auth-illustration" aria-hidden="true"><span>青</span><span>泰</span><span>济</span></div>
        <p className="eyebrow">云端旅行册</p>
        <h2 id="auth-title">{mode === 'register' ? '创建同行账号' : '继续这趟旅程'}</h2>
        <p className="dialog-copy">登录后，打卡与人物位置会保存在演示服务中。</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>昵称<input name="displayName" required minLength={1} maxLength={50} placeholder="例如：山海搭子" /></label>}
          <label>用户名<input name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9_]+" placeholder="3—32位字母或数字" /></label>
          <label>密码<input name="password" type="password" required minLength={8} maxLength={72} placeholder="至少8位" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" disabled={busy}>{mode === 'register' ? <UserPlus /> : <LogIn />}{busy ? '处理中…' : mode === 'register' ? '创建账号' : '登录'}</button>
        </form>
        <button className="text-button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}>{mode === 'register' ? '已有账号？直接登录' : '没有账号？创建一个'}</button>
      </section>
    </div>
  );
}
