import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET,
);

export async function verifyAuth(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  try {
    const { userId } = await privy.verifyAuthToken(token);
    return userId;
  } catch {
    return null;
  }
}

export default privy;
