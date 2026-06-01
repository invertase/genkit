/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { GenkitClientOptions } from '@genkit-ai/client';
import { GenkitClientProvider, useAction, useStream } from '@genkit-ai/react';
import { useMemo, useState, type FormEvent } from 'react';

const defaultServerUrl =
  import.meta.env.VITE_GENKIT_BASE_URL ?? 'http://127.0.0.1:3781';

export function App() {
  const [serverUrl, setServerUrl] = useState(defaultServerUrl);
  const [token, setToken] = useState('');
  const clientConfig = useMemo<GenkitClientOptions>(
    () => ({
      baseUrl: `${serverUrl.replace(/\/$/, '')}/api`,
      headers: (): HeadersInit =>
        token ? { Authorization: `Bearer ${token}` } : {},
    }),
    [serverUrl, token]
  );

  return (
    <GenkitClientProvider config={clientConfig}>
      <main className="shell">
        <header className="topbar">
          <div className="brand">
            <img src="/genkit-logo.png" alt="" />
            <div>
              <h1>Genkit Client Examples</h1>
              <p>Headless calls, React state, streaming, and auth.</p>
            </div>
          </div>
          <div className="connection">
            <label>
              Server
              <input
                value={serverUrl}
                onChange={(event) => setServerUrl(event.target.value)}
                spellCheck={false}
              />
            </label>
            <label>
              Token
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="test-token"
                spellCheck={false}
              />
            </label>
          </div>
        </header>
        <section className="grid">
          <EchoExample />
          <AddExample />
          <CountStreamExample />
          <SecureEchoExample />
        </section>
      </main>
    </GenkitClientProvider>
  );
}

function EchoExample() {
  const [text, setText] = useState('Hello from Vite');
  const { execute, data, error, isLoading, reset } = useAction({
    url: '/echo',
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void execute({ text }).catch(() => undefined);
  }

  return (
    <form className="panel" onSubmit={onSubmit}>
      <PanelHeader title="Echo" status={statusText(isLoading, error, data)} />
      <label>
        Text
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div className="actions">
        <button disabled={isLoading}>Run</button>
        <button type="button" className="secondary" onClick={reset}>
          Reset
        </button>
      </div>
      <Result value={data ?? error} />
    </form>
  );
}

function AddExample() {
  const [a, setA] = useState(12);
  const [b, setB] = useState(30);
  const { execute, data, error, isLoading } = useAction({
    url: '/add',
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void execute({ a, b }).catch(() => undefined);
  }

  return (
    <form className="panel" onSubmit={onSubmit}>
      <PanelHeader title="Add" status={statusText(isLoading, error, data)} />
      <div className="split">
        <label>
          A
          <input
            type="number"
            value={a}
            onChange={(event) => setA(event.target.valueAsNumber)}
          />
        </label>
        <label>
          B
          <input
            type="number"
            value={b}
            onChange={(event) => setB(event.target.valueAsNumber)}
          />
        </label>
      </div>
      <div className="actions">
        <button disabled={isLoading}>Calculate</button>
      </div>
      <Result value={data ?? error} />
    </form>
  );
}

function CountStreamExample() {
  const [to, setTo] = useState(5);
  const { execute, abort, reset, chunks, data, error, isStreaming, streamId } =
    useStream({ url: '/countStream' });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void execute({ to }).catch(() => undefined);
  }

  return (
    <form className="panel wide" onSubmit={onSubmit}>
      <PanelHeader
        title="Count Stream"
        status={statusText(isStreaming, error, data)}
      />
      <div className="split">
        <label>
          To
          <input
            min={1}
            max={20}
            type="number"
            value={to}
            onChange={(event) => setTo(event.target.valueAsNumber)}
          />
        </label>
        <label>
          Stream ID
          <input value={streamId ?? ''} readOnly />
        </label>
      </div>
      <div className="actions">
        <button disabled={isStreaming}>Stream</button>
        <button
          type="button"
          className="secondary"
          disabled={!isStreaming}
          onClick={abort}>
          Abort
        </button>
        <button type="button" className="secondary" onClick={reset}>
          Reset
        </button>
      </div>
      <div className="chunkRow" aria-label="stream chunks">
        {chunks.length === 0 ? (
          <span className="empty">No chunks yet</span>
        ) : (
          chunks.map((chunk, index) => (
            <span className="chunk" key={`${chunk}-${index}`}>
              {String(chunk)}
            </span>
          ))
        )}
      </div>
      <Result value={data ?? error} />
    </form>
  );
}

function SecureEchoExample() {
  const [text, setText] = useState('private hello');
  const { execute, data, error, isLoading } = useAction({
    url: '/secureEcho',
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void execute({ text }).catch(() => undefined);
  }

  return (
    <form className="panel" onSubmit={onSubmit}>
      <PanelHeader
        title="Secure Echo"
        status={statusText(isLoading, error, data)}
      />
      <label>
        Text
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div className="actions">
        <button disabled={isLoading}>Run Secure</button>
      </div>
      <Result value={data ?? error} />
    </form>
  );
}

function PanelHeader({ title, status }: { title: string; status: string }) {
  return (
    <div className="panelHeader">
      <h2>{title}</h2>
      <span className={`status ${status.toLowerCase()}`}>{status}</span>
    </div>
  );
}

function Result({ value }: { value: unknown }) {
  if (!value) {
    return <pre className="result">Waiting for output</pre>;
  }
  if (value instanceof Error) {
    return <pre className="result error">{value.message}</pre>;
  }
  return <pre className="result">{JSON.stringify(value, null, 2)}</pre>;
}

function statusText(
  busy: boolean,
  error: Error | undefined,
  data: unknown
): string {
  if (busy) {
    return 'Running';
  }
  if (error) {
    return 'Error';
  }
  if (data) {
    return 'Ready';
  }
  return 'Idle';
}
