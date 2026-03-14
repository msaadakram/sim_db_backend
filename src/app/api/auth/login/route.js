import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Admin from '@/lib/models/Admin';

export async function POST(request) {
  try {
    await dbConnect();
    const { username, password } = await request.json();
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedPassword = typeof password === 'string' ? password : '';

    if (!normalizedUsername || !normalizedPassword) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    let admin = await Admin.findOne({ username: normalizedUsername });

    // Bootstrap first admin from env creds if database has no admin yet.
    if (!admin) {
      const envUsername = (process.env.ADMIN_USERNAME || '').trim();
      const envPassword = process.env.ADMIN_PASSWORD || '';

      if (
        envUsername &&
        envPassword &&
        normalizedUsername === envUsername &&
        normalizedPassword === envPassword
      ) {
        admin = await Admin.create({ username: envUsername, password: envPassword });
      } else {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    let match = await admin.comparePassword(normalizedPassword);

    // Handle rare legacy case where a plaintext password may have been stored.
    if (!match && admin.password === normalizedPassword) {
      admin.password = normalizedPassword;
      await admin.save();
      match = true;
    }

    if (!match) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return NextResponse.json({ token, username: admin.username });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
