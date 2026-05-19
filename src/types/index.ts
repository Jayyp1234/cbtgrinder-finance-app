// Finance-app shared types. Slim — most domain types live with their
// RTK Query slice (e.g. diagnosticsApi.ts).
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
}
