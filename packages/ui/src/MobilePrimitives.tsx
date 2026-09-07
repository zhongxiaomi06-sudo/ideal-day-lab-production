import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export function SafeAreaScreen({ children, className = '', mainId = 'main' }: PropsWithChildren<{ className?: string; mainId?: string }>) {
  return <main id={mainId} tabIndex={-1} className={`eazo-safe-screen ${className}`.trim()}>{children}</main>;
}

export function PrimaryAction({ children, busy = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return <button {...props} type={props.type ?? 'button'} className={`eazo-primary-action ${props.className ?? ''}`.trim()} disabled={busy || props.disabled} aria-busy={busy || undefined}>{children}</button>;
}

export function AudioControl({ muted, onToggle, label = 'Sound' }: { muted: boolean; onToggle: () => void; label?: string }) {
  return <button type="button" className="eazo-audio-control" aria-label={`${muted ? 'Turn on' : 'Mute'} ${label.toLowerCase()}`} aria-pressed={muted} onClick={onToggle}><span aria-hidden="true">{muted ? 'Sound off' : 'Sound on'}</span></button>;
}

export function CompletionActions({ onRestart, onDone, restartLabel = 'Again', doneLabel = 'Done', detail }: { onRestart: () => void; onDone?: () => void; restartLabel?: string; doneLabel?: string; detail?: ReactNode }) {
  return <section className="eazo-completion" aria-label="Experience complete" role="status"><div>{detail}</div><div className="eazo-action-row"><PrimaryAction onClick={onRestart}>{restartLabel}</PrimaryAction>{onDone ? <button type="button" onClick={onDone}>{doneLabel}</button> : null}</div></section>;
}

export function PermissionPrompt({ title, explanation, action, onRequest, onSkip }: { title: string; explanation: string; action: string; onRequest: () => void; onSkip: () => void }) {
  return <section className="eazo-permission" aria-labelledby="permission-title"><h2 id="permission-title">{title}</h2><p>{explanation}</p><div className="eazo-action-row"><PrimaryAction onClick={onRequest}>{action}</PrimaryAction><button type="button" onClick={onSkip}>Not now</button></div></section>;
}
