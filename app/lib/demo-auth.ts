export type DemoRole = "student" | "teacher" | "admin";

export type DemoSession = {
  role: DemoRole;
  name: string;
  email: string;
};

export const DEMO_ACCOUNTS: Record<DemoRole, DemoSession & { password: string; destination: string }> = {
  student: {
    role: "student",
    name: "Geraldo Santos",
    email: "aluno@centep.com.br",
    password: "Aluno@2026",
    destination: "/portal-aluno",
  },
  teacher: {
    role: "teacher",
    name: "Marcos Almeida",
    email: "professor@centep.com.br",
    password: "Professor@2026",
    destination: "/portal-professor",
  },
  admin: {
    role: "admin",
    name: "Administração CENTEP",
    email: "admin@centep.com.br",
    password: "Centep@2026",
    destination: "/admin",
  },
};

export const SESSION_KEY = "centep-demo-session";

export function saveDemoSession(account: DemoSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(account));
}

export function readDemoSession(): DemoSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    return null;
  }
}

export function clearDemoSession() {
  window.localStorage.removeItem(SESSION_KEY);
}
