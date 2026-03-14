import jwt from 'jsonwebtoken';
import dbConnect from './db';
import Admin from './models/Admin';

/**
 * Verify JWT token from Authorization header.
 * Returns the decoded admin payload or null.
 */
export async function verifyAuth(request) {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Helper that returns a 401 response if auth fails,
 * or the decoded admin object if auth succeeds.
 */
export async function requireAuth(request) {
  await dbConnect();
  const admin = await verifyAuth(request);
  if (!admin) {
    return { error: true, response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  return { error: false, admin };
}
