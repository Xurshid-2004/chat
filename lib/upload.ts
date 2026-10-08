/**
 * Message upload with progress (fetch can't report upload progress, XHR can).
 * Like `request()`, a 401 refreshes the session once and repeats the upload.
 */
import { ApiError, notifySessionExpired, refreshSession } from "./api";
import type { Message } from "./types";

interface UploadOptions {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

function send(chatId: number, form: FormData, { onProgress, signal }: UploadOptions): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/chats/${chatId}/messages/`);
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new ApiError(0, "network_error", "Upload failed. Check your connection."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(form);
  });
}

function toError(status: number, body: string): ApiError {
  let data: { detail?: string; code?: string; errors?: Record<string, string[]> } = {};
  try {
    data = JSON.parse(body);
  } catch {
    // not JSON
  }
  const fallback = status === 413 ? "File is too large." : status >= 500 ? "Server error. Please try again." : "Upload failed.";
  return new ApiError(status, data.code ?? "error", data.detail ?? fallback, data.errors ?? {});
}

export async function uploadMessage(chatId: number, form: FormData, options: UploadOptions = {}): Promise<Message> {
  let result = await send(chatId, form, options);
  if (result.status === 401) {
    if (await refreshSession()) {
      result = await send(chatId, form, options);
    }
    if (result.status === 401) notifySessionExpired();
  }
  if (result.status < 200 || result.status >= 300) throw toError(result.status, result.body);
  return JSON.parse(result.body) as Message;
}
