import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const DB_PATH = path.join(process.cwd(), ".data", "projects.json");
let writeQueue: Promise<void> = Promise.resolve();

export type SceneStatus = "pending" | "generating_image" | "generating_video" | "done" | "error";

export interface Scene {
  id: string;
  text: string;
  visualPrompt: string;
  hasImage?: boolean;
  hasVideo?: boolean;
  imageBase64?: string;
  videoBase64?: string;
  status: SceneStatus;
}

export type ProjectStatus =
  | "draft"
  | "generating_script"
  | "generating_scenes"
  | "rendering"
  | "waiting_external_render"
  | "done"
  | "error";

export interface Project {
  id: string;
  title: string;
  description: string;
  topic: string;
  style: string;
  duration: number;
  status: ProjectStatus;
  scenes: Scene[];
  outputUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

async function readDB(): Promise<Project[]> {
  try {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeDB(projects: Project[]): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tempPath = `${DB_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(projects, null, 2), "utf-8");
  await fs.rename(tempPath, DB_PATH);
}

async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = writeQueue;
  let release = () => {};
  writeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

export async function getAllProjects(): Promise<Project[]> {
  const projects = await readDB();
  return projects.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await readDB();
  return projects.find((p) => p.id === id) ?? null;
}

export async function createProject(
  data: Pick<Project, "topic" | "style" | "duration">
): Promise<Project> {
  return withWriteLock(async () => {
    const projects = await readDB();
    const project: Project = {
      id: randomUUID(),
      title: "",
      description: "",
      topic: data.topic,
      style: data.style,
      duration: data.duration,
      status: "draft",
      scenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.push(project);
    await writeDB(projects);
    return project;
  });
}

export async function updateProject(
  id: string,
  updates: Partial<Project>
): Promise<Project | null> {
  return withWriteLock(async () => {
    const projects = await readDB();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    projects[idx] = {
      ...projects[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await writeDB(projects);
    return projects[idx];
  });
}

export async function updateScene(
  projectId: string,
  sceneId: string,
  updates: Partial<Scene>
): Promise<void> {
  await withWriteLock(async () => {
    const projects = await readDB();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    Object.assign(scene, updates);
    project.updatedAt = new Date().toISOString();
    await writeDB(projects);
  });
}
