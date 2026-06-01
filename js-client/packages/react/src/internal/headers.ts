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

/**
 * Produces a stable, order-independent string key for a set of headers.
 *
 * Hooks accept `headers` as a `HeadersInit`, which callers almost always pass
 * as an inline object literal — a new reference on every render. Using that
 * reference directly in a dependency array would re-create the underlying
 * executor (and abort any in-flight request) on every render. Depending on
 * this content-derived key instead keeps the dependency stable while still
 * reacting when the header values actually change.
 */
export function serializeHeaders(init?: HeadersInit): string {
  if (!init) {
    return '';
  }
  const entries: string[] = [];
  new Headers(init).forEach((value, key) => {
    entries.push(`${key}:${value}`);
  });
  return entries.sort().join('\n');
}
