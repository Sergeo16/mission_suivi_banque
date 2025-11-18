import { NextRequest, NextResponse } from 'next/server';
import { isMaintenanceMode, setMaintenanceMode } from '@/lib/maintenance';
import { getSessionByToken, getUserById, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ enabled: false });
    }

    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json({ enabled: false });
    }

    const user = await getUserById(session.userId);
    if (!isAdmin(user)) {
      return NextResponse.json({ enabled: false });
    }

    const enabled = await isMaintenanceMode();
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Maintenance check error:', error);
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, enabled } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 401 }
      );
    }

    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalide' },
        { status: 401 }
      );
    }

    const user = await getUserById(session.userId);
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    await setMaintenanceMode(enabled === true);
    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error('Maintenance toggle error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification' },
      { status: 500 }
    );
  }
}

