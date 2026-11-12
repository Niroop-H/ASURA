import { NextResponse } from 'next/server';
import { operationalDefinitions } from '@/lib/operationalFeeds';
export const runtime = 'nodejs';
import {
  getAllSources,
  addSource,
  updateSource,
  deleteSource,
  toggleSource,
} from '@/lib/sourceRegistry';

export async function GET() {
  try {
    return NextResponse.json({ sources: getAllSources(), operationalSources: operationalDefinitions(), operationalStatus:'registered-contracts-not-probed' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const source = addSource(body);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: 'Source id is required' },
        { status: 400 }
      );
    }
    const source = updateSource(id, updates);
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: 'Source id is required' },
        { status: 400 }
      );
    }
    const success = deleteSource(id);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: 'Source id is required' },
        { status: 400 }
      );
    }
    const source = toggleSource(id);
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
