import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

const client = axios.create({ baseURL: API_BASE });

export function setAuthToken(token) {
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

export async function signup(payload) {
  const { data } = await client.post("/api/auth/signup", payload);
  return data;
}

export async function login(payload) {
  const { data } = await client.post("/api/auth/login", payload);
  return data;
}

export async function createConversation(title) {
  const { data } = await client.post("/api/conversations", { title });
  return data;
}

export async function getConversations() {
  const { data } = await client.get("/api/conversations");
  return data.conversations || [];
}

export async function getMessages(conversationId) {
  const { data } = await client.get(`/api/conversations/${conversationId}/messages`);
  return data.messages || [];
}

export async function queryRag({ query, conversationId }) {
  const { data } = await client.post("/api/query", {
    query,
    conversation_id: conversationId,
  });
  return data;
}

export async function listDocuments() {
  const { data } = await client.get("/api/documents");
  return data.documents || [];
}

export async function ingestPdfs(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  const { data } = await client.post("/api/ingest", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data; // { jobs: [{job_id, filename}] }
}

export async function getIngestStatus(jobId) {
  const { data } = await client.get(`/api/ingest/status/${jobId}`);
  return data; // { status, progress, filename, message }
}

export async function reingestDocument(filename) {
  const { data } = await client.post("/api/reingest", { filename });
  return data; // { job_id, filename }
}
