import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const THEME_KEY = 'chatplay_admin_theme';
const theme = window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
if (theme === 'dark') document.documentElement.classList.add('dark');
else document.documentElement.classList.remove('dark');

createRoot(document.getElementById('root')!).render(<App />);
