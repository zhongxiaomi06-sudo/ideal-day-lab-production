import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { LocaleProvider } from './i18n';
import { EazoProvider } from '@eazo/sdk/react';
import { PreviewInspector } from './components/eazo/preview-inspector';
import { AnnotationMode } from './components/eazo/annotation-mode';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EazoProvider>
      <LocaleProvider>
        <App />
        <PreviewInspector />
        <AnnotationMode />
      </LocaleProvider>
    </EazoProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js'));
}
